import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  createUserDocument,
  getUserDocument,
  updateUserProfile,
  updateUserRole as updateUserRoleInFirestore,
  switchActiveRole as switchActiveRoleInFirestore,
  addRoleToUser,
  userDocumentExists,
  createProviderProfile,
  deleteUserAccount,
  checkPhoneExists,
  updateLastLogin,
} from "@/lib/firestore";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    phone: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  becomeProvider: (providerData: {
    bio: string;
    region: string;
    city: string;
    area: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Get user document from Firestore
          const userDoc = await getUserDocument(fbUser.uid);

          if (userDoc) {
            // A suspended/inactive account keeps all its data but may not
            // use the app — sign it back out immediately, including on a
            // page refresh of an already-open session.
            if (userDoc.status && userDoc.status !== "ACTIVE") {
              await signOut(auth);
              setUser(null);
              setFirebaseUser(null);
              setIsLoading(false);
              return;
            }
            // verifyBeforeUpdateEmail (the admin email-change flow) only
            // updates the Firebase Auth email once the user clicks the link
            // sent to their new inbox — sync our denormalized Firestore copy
            // once that's happened.
            if (fbUser.email && userDoc.email !== fbUser.email) {
              updateUserProfile(fbUser.uid, { email: fbUser.email }).catch(
                console.error,
              );
              userDoc.email = fbUser.email;
            }
            setUser(userDoc);
          } else {
            // User exists in Firebase Auth but not in Firestore
            // This shouldn't happen in normal flow, but handle it
            console.warn("User authenticated but no Firestore document found");
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const fbUser = userCredential.user;

      // Get user document from Firestore
      const userDoc = await getUserDocument(fbUser.uid);

      if (userDoc && userDoc.status && userDoc.status !== "ACTIVE") {
        await signOut(auth);
        throw {
          code:
            userDoc.status === "SUSPENDED"
              ? "auth/account-suspended"
              : "auth/account-inactive",
          message: "Account is not active",
        };
      }

      // Non-blocking: don't fail login if this write fails.
      updateLastLogin(fbUser.uid).catch(console.error);

      if (userDoc) {
        setUser(userDoc);
      } else {
        // Create user document if it doesn't exist (edge case)
        const newUser = await createUserDocument(
          fbUser.uid,
          fbUser.email || email,
          fbUser.displayName || email.split("@")[0],
        );
        setUser(newUser);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    phone: string,
  ) => {
    setIsLoading(true);
    let fbUser: FirebaseUser | null = null;
    try {
      // First create the Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      fbUser = userCredential.user;

      // Now check if phone number already exists (after auth, so we have permissions)
      // Only check if phone is provided and not empty
      if (phone && phone.trim() !== "") {
        const phoneExists = await checkPhoneExists(phone);
        if (phoneExists) {
          // Phone already exists - delete the just-created auth user and throw error
          await fbUser.delete();
          throw {
            code: "auth/phone-already-in-use",
            message: "Phone number already in use",
          };
        }
      }

      // Attempt to send email verification
      try {
        await sendEmailVerification(fbUser);

        // Also send verification email via Resend (our branded email). The
        // server builds the actual link itself from this code — it will not
        // accept a full link from us.
        try {
          await fetch("/api/auth/send-verification-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              name: name || email.split("@")[0],
              code: fbUser.uid,
            }),
          });
        } catch (resendError) {
          console.warn(
            "Failed to send Resend verification email:",
            resendError,
          );
          // Continue - Firebase verification email already sent
        }
      } catch (verificationError) {
        console.warn("Failed to send verification email:", verificationError);
        // Continue with signup even if verification email fails
        // User can resend from the banner
      }

      // Create user document in Firestore
      const newUser = await createUserDocument(fbUser.uid, email, name, phone);
      setUser(newUser);
    } catch (error: unknown) {
      console.error("Signup error:", error);
      // If we created an auth user but something else failed, clean up
      const errorCode = (error as { code?: string })?.code;
      if (fbUser && errorCode !== "auth/phone-already-in-use") {
        try {
          await fbUser.delete();
        } catch (deleteError) {
          console.error(
            "Failed to cleanup auth user after signup error:",
            deleteError,
          );
        }
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (password: string) => {
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error("No authenticated user");
    }

    setIsLoading(true);
    try {
      // Re-authenticate user first (required for sensitive operations)
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        password,
      );
      await reauthenticateWithCredential(firebaseUser, credential);

      // Delete user data from Firestore first
      await deleteUserAccount(firebaseUser.uid);

      // Then delete the Firebase Auth user
      await deleteUser(firebaseUser);

      // Clear local state
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Delete account error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const setUserRole = async (role: UserRole) => {
    if (user && firebaseUser) {
      try {
        // Update role in Firestore
        await updateUserRoleInFirestore(firebaseUser.uid, role);

        // If becoming a provider, create provider profile
        if (role === "PROVIDER") {
          await createProviderProfile(firebaseUser.uid, {
            bio: "",
            region: "",
            city: "",
            area: "",
            phone: user.phone,
          });
        }

        // Update local state
        const updatedUser = {
          ...user,
          roles: user.roles.includes(role) ? user.roles : [...user.roles, role],
          activeRole: role,
        };
        setUser(updatedUser);
      } catch (error) {
        console.error("Error updating user role:", error);
        throw error;
      }
    }
  };

  const switchRole = async (role: UserRole) => {
    if (user && firebaseUser && user.roles.includes(role)) {
      try {
        // Update active role in Firestore
        await switchActiveRoleInFirestore(firebaseUser.uid, role);

        // Update local state
        setUser({ ...user, activeRole: role });
      } catch (error) {
        console.error("Error switching role:", error);
        throw error;
      }
    }
  };

  const becomeProvider = async (providerData: {
    bio: string;
    region: string;
    city: string;
    area: string;
  }) => {
    if (user && firebaseUser) {
      try {
        // Add PROVIDER role to user
        await addRoleToUser(firebaseUser.uid, "PROVIDER");

        // Create provider profile with provided data. The phone number was
        // already collected at signup — carry it over so a brand-new
        // provider's profile is immediately "complete" (see isProfileComplete
        // in ProviderServicesPage) without having to re-enter it.
        await createProviderProfile(firebaseUser.uid, {
          ...providerData,
          phone: user.phone,
        });

        // Update local state
        const updatedRoles = user.roles.includes("PROVIDER")
          ? user.roles
          : [...user.roles, "PROVIDER" as UserRole];
        setUser({
          ...user,
          roles: updatedRoles,
          activeRole: "PROVIDER",
        });
      } catch (error) {
        console.error("Error becoming provider:", error);
        throw error;
      }
    }
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;
    try {
      const userDoc = await getUserDocument(firebaseUser.uid);
      if (userDoc) {
        setUser(userDoc);
      }
    } catch (error) {
      console.error("Error refreshing user document:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        deleteAccount,
        setUserRole,
        switchRole,
        becomeProvider,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
