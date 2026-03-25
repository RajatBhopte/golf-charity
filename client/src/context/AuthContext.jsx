/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error.message || error);
        // Keep auth session usable even when profile query fails.
        setUser({ id: userId });
      } else if (!data) {
        // No profile row yet (common right after OAuth register/sync).
        setUser({ id: userId });
      } else {
        setUser({ id: userId, ...data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const loginWithGoogle = async () => {
    // Always land on the signup onboarding page after Google OAuth.
    // Signup.jsx will detect whether the user is new or returning and
    // route them to the correct place (charity step / /subscribe / /dashboard).
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/signup?oauth=google`,
      },
    });
  };

  const signup = async (email, password, metadata = {}) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  };

  const logout = async () => {
    return supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const updatePassword = async (newPassword) => {
    return supabase.auth.updateUser({ password: newPassword });
  };

  // Handy context value
  const value = {
    session,
    user,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    resetPassword,
    updatePassword,
    refreshUserData: () =>
      session?.user?.id && fetchUserProfile(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
