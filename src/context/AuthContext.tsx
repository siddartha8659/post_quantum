'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/types/ehr';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabaseClient';

interface AuthContextType {
  currentUser: UserProfile | null;
  profiles: UserProfile[];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  toggleAttributeRevocation: (attribute: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  isSupabaseActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'pq_abac_current_user_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await ehrRepository.init();
      const allProfiles = await ehrRepository.getProfiles();
      setProfiles(allProfiles);

      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
      const matched = allProfiles.find((p) => p.id === savedUserId);
      if (matched) {
        setCurrentUser(matched);
      } else if (allProfiles.length > 0) {
        // Default to Dr. Sarah Rao (Tier-3 Oncologist)
        const defaultUser = allProfiles.find((p) => p.role === 'Oncologist') || allProfiles[0];
        setCurrentUser(defaultUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(CURRENT_USER_KEY, defaultUser.id);
        }
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Listen for live Supabase auth state if configured
    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await ehrRepository.getProfileById(session.user.id);
          if (profile) setCurrentUser(profile);
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

  const login = async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          console.warn('Supabase auth sign-in error:', error.message);
        } else if (data.user) {
          const profile = await ehrRepository.getProfileById(data.user.id);
          if (profile) {
            setCurrentUser(profile);
            localStorage.setItem(CURRENT_USER_KEY, profile.id);
            setIsLoading(false);
            return true;
          }
        }
      }

      // Quick lookup for preset demo profiles
      const matched = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        setCurrentUser(matched);
        if (typeof window !== 'undefined') {
          localStorage.setItem(CURRENT_USER_KEY, matched.id);
        }
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    setCurrentUser(null);
  };

  const switchUser = async (userId: string) => {
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      setCurrentUser(target);
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
        login,
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
