// User roles in the app
export type UserRole = "CLIENT" | "PROVIDER" | "ADMIN";

// User status
export type UserStatus = "ACTIVE" | "SUSPENDED";

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

// Report status
export type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";

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
  email: string;
  phone?: string;
  region?: string;
  city?: string;
  district?: string;
  notificationsEnabled?: boolean;
  createdAt: Date;
}

// Provider profile
export interface ProviderProfile {
  uid: string;
  displayName?: string;
  bio: string;
  region?: string;
  city: string;
  area: string;
  phone?: string;
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
  accountStatus: "ACTIVE" | "LOCKED" | "SUSPENDED";
  // Payment verification fields
  lastPaymentDate?: Date;
  paymentVerificationStatus?: "PENDING" | "VERIFIED" | "FAILED";
  paymentNotes?: string;
  // Subscription payment tracking (for profit calculation)
  lastSubscriptionPaymentDate?: Date;
  lastSubscriptionPaymentAmount?: number;
  lastSubscriptionPaymentMethod?: "BANK_TRANSFER" | "CARD" | "OTHER";
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
  durationMin: number;
  locationType: LocationType;
  isActive: boolean;
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
}

// Review
export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName?: string; // For display purposes
  providerId: string;
  serviceId?: string;
  serviceName?: string; // For display purposes
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Report
export interface Report {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  // Context fields for admin display
  targetOwnerId?: string; // e.g. provider who owns the review, or user being reported
  targetOwnerName?: string;
  targetContent?: string; // snapshot of the reported content (review text, message, etc.)
  adminNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

// Blocked user
export interface BlockedUser {
  id: string;
  blockerId: string; // user who initiated the block
  blockedUserId: string; // user who is blocked
  createdAt: Date;
}

// Time slot for booking
export interface TimeSlot {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isAvailable: boolean;
}

// Homepage banner settings (for clients)
export interface BannerSettings {
  isActive: boolean;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  backgroundColor: string; // hex color
  textColor: string; // hex color
  linkUrl?: string; // optional link when banner is clicked
  updatedAt: Date;
}

// Provider banner settings (for providers dashboard)
export interface ProviderBannerSettings {
  isActive: boolean;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  backgroundColor: string; // hex color
  textColor: string; // hex color
  linkUrl?: string; // optional link when banner is clicked
  updatedAt: Date;
}
