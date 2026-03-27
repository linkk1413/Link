// Firestore database helper functions
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  User,
  UserRole,
  UserStatus,
  Category,
  Service,
  ProviderProfile,
  Booking,
  BookingStatus,
  Review,
  Payment,
  BannerSettings,
  ProviderBannerSettings,
  Report,
  ReportStatus,
  ReportTargetType,
  BlockedUser,
} from "@/types";

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  PROVIDERS: "providers",
  SERVICES: "services",
  CATEGORIES: "categories",
  BOOKINGS: "bookings",
  PAYMENTS: "payments",
  CHATS: "chats",
  MESSAGES: "messages",
  REVIEWS: "reviews",
  PAYOUTS: "payouts",
  SETTINGS: "settings",
  REPORTS: "reports",
  BLOCKED_USERS: "blockedUsers",
} as const;

// Convert Firestore timestamp to Date
export const timestampToDate = (timestamp: Timestamp | null): Date => {
  return timestamp?.toDate() || new Date();
};

// User document operations
export interface FirestoreUser {
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  roles: UserRole[]; // Array of roles user has access to
  activeRole: UserRole | null; // Currently active role
  // Legacy field for backward compatibility
  role?: UserRole | null;
  status: UserStatus;
  phone?: string;
  region?: string;
  city?: string;
  district?: string;
  notificationsEnabled?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Create a new user document in Firestore
export const createUserDocument = async (
  uid: string,
  email: string,
  name: string,
  phone?: string,
): Promise<User> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);

  const userData: Omit<FirestoreUser, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    uid,
    email,
    name,
    displayName: name,
    roles: ["CLIENT"], // New users start as CLIENT
    activeRole: "CLIENT", // Default active role
    status: "ACTIVE",
    phone: phone || "",
    region: "",
    city: "",
    district: "",
    notificationsEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, userData);

  return {
    uid,
    email,
    name,
    roles: ["CLIENT"],
    activeRole: "CLIENT",
    status: "ACTIVE",
    phone: phone || "",
    region: "",
    city: "",
    district: "",
    createdAt: new Date(),
  };
};

// Check if phone number already exists
// Check if phone number already exists (skip empty phone numbers)
export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  // Don't check for empty phone numbers
  if (!phone || phone.trim() === "") {
    return false;
  }
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where("phone", "==", phone), limit(1));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Get user document from Firestore
export const getUserDocument = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data() as FirestoreUser;

  // Handle backward compatibility: migrate old role to roles array
  let roles: UserRole[] = data.roles || [];
  let activeRole: UserRole | null = data.activeRole || null;

  // If user has old single role but no roles array, migrate
  if (roles.length === 0 && data.role) {
    roles = [data.role];
    activeRole = data.role;
    // Migrate in background (don't await to avoid blocking)
    updateDoc(userRef, {
      roles,
      activeRole,
      updatedAt: serverTimestamp(),
    }).catch(console.error);
  }

  // Ensure providers always have CLIENT role for role switching
  if (roles.includes("PROVIDER") && !roles.includes("CLIENT")) {
    roles = ["CLIENT", ...roles];
    // Update in background
    updateDoc(userRef, {
      roles,
      updatedAt: serverTimestamp(),
    }).catch(console.error);
  }

  return {
    uid: data.uid,
    email: data.email,
    name: data.name,
    roles,
    activeRole,
    status: data.status,
    phone: data.phone || "",
    region: data.region || "",
    city: data.city || "",
    district: data.district || "",
    notificationsEnabled: data.notificationsEnabled ?? true,
    createdAt: timestampToDate(data.createdAt),
  };
};

// Update user role in Firestore (legacy - kept for compatibility)
export const updateUserRole = async (
  uid: string,
  role: UserRole,
): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    role,
    activeRole: role,
    updatedAt: serverTimestamp(),
  });
};

// Switch active role (when user has multiple roles)
export const switchActiveRole = async (
  uid: string,
  role: UserRole,
): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    activeRole: role,
    role: role, // Also update legacy role field for Firestore rules compatibility
    updatedAt: serverTimestamp(),
  });
};

// Add a new role to user's roles array
export const addRoleToUser = async (
  uid: string,
  newRole: UserRole,
): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const data = userSnap.data();
  let currentRoles: UserRole[] = data.roles || [];

  // Ensure CLIENT role exists when adding PROVIDER (for role switching)
  if (newRole === "PROVIDER" && !currentRoles.includes("CLIENT")) {
    currentRoles = [...currentRoles, "CLIENT"];
  }

  // Only add if not already present
  if (!currentRoles.includes(newRole)) {
    await updateDoc(userRef, {
      roles: [...currentRoles, newRole],
      activeRole: newRole, // Switch to new role
      role: newRole, // Also update legacy role field for Firestore rules compatibility
      updatedAt: serverTimestamp(),
    });
  }
};

// Update user profile in Firestore
export const updateUserProfile = async (
  uid: string,
  updates: Partial<
    Pick<
      User,
      | "name"
      | "email"
      | "phone"
      | "region"
      | "city"
      | "district"
      | "notificationsEnabled"
    >
  >,
): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Check if user document exists
export const userDocumentExists = async (uid: string): Promise<boolean> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists();
};

// Delete user account and all related data
export const deleteUserAccount = async (uid: string): Promise<void> => {
  const batch = writeBatch(db);

  // Delete user document
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  batch.delete(userRef);

  // Delete provider profile if exists
  const providerRef = doc(db, COLLECTIONS.PROVIDERS, uid);
  const providerSnap = await getDoc(providerRef);
  if (providerSnap.exists()) {
    batch.delete(providerRef);
  }

  // Delete user's services
  const servicesQuery = query(
    collection(db, COLLECTIONS.SERVICES),
    where("providerId", "==", uid),
  );
  const servicesSnap = await getDocs(servicesQuery);
  servicesSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Note: We don't delete bookings/reviews to preserve history for other users
  // The UI should handle showing "Deleted User" for these records

  await batch.commit();
};

// ============================================
// CATEGORIES
// ============================================

// Default categories to use when Firestore is empty
// Women-focused services marketplace
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "makeup",
    nameEn: "Makeup",
    nameAr: "المكياج",
    icon: "Palette",
    isActive: true,
  },
  {
    id: "hair",
    nameEn: "Hair Styling",
    nameAr: "تصفيف الشعر",
    icon: "Scissors",
    isActive: true,
  },
  {
    id: "nails",
    nameEn: "Nails",
    nameAr: "الأظافر",
    icon: "Sparkles",
    isActive: true,
  },
  {
    id: "skincare",
    nameEn: "Skincare",
    nameAr: "العناية بالبشرة",
    icon: "Droplets",
    isActive: true,
  },
  {
    id: "spa",
    nameEn: "Spa & Relaxation",
    nameAr: "السبا والاسترخاء",
    icon: "Flower2",
    isActive: true,
  },
  {
    id: "massage",
    nameEn: "Massage",
    nameAr: "المساج",
    icon: "Hand",
    isActive: true,
  },
  {
    id: "henna",
    nameEn: "Henna",
    nameAr: "الحناء",
    icon: "Leaf",
    isActive: true,
  },
  {
    id: "waxing",
    nameEn: "Hair Removal",
    nameAr: "إزالة الشعر",
    icon: "Star",
    isActive: true,
  },
  {
    id: "lashes",
    nameEn: "Lashes & Brows",
    nameAr: "الرموش والحواجب",
    icon: "Eye",
    isActive: true,
  },
  {
    id: "aesthetics",
    nameEn: "Medical Aesthetics",
    nameAr: "التجميل الطبي",
    icon: "Syringe",
    isActive: true,
  },
  {
    id: "bridal",
    nameEn: "Bridal Services",
    nameAr: "خدمات العروس",
    icon: "Crown",
    isActive: true,
  },
  {
    id: "yoga",
    nameEn: "Yoga & Pilates",
    nameAr: "اليوغا والبيلاتس",
    icon: "Heart",
    isActive: true,
  },
  {
    id: "fitness",
    nameEn: "Women's Fitness",
    nameAr: "لياقة نسائية",
    icon: "Dumbbell",
    isActive: true,
  },
  {
    id: "nutrition",
    nameEn: "Nutrition & Diet",
    nameAr: "التغذية والحمية",
    icon: "Apple",
    isActive: true,
  },
  {
    id: "photography",
    nameEn: "Photography",
    nameAr: "التصوير",
    icon: "Camera",
    isActive: true,
  },
  {
    id: "tailoring",
    nameEn: "Tailoring & Alterations",
    nameAr: "الخياطة والتعديلات",
    icon: "Shirt",
    isActive: true,
  },
  {
    id: "personal_shopping",
    nameEn: "Personal Shopping",
    nameAr: "التسوق الشخصي",
    icon: "ShoppingBag",
    isActive: true,
  },
  {
    id: "events",
    nameEn: "Event Planning",
    nameAr: "تنظيم الفعاليات",
    icon: "PartyPopper",
    isActive: true,
  },
  {
    id: "cooking",
    nameEn: "Cooking & Catering",
    nameAr: "الطبخ والتموين",
    icon: "ChefHat",
    isActive: true,
  },
  {
    id: "childcare",
    nameEn: "Childcare",
    nameAr: "رعاية الأطفال",
    icon: "Baby",
    isActive: true,
  },
  {
    id: "tutoring",
    nameEn: "Tutoring",
    nameAr: "دروس خصوصية",
    icon: "BookOpen",
    isActive: true,
  },
  {
    id: "cleaning",
    nameEn: "Home Cleaning",
    nameAr: "تنظيف المنزل",
    icon: "Home",
    isActive: true,
  },
  {
    id: "organizing",
    nameEn: "Home Organizing",
    nameAr: "تنظيم المنزل",
    icon: "FolderOpen",
    isActive: true,
  },
];

export const seedDefaultCategories = async (): Promise<void> => {
  const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
  const snapshot = await getDocs(query(categoriesRef, limit(1)));
  if (!snapshot.empty) return;

  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach((category) => {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, category.id);
    batch.set(categoryRef, {
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      isActive: category.isActive,
      icon: category.icon || "",
      parentId: category.parentId || null,
    });
  });

  await batch.commit();
};

// Force reseed all categories (replaces existing ones but preserves imageUrl)
export const forceReseedCategories = async (): Promise<void> => {
  const batch = writeBatch(db);

  // First, get existing categories to preserve their imageUrl
  const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
  const existingSnapshot = await getDocs(categoriesRef);

  // Create a map of existing category imageUrls
  const existingImages: Record<string, string> = {};
  existingSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.imageUrl) {
      existingImages[docSnap.id] = data.imageUrl;
    }
    // Deactivate categories not in DEFAULT_CATEGORIES
    if (!DEFAULT_CATEGORIES.some((c) => c.id === docSnap.id)) {
      batch.update(docSnap.ref, { isActive: false });
    }
  });

  // Then add/update all default categories, preserving imageUrl
  DEFAULT_CATEGORIES.forEach((category) => {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, category.id);
    batch.set(
      categoryRef,
      {
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        isActive: category.isActive,
        icon: category.icon || "",
        parentId: category.parentId || null,
        // Preserve existing imageUrl if it exists
        ...(existingImages[category.id] && {
          imageUrl: existingImages[category.id],
        }),
      },
      { merge: true },
    );
  });

  await batch.commit();
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const q = query(categoriesRef, where("isActive", "==", true));
    const snapshot = await getDocs(q);

    if (snapshot.docs.length === 0) {
      console.info("No categories in Firestore, using mock data");
      return DEFAULT_CATEGORIES;
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.warn("Error fetching categories from Firestore:", error);
    return DEFAULT_CATEGORIES;
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
  const categorySnap = await getDoc(categoryRef);

  if (!categorySnap.exists()) return null;

  return { id: categorySnap.id, ...categorySnap.data() } as Category;
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const snapshot = await getDocs(categoriesRef);

    if (snapshot.docs.length === 0) {
      return DEFAULT_CATEGORIES;
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.warn("Error fetching all categories:", error);
    return DEFAULT_CATEGORIES;
  }
};

export const createCategory = async (
  category: Omit<Category, "id">,
): Promise<string> => {
  const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
  const docRef = await addDoc(categoriesRef, category);
  return docRef.id;
};

export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, "id">>,
): Promise<void> => {
  const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
  await updateDoc(categoryRef, updates);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
  await deleteDoc(categoryRef);
};

// ============================================
// PROVIDERS
// ============================================

// Default mock providers for testing when Firestore is empty
export const DEFAULT_PROVIDERS: ProviderProfile[] = [
  {
    uid: "provider-1",
    displayName: "Sara Ahmed",
    bio: "Professional makeup artist with 5+ years of experience",
    region: "Riyadh",
    city: "Riyadh",
    area: "Al Olaya",
    latitude: 24.7136,
    longitude: 46.6753,
    radiusKm: 15,
    isVerified: true, // Trusted badge (10+ completed bookings)
    identityVerified: true, // Account verified, can add services
    ratingAvg: 4.8,
    ratingCount: 124,
    updatedAt: new Date(),
    isSubscribed: true,
    subscriptionStatus: "ACTIVE",
    accountStatus: "ACTIVE",
  },
  {
    uid: "provider-2",
    displayName: "Fatima Al-Hassan",
    bio: "Certified hair stylist specializing in bridal looks",
    region: "Makkah",
    city: "Jeddah",
    area: "Al Hamra",
    latitude: 21.4858,
    longitude: 39.1925,
    radiusKm: 20,
    isVerified: true, // Trusted badge (10+ completed bookings)
    identityVerified: true, // Account verified, can add services
    ratingAvg: 4.9,
    ratingCount: 89,
    updatedAt: new Date(),
    isSubscribed: true,
    subscriptionStatus: "ACTIVE",
    accountStatus: "ACTIVE",
  },
  {
    uid: "provider-3",
    displayName: "Nora Mohammed",
    bio: "Nail artist and henna specialist",
    region: "Riyadh",
    city: "Riyadh",
    area: "Al Malqa",
    latitude: 24.8103,
    longitude: 46.6766,
    radiusKm: 10,
    isVerified: true, // Trusted badge (10+ completed bookings)
    identityVerified: true, // Account verified, can add services
    ratingAvg: 4.7,
    ratingCount: 56,
    updatedAt: new Date(),
    isSubscribed: true,
    subscriptionStatus: "ACTIVE",
    accountStatus: "ACTIVE",
  },
];

export interface FirestoreProviderProfile extends Omit<
  ProviderProfile,
  "updatedAt"
> {
  updatedAt: Timestamp;
}

export const getProviderProfile = async (
  uid: string,
): Promise<ProviderProfile | null> => {
  try {
    const providerRef = doc(db, COLLECTIONS.PROVIDERS, uid);
    const providerSnap = await getDoc(providerRef);

    if (!providerSnap.exists()) {
      // Check if the user exists and is a provider - if so, return profile
      const userDoc = await getUserDocument(uid);
      if (userDoc && userDoc.role === "PROVIDER") {
        // Create a basic provider profile for existing providers
        // Note: user doc may have 'name' or 'displayName' field
        const userName =
          userDoc.name ||
          userDoc.displayName ||
          userDoc.email?.split("@")[0] ||
          "Provider";
        const newProfile: ProviderProfile = {
          uid,
          displayName: userName,
          bio: "",
          region: "",
          city: "",
          area: "",
          isVerified: false, // Trusted badge - earned after 10 completed bookings
          identityVerified: false, // Account verification - required to add services
          ratingAvg: 0,
          ratingCount: 0,
          updatedAt: new Date(),
          isSubscribed: false,
          subscriptionStatus: "EXPIRED",
          accountStatus: "ACTIVE",
        };

        // Try to save to Firestore (may fail if current user isn't the provider)
        try {
          await setDoc(providerRef, {
            ...newProfile,
            updatedAt: serverTimestamp(),
          });
        } catch (saveError) {
          // Permission issue - return in-memory profile
        }

        // Return the profile regardless of save success
        return newProfile;
      }

      return null;
    }

    const data = providerSnap.data() as FirestoreProviderProfile;

    // If displayName is missing or empty, try to get it from user document
    let displayName = data.displayName;
    if (!displayName || displayName.trim() === "") {
      const userDoc = await getUserDocument(uid);
      // Note: user doc may have 'name' or 'displayName' field
      displayName =
        userDoc?.name ||
        userDoc?.displayName ||
        userDoc?.email?.split("@")[0] ||
        "Provider";

      // Update the provider document with the displayName for future queries
      await setDoc(providerRef, { displayName }, { merge: true });
    }

    return {
      ...data,
      displayName,
      updatedAt: timestampToDate(data.updatedAt),
    };
  } catch (error) {
    console.warn("Error fetching provider:", error);
    return null;
  }
};

// Get providers by a list of UIDs
export const getProvidersByIds = async (
  uids: string[],
): Promise<ProviderProfile[]> => {
  if (uids.length === 0) return [];

  try {
    const providers: ProviderProfile[] = [];

    // Firestore 'in' query supports max 30 items, so we batch
    const batchSize = 30;
    for (let i = 0; i < uids.length; i += batchSize) {
      const batch = uids.slice(i, i + batchSize);
      const providersRef = collection(db, COLLECTIONS.PROVIDERS);
      const q = query(providersRef, where("uid", "in", batch));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as FirestoreProviderProfile;
        providers.push({
          ...data,
          updatedAt: timestampToDate(data.updatedAt),
        });
      });
    }

    return providers;
  } catch (error) {
    console.warn("Error fetching providers by IDs:", error);
    return [];
  }
};

// Get active providers (ordered by rating)
// Note: Email verification is checked via Firebase Auth, not a Firestore field
export const getVerifiedProviders = async (
  limitCount = 20,
): Promise<ProviderProfile[]> => {
  try {
    const providersRef = collection(db, COLLECTIONS.PROVIDERS);

    // First try with accountStatus filter
    let q = query(
      providersRef,
      where("accountStatus", "==", "ACTIVE"),
      orderBy("ratingAvg", "desc"),
      limit(limitCount),
    );
    let snapshot = await getDocs(q);

    // If no results, try without the accountStatus filter (for backwards compatibility)
    if (snapshot.empty) {
      q = query(providersRef, orderBy("ratingAvg", "desc"), limit(limitCount));
      snapshot = await getDocs(q);
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreProviderProfile;
      return {
        ...data,
        updatedAt: timestampToDate(data.updatedAt),
      };
    });
  } catch (error) {
    console.warn("Error fetching providers:", error);
    return [];
  }
};

export const createProviderProfile = async (
  uid: string,
  profile: Omit<
    ProviderProfile,
    | "uid"
    | "updatedAt"
    | "ratingAvg"
    | "ratingCount"
    | "isVerified"
    | "identityVerified"
    | "isSubscribed"
    | "subscriptionStatus"
    | "accountStatus"
  >,
): Promise<void> => {
  const providerRef = doc(db, COLLECTIONS.PROVIDERS, uid);

  // Fetch subscription settings to determine trial period
  const subscriptionSettings = await getSubscriptionSettings();
  const trialDays = subscriptionSettings.trialDays || 0;

  // Calculate trial end date if trial is enabled
  let subscriptionStatus: "TRIAL" | "EXPIRED" = "EXPIRED";
  let subscriptionEndDate: Date | null = null;
  let subscriptionStartDate: Date | null = null;

  if (trialDays > 0) {
    subscriptionStatus = "TRIAL";
    subscriptionStartDate = new Date();
    subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + trialDays);
  }

  await setDoc(providerRef, {
    uid,
    ...profile,
    isVerified: false, // Trusted badge - earned after 10 completed bookings
    identityVerified: false, // Account verification - required to add services
    ratingAvg: 0,
    ratingCount: 0,
    // Subscription initialization with trial support
    isSubscribed: trialDays > 0, // Subscribed during trial
    subscriptionStatus,
    subscriptionStartDate,
    subscriptionEndDate,
    subscriptionPrice: subscriptionSettings.monthlyPrice || 10, // SAR per month
    autoRenew: false,
    cancellationDate: null,
    accountStatus: "ACTIVE",
    updatedAt: serverTimestamp(),
  });
};

export const updateProviderProfile = async (
  uid: string,
  updates: Partial<ProviderProfile>,
): Promise<void> => {
  const providerRef = doc(db, COLLECTIONS.PROVIDERS, uid);

  // Filter out undefined values as Firestore doesn't accept them
  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined),
  );

  await updateDoc(providerRef, {
    ...cleanedUpdates,
    updatedAt: serverTimestamp(),
  });
};

// Verify subscription payment (admin marks as paid)
export const verifySubscriptionPayment = async (
  providerId: string,
  paymentData?: {
    date?: Date;
    amount?: number;
    method?: "BANK_TRANSFER" | "CARD" | "OTHER";
    notes?: string;
  },
): Promise<void> => {
  const now = new Date();
  const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
  const profile = await getProviderProfile(providerId);

  if (!profile) {
    throw new Error("Provider profile not found");
  }

  // Calculate new subscription end date based on plan
  // Use payment date if provided, otherwise use current date
  const startDate = paymentData?.date || now;
  const endDate = new Date(startDate);

  // Map price to months: 10=1 month, 27=3 months, 96=12 months
  const priceToMonths: Record<number, number> = {
    10: 1,
    27: 3,
    96: 12,
  };

  const currentPrice = profile.subscriptionPrice || 10;
  const months = priceToMonths[currentPrice] || 1;
  endDate.setMonth(endDate.getMonth() + months);

  const updateData = {
    uid: providerId,
    displayName: profile.displayName || "Provider",
    subscriptionStatus: "ACTIVE",
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    lastPaymentDate: serverTimestamp(),
    paymentVerificationStatus: "VERIFIED",
    paymentNotes: paymentData?.notes || "Payment verified by admin",
    accountStatus: "ACTIVE", // Unlock account if was locked
    isSubscribed: true,
    wasOnTrial: false, // Clear trial flag when subscription is activated
    // New payment tracking fields
    lastSubscriptionPaymentDate: paymentData?.date || now,
    lastSubscriptionPaymentAmount: paymentData?.amount || currentPrice,
    lastSubscriptionPaymentMethod: paymentData?.method || "BANK_TRANSFER",
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>;

  // Use setDoc with merge to handle both existing and new documents
  await setDoc(providerRef, updateData, { merge: true });
};

// Update subscription status manually (admin action)
export const updateSubscriptionStatus = async (
  providerId: string,
  status: "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED",
  startDate?: Date,
  endDate?: Date,
  price?: number,
): Promise<void> => {
  const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
  const updates: Record<string, unknown> = {
    subscriptionStatus: status,
    updatedAt: serverTimestamp(),
  };

  if (startDate) updates.subscriptionStartDate = startDate;
  if (endDate) updates.subscriptionEndDate = endDate;
  if (price) updates.subscriptionPrice = price;

  // Clear wasOnTrial when subscription becomes active
  if (status === "ACTIVE") {
    updates.wasOnTrial = false;
    updates.isSubscribed = true;
  }

  if (status === "CANCELLED") {
    updates.cancellationDate = new Date();
  }

  await updateDoc(providerRef, updates);
};

// Check and expire trial if it has ended
export const checkAndExpireTrial = async (
  providerId: string,
): Promise<boolean> => {
  const profile = await getProviderProfile(providerId);
  if (!profile) return false;

  // Only check TRIAL status providers
  if (profile.subscriptionStatus !== "TRIAL") return false;

  // Check if trial has expired
  if (profile.subscriptionEndDate) {
    const now = new Date();
    const endDate = new Date(profile.subscriptionEndDate);

    if (now > endDate) {
      // Trial has expired, update status
      const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
      await updateDoc(providerRef, {
        subscriptionStatus: "EXPIRED",
        isSubscribed: false,
        wasOnTrial: true, // Mark that this was a trial expiration
        updatedAt: serverTimestamp(),
      });
      return true; // Trial was expired
    }
  }

  return false; // Trial still active
};

// Grant trial to an existing provider (admin action)
export const grantTrialToProvider = async (
  providerId: string,
  trialDays?: number,
): Promise<void> => {
  // Fetch subscription settings if trial days not provided
  let days = trialDays;
  if (!days) {
    const settings = await getSubscriptionSettings();
    days = settings.trialDays || 14; // Default to 14 days if not set
  }

  if (days <= 0) {
    throw new Error("Trial days must be greater than 0");
  }

  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
  await updateDoc(providerRef, {
    subscriptionStatus: "TRIAL",
    subscriptionStartDate: now,
    subscriptionEndDate: endDate,
    isSubscribed: true,
    updatedAt: serverTimestamp(),
  });
};

// Fix provider displayName by fetching from user document
export const fixProviderDisplayName = async (uid: string): Promise<string> => {
  const userDoc = await getUserDocument(uid);
  const displayName =
    userDoc?.displayName || userDoc?.email?.split("@")[0] || "Provider";

  const providerRef = doc(db, COLLECTIONS.PROVIDERS, uid);
  await setDoc(providerRef, { displayName }, { merge: true });

  return displayName;
};

// ============================================
// SERVICES
// ============================================

// Default mock services for testing
export const DEFAULT_SERVICES: Service[] = [
  {
    id: "service-1",
    providerId: "provider-1",
    categoryId: "makeup",
    title: "Bridal Makeup",
    description: "Complete bridal makeup with premium products",
    price: 400,
    durationMin: 120,
    locationType: "BOTH",
    mediaUrls: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "service-2",
    providerId: "provider-1",
    categoryId: "makeup",
    title: "Party Makeup",
    description: "Glamorous makeup for special occasions",
    price: 200,
    durationMin: 60,
    locationType: "BOTH",
    mediaUrls: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "service-3",
    providerId: "provider-2",
    categoryId: "hair",
    title: "Bridal Hair Styling",
    description: "Elegant updos and bridal hairstyles",
    price: 325,
    durationMin: 90,
    locationType: "AT_PROVIDER",
    mediaUrls: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "service-4",
    providerId: "provider-2",
    categoryId: "hair",
    title: "Haircut & Blowdry",
    description: "Professional cut and styling",
    price: 125,
    durationMin: 45,
    locationType: "AT_PROVIDER",
    mediaUrls: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "service-5",
    providerId: "provider-3",
    categoryId: "nails",
    title: "Gel Manicure",
    description: "Long-lasting gel polish manicure",
    price: 100,
    durationMin: 60,
    locationType: "BOTH",
    mediaUrls: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "service-6",
    providerId: "provider-3",
    categoryId: "henna",
    title: "Henna Design",
    description: "Traditional and modern henna art",
    price: 200,
    durationMin: 90,
    locationType: "AT_CLIENT",
    mediaUrls: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "service-cooking-1",
    providerId: "provider-1",
    categoryId: "cooking",
    title: "Home Cooking",
    description: "Delicious home-cooked meals prepared at your place.",
    price: 140,
    durationMin: 120,
    locationType: "AT_CLIENT",
    mediaUrls: ["/assets/services/cooking1.jpg"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export interface FirestoreService extends Omit<
  Service,
  "createdAt" | "updatedAt"
> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const getServices = async (filters?: {
  categoryId?: string;
  providerId?: string;
  isActive?: boolean;
}): Promise<Service[]> => {
  try {
    const servicesRef = collection(db, COLLECTIONS.SERVICES);
    let q = query(servicesRef);

    if (filters?.categoryId) {
      q = query(q, where("categoryId", "==", filters.categoryId));
    }
    if (filters?.providerId) {
      q = query(q, where("providerId", "==", filters.providerId));
    }
    if (filters?.isActive !== undefined) {
      q = query(q, where("isActive", "==", filters.isActive));
    }

    const snapshot = await getDocs(q);

    if (snapshot.docs.length === 0 && !filters) {
      console.info("No services in Firestore, using mock data");
      return DEFAULT_SERVICES;
    }

    const services = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreService;
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      };
    });

    // Filter out services from locked or expired subscription providers (don't show to clients)
    // If filtering by specific provider ID, skip this check (provider sees own services)
    if (!filters?.providerId) {
      const hiddenServiceIds = new Set<string>();

      // Fetch provider profiles to check account and subscription status
      for (const service of services) {
        try {
          const providerProfile = await getProviderProfile(service.providerId);
          if (providerProfile) {
            // Hide if account is locked
            if (providerProfile.accountStatus === "LOCKED") {
              hiddenServiceIds.add(service.id);
            }
            // Hide if subscription expired (not in trial or active subscription)
            if (
              providerProfile.subscriptionStatus === "EXPIRED" ||
              providerProfile.subscriptionStatus === "CANCELLED" ||
              !providerProfile.subscriptionStatus
            ) {
              hiddenServiceIds.add(service.id);
            }
          }
        } catch (error) {
          // Silent fail - if we can't fetch profile, include the service
        }
      }

      return services.filter((s) => !hiddenServiceIds.has(s.id));
    }

    return services;
  } catch (error) {
    console.warn("Error fetching services:", error);
    if (!filters) {
      return DEFAULT_SERVICES;
    }
    return [];
  }
};

export const getServiceById = async (id: string): Promise<Service | null> => {
  try {
    const serviceRef = doc(db, COLLECTIONS.SERVICES, id);
    const serviceSnap = await getDoc(serviceRef);

    if (!serviceSnap.exists()) {
      return null;
    }

    const data = serviceSnap.data() as FirestoreService;
    return {
      ...data,
      id: serviceSnap.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  } catch (error) {
    console.warn("Error fetching service:", error);
    return null;
  }
};

export const createService = async (
  service: Omit<Service, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const servicesRef = collection(db, COLLECTIONS.SERVICES);
  const docRef = await addDoc(servicesRef, {
    ...service,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateService = async (
  id: string,
  updates: Partial<Service>,
): Promise<void> => {
  const serviceRef = doc(db, COLLECTIONS.SERVICES, id);
  await updateDoc(serviceRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteService = async (id: string): Promise<void> => {
  const serviceRef = doc(db, COLLECTIONS.SERVICES, id);
  await deleteDoc(serviceRef);
};

// ============================================
// BOOKINGS
// ============================================

export interface FirestoreBooking extends Omit<
  Booking,
  "startAt" | "endAt" | "expiresAt" | "createdAt" | "updatedAt"
> {
  startAt: Timestamp;
  endAt: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const convertFirestoreBooking = (
  doc: QueryDocumentSnapshot<DocumentData>,
): Booking => {
  const data = doc.data() as FirestoreBooking;
  return {
    ...data,
    id: doc.id,
    startAt: timestampToDate(data.startAt),
    endAt: timestampToDate(data.endAt),
    expiresAt: data.expiresAt ? timestampToDate(data.expiresAt) : undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

export const getBookings = async (filters: {
  clientId?: string;
  providerId?: string;
  status?: BookingStatus;
}): Promise<Booking[]> => {
  try {
    const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);

    // Build query - note: composite indexes required for filter + orderBy
    // If no index exists, we'll catch the error and try without ordering
    const constraints = [];

    if (filters.clientId) {
      constraints.push(where("clientId", "==", filters.clientId));
    }
    if (filters.providerId) {
      constraints.push(where("providerId", "==", filters.providerId));
    }
    if (filters.status) {
      constraints.push(where("status", "==", filters.status));
    }

    // Try with ordering first
    try {
      const q = query(
        bookingsRef,
        ...constraints,
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertFirestoreBooking);
    } catch (indexError) {
      // If index error, try without ordering
      console.warn(
        "Composite index not available, fetching without order:",
        indexError,
      );
      const q = query(bookingsRef, ...constraints);
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(convertFirestoreBooking);
      // Sort in memory
      return bookings.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
};

export const getBookingById = async (id: string): Promise<Booking | null> => {
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, id);
  const bookingSnap = await getDoc(bookingRef);

  if (!bookingSnap.exists()) return null;

  return convertFirestoreBooking(bookingSnap);
};

export const createBooking = async (
  booking: Omit<Booking, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);

  // Convert Date objects to Firestore-compatible format
  const bookingData = {
    ...booking,
    startAt:
      booking.startAt instanceof Date
        ? booking.startAt
        : new Date(booking.startAt),
    endAt:
      booking.endAt instanceof Date ? booking.endAt : new Date(booking.endAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(bookingsRef, bookingData);
  return docRef.id;
};

export const updateBookingStatus = async (
  id: string,
  status: BookingStatus,
): Promise<void> => {
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, id);

  // Get the booking to find the providerId for badge check
  const bookingSnap = await getDoc(bookingRef);
  const bookingData = bookingSnap.data();

  await updateDoc(bookingRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  // If status changed to COMPLETED, check if provider should get Trusted badge
  if (status === "COMPLETED" && bookingData?.providerId) {
    await checkAndGrantTrustedBadge(bookingData.providerId);
  }
};

// Check if provider has 10+ completed bookings and grant Trusted Provider badge
export const checkAndGrantTrustedBadge = async (
  providerId: string,
): Promise<boolean> => {
  try {
    // First check if provider already has the badge
    const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
    const providerSnap = await getDoc(providerRef);

    if (!providerSnap.exists()) return false;

    const providerData = providerSnap.data();
    if (providerData.isVerified) {
      // Already has the badge
      return true;
    }

    // Count completed bookings
    const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
    const q = query(
      bookingsRef,
      where("providerId", "==", providerId),
      where("status", "==", "COMPLETED"),
    );
    const snapshot = await getDocs(q);
    const completedCount = snapshot.size;

    // If 10 or more completed bookings, grant the badge
    if (completedCount >= 10) {
      await updateDoc(providerRef, {
        isVerified: true,
        verifiedAt: serverTimestamp(),
      });
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

// ============================================
// PAYMENTS
// ============================================

export const createPayment = async (
  payment: Omit<Payment, "id" | "createdAt">,
): Promise<string> => {
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  const docRef = await addDoc(paymentsRef, {
    ...payment,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updatePayment = async (
  id: string,
  updates: Partial<Payment>,
): Promise<void> => {
  const paymentRef = doc(db, COLLECTIONS.PAYMENTS, id);
  await updateDoc(paymentRef, {
    ...updates,
  });
};

// ============================================
// REVIEWS
// ============================================

export interface FirestoreReview extends Omit<
  Review,
  "createdAt" | "updatedAt" | "providerReplyAt"
> {
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  providerReplyAt?: Timestamp;
}

export const getReviews = async (providerId: string): Promise<Review[]> => {
  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  // Simple query - sorting will be done client-side to avoid composite index requirement
  const q = query(reviewsRef, where("providerId", "==", providerId));
  const snapshot = await getDocs(q);

  const reviews = snapshot.docs.map((doc) => {
    const data = doc.data() as FirestoreReview;
    return {
      ...data,
      id: doc.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
      providerReplyAt: data.providerReplyAt ? timestampToDate(data.providerReplyAt) : undefined,
    };
  });

  // Sort by createdAt descending (client-side)
  return reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// Get a review by booking ID (to check if review exists)
export const getReviewByBooking = async (
  bookingId: string,
): Promise<Review | null> => {
  if (!bookingId) return null;
  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  const q = query(reviewsRef, where("bookingId", "==", bookingId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as FirestoreReview;
  return {
    ...data,
    id: doc.id,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
  };
};

// Get a review by client and provider (for open reviews without booking)
export const getReviewByClientAndProvider = async (
  clientId: string,
  providerId: string,
): Promise<Review | null> => {
  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  const q = query(
    reviewsRef,
    where("clientId", "==", clientId),
    where("providerId", "==", providerId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as FirestoreReview;
  return {
    ...data,
    id: doc.id,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
  };
};

// Get a review by ID
export const getReviewById = async (
  reviewId: string,
): Promise<Review | null> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const snapshot = await getDoc(reviewRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as FirestoreReview;
  return {
    ...data,
    id: snapshot.id,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
  };
};

// Helper function to recalculate and update provider rating
const updateProviderRating = async (providerId: string): Promise<void> => {
  // Simple query without orderBy to avoid index requirement
  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  const q = query(reviewsRef, where("providerId", "==", providerId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // No reviews, reset rating
    const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
    await updateDoc(providerRef, {
      ratingAvg: 0,
      ratingCount: 0,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  let totalRating = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    totalRating += data.rating || 0;
  });
  const ratingAvg = totalRating / snapshot.docs.length;

  const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
  await updateDoc(providerRef, {
    ratingAvg: Math.round(ratingAvg * 10) / 10, // Round to 1 decimal
    ratingCount: snapshot.docs.length,
    updatedAt: serverTimestamp(),
  });
};

// Create a new review and update provider rating
export const createReview = async (
  review: Omit<Review, "id" | "createdAt">,
): Promise<string> => {
  // Check if review already exists
  // For booking-based reviews, check by bookingId
  // For open reviews (no booking), check by client+provider
  let existingReview: Review | null = null;
  
  if (review.bookingId) {
    existingReview = await getReviewByBooking(review.bookingId);
  } else {
    // Open review - check if client already reviewed this provider
    existingReview = await getReviewByClientAndProvider(review.clientId, review.providerId);
  }
  
  if (existingReview) {
    // Review exists - return the existing ID instead of throwing
    // This handles the case where review was created but rating update failed
    try {
      await updateProviderRating(review.providerId);
    } catch (e) {
      console.error("Failed to update provider rating:", e);
    }
    return existingReview.id;
  }

  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  
  // Filter out undefined values - Firestore doesn't accept undefined
  const reviewData = Object.fromEntries(
    Object.entries(review).filter(([, value]) => value !== undefined)
  );
  
  const docRef = await addDoc(reviewsRef, {
    ...reviewData,
    createdAt: serverTimestamp(),
  });

  // Update provider's rating (don't fail the whole operation if this fails)
  try {
    await updateProviderRating(review.providerId);
  } catch (e) {
    console.error("Failed to update provider rating:", e);
  }

  return docRef.id;
};

// Update an existing review
export const updateReview = async (
  reviewId: string,
  updates: { rating?: number; comment?: string },
): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new Error("Review not found");
  }

  await updateDoc(reviewRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  // Update provider's rating if rating changed
  if (updates.rating !== undefined) {
    const reviewData = reviewSnap.data() as FirestoreReview;
    await updateProviderRating(reviewData.providerId);
  }
};

// Delete a review and update provider rating
export const deleteReview = async (reviewId: string): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new Error("Review not found");
  }

  const reviewData = reviewSnap.data() as FirestoreReview;
  const providerId = reviewData.providerId;

  await deleteDoc(reviewRef);

  // Update provider's rating after deletion
  await updateProviderRating(providerId);
};

// Add provider reply to a review (only one reply allowed)
export const replyToReview = async (
  reviewId: string,
  providerId: string,
  reply: string,
): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new Error("Review not found");
  }

  const reviewData = reviewSnap.data() as FirestoreReview;

  // Verify the provider owns this review (it's directed to them)
  if (reviewData.providerId !== providerId) {
    throw new Error("Not authorized to reply to this review");
  }

  // Check if already replied
  if (reviewData.providerReply) {
    throw new Error("Already replied to this review");
  }

  await updateDoc(reviewRef, {
    providerReply: reply.trim(),
    providerReplyAt: serverTimestamp(),
  });
};

// ============================================
// BANNER SETTINGS
// ============================================

const DEFAULT_BANNER: BannerSettings = {
  isActive: false,
  titleEn: "Welcome to Link",
  titleAr: "مرحباً بك في لينك",
  subtitleEn: "Find the best services near you",
  subtitleAr: "اعثري على أفضل الخدمات بالقرب منك",
  backgroundColor: "#f8e1e7",
  textColor: "#1a1a1a",
  linkUrl: "",
  updatedAt: new Date(),
};

export const getBannerSettings = async (): Promise<BannerSettings> => {
  try {
    const bannerRef = doc(db, COLLECTIONS.SETTINGS, "banner");
    const bannerSnap = await getDoc(bannerRef);

    if (!bannerSnap.exists()) {
      return DEFAULT_BANNER;
    }

    const data = bannerSnap.data();
    return {
      isActive: data.isActive ?? false,
      titleEn: data.titleEn ?? DEFAULT_BANNER.titleEn,
      titleAr: data.titleAr ?? DEFAULT_BANNER.titleAr,
      subtitleEn: data.subtitleEn ?? DEFAULT_BANNER.subtitleEn,
      subtitleAr: data.subtitleAr ?? DEFAULT_BANNER.subtitleAr,
      backgroundColor: data.backgroundColor ?? DEFAULT_BANNER.backgroundColor,
      textColor: data.textColor ?? DEFAULT_BANNER.textColor,
      linkUrl: data.linkUrl ?? "",
      updatedAt: timestampToDate(data.updatedAt),
    };
  } catch (error) {
    console.warn("Error fetching banner settings:", error);
    return DEFAULT_BANNER;
  }
};

export const updateBannerSettings = async (
  settings: Partial<BannerSettings>,
): Promise<void> => {
  const bannerRef = doc(db, COLLECTIONS.SETTINGS, "banner");
  await setDoc(
    bannerRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

// ============================================
// PROVIDER BANNER SETTINGS
// ============================================

const DEFAULT_PROVIDER_BANNER: ProviderBannerSettings = {
  isActive: false,
  titleEn: "Welcome Provider!",
  titleAr: "مرحباً بك أيتها المقدمة!",
  subtitleEn: "Manage your services and grow your business",
  subtitleAr: "أديري خدماتك ونمّي عملك",
  backgroundColor: "#7c3aed",
  textColor: "#ffffff",
  linkUrl: "",
  updatedAt: new Date(),
};

export const getProviderBannerSettings =
  async (): Promise<ProviderBannerSettings> => {
    try {
      const bannerRef = doc(db, COLLECTIONS.SETTINGS, "provider-banner");
      const bannerSnap = await getDoc(bannerRef);

      if (!bannerSnap.exists()) {
        return DEFAULT_PROVIDER_BANNER;
      }

      const data = bannerSnap.data();
      return {
        isActive: data.isActive ?? false,
        titleEn: data.titleEn ?? DEFAULT_PROVIDER_BANNER.titleEn,
        titleAr: data.titleAr ?? DEFAULT_PROVIDER_BANNER.titleAr,
        subtitleEn: data.subtitleEn ?? DEFAULT_PROVIDER_BANNER.subtitleEn,
        subtitleAr: data.subtitleAr ?? DEFAULT_PROVIDER_BANNER.subtitleAr,
        backgroundColor:
          data.backgroundColor ?? DEFAULT_PROVIDER_BANNER.backgroundColor,
        textColor: data.textColor ?? DEFAULT_PROVIDER_BANNER.textColor,
        linkUrl: data.linkUrl ?? "",
        updatedAt: timestampToDate(data.updatedAt),
      };
    } catch (error) {
      console.warn("Error fetching provider banner settings:", error);
      return DEFAULT_PROVIDER_BANNER;
    }
  };

export const updateProviderBannerSettings = async (
  settings: Partial<ProviderBannerSettings>,
): Promise<void> => {
  const bannerRef = doc(db, COLLECTIONS.SETTINGS, "provider-banner");
  await setDoc(
    bannerRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

// SUBSCRIPTION SETTINGS
export interface SubscriptionPlan {
  id: string;
  months: number;
  price: number;
  discountPercent: number; // 0-100
  isActive: boolean;
}

export interface SubscriptionSettings {
  monthlyPrice: number; // Base price in SAR per month
  trialDays: number; // Number of free trial days for new providers
  plans: SubscriptionPlan[];
  // Contact info settings
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  updatedAt?: Date;
}

const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = {
  monthlyPrice: 10,
  trialDays: 0,
  plans: [
    { id: "monthly", months: 1, price: 10, discountPercent: 0, isActive: true },
    {
      id: "half-yearly",
      months: 6,
      price: 50,
      discountPercent: 15,
      isActive: true,
    },
    {
      id: "yearly",
      months: 12,
      price: 96,
      discountPercent: 20,
      isActive: true,
    },
  ],
  contactEmail: "support@linkbloom.com",
  contactPhone: "+966 55 297 9710",
  contactWhatsapp: "https://wa.me/966552979710",
};

export const getSubscriptionSettings =
  async (): Promise<SubscriptionSettings> => {
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, "subscription");
      const snapshot = await getDoc(settingsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          monthlyPrice:
            data.monthlyPrice ?? DEFAULT_SUBSCRIPTION_SETTINGS.monthlyPrice,
          trialDays: data.trialDays ?? DEFAULT_SUBSCRIPTION_SETTINGS.trialDays,
          plans: data.plans ?? DEFAULT_SUBSCRIPTION_SETTINGS.plans,
          contactEmail: data.contactEmail ?? DEFAULT_SUBSCRIPTION_SETTINGS.contactEmail,
          contactPhone: data.contactPhone ?? DEFAULT_SUBSCRIPTION_SETTINGS.contactPhone,
          contactWhatsapp: data.contactWhatsapp ?? DEFAULT_SUBSCRIPTION_SETTINGS.contactWhatsapp,
          updatedAt: data.updatedAt
            ? timestampToDate(data.updatedAt)
            : undefined,
        };
      }

      return DEFAULT_SUBSCRIPTION_SETTINGS;
    } catch (error) {
      console.warn("Error fetching subscription settings:", error);
      return DEFAULT_SUBSCRIPTION_SETTINGS;
    }
  };

export const updateSubscriptionSettings = async (
  settings: Partial<SubscriptionSettings>,
): Promise<void> => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, "subscription");
  await setDoc(
    settingsRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

// ==================== REPORTS ====================

export const createReport = async (
  data: Omit<Report, "id" | "createdAt" | "status">,
): Promise<string> => {
  const colRef = collection(db, COLLECTIONS.REPORTS);
  const docRef = await addDoc(colRef, {
    ...data,
    status: "PENDING" as ReportStatus,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getReports = async (
  statusFilter?: ReportStatus,
): Promise<Report[]> => {
  const colRef = collection(db, COLLECTIONS.REPORTS);
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      resolvedAt: data.resolvedAt
        ? timestampToDate(data.resolvedAt)
        : undefined,
    } as Report;
  });
  if (statusFilter) {
    return reports.filter((r) => r.status === statusFilter);
  }
  return reports;
};

export const getReportsByReporter = async (
  reporterId: string,
): Promise<Report[]> => {
  const colRef = collection(db, COLLECTIONS.REPORTS);
  const q = query(
    colRef,
    where("reporterId", "==", reporterId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
    } as Report;
  });
};

export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  adminNotes?: string,
  resolvedBy?: string,
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
  const updates: Record<string, unknown> = { status };
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  if (status === "RESOLVED" || status === "DISMISSED") {
    updates.resolvedAt = serverTimestamp();
    if (resolvedBy) updates.resolvedBy = resolvedBy;
  }
  await updateDoc(docRef, updates);
};

// ==================== BLOCKED USERS ====================

export const blockUser = async (
  blockerId: string,
  blockedUserId: string,
): Promise<string> => {
  const colRef = collection(db, COLLECTIONS.BLOCKED_USERS);
  const docRef = await addDoc(colRef, {
    blockerId,
    blockedUserId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const unblockUser = async (
  blockerId: string,
  blockedUserId: string,
): Promise<void> => {
  const colRef = collection(db, COLLECTIONS.BLOCKED_USERS);
  const q = query(
    colRef,
    where("blockerId", "==", blockerId),
    where("blockedUserId", "==", blockedUserId),
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

export const getBlockedUsers = async (
  blockerId: string,
): Promise<BlockedUser[]> => {
  const colRef = collection(db, COLLECTIONS.BLOCKED_USERS);
  const q = query(
    colRef,
    where("blockerId", "==", blockerId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
    } as BlockedUser;
  });
};

export const isUserBlocked = async (
  blockerId: string,
  blockedUserId: string,
): Promise<boolean> => {
  const colRef = collection(db, COLLECTIONS.BLOCKED_USERS);
  const q = query(
    colRef,
    where("blockerId", "==", blockerId),
    where("blockedUserId", "==", blockedUserId),
    limit(1),
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};
