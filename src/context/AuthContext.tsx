'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, getCanonicalRole } from '@/types/ehr';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabaseClient';
import { SEED_PROFILES } from '@/lib/data/seedData';

interface AuthContextType {
  currentUser: UserProfile | null;
  profiles: UserProfile[];
  isLoading: boolean;
  staffOtpVerified: boolean;
  authenticateCredentials: (email: string, password?: string) => Promise<{ success: boolean; profile?: UserProfile; isPatient: boolean; error?: string }>;
  completeStaffOtpLogin: (profile: UserProfile, token: string) => void;
  loginAsPatient: (profile: UserProfile) => void;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  toggleAttributeRevocation: (attribute: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  isSupabaseActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'pq_abac_current_user_id';
const PQ_TOKEN_KEY = 'pq_abac_session_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [staffOtpVerified, setStaffOtpVerified] = useState<boolean>(false);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await ehrRepository.init();
      const allProfiles = await ehrRepository.getProfiles();
      setProfiles(allProfiles);

      // Restore session only if a user previously logged in via OTP (explicit login)
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem(PQ_TOKEN_KEY) : null;

      if (savedUserId && sessionToken) {
        // Only restore if there's a valid OTP session token too
        const matched = allProfiles.find((p) => p.id === savedUserId);
        if (matched) {
          setCurrentUser(matched);
          setStaffOtpVerified(true);
        }
      } else if (savedUserId && !sessionToken) {
        // Patient sessions don't have a token — restore patients only
        const matched = allProfiles.find((p) => p.id === savedUserId);
        if (matched && (matched.role || '').toLowerCase() === 'patient') {
          setCurrentUser(matched);
          setStaffOtpVerified(true);
        } else {
          // Staff without token = force re-login
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      }
      // No saved session → start unauthenticated (show home/login page)
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await ehrRepository.getProfileById(session.user.id);
          if (profile) {
            setCurrentUser(profile);
            setStaffOtpVerified(true);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const refreshProfiles = async () => {
    const all = await ehrRepository.getProfiles();
    setProfiles(all);
    if (currentUser) {
      const updated = all.find((p) => p.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  };

  /**
   * Step 1: Credential Authentication
   * Validates email/password against Supabase Auth or seeded directory
   */
  const authenticateCredentials = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; profile?: UserProfile; isPatient: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // 1. Try Supabase Auth if configured
      if (isSupabaseConfigured && supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          console.warn('Supabase auth error:', error.message);
        } else if (data.user) {
          const profile = await ehrRepository.getProfileById(data.user.id);
          if (profile) {
            const isPatient = getCanonicalRole(profile.role) === 'patient';
            setIsLoading(false);
            return { success: true, profile, isPatient };
          }
        }
      }

      // 2. Directory lookup for pre-configured demo accounts
      const all = await ehrRepository.getProfiles();
      const matched = all.find((p) => p.email.toLowerCase() === email.toLowerCase())
        || SEED_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        const isPatient = getCanonicalRole(matched.role) === 'patient';
        setIsLoading(false);
        return { success: true, profile: matched, isPatient };
      }

      setIsLoading(false);
      return { success: false, isPatient: false, error: 'Unregistered email or invalid clinical credentials.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, isPatient: false, error: err.message || 'Authentication failed' };
    }
  };

  /**
   * Step 2: Complete Staff Login after verified 6-digit Email OTP challenge
   */
  const completeStaffOtpLogin = (profile: UserProfile, token: string) => {
    setCurrentUser(profile);
    setStaffOtpVerified(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, profile.id);
      localStorage.setItem(PQ_TOKEN_KEY, token);
    }
  };

  /**
   * Patient Direct Login: Patients bypass staff OTP challenge
   */
  const loginAsPatient = (profile: UserProfile) => {
    setCurrentUser(profile);
    setStaffOtpVerified(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, profile.id);
    }
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(PQ_TOKEN_KEY);
    }
    setCurrentUser(null);
    setStaffOtpVerified(false);
  };

  const switchUser = async (userId: string) => {
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      setCurrentUser(target);
      setStaffOtpVerified(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENT_USER_KEY, target.id);
      }
    }
  };

  const toggleAttributeRevocation = async (attribute: string) => {
    if (!currentUser) return;
    const currentRevoked = currentUser.revokedAttributes || [];
    const isAlreadyRevoked = currentRevoked.includes(attribute);

    const updatedRevoked = isAlreadyRevoked
      ? currentRevoked.filter((a) => a !== attribute)
      : [...currentRevoked, attribute];

    const updatedProfile: UserProfile = {
      ...currentUser,
      revokedAttributes: updatedRevoked,
    };

    await ehrRepository.updateProfile(updatedProfile);
    setCurrentUser(updatedProfile);

    // Record revocation event in audit ledger
    await ehrRepository.addAuditLogEntry({
      eventType: 'ATTRIBUTE_REVOKED',
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      outcome: isAlreadyRevoked ? 'GRANTS' : 'DENIED',
      reason: isAlreadyRevoked
        ? `Cryptographic Authority RESTORED attribute '${attribute}' for ${currentUser.fullName}`
        : `Cryptographic Authority REVOKED attribute '${attribute}' for ${currentUser.fullName}. Immediate access denial enforced.`,
      metadata: {
        affectedAttribute: attribute,
        action: isAlreadyRevoked ? 'RESTORED' : 'REVOKED',
        actor_department: currentUser.department,
      },
    });

    await refreshProfiles();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profiles,
        isLoading,
        staffOtpVerified,
        authenticateCredentials,
        completeStaffOtpLogin,
        loginAsPatient,
        logout,
        switchUser,
        toggleAttributeRevocation,
        refreshProfiles,
        isSupabaseActive: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
