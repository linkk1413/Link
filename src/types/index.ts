// User roles in the app
export type UserRole = "CLIENT" | "PROVIDER" | "ADMIN";

// User status. ACTIVE: full access. SUSPENDED: admin-initiated block (e.g.
// for a complaint), can be lifted any time. INACTIVE: account not currently
// in use (self- or admin-deactivated); same login block as SUSPENDED, kept
// as a distinct value for reporting/semantics. Both non-ACTIVE states block
// sign-in (see AuthContext.login) while preserving all of the user's data.
export type UserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

// Booking status
export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_BY_CLIENT"
  | "CANCELLED_BY_PROVIDER"
  | "NO_SHOW"
  | "REFUNDED"
  | "DISPUTED";

// Payment status
export type PaymentStatus =
  | "CREATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "VOIDED"
  | "REFUNDED"
  | "FAILED";

// Payment type
export type PayType = "DEPOSIT" | "FULL";

// Payment gateway
export type PaymentGateway = "PAYPAL" | "STRIPE" | "MOYASAR";

// Payout status
export type PayoutStatus = "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";

// Location type for services
export type LocationType = "AT_PROVIDER" | "AT_CLIENT" | "BOTH";

// Availability exception type
export type AvailabilityExceptionType = "BLOCK" | "EXTRA";

// Chat message type
export type MessageType = "TEXT" | "IMAGE";

// Report target type
export type ReportTargetType =
  | "USER"
  | "PROVIDER"
  | "SERVICE"
  | "BOOKING"
  | "MESSAGE"
  | "REVIEW";

// Report status. NEW/UNDER_REVIEW/AWAITING_*/RESOLVED/REJECTED/CLOSED are the
// current set; PENDING/REVIEWED/DISMISSED are kept so reports created before
// this status overhaul still type-check and display correctly — new reports
// never get written with the legacy values.
export type ReportStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "AWAITING_CLIENT_REPLY"
  | "AWAITING_PROVIDER_REPLY"
  | "RESOLVED"
  | "REJECTED"
  | "CLOSED"
  | "PENDING"
  | "REVIEWED"
  | "DISMISSED";

// Report reason — real violations that need admin action. Service-quality
// complaints (no-show, late, payment issues, refunds) belong in reviews, not
// reports.
export type ReportReason =
  | "abusive_language"
  | "spam"
  | "fraud_attempt"
  | "impersonation"
  | "inappropriate_content"
  | "terms_violation"
  | "harassment"
  | "threat_blackmail"
  | "suspicious_account"
  | "other";

export interface ReportAttachment {
  url: string;
  name: string;
}

// User interface
export interface User {
  uid: string;
  roles: UserRole[]; // Array of roles user has access to
  activeRole: UserRole | null; // Currently active role for UI
  // Legacy field for backward compatibility - will be migrated to roles array
  role?: UserRole | null;
  status: UserStatus;
  name: string;
  displayName?: string;
  photoURL?: string;
  email: string;
  phone?: string;
  region?: string;
  city?: string;
  district?: string;
  notificationsEnabled?: boolean;
  createdAt: Date;
  // Written by AuthContext on successful sign-in.
  lastLoginAt?: Date;
  lastLoginDevice?: string;
}

// One entry in users/{uid}/loginHistory — a lightweight sign-in audit trail
// for the account owner (see AdminAccountPage's security section). Written
// client-side by the account holder themselves at login time.
export interface LoginHistoryEntry {
  id: string;
  device?: string;
  createdAt: Date;
}

// Provider profile
// Which contact methods a provider allows clients to reach them through, in
// addition to (or instead of) in-app chat. Absent on providers who never
// touched this setting — treat as chat-only (today's behavior) in that case.
export interface CommunicationPrefs {
  inAppChat: boolean;
  whatsapp: boolean;
  phoneCall: boolean;
}

export interface ProviderProfile {
  uid: string;
  displayName?: string;
  bio: string;
  region?: string;
  city: string;
  area: string;
  phone?: string;
  communicationPrefs?: CommunicationPrefs;
  latitude?: number;
  longitude?: number;
  isVerified: boolean; // "Trusted Provider" badge - earned after 10 completed bookings
  identityVerified?: boolean; // Account/identity verification - required to add services
  ratingAvg: number;
  ratingCount: number;
  radiusKm?: number;
  travelFeeBase?: number;
  updatedAt: Date;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIBAN?: string;
  // Subscription fields
  isSubscribed: boolean;
  subscriptionStatus: "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED";
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionPrice?: number;
  autoRenew?: boolean;
  cancellationDate?: Date;
  wasOnTrial?: boolean; // Marks if subscription expired from a trial
  accountStatus: "ACTIVE" | "LOCKED" | "SUSPENDED";
  // Payment verification fields
  lastPaymentDate?: Date;
  paymentVerificationStatus?: "PENDING" | "VERIFIED" | "FAILED";
  paymentNotes?: string;
  // Subscription payment tracking (for profit calculation)
  lastSubscriptionPaymentDate?: Date;
  lastSubscriptionPaymentAmount?: number;
  lastSubscriptionPaymentMethod?: "BANK_TRANSFER" | "CARD" | "OTHER";
  // Weekly working hours + one-off overrides, set on ProviderSchedulePage.
  availabilityRules?: AvailabilityRule[];
  availabilityExceptions?: AvailabilityException[];
}

// Category
export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  isActive: boolean;
  icon?: string;
  imageUrl?: string;
}

// Service
export interface Service {
  id: string;
  providerId: string;
  categoryId: string;
  categoryName?: string;
  title: string;
  description: string;
  price: number;
  durationMin: number; // derived from durationText; used to compute booking endAt
  durationText?: string; // what the provider typed, e.g. "ساعتين"
  locationType: LocationType;
  isActive: boolean;
  // Set when the service was hidden automatically because the provider's
  // subscription lapsed, so it can be restored on renewal.
  deactivatedBySubscription?: boolean;
  mediaUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Availability rule (weekly schedule)
export interface AvailabilityRule {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  breakStart?: string; // "HH:mm"
  breakEnd?: string; // "HH:mm"
}

// Availability exception (specific date overrides)
export interface AvailabilityException {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  type: AvailabilityExceptionType;
}

// Booking
export interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  bookingDate: string; // "YYYY-MM-DD"
  status: BookingStatus;
  priceTotal: number;
  depositAmount: number;
  expiresAt?: Date;
  notes?: string;
  addressText?: string;
  lat?: number;
  lng?: number;
  locationType?: "AT_PROVIDER" | "AT_CLIENT";
  clientName?: string; // For display purposes
  serviceName?: string; // For display purposes
  createdAt: Date;
  updatedAt: Date;
}

// One entry in a booking's status timeline (bookings/{id}/timeline) — lets
// the client/provider see exactly what happened and when: created, each
// status change (who did it), including the automatic 24h expiry.
export interface BookingTimelineEntry {
  id: string;
  type: "CREATED" | "STATUS_CHANGE";
  actorRole?: "CLIENT" | "PROVIDER" | "ADMIN" | "SYSTEM";
  fromStatus?: BookingStatus;
  toStatus?: BookingStatus;
  createdAt: Date;
}

// Payment
export interface Payment {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  payType: PayType;
  status: PaymentStatus;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  amountSar?: number;
  amountUsd?: number;
  fxRate?: number;
  orderId: string;
  authorizationId?: string;
  captureId?: string;
  reference?: string;
  platformFee: number;
  gatewayFee: number;
  providerAmount: number;
  createdAt: Date;
}

// Provider wallet
export interface ProviderWallet {
  uid: string;
  balance: number;
  pendingBalance: number;
  updatedAt: Date;
}

// Payout request
export interface Payout {
  id: string;
  providerId: string;
  amount: number;
  status: PayoutStatus;
  createdAt: Date;
}

// Chat
export interface Chat {
  id: string;
  clientId: string;
  providerId: string;
  clientName?: string;
  providerName?: string;
  bookingId?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageSenderId?: string;
  clientLastReadAt?: Date;
  providerLastReadAt?: Date;
  unreadCount: number;
  createdAt: Date;
}

// Chat message
export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  imageUrl?: string;
  createdAt: Date;
  readAt?: Date;
  // Set at send time when the text looks like a phone number / WhatsApp /
  // social handle — flagged for admin review, sending is never blocked.
  flaggedContactInfo?: boolean;
  flaggedMatch?: string;
}

// Review
export interface Review {
  id: string;
  bookingId?: string; // Optional - reviews can be left without a booking
  clientId: string;
  clientName?: string; // For display purposes
  providerId: string;
  serviceId?: string;
  serviceName?: string; // For display purposes
  rating: number; // 1-5
  comment?: string;
  providerReply?: string; // Reply from the provider (one reply only)
  providerReplyAt?: Date; // When the provider replied
  createdAt: Date;
  updatedAt?: Date;
  // Soft-hide by an admin — excluded from public display and from the
  // provider's ratingAvg/ratingCount, but kept for potential restore.
  hidden?: boolean;
}

// Report
export interface Report {
  id: string;
  reportNumber?: number; // sequential, assigned via a counter transaction — absent on reports predating this
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason | string;
  description?: string;
  status: ReportStatus;
  // Context fields for admin display
  targetOwnerId?: string; // e.g. provider who owns the review, or user being reported
  targetOwnerName?: string;
  targetOwnerEmail?: string;
  targetOwnerPhone?: string;
  targetContent?: string; // snapshot of the reported content (review text, message, etc.)
  images?: ReportAttachment[];
  chatId?: string; // conversation this report originated from, if any
  serviceId?: string; // service this report relates to, if any
  bookingId?: string; // order this report relates to, if any
  // Deprecated: superseded by the reports/{id}/internalNotes subcollection,
  // which — unlike this field — isn't readable by the reporter. Kept
  // optional so reports written before the change still type-check.
  adminNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Internal note on a report — admin-only, stored in a subcollection so
// firestore.rules can keep it out of the reporter's read access entirely
// (a top-level field on the report doc would be readable by the reporter).
export interface ReportInternalNote {
  id: string;
  authorId: string;
  authorName?: string;
  note: string;
  createdAt: Date;
}

// One entry in a report's activity feed — both the visible "timeline"
// (created / status changes) and the two-way message thread between the
// admin and the person who filed the report are the same subcollection,
// just rendered differently depending on `type`. Unlike ReportInternalNote,
// this is readable by the reporter (see firestore.rules reports/{id}/activity).
export type ReportActivityType = "CREATED" | "STATUS_CHANGE" | "MESSAGE";

export interface ReportActivityEntry {
  id: string;
  type: ReportActivityType;
  actorId?: string;
  actorName?: string;
  actorRole?: "ADMIN" | "USER";
  message?: string; // MESSAGE entries
  fromStatus?: ReportStatus; // STATUS_CHANGE entries
  toStatus?: ReportStatus; // STATUS_CHANGE entries
  createdAt: Date;
}

// Blocked user
export interface BlockedUser {
  id: string;
  blockerId: string; // user who initiated the block
  blockedUserId: string; // user who is blocked
  createdAt: Date;
}

// A client's saved provider
export interface Favorite {
  id: string;
  clientId: string;
  providerId: string;
  providerName?: string; // snapshot, for display without an extra lookup
  createdAt: Date;
}

// In-app notification — always written server-side (Cloud Function
// triggers, Admin SDK), since a client has no permission to write a
// notification for someone else's uid.
export type NotificationType =
  | "NEW_BOOKING"
  | "BOOKING_STATUS"
  | "NEW_MESSAGE"
  | "COMPLAINT_REPLY";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string; // in-app route to open when tapped
  read: boolean;
  createdAt: Date;
}

// Admin action audit trail — append-only, admin-only read/write (see
// firestore.rules). Written best-effort right after the real privileged
// action succeeds; a logging failure never blocks the action itself.
export type AdminAuditAction =
  | "USER_SUSPENDED"
  | "USER_ACTIVATED"
  | "USER_STATUS_CHANGED"
  | "USER_ROLES_CHANGED"
  | "USER_DELETED"
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "REPORT_STATUS_CHANGED"
  | "REVIEW_HIDDEN"
  | "REVIEW_RESTORED"
  | "REVIEW_DELETED"
  | "COMMISSION_RATE_CHANGED";

export type AdminAuditTargetType =
  | "USER"
  | "VERIFICATION"
  | "REPORT"
  | "REVIEW"
  | "SETTINGS";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName?: string;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId?: string;
  targetLabel?: string;
  details?: string;
  createdAt: Date;
}

// Time slot for booking
export interface TimeSlot {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isAvailable: boolean;
}

// A single image slide within a promotional banner slider
export interface BannerSlide {
  id: string;
  imageUrl: string;
  linkUrl?: string; // optional link when the slide is tapped
}

// Homepage banner slider settings (for clients)
export interface BannerSettings {
  isActive: boolean;
  slides: BannerSlide[];
  updatedAt: Date;
}

// Provider banner slider settings (for providers dashboard)
export interface ProviderBannerSettings {
  isActive: boolean;
  slides: BannerSlide[];
  updatedAt: Date;
}
