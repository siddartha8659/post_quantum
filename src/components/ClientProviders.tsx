'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { EmergencyPortalAlertListener } from '@/components/EmergencyPortalAlertListener';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <EmergencyPortalAlertListener />
      {children}
    </AuthProvider>
  );
}
