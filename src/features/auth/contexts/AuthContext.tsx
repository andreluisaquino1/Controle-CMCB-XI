import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/shared/lib/env";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService, Profile } from "@/features/users/services/profileService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isDemo: boolean;
  isSecretaria: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  // Profile management via React Query
  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  useEffect(() => {
    // 1. Initial manual check for session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setAuthLoading(false);
    });

    // 2. Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === "SIGNED_OUT") {
          queryClient.clear(); // Clear all queries on sign out
        }

        if (event === "PASSWORD_RECOVERY") {
          window.location.href = "/auth/reset-password";
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    setAuthLoading(true);
    try {
      const origin = env.VITE_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            full_name: name,
            name: name,
          },
        },
      });
      return { error };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };

  const resetPassword = async (email: string) => {
    setAuthLoading(true);
    try {
      const origin = env.VITE_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/update-password`,
      });
      return { error };
    } finally {
      setAuthLoading(false);
    }
  };

  const isLoading = authLoading || (!!user && profileLoading && profileFetching);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile: profile || null,
        isAdmin: profile?.role === "admin",
        isDemo: profile?.role === "demo",
        isSecretaria: profile?.role === "secretaria",
        loading: isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
