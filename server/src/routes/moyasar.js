const express = require("express");
const router = express.Router();

const MOYASAR_API_BASE = "https://api.moyasar.com/v1";

const getAuthHeader = () => {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing MOYASAR_SECRET_KEY");
  }
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
};

// Create a payment
router.post("/create-payment", async (req, res) => {
  try {
    const {
      amount,
      currency = "SAR",
      description,
      callbackUrl,
      metadata,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Missing amount" });
    }

    // Amount should be in halalas (1 SAR = 100 halalas)
    const amountInHalalas = Math.round(Number(amount) * 100);

    const response = await fetch(`${MOYASAR_API_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInHalalas,
        currency,
        description: description || "Booking Payment",
        callback_url: callbackUrl || process.env.MOYASAR_CALLBACK_URL,
        metadata: metadata || {},
        source: {
          type: "creditcard",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Moyasar create payment error:", data);
      return res
        .status(response.status)
        .json({ error: data.message || "Payment creation failed" });
    }

    res.json(data);
  } catch (error) {
    console.error("Moyasar create payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch payment by ID
router.get("/payment/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const response = await fetch(`${MOYASAR_API_BASE}/payments/${id}`, {
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.message || "Payment fetch failed" });
    }

    res.json(data);
  } catch (error) {
    console.error("Moyasar fetch payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler for payment status updates
router.post("/webhook", async (req, res) => {
  try {
    // Verify the shared secret token Moyasar sends in the payload (configured
    // when creating the webhook in the dashboard). Rejects spoofed calls.
    const expectedToken = process.env.MOYASAR_WEBHOOK_SECRET;
    if (expectedToken && req.body.secret_token !== expectedToken) {
      console.warn("Moyasar webhook: invalid secret_token");
      return res.status(401).json({ error: "Invalid webhook token" });
    }

    const { id, status, amount, metadata } = req.body;

    console.log("Moyasar webhook received:", { id, status, amount, metadata });

    // Handle payment status
    switch (status) {
      case "paid":
        // Payment successful - you can update your database here
        console.log("Payment successful:", id);
        break;
      case "failed":
        console.log("Payment failed:", id);
        break;
      case "refunded":
        console.log("Payment refunded:", id);
        break;
      default:
        console.log("Unknown payment status:", status);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Moyasar webhook error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Capture an authorized (manual/hold) payment — charges the held funds.
// Called when the provider ACCEPTS the booking.
router.post("/capture/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // Optional partial capture amount in SAR

    const body = amount ? { amount: Math.round(Number(amount) * 100) } : {};

    const response = await fetch(`${MOYASAR_API_BASE}/payments/${id}/capture`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Moyasar capture error:", data);
      return res
        .status(response.status)
        .json({ error: data.message || "Capture failed" });
    }

    res.json(data);
  } catch (error) {
    console.error("Moyasar capture error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Void an authorized (manual/hold) payment — releases the hold without charging.
// Called when the provider REJECTS/cancels a still-authorized booking.
router.post("/void/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const response = await fetch(`${MOYASAR_API_BASE}/payments/${id}/void`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Moyasar void error:", data);
      return res
        .status(response.status)
        .json({ error: data.message || "Void failed" });
    }

    res.json(data);
  } catch (error) {
    console.error("Moyasar void error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Refund a payment
router.post("/refund/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // Optional: partial refund amount in halalas

    const body = amount ? { amount: Math.round(Number(amount) * 100) } : {};

    const response = await fetch(`${MOYASAR_API_BASE}/payments/${id}/refund`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.message || "Refund failed" });
    }

    res.json(data);
  } catch (error) {
    console.error("Moyasar refund error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Apple Pay merchant validation
router.post("/apple-pay-session", async (req, res) => {
  try {
    const { validation_url, display_name, domain_name } = req.body;

    console.log("Apple Pay session request:", {
      validation_url,
      display_name,
      domain_name,
    });

    const response = await fetch(`${MOYASAR_API_BASE}/applepay/initiate`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        validation_url: validation_url,
        display_name: display_name || "Link",
        domain_name: domain_name || "www.link-22.com",
      }),
    });

    const data = await response.json();

    console.log("Apple Pay session response:", data);

    if (!response.ok) {
      console.error("Apple Pay session error:", data);
      return res
        .status(response.status)
        .json({ error: data.message || "Apple Pay session failed" });
    }

    res.json(data);
  } catch (error) {
    console.error("Apple Pay session error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
