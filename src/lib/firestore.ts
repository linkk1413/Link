// Firestore database helper functions
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import {
  User,
  UserRole,
  UserStatus,
  Category,
  Service,
  ProviderProfile,
  Booking,
  BookingStatus,
  BookingTimelineEntry,
  Review,
  Payment,
  BannerSettings,
  ProviderBannerSettings,
  Report,
  ReportStatus,
  ReportTargetType,
  ReportInternalNote,
  ReportActivityEntry,
  BookingTimelineEntry,
  BlockedUser,
  Favorite,
  AppNotification,
  AdminAuditAction,
  AdminAuditTargetType,
  AuditLogEntry,
  LoginHistoryEntry,
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
  VERIFICATIONS: "verifications",
  FAVORITES: "favorites",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "auditLogs",
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

// Stamp the user's last sign-in time (called from AuthContext on login).
// Non-blocking by convention at the call site — a failed write here
// shouldn't fail login.
export const updateLastLogin = async (uid: string): Promise<void> => {
  const device =
    typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await Promise.all([
    updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      lastLoginDevice: device || null,
    }),
    addDoc(collection(db, COLLECTIONS.USERS, uid, "loginHistory"), {
      device: device || null,
      createdAt: serverTimestamp(),
    }),
  ]);
};

export const getLoginHistory = async (
  uid: string,
  limitCount = 10,
): Promise<LoginHistoryEntry[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.USERS, uid, "loginHistory"),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      device: data.device || undefined,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    };
  });
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
      | "photoURL"
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

        // Try to save to Firestore (may fail if current user isn't the
        // provider). The doc create itself can't include subscription fields
        // (firestore.rules blocks that on self-create), so persist the base
        // profile only, then let grantSignupTrial (Admin SDK) set the real
        // subscription defaults/trial — same as a normal signup.
        try {
          await setDoc(providerRef, {
            uid,
            displayName: userName,
            bio: "",
            region: "",
            city: "",
            area: "",
            isVerified: false,
            identityVerified: false,
            ratingAvg: 0,
            ratingCount: 0,
            updatedAt: serverTimestamp(),
          });
          const grantTrial = httpsCallable(functions, "grantSignupTrial");
          await grantTrial({});
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

  // The initial document create can only contain non-privileged fields —
  // firestore.rules blocks a self-create that includes subscription/account
  // fields, so a signing-up provider can't hand themselves an active
  // subscription by racing this write. The free trial (if any) is granted
  // right after via the grantSignupTrial Cloud Function (Admin SDK).
  await setDoc(providerRef, {
    uid,
    ...profile,
    isVerified: false, // Trusted badge - earned after 10 completed bookings
    identityVerified: false, // Account verification - required to add services
    ratingAvg: 0,
    ratingCount: 0,
    updatedAt: serverTimestamp(),
  });

  try {
    const grantTrial = httpsCallable(functions, "grantSignupTrial");
    await grantTrial({});
  } catch (err) {
    console.warn("Failed to grant signup trial:", err);
  }
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

// ============================================
// PROVIDER IDENTITY VERIFICATION
// ============================================

export interface VerificationRequest {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  documents: { name: string; url: string }[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: Date;
  reason?: string;
}

// Provider submits (or re-submits after a rejection) their ID documents.
export const submitVerificationRequest = async (
  providerId: string,
  providerName: string,
  providerEmail: string,
  documents: { name: string; url: string }[],
): Promise<string> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS);
  const docRef = await addDoc(verificationsRef, {
    providerId,
    providerName,
    providerEmail,
    documents,
    status: "PENDING",
    submittedAt: serverTimestamp(),
  });
  return docRef.id;
};

// The provider's most recent verification request, if any. Sorted
// client-side (no orderBy) so this doesn't need a composite index.
export const getLatestVerificationForProvider = async (
  providerId: string,
): Promise<VerificationRequest | null> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS);
  const q = query(verificationsRef, where("providerId", "==", providerId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const requests = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      submittedAt: data.submittedAt?.toDate?.() || new Date(0),
    } as VerificationRequest;
  });

  requests.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  return requests[0];
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

  // Bring back the ads that were auto-hidden when the subscription lapsed.
  await reactivateProviderServices(providerId);
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
    updates.isSubscribed = false;
  }

  await updateDoc(providerRef, updates);

  // Keep the provider's ads in step with the status the admin just set.
  if (status === "ACTIVE" || status === "TRIAL") {
    await reactivateProviderServices(providerId);
  } else {
    await deactivateProviderServices(providerId);
  }
};

// Subscription status is written as "ACTIVE" by the admin flow but as "active"
// by an older version of the Moyasar checkout, so every comparison normalizes.
export const normalizeSubscriptionStatus = (
  status?: string | null,
): "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED" | null =>
  status
    ? (status.toUpperCase() as "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED")
    : null;

/**
 * Hide every service of a provider whose subscription lapsed. Flagged so a
 * renewal can restore exactly these and not the ones the provider turned off
 * herself.
 */
export const deactivateProviderServices = async (
  providerId: string,
): Promise<number> => {
  const servicesRef = collection(db, COLLECTIONS.SERVICES);
  const q = query(
    servicesRef,
    where("providerId", "==", providerId),
    where("isActive", "==", true),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  snapshot.docs.forEach((serviceDoc) => {
    batch.update(serviceDoc.ref, {
      isActive: false,
      deactivatedBySubscription: true,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return snapshot.size;
};

/** Restore the services that were auto-hidden when the subscription lapsed. */
export const reactivateProviderServices = async (
  providerId: string,
): Promise<number> => {
  const servicesRef = collection(db, COLLECTIONS.SERVICES);
  const q = query(
    servicesRef,
    where("providerId", "==", providerId),
    where("deactivatedBySubscription", "==", true),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  snapshot.docs.forEach((serviceDoc) => {
    batch.update(serviceDoc.ref, {
      isActive: true,
      deactivatedBySubscription: false,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return snapshot.size;
};

/**
 * Expire a lapsed subscription (trial or paid) on access and hide the provider's
 * services. Idempotent: once the status is EXPIRED it does nothing.
 */
export const checkAndExpireSubscription = async (
  providerId: string,
): Promise<{ expired: boolean; wasTrial: boolean }> => {
  // Delegates to the expireMySubscription Cloud Function (Admin SDK write) —
  // firestore.rules blocks a provider from writing subscriptionStatus to
  // their own doc directly, same as it blocks self-activating one.
  const expireMine = httpsCallable<
    Record<string, never>,
    { expired: boolean; wasTrial: boolean }
  >(functions, "expireMySubscription");
  const result = await expireMine({});
  return result.data;
};

// Kept for callers that only care about trials.
export const checkAndExpireTrial = async (
  providerId: string,
): Promise<boolean> => {
  const { expired, wasTrial } = await checkAndExpireSubscription(providerId);
  return expired && wasTrial;
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

  // Best-effort: the booking itself already exists even if this fails.
  try {
    await addBookingTimelineEntry(docRef.id, { type: "CREATED", actorRole: "CLIENT" });
  } catch (err) {
    console.warn("Failed to log booking creation timeline entry:", err);
  }

  return docRef.id;
};

export const updateBookingStatus = async (
  id: string,
  status: BookingStatus,
  actorRole?: "CLIENT" | "PROVIDER" | "ADMIN",
): Promise<void> => {
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, id);
  const currentSnap = await getDoc(bookingRef);
  const fromStatus = currentSnap.exists()
    ? (currentSnap.data().status as BookingStatus)
    : undefined;

  await updateDoc(bookingRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  if (fromStatus !== status) {
    try {
      await addBookingTimelineEntry(id, {
        type: "STATUS_CHANGE",
        actorRole,
        fromStatus,
        toStatus: status,
      });
    } catch (err) {
      console.warn("Failed to log booking status change timeline entry:", err);
    }
  }
};

export const addBookingTimelineEntry = async (
  bookingId: string,
  entry: Omit<BookingTimelineEntry, "id" | "createdAt">,
): Promise<string> => {
  const colRef = collection(db, COLLECTIONS.BOOKINGS, bookingId, "timeline");
  const docRef = await addDoc(colRef, stripUndefinedFields({
    ...entry,
    createdAt: serverTimestamp(),
  }));
  return docRef.id;
};

export const subscribeToBookingTimeline = (
  bookingId: string,
  callback: (entries: BookingTimelineEntry[]) => void,
): (() => void) => {
  const colRef = collection(db, COLLECTIONS.BOOKINGS, bookingId, "timeline");
  const q = query(colRef, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: timestampToDate(data.createdAt),
          } as BookingTimelineEntry;
        }),
      );
    },
    () => callback([]),
  );
};

// The "Trusted Provider" blue-checkmark badge (providers.isVerified) is now
// granted automatically server-side by the onReviewWritten Cloud Function
// once a provider reaches 50 reviews rated above 3 stars — see
// functions/index.js. firestore.rules blocks clients from writing
// isVerified/verifiedAt directly, so there is no client-side grant here.

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

// Fetch the payment record for a booking (used to capture/void on accept/reject).
// providerId must match the signed-in provider to satisfy Firestore read rules.
export const getPaymentByBooking = async (
  bookingId: string,
  providerId: string,
): Promise<(Payment & { id: string }) | null> => {
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  const q = query(
    paymentsRef,
    where("providerId", "==", providerId),
    where("bookingId", "==", bookingId),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { ...(docSnap.data() as Payment), id: docSnap.id };
};

// Fetch a payment by its gateway order/charge id — used to de-duplicate booking
// finalization across the on_completed callback and the 3-D Secure redirect.
// clientId must match the signed-in client to satisfy Firestore read rules.
export const getPaymentByOrderId = async (
  orderId: string,
  clientId: string,
): Promise<(Payment & { id: string }) | null> => {
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  const q = query(
    paymentsRef,
    where("clientId", "==", clientId),
    where("orderId", "==", orderId),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { ...(docSnap.data() as Payment), id: docSnap.id };
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
  // Public/provider-facing — a review an admin hid is invisible here, same
  // as it's excluded from ratingAvg/ratingCount (see onReviewWritten). Admin
  // moderation uses getProviderReviewsForAdmin instead, which keeps hidden
  // ones so they can be restored.
  const reviews = await getProviderReviewsForAdmin(providerId);
  return reviews.filter((review) => !review.hidden);
};

/** Every review for a provider, including admin-hidden ones (admin only). */
export const getProviderReviewsForAdmin = async (
  providerId: string,
): Promise<Review[]> => {
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

/** Every review written by a client, across all providers (admin only). */
export const getReviewsByClient = async (
  clientId: string,
): Promise<Review[]> => {
  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  const q = query(reviewsRef, where("clientId", "==", clientId));
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

  return reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

/** Admin-only: hide or restore a review without deleting it. */
export const setReviewHidden = async (
  reviewId: string,
  hidden: boolean,
): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  await updateDoc(reviewRef, { hidden, updatedAt: serverTimestamp() });
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
    providerReplyAt: data.providerReplyAt
      ? timestampToDate(data.providerReplyAt)
      : undefined,
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
    providerReplyAt: data.providerReplyAt
      ? timestampToDate(data.providerReplyAt)
      : undefined,
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
    providerReplyAt: data.providerReplyAt
      ? timestampToDate(data.providerReplyAt)
      : undefined,
  };
};

// Provider ratingAvg/ratingCount are recomputed server-side by the
// onReviewWritten Cloud Function (Admin SDK) whenever a review changes —
// firestore.rules blocks clients (including the provider) from writing those
// fields directly, so there is no client-side recompute step here anymore.

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

  // Provider rating is recomputed by the onReviewWritten Cloud Function.
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

  // Provider rating is recomputed by the onReviewWritten Cloud Function.
};

// Delete a review
export const deleteReview = async (reviewId: string): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new Error("Review not found");
  }

  await deleteDoc(reviewRef);

  // Provider rating is recomputed by the onReviewWritten Cloud Function.
};

/**
 * Remove only the provider's reply, keeping the client's review and rating
 * intact (admin moderation).
 */
export const deleteReviewReply = async (reviewId: string): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new Error("Review not found");
  }

  await updateDoc(reviewRef, {
    providerReply: deleteField(),
    providerReplyAt: deleteField(),
  });
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
  slides: [],
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
      slides: data.slides ?? [],
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
  slides: [],
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
        slides: data.slides ?? [],
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
  // Percentage of each booking's price kept as platform commission
  // (Payment.platformFee), applied when a booking payment is finalized.
  platformCommissionPercent?: number;
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
  platformCommissionPercent: 15,
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
          platformCommissionPercent:
            data.platformCommissionPercent ??
            DEFAULT_SUBSCRIPTION_SETTINGS.platformCommissionPercent,
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

// Firestore rejects any field whose value is `undefined` (throws instead of
// silently dropping it) — every optional field on Report can legitimately be
// undefined (an unfilled "additional details" box, a report with no images),
// so every write here is stripped first.
const stripUndefinedFields = <T extends Record<string, unknown>>(
  obj: T,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

const getNextReportNumber = async (): Promise<number> => {
  const counterRef = doc(db, "counters", "reports");
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const next = snap.exists() ? (Number(snap.data().count) || 0) + 1 : 1;
    transaction.set(counterRef, { count: next }, { merge: true });
    return next;
  });
};

export const createReport = async (
  data: Omit<Report, "id" | "createdAt" | "status" | "reportNumber">,
): Promise<string> => {
  const reportNumber = await getNextReportNumber();
  const colRef = collection(db, COLLECTIONS.REPORTS);
  const docRef = await addDoc(
    colRef,
    stripUndefinedFields({
      ...data,
      reportNumber,
      status: "NEW" as ReportStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  // Best-effort: the report itself already exists even if this fails, so a
  // missing first timeline entry isn't worth failing the whole submission.
  try {
    await addReportActivity(docRef.id, {
      type: "CREATED",
      actorId: data.reporterId,
      actorName: data.reporterName,
      actorRole: "USER",
    });
  } catch (err) {
    console.warn("Failed to log report creation activity:", err);
  }

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
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
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

export const getReportById = async (
  reportId: string,
): Promise<Report | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.REPORTS, reportId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    resolvedAt: data.resolvedAt ? timestampToDate(data.resolvedAt) : undefined,
  } as Report;
};

export const getReportsByReporter = async (
  reporterId: string,
): Promise<Report[]> => {
  const colRef = collection(db, COLLECTIONS.REPORTS);
  // where-only, sorted client-side — combining this filter with orderBy on a
  // different field would need a composite index that isn't declared (same
  // reasoning as getReports/getProviderReviewsForAdmin elsewhere in this file).
  const q = query(colRef, where("reporterId", "==", reporterId));
  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
      resolvedAt: data.resolvedAt ? timestampToDate(data.resolvedAt) : undefined,
    } as Report;
  });
  return reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// Statuses that represent the report being done with, as opposed to still
// active (NEW/UNDER_REVIEW/AWAITING_*). Moving to one of these stamps
// resolvedAt/resolvedBy; moving back out (reopening) clears them.
const TERMINAL_REPORT_STATUSES: ReportStatus[] = ["RESOLVED", "REJECTED", "CLOSED"];

export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  resolvedBy?: string,
  resolvedByName?: string,
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
  const currentSnap = await getDoc(docRef);
  const fromStatus = currentSnap.exists()
    ? (currentSnap.data().status as ReportStatus)
    : undefined;

  const updates: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (TERMINAL_REPORT_STATUSES.includes(status)) {
    updates.resolvedAt = serverTimestamp();
    if (resolvedBy) updates.resolvedBy = resolvedBy;
  } else {
    updates.resolvedAt = deleteField();
    updates.resolvedBy = deleteField();
  }
  await updateDoc(docRef, updates);

  if (fromStatus !== status) {
    try {
      await addReportActivity(reportId, {
        type: "STATUS_CHANGE",
        actorId: resolvedBy,
        actorName: resolvedByName,
        actorRole: "ADMIN",
        fromStatus,
        toStatus: status,
      });
    } catch (err) {
      console.warn("Failed to log report status change activity:", err);
    }
  }
};

export const getReportInternalNotes = async (
  reportId: string,
): Promise<ReportInternalNote[]> => {
  const colRef = collection(db, COLLECTIONS.REPORTS, reportId, "internalNotes");
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
    } as ReportInternalNote;
  });
};

export const addReportInternalNote = async (
  reportId: string,
  authorId: string,
  note: string,
  authorName?: string,
): Promise<string> => {
  const colRef = collection(db, COLLECTIONS.REPORTS, reportId, "internalNotes");
  const docRef = await addDoc(
    colRef,
    stripUndefinedFields({
      authorId,
      authorName,
      note,
      createdAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

// ==================== REPORT ACTIVITY (timeline + messages) ====================
// A report's activity feed doubles as its user-visible timeline (CREATED,
// STATUS_CHANGE entries) and its message thread with the admin (MESSAGE
// entries) — one chronological subcollection, rendered as either view.

export const addReportActivity = async (
  reportId: string,
  entry: Omit<ReportActivityEntry, "id" | "createdAt">,
): Promise<string> => {
  const colRef = collection(db, COLLECTIONS.REPORTS, reportId, "activity");
  const docRef = await addDoc(
    colRef,
    stripUndefinedFields({
      ...entry,
      createdAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const sendReportMessage = async (
  reportId: string,
  actorId: string,
  actorRole: "ADMIN" | "USER",
  message: string,
  actorName?: string,
): Promise<string> =>
  addReportActivity(reportId, { type: "MESSAGE", actorId, actorRole, actorName, message });

// Realtime status for the "follow your complaint moment-to-moment" detail
// page — react-query's cache alone can't do that, this pushes on every
// server-side write. Returns the unsubscribe function.
export const subscribeToReport = (
  reportId: string,
  callback: (report: Report | null) => void,
): (() => void) => {
  const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      callback({
        id: snap.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
        resolvedAt: data.resolvedAt ? timestampToDate(data.resolvedAt) : undefined,
      } as Report);
    },
    // Not this user's report (or it was deleted) — surface as "not found"
    // instead of an unhandled listener error.
    () => callback(null),
  );
};

export const subscribeToReportActivity = (
  reportId: string,
  callback: (entries: ReportActivityEntry[]) => void,
): (() => void) => {
  const colRef = collection(db, COLLECTIONS.REPORTS, reportId, "activity");
  const q = query(colRef, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: timestampToDate(data.createdAt),
          } as ReportActivityEntry;
        }),
      );
    },
    () => callback([]),
  );
};

// Permanently deletes a report and its internal notes + activity (admin
// only, per firestore.rules). Irreversible.
export const deleteReport = async (reportId: string): Promise<void> => {
  const notesRef = collection(db, COLLECTIONS.REPORTS, reportId, "internalNotes");
  const activityRef = collection(db, COLLECTIONS.REPORTS, reportId, "activity");
  const [notesSnap, activitySnap] = await Promise.all([
    getDocs(notesRef),
    getDocs(activityRef),
  ]);
  if (!notesSnap.empty || !activitySnap.empty) {
    const batch = writeBatch(db);
    notesSnap.docs.forEach((noteDoc) => batch.delete(noteDoc.ref));
    activitySnap.docs.forEach((entryDoc) => batch.delete(entryDoc.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, COLLECTIONS.REPORTS, reportId));
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

// ==================== NOTIFICATIONS ====================
// Always written server-side (see functions/index.js triggers) — the client
// only ever reads, marks read, or deletes its own.

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: AppNotification[]) => void,
): (() => void) => {
  const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  const q = query(colRef, where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: timestampToDate(data.createdAt),
        } as AppNotification;
      });
      notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(notifications);
    },
    () => callback([]),
  );
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
  await updateDoc(docRef, { read: true });
};

export const markAllNotificationsRead = async (
  notifications: AppNotification[],
): Promise<void> => {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  unread.forEach((n) => {
    batch.update(doc(db, COLLECTIONS.NOTIFICATIONS, n.id), { read: true });
  });
  await batch.commit();
};

// ==================== FAVORITES ====================

export const addFavorite = async (
  clientId: string,
  providerId: string,
  providerName?: string,
): Promise<string> => {
  const colRef = collection(db, COLLECTIONS.FAVORITES);
  const docRef = await addDoc(
    colRef,
    stripUndefinedFields({
      clientId,
      providerId,
      providerName,
      createdAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const removeFavorite = async (
  clientId: string,
  providerId: string,
): Promise<void> => {
  const colRef = collection(db, COLLECTIONS.FAVORITES);
  const q = query(
    colRef,
    where("clientId", "==", clientId),
    where("providerId", "==", providerId),
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

// where-only, sorted client-side — see getReports/getReportsByReporter for
// why this avoids a where+orderBy composite index that isn't declared.
export const getFavorites = async (clientId: string): Promise<Favorite[]> => {
  const colRef = collection(db, COLLECTIONS.FAVORITES);
  const q = query(colRef, where("clientId", "==", clientId));
  const snapshot = await getDocs(q);
  const favorites = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
    } as Favorite;
  });
  return favorites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const isProviderFavorited = async (
  clientId: string,
  providerId: string,
): Promise<boolean> => {
  const colRef = collection(db, COLLECTIONS.FAVORITES);
  const q = query(
    colRef,
    where("clientId", "==", clientId),
    where("providerId", "==", providerId),
    limit(1),
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// ==================== ADMIN ALERT COUNTERS ====================
// Cheap aggregation queries (no document reads) for the sidebar badges —
// active complaints and pending verification requests.

export const getAdminAlertCounts = async (): Promise<{
  activeComplaints: number;
  pendingVerifications: number;
}> => {
  const [complaintsSnap, verificationsSnap] = await Promise.all([
    getCountFromServer(
      query(
        collection(db, COLLECTIONS.REPORTS),
        where("status", "in", ["NEW", "PENDING"]),
      ),
    ),
    getCountFromServer(
      query(
        collection(db, COLLECTIONS.VERIFICATIONS),
        where("status", "==", "PENDING"),
      ),
    ),
  ]);

  return {
    activeComplaints: complaintsSnap.data().count,
    pendingVerifications: verificationsSnap.data().count,
  };
};

// ==================== ADMIN AUDIT LOG ====================
// Append-only trail of privileged admin actions (suspend/delete a user,
// approve/reject verifications, moderate reviews, change platform
// settings...). Written best-effort right after the real action succeeds —
// a logging failure must never block the action itself.

export const logAdminAction = async (entry: {
  actorId: string;
  actorName?: string;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId?: string;
  targetLabel?: string;
  details?: string;
}): Promise<void> => {
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
      actorId: entry.actorId,
      actorName: entry.actorName || null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId || null,
      targetLabel: entry.targetLabel || null,
      details: entry.details || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
};

export const getAuditLogs = async (
  limitCount = 200,
): Promise<AuditLogEntry[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.AUDIT_LOGS),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      actorId: data.actorId,
      actorName: data.actorName || undefined,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId || undefined,
      targetLabel: data.targetLabel || undefined,
      details: data.details || undefined,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as AuditLogEntry;
  });
};
