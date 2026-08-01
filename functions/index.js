require("dotenv").config();
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { defineSecret } = require("firebase-functions/params");
const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();
const db = admin.firestore();

const resendApiKeyParam = defineSecret("RESEND_API_KEY");
const emailFromParam = defineSecret("EMAIL_FROM");
const clientAppUrlParam = defineSecret("CLIENT_APP_URL");
const moyasarSecretKeyParam = defineSecret("MOYASAR_SECRET_KEY");
const paypalClientIdParam = defineSecret("PAYPAL_CLIENT_ID");
const paypalSecretParam = defineSecret("PAYPAL_CLIENT_SECRET");

const getResend = () => {
  const key = resendApiKeyParam.value();
  if (!key) return null;
  return new Resend(key);
};

const sendEmail = async ({ to, subject, html, text }) => {
  const resend = getResend();
  if (!resend) {
    console.warn("Resend not configured. Skipping email to", to);
    return;
  }

  await resend.emails.send({
    from: "Link <noreply@link-22.com>",
    to,
    subject,
    html,
    text,
  });
};

const getUserById = async (uid) => {
  if (!uid) return null;
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

const getProviderById = async (uid) => {
  if (!uid) return null;
  const snap = await db.collection("providers").doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

const getServiceById = async (id) => {
  if (!id) return null;
  const snap = await db.collection("services").doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

// Get payment by booking ID
const getPaymentByBookingId = async (bookingId) => {
  const snapshot = await db
    .collection("payments")
    .where("bookingId", "==", bookingId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// Process refund via Moyasar API
const processRefund = async (paymentId, amount = null) => {
  const secretKey = moyasarSecretKeyParam.value();
  if (!secretKey) {
    console.error("MOYASAR_SECRET_KEY not configured");
    return { success: false, error: "Moyasar not configured" };
  }

  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

  try {
    const body = amount ? { amount: Math.round(Number(amount) * 100) } : {};

    const response = await fetch(
      `https://api.moyasar.com/v1/payments/${paymentId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Moyasar refund error:", data);
      return { success: false, error: data.message || "Refund failed" };
    }

    console.log("Moyasar refund successful:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Moyasar refund exception:", error);
    return { success: false, error: error.message };
  }
};

// Refund booking payment and update records
const refundBookingPayment = async (bookingId, reason = "rejected") => {
  const payment = await getPaymentByBookingId(bookingId);

  if (!payment) {
    console.warn(`No payment found for booking ${bookingId}`);
    return { success: false, error: "No payment found" };
  }

  if (payment.status === "REFUNDED") {
    console.log(`Payment for booking ${bookingId} already refunded`);
    return { success: true, alreadyRefunded: true };
  }

  const moyasarPaymentId = payment.orderId;
  if (!moyasarPaymentId) {
    console.error(`No Moyasar payment ID for booking ${bookingId}`);
    return { success: false, error: "No Moyasar payment ID" };
  }

  const refundResult = await processRefund(moyasarPaymentId);

  if (refundResult.success) {
    // Update payment record
    await db.collection("payments").doc(payment.id).update({
      status: "REFUNDED",
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundReason: reason,
    });

    // Update booking record
    await db.collection("bookings").doc(bookingId).update({
      paymentStatus: "REFUNDED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return refundResult;
};

exports.onBookingCreated = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    secrets: [resendApiKeyParam, emailFromParam, clientAppUrlParam],
  },
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return;

    const [client, providerProfile, providerUser, service] = await Promise.all([
      getUserById(booking.clientId),
      getProviderById(booking.providerId),
      getUserById(booking.providerId),
      getServiceById(booking.serviceId),
    ]);

    const clientEmail = client?.email;
    const providerEmail = providerUser?.email;

    const clientAppUrl = "https://www.link-22.com";
    const bookingUrl = `${clientAppUrl}/client/bookings/${event.params.bookingId}`;
    const providerUrl = `${clientAppUrl}/provider/booking/${event.params.bookingId}`;

    if (clientEmail) {
      await sendEmail({
        to: clientEmail,
        subject: "Booking received - awaiting provider confirmation",
        text: `Your booking is confirmed and awaiting provider acceptance. View: ${bookingUrl}`,
        html: `
          <p>Your booking is successful and is waiting for the provider to accept.</p>
          <p>Service: ${service?.title || "Service"}</p>
          <p>Date: ${booking.bookingDate}</p>
          <p><a href="${bookingUrl}">View booking</a></p>
        `,
      });
    }

    if (providerEmail) {
      await sendEmail({
        to: providerEmail,
        subject: "New booking request",
        text: `You have a new booking request. Please accept within 24 hours. View: ${providerUrl}`,
        html: `
          <p>You have a new booking request.</p>
          <p>Service: ${service?.title || "Service"}</p>
          <p>Client: ${client?.name || "Client"}</p>
          <p>Date: ${booking.bookingDate}</p>
          <p>Please accept within 24 hours or it will be auto-rejected.</p>
          <p><a href="${providerUrl}">View request</a></p>
        `,
      });
    }
  },
);

exports.autoRejectExpiredBookings = onSchedule(
  {
    schedule: "every 60 minutes",
    secrets: [resendApiKeyParam, emailFromParam, moyasarSecretKeyParam],
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 24 * 60 * 60 * 1000,
    );

    const snapshot = await db
      .collection("bookings")
      .where("status", "==", "PENDING")
      .where("createdAt", "<=", cutoff)
      .get();

    if (snapshot.empty) return;

    const updates = snapshot.docs.map(async (doc) => {
      const bookingId = doc.id;
      const booking = doc.data();

      // Process refund first
      const refundResult = await refundBookingPayment(
        bookingId,
        "auto_rejected_timeout",
      );
      console.log(`Refund for booking ${bookingId}:`, refundResult);

      // Update booking status
      await doc.ref.update({
        status: "REJECTED",
        rejectionReason: "auto_rejected_timeout",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const [client, providerUser, service] = await Promise.all([
        getUserById(booking.clientId),
        getUserById(booking.providerId),
        getServiceById(booking.serviceId),
      ]);

      const clientEmail = client?.email;
      const providerEmail = providerUser?.email;

      if (clientEmail) {
        const refundMessage = refundResult.success
          ? "Your payment has been refunded automatically."
          : "Please contact support for your refund.";

        await sendEmail({
          to: clientEmail,
          subject: "Booking auto-rejected - Payment refunded",
          text: `Your booking was auto-rejected because the provider did not respond within 24 hours. ${refundMessage}`,
          html: `
            <p>Your booking was auto-rejected because the provider did not respond within 24 hours.</p>
            <p>Service: ${service?.title || "Service"}</p>
            <p><strong>${refundMessage}</strong></p>
          `,
        });
      }

      if (providerEmail) {
        await sendEmail({
          to: providerEmail,
          subject: "Booking request expired",
          text: "A booking request was auto-rejected after 24 hours.",
          html: `
            <p>A booking request was auto-rejected after 24 hours.</p>
            <p>Service: ${service?.title || "Service"}</p>
          `,
        });
      }
    });

    await Promise.all(updates);
  },
);

// Trigger when booking status changes - auto-refund on rejection
exports.onBookingStatusChanged = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    secrets: [resendApiKeyParam, emailFromParam, moyasarSecretKeyParam],
  },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) return;

    const bookingId = event.params.bookingId;
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;

    // Only process if status changed TO REJECTED (and wasn't already rejected)
    if (newStatus !== "REJECTED" || oldStatus === "REJECTED") {
      return;
    }

    // Skip if this was from auto-reject (already handled by autoRejectExpiredBookings)
    if (afterData.rejectionReason === "auto_rejected_timeout") {
      console.log(
        `Booking ${bookingId} was auto-rejected, skipping duplicate refund`,
      );
      return;
    }

    console.log(
      `Booking ${bookingId} manually rejected by provider, processing refund...`,
    );

    // Process refund
    const refundResult = await refundBookingPayment(
      bookingId,
      "provider_rejected",
    );
    console.log(`Refund result for booking ${bookingId}:`, refundResult);

    // Send email to client about refund
    const [client, service] = await Promise.all([
      getUserById(afterData.clientId),
      getServiceById(afterData.serviceId),
    ]);

    const clientEmail = client?.email;
    if (clientEmail) {
      const refundMessage = refundResult.success
        ? "Your payment has been refunded automatically."
        : "Please contact support for your refund.";

      await sendEmail({
        to: clientEmail,
        subject: "Booking rejected - Payment refunded",
        text: `Unfortunately, the provider was unable to accept your booking. ${refundMessage}`,
        html: `
          <p>Unfortunately, the provider was unable to accept your booking.</p>
          <p>Service: ${service?.title || "Service"}</p>
          <p><strong>${refundMessage}</strong></p>
          <p>We apologize for the inconvenience. Please try booking with another provider.</p>
        `,
      });
    }
  },
);

// =====================
// Booking availability
// =====================

const BLOCKING_BOOKING_STATUSES = new Set([
  "PENDING",
  "ACCEPTED",
  "CONFIRMED",
  "IN_PROGRESS",
]);
const DEFAULT_AVAILABILITY_WINDOW = { start: 9 * 60, end: 20 * 60 }; // 09:00-20:00 fallback
const SLOT_INTERVAL_MIN = 30;

const timeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};

// Cuts `remove` out of every window in `windows`, splitting a window in two
// if `remove` falls in its middle.
const subtractInterval = (windows, remove) => {
  const result = [];
  for (const w of windows) {
    if (remove.end <= w.start || remove.start >= w.end) {
      result.push(w);
      continue;
    }
    if (remove.start > w.start) {
      result.push({ start: w.start, end: Math.min(remove.start, w.end) });
    }
    if (remove.end < w.end) {
      result.push({ start: Math.max(remove.end, w.start), end: w.end });
    }
  }
  return result.filter((w) => w.end > w.start);
};

// "YYYY-MM-DD" for a Date, in Saudi local time regardless of the server's
// own execution timezone (Cloud Functions run in UTC).
const riyadhDateKey = (date) =>
  date.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

const riyadhTimeMinutes = (date) =>
  timeToMinutes(
    date.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Riyadh",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

// Returns the free "HH:mm" start times for a provider on a given date,
// intersecting their weekly availabilityRules, one-off availabilityExceptions,
// and existing (non-cancelled) bookings. Runs server-side because a client
// can't otherwise read other clients' booking documents to compute
// conflicts — firestore.rules scopes bookings/{id} reads to that booking's
// own client/provider/admin — this callable exposes only the resulting free
// slot list, never any booking's client identity or other details.
exports.getAvailableBookingSlots = onCall(async (request) => {
  const { providerId, date, durationMin } = request.data || {};
  const minutesNeeded = Number(durationMin);
  if (
    !providerId ||
    typeof providerId !== "string" ||
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(minutesNeeded) ||
    minutesNeeded <= 0
  ) {
    throw new HttpsError("invalid-argument", "Missing or invalid parameters.");
  }

  const providerSnap = await db.collection("providers").doc(providerId).get();
  const profile = providerSnap.exists ? providerSnap.data() : {};
  const availabilityRules = Array.isArray(profile.availabilityRules)
    ? profile.availabilityRules
    : [];
  const availabilityExceptions = Array.isArray(profile.availabilityExceptions)
    ? profile.availabilityExceptions
    : [];

  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();

  let windows;
  if (availabilityRules.length > 0) {
    const rule = availabilityRules.find((r) => r.dayOfWeek === dayOfWeek);
    if (!rule) {
      windows = []; // provider doesn't work this day at all
    } else {
      windows = [
        { start: timeToMinutes(rule.startTime), end: timeToMinutes(rule.endTime) },
      ];
      if (rule.breakStart && rule.breakEnd) {
        windows = subtractInterval(windows, {
          start: timeToMinutes(rule.breakStart),
          end: timeToMinutes(rule.breakEnd),
        });
      }
    }
  } else {
    // No schedule configured yet — fall back to the old permissive default
    // so a provider who never touched ProviderSchedulePage stays bookable.
    windows = [{ ...DEFAULT_AVAILABILITY_WINDOW }];
  }

  for (const exception of availabilityExceptions) {
    if (exception.date !== date) continue;
    const exInterval = {
      start: timeToMinutes(exception.startTime),
      end: timeToMinutes(exception.endTime),
    };
    windows =
      exception.type === "BLOCK"
        ? subtractInterval(windows, exInterval)
        : [...windows, exInterval];
  }

  const bookingsSnap = await db
    .collection("bookings")
    .where("providerId", "==", providerId)
    .get();

  for (const bookingDoc of bookingsSnap.docs) {
    const booking = bookingDoc.data();
    if (!BLOCKING_BOOKING_STATUSES.has(booking.status)) continue;
    const startAt = booking.startAt?.toDate ? booking.startAt.toDate() : null;
    const endAt = booking.endAt?.toDate ? booking.endAt.toDate() : null;
    if (!startAt || !endAt) continue;
    if (riyadhDateKey(startAt) !== date) continue;

    windows = subtractInterval(windows, {
      start: riyadhTimeMinutes(startAt),
      end: riyadhTimeMinutes(endAt),
    });
  }

  const now = new Date();
  const isToday = riyadhDateKey(now) === date;
  const nowMinutes = isToday ? riyadhTimeMinutes(now) : -1;

  const slots = [];
  for (const w of windows) {
    for (let start = w.start; start + minutesNeeded <= w.end; start += SLOT_INTERVAL_MIN) {
      if (isToday && start <= nowMinutes) continue;
      slots.push(minutesToTime(start));
    }
  }
  slots.sort();

  return { slots };
});

// Recompute a provider's rating from real review documents whenever a review
// is created, edited, or deleted. Runs with Admin SDK privileges so it's the
// only path allowed to write providers/{id}.ratingAvg|ratingCount — clients
// (including the provider themselves) are blocked from writing those fields
// directly in firestore.rules, closing off fake/self-inflated ratings.
exports.onReviewWritten = onDocumentWritten(
  "reviews/{reviewId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const providerId = after?.providerId || before?.providerId;
    if (!providerId) return;

    const snapshot = await db
      .collection("reviews")
      .where("providerId", "==", providerId)
      .get();

    // Admin-hidden reviews don't count toward the rating, same as they're
    // excluded from public/provider display (see getReviews in firestore.ts).
    const ratings = snapshot.docs
      .filter((doc) => !doc.data().hidden)
      .map((doc) => Number(doc.data().rating))
      .filter((r) => Number.isFinite(r));

    const ratingCount = ratings.length;
    const ratingAvg = ratingCount
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratingCount) * 10) / 10
      : 0;

    const updates = {
      ratingAvg,
      ratingCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // "Trusted Provider" blue-checkmark badge — granted automatically once
    // and never revoked, after 50+ reviews rated above 3 stars. Replaces the
    // old client-side "10 completed bookings" rule.
    const positiveReviewCount = ratings.filter((r) => r > 3).length;
    if (positiveReviewCount >= 50) {
      const providerRef = db.collection("providers").doc(providerId);
      const providerSnap = await providerRef.get();
      if (providerSnap.exists && !providerSnap.data().isVerified) {
        updates.isVerified = true;
        updates.verifiedAt = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    await db.collection("providers").doc(providerId).update(updates);
  },
);

// =====================
// Subscriptions
// =====================

// Expire lapsed subscriptions and take the provider's ads down with them.
// The client does this too when the provider opens the app, but a provider who
// never logs in again must not keep live ads, so this runs server-side daily.
// Services hidden here are flagged so a renewal can restore exactly these.
exports.expireLapsedSubscriptions = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "Asia/Riyadh",
    secrets: [resendApiKeyParam, emailFromParam],
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    // Only a range filter on one field, so no composite index is needed. The
    // status is checked in code — it was written as "ACTIVE" by the admin flow
    // but "active" by an older build of the checkout, so both must be swept.
    const snapshot = await db
      .collection("providers")
      .where("subscriptionEndDate", "<=", now)
      .get();

    const lapsed = snapshot.docs.filter((providerDoc) => {
      const status = String(
        providerDoc.data().subscriptionStatus || "",
      ).toUpperCase();
      return status === "ACTIVE" || status === "TRIAL";
    });

    if (lapsed.length === 0) {
      console.log("No lapsed subscriptions.");
      return;
    }

    for (const providerDoc of lapsed) {
      const providerId = providerDoc.id;
      const wasTrial =
        String(providerDoc.data().subscriptionStatus).toUpperCase() === "TRIAL";

      try {
        await providerDoc.ref.update({
          subscriptionStatus: "EXPIRED",
          isSubscribed: false,
          wasOnTrial: wasTrial,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const services = await db
          .collection("services")
          .where("providerId", "==", providerId)
          .where("isActive", "==", true)
          .get();

        if (!services.empty) {
          const batch = db.batch();
          services.docs.forEach((serviceDoc) => {
            batch.update(serviceDoc.ref, {
              isActive: false,
              deactivatedBySubscription: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }

        console.log(
          `Expired ${providerId}: hid ${services.size} service(s), wasTrial=${wasTrial}`,
        );

        const providerUser = await getUserById(providerId);
        if (providerUser?.email) {
          await sendEmail({
            to: providerUser.email,
            subject: "Your subscription has ended",
            text: "Your subscription has ended and your services are now hidden from clients. Renew to restore them.",
            html: `
              <p>Your subscription has ended.</p>
              <p>Your services are now hidden from clients and you cannot add new ones.</p>
              <p><strong>Renew your subscription and your services will be restored automatically.</strong></p>
              <p><a href="https://www.link-22.com/provider/subscription">Renew now</a></p>
            `,
          });
        }
      } catch (error) {
        console.error(`Failed to expire provider ${providerId}:`, error);
      }
    }
  },
);

// Verifies a Moyasar subscription payment directly with Moyasar (secret key,
// server-side) and activates the provider's subscription via the Admin SDK.
// The browser used to write subscriptionStatus/accountStatus/isSubscribed
// directly to its own providers/{uid} doc after a client-side verification
// call — firestore.rules now blocks that self-write (same class of issue as
// the payments.status fix), so this callable is the only path left that can
// set those fields for a non-admin caller. Idempotent: de-dupes on the
// Moyasar payment id stored in lastPaymentOrderId.
exports.activateSubscription = onCall(
  { secrets: [moyasarSecretKeyParam] },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const { paymentId, planId, planName, planMonths, price } =
      request.data || {};

    const monthsNum = Number(planMonths);
    const priceNum = Number(price);
    if (
      !paymentId ||
      typeof paymentId !== "string" ||
      !Number.isFinite(monthsNum) ||
      monthsNum <= 0 ||
      !Number.isFinite(priceNum) ||
      priceNum <= 0
    ) {
      throw new HttpsError("invalid-argument", "Missing or invalid subscription data.");
    }

    const providerRef = db.collection("providers").doc(callerUid);
    const userRef = db.collection("users").doc(callerUid);

    const providerSnap = await providerRef.get();
    const providerData = providerSnap.exists ? providerSnap.data() : {};

    // De-dupe: this exact payment already activated the subscription.
    if (providerData.lastPaymentOrderId === paymentId) {
      const existingEnd =
        providerData.subscriptionEndDate?.toDate?.() ?? new Date();
      return { deduped: true, endDate: existingEnd.toISOString() };
    }

    // Verify the payment with Moyasar directly. Never trust the caller.
    const secretKey = moyasarSecretKeyParam.value();
    if (!secretKey) {
      throw new HttpsError(
        "failed-precondition",
        "Payment verification not configured.",
      );
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
    const response = await fetch(
      `https://api.moyasar.com/v1/payments/${paymentId}`,
      { headers: { Authorization: authHeader } },
    );
    const payment = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new HttpsError(
        "failed-precondition",
        payment.message || "Could not verify payment.",
      );
    }

    const okStatus = ["paid", "captured"].includes(payment.status);
    if (!okStatus) {
      throw new HttpsError(
        "failed-precondition",
        `Payment not completed (status: ${payment.status}).`,
      );
    }

    const expectedHalalas = Math.round(priceNum * 100);
    if (payment.amount !== expectedHalalas || payment.currency !== "SAR") {
      throw new HttpsError(
        "failed-precondition",
        "Payment amount does not match the selected plan.",
      );
    }

    // Extend from the later of now / current end so early renewals add time
    // instead of resetting it.
    const nowDate = new Date();
    const currentEnd = providerData.subscriptionEndDate?.toDate?.() ?? null;
    const base = currentEnd && currentEnd > nowDate ? currentEnd : nowDate;
    const endDate = new Date(base);
    endDate.setMonth(endDate.getMonth() + monthsNum);

    const subscriptionData = {
      subscriptionStatus: "ACTIVE",
      subscriptionStartDate: admin.firestore.Timestamp.fromDate(nowDate),
      subscriptionEndDate: admin.firestore.Timestamp.fromDate(endDate),
      subscriptionPlanId: planId || null,
      subscriptionPlanMonths: monthsNum,
      lastPaymentDate: admin.firestore.Timestamp.fromDate(nowDate),
      lastPaymentAmount: priceNum,
      lastPaymentGateway: "MOYASAR",
      lastPaymentOrderId: paymentId,
      lastPaymentAuthorizationId: paymentId,
      accountStatus: "ACTIVE",
      isSubscribed: true,
      wasOnTrial: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const writeBatch = db.batch();
    writeBatch.set(providerRef, subscriptionData, { merge: true });
    writeBatch.set(userRef, subscriptionData, { merge: true });
    await writeBatch.commit();

    // Restore the ads that were auto-hidden when the subscription lapsed.
    const lapsedServices = await db
      .collection("services")
      .where("providerId", "==", callerUid)
      .where("deactivatedBySubscription", "==", true)
      .get();
    if (!lapsedServices.empty) {
      const restoreBatch = db.batch();
      lapsedServices.docs.forEach((serviceDoc) => {
        restoreBatch.update(serviceDoc.ref, {
          isActive: true,
          deactivatedBySubscription: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await restoreBatch.commit();
    }

    console.log(`Activated subscription for provider ${callerUid}, planName=${planName || "n/a"}`);

    return { deduped: false, endDate: endDate.toISOString() };
  },
);

// Lazily expires the caller's own lapsed trial/subscription (mirrors the
// nightly expireLapsedSubscriptions sweep, but runs on-access so a provider
// sees the correct state immediately instead of waiting for the next 03:00
// run). Writing subscriptionStatus/isSubscribed used to happen client-side
// via updateDoc — moved server-side alongside activateSubscription so the
// providers/users self-write block in firestore.rules doesn't also break
// this legitimate "expire myself" path.
exports.expireMySubscription = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const providerRef = db.collection("providers").doc(callerUid);
  const providerSnap = await providerRef.get();
  if (!providerSnap.exists) {
    return { expired: false, wasTrial: false };
  }
  const profile = providerSnap.data();

  const status = String(profile.subscriptionStatus || "").toUpperCase();
  if (status !== "TRIAL" && status !== "ACTIVE") {
    return { expired: false, wasTrial: false };
  }

  const endDate = profile.subscriptionEndDate?.toDate?.();
  if (!endDate || endDate > new Date()) {
    return { expired: false, wasTrial: false };
  }

  const wasTrial = status === "TRIAL";
  await providerRef.update({
    subscriptionStatus: "EXPIRED",
    isSubscribed: false,
    wasOnTrial: wasTrial,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const services = await db
    .collection("services")
    .where("providerId", "==", callerUid)
    .where("isActive", "==", true)
    .get();
  if (!services.empty) {
    const batch = db.batch();
    services.docs.forEach((serviceDoc) => {
      batch.update(serviceDoc.ref, {
        isActive: false,
        deactivatedBySubscription: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return { expired: true, wasTrial };
});

// Grants the free trial (if configured) on a freshly created provider doc.
// createProviderProfile (client) creates the base providers/{uid} doc with no
// subscription fields — firestore.rules blocks a self-create from including
// them, so a signup can't hand itself an active subscription by racing the
// write. This callable does that one-time trial grant server-side instead.
// A no-op if the provider already has a subscriptionStatus (never re-grants).
exports.grantSignupTrial = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const providerRef = db.collection("providers").doc(callerUid);
  const providerSnap = await providerRef.get();
  if (!providerSnap.exists) {
    throw new HttpsError("failed-precondition", "Provider profile not found.");
  }
  if (providerSnap.data().subscriptionStatus) {
    return { granted: false };
  }

  const settingsSnap = await db.collection("settings").doc("subscription").get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const trialDays = Number(settings.trialDays) || 0;
  const monthlyPrice = Number(settings.monthlyPrice) || 10;

  const now = new Date();
  let subscriptionStatus = "EXPIRED";
  let subscriptionStartDate = null;
  let subscriptionEndDate = null;
  if (trialDays > 0) {
    subscriptionStatus = "TRIAL";
    subscriptionStartDate = admin.firestore.Timestamp.fromDate(now);
    const end = new Date(now);
    end.setDate(end.getDate() + trialDays);
    subscriptionEndDate = admin.firestore.Timestamp.fromDate(end);
  }

  await providerRef.update({
    isSubscribed: trialDays > 0,
    subscriptionStatus,
    subscriptionStartDate,
    subscriptionEndDate,
    subscriptionPrice: monthlyPrice,
    autoRenew: false,
    cancellationDate: null,
    accountStatus: "ACTIVE",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { granted: true, subscriptionStatus };
});

// =====================
// PayPal Payment Functions
// =====================

const PAYPAL_API_BASE = "https://api-m.paypal.com"; // Live API

// In-memory cache for order metadata (serverless safe for short-lived)
const orderMetaCache = new Map();

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FX rate failed: ${response.status} ${error}`);
  }
  return response.json();
};

const getSarToUsdRate = async () => {
  try {
    const data = await fetchJson("https://open.er-api.com/v6/latest/SAR");
    const rate = data?.rates?.USD;
    if (rate) return Number(rate);
  } catch (error) {
    console.warn("ER-API FX failed:", error.message);
  }

  try {
    const data = await fetchJson(
      "https://api.exchangerate.host/latest?base=SAR&symbols=USD",
    );
    const rate = data?.rates?.USD;
    if (rate) return Number(rate);
  } catch (error) {
    console.warn("ExchangeRate.host FX failed:", error.message);
  }

  const fallbackRate = 0.27;
  console.warn("FX rate missing USD. Falling back to", fallbackRate);
  return fallbackRate;
};

const getPayPalAccessToken = async () => {
  const clientId = paypalClientIdParam.value();
  const secret = paypalSecretParam.value();
  if (!clientId || !secret) {
    throw new Error("Missing PayPal credentials");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
};

// CORS handler for all PayPal endpoints
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// PayPal Create Order
exports.paypalCreateOrder = onRequest(
  {
    cors: true,
    secrets: [paypalClientIdParam, paypalSecretParam],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.set(corsHeaders).status(204).send("");
    }

    try {
      const { amountSar } = req.body;
      if (!amountSar) {
        return res.status(400).json({ error: "Missing amountSar" });
      }

      const fxRate = await getSarToUsdRate();
      const amountUsd = Number(amountSar) * fxRate;

      if (!Number.isFinite(amountUsd)) {
        return res.status(400).json({ error: "Invalid SAR amount" });
      }

      const accessToken = await getPayPalAccessToken();
      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "AUTHORIZE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: Number(amountUsd).toFixed(2),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("PayPal create order error:", response.status, error);
        return res.status(500).json({ error });
      }

      const data = await response.json();
      
      // Store in Firestore for serverless persistence
      await db.collection("paypal_orders").doc(data.id).set({
        amountUsd: Number(amountUsd.toFixed(2)),
        fxRate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return res.json({
        orderId: data.id,
        amountUsd: Number(amountUsd.toFixed(2)),
        fxRate,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to create order" });
    }
  },
);

// PayPal Get Order Meta
exports.paypalOrderMeta = onRequest(
  {
    cors: true,
    secrets: [paypalClientIdParam, paypalSecretParam],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.set(corsHeaders).status(204).send("");
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    // Get from Firestore
    const doc = await db.collection("paypal_orders").doc(orderId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Order meta not found" });
    }

    const meta = doc.data();
    return res.json({ amountUsd: meta.amountUsd, fxRate: meta.fxRate });
  },
);

// PayPal Capture Authorization
exports.paypalCaptureAuthorization = onRequest(
  {
    cors: true,
    secrets: [paypalClientIdParam, paypalSecretParam],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.set(corsHeaders).status(204).send("");
    }

    try {
      const { authorizationId } = req.body;
      if (!authorizationId) {
        return res.status(400).json({ error: "Missing authorizationId" });
      }

      const accessToken = await getPayPalAccessToken();
      const response = await fetch(
        `${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("PayPal capture error:", response.status, error);
        return res.status(500).json({ error });
      }

      const data = await response.json();
      return res.json({ captureId: data.id, status: data.status });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to capture authorization" });
    }
  },
);

// PayPal Void Authorization
exports.paypalVoidAuthorization = onRequest(
  {
    cors: true,
    secrets: [paypalClientIdParam, paypalSecretParam],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.set(corsHeaders).status(204).send("");
    }

    try {
      const { authorizationId } = req.body;
      if (!authorizationId) {
        return res.status(400).json({ error: "Missing authorizationId" });
      }

      const accessToken = await getPayPalAccessToken();
      const response = await fetch(
        `${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/void`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("PayPal void error:", response.status, error);
        return res.status(500).json({ error });
      }

      return res.json({ status: "VOIDED" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to void authorization" });
    }
  },
);

// =====================
// Admin account deletion
// =====================

// Permanently deletes a user: their Firebase Auth account plus their
// users/{uid} and providers/{uid} Firestore docs. Only an ADMIN may call
// this — Firestore rules can't do this themselves since deleting an Auth
// account requires the Admin SDK. Irreversible.
exports.adminDeleteUser = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const callerSnap = await db.collection("users").doc(callerUid).get();
  const callerRole = callerSnap.exists
    ? callerSnap.data().activeRole || callerSnap.data().role
    : null;
  if (callerRole !== "ADMIN") {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const targetUid = request.data?.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "Missing uid.");
  }
  if (targetUid === callerUid) {
    throw new HttpsError(
      "failed-precondition",
      "Admins cannot delete their own account this way.",
    );
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    // Auth user may already be gone (e.g. retried call) — proceed to clean
    // up Firestore either way.
    if (error.code !== "auth/user-not-found") {
      console.error(`Failed to delete auth user ${targetUid}:`, error);
      throw new HttpsError("internal", "Failed to delete authentication account.");
    }
  }

  const batch = db.batch();
  batch.delete(db.collection("users").doc(targetUid));
  batch.delete(db.collection("providers").doc(targetUid));
  await batch.commit();

  return { success: true };
});
