'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Flame,
  VolumeX,
  Volume2,
  AlertOctagon,
  ExternalLink,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sirenAudio } from '@/lib/audio/sirenAudio';
import {
  PortalEmergencyAlert,
  getActivePortalEmergency,
  dismissActivePortalEmergency,
} from '@/lib/audio/emergencyBroadcast';

export function EmergencyPortalAlertListener() {
  const { currentUser } = useAuth();
  const [activeAlert, setActiveAlert] = useState<PortalEmergencyAlert | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [audioBlockedNotice, setAudioBlockedNotice] = useState(false);

  /**
   * STRICT SCOPING:
   * Only the respective department clinicians (or ER trauma physicians overseeing
   * life-or-death resuscitations) receive the emergency popup and siren.
   */
  const shouldNotifyCurrentUser = useCallback(
    (alert: PortalEmergencyAlert | null): boolean => {
      if (!alert) return false;
      if (!currentUser) return false;

      // Patients do not receive clinician code blue override popups
      const userRole = (currentUser.role || '').trim().toLowerCase();
      if (userRole === 'patient') return false;

      const userDept = (currentUser.department || '').trim().toLowerCase();
      const targetDept = (alert.targetDepartment || '').trim().toLowerCase();

      // 1. Respective department clinicians (e.g. Cardiology staff for Cardiology emergency)
      const isRespectiveDept =
        Boolean(userDept && targetDept) &&
        (userDept === targetDept || userDept.includes(targetDept) || targetDept.includes(userDept));

      // 2. ER trauma physicians oversee critical overrides hospital-wide
      const isErSpecialist = userRole.includes('er') || userDept.includes('emergency');

      return isRespectiveDept || isErSpecialist;
    },
    [currentUser]
  );

  // Trigger siren sound and display the popup modal
  const triggerAlertWithSiren = useCallback(
    (alert: PortalEmergencyAlert) => {
      // Only pop up if current user belongs to the respective department or ER team
      if (!shouldNotifyCurrentUser(alert)) {
        setActiveAlert(null);
        return;
      }

      setActiveAlert(alert);
      setAcknowledged(false);

      const soundStarted = sirenAudio.start();
      setIsSirenActive(true);
      if (!soundStarted) {
        setAudioBlockedNotice(true);
      }
    },
    [shouldNotifyCurrentUser]
  );

  // Acknowledge notification: immediately shuts off siren and dismisses popup
  const handleAcknowledgeAndOffSiren = () => {
    sirenAudio.stop();
    setIsSirenActive(false);
    setAudioBlockedNotice(false);
    setAcknowledged(true);
    setActiveAlert(null);
    dismissActivePortalEmergency();
  };

  // Setup broadcast channel, storage listener, and polling
  useEffect(() => {
    // 1. Initial check on mount
    const initialAlert = getActivePortalEmergency();
    if (initialAlert) {
      triggerAlertWithSiren(initialAlert);
    }

    // 2. Storage event for cross-tab synchronisation
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pq_abac_active_siren_alert') {
        if (e.newValue) {
          try {
            const alert: PortalEmergencyAlert = JSON.parse(e.newValue);
            triggerAlertWithSiren(alert);
          } catch {}
        } else {
          sirenAudio.stop();
          setIsSirenActive(false);
          setActiveAlert(null);
        }
      }
    };

    // 3. Custom events within the active window
    const handleCustomAlert = (e: Event) => {
      const customEvent = e as CustomEvent<PortalEmergencyAlert>;
      if (customEvent.detail) {
        triggerAlertWithSiren(customEvent.detail);
      }
    };

    const handleCustomDismiss = () => {
      sirenAudio.stop();
      setIsSirenActive(false);
      setActiveAlert(null);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pq_emergency_alert', handleCustomAlert);
    window.addEventListener('pq_emergency_dismissed', handleCustomDismiss);

    // 4. BroadcastChannel for instant cross-tab communication
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('pq_abac_emergency_alerts');
        channel.onmessage = (event) => {
          if (event.data?.type === 'EMERGENCY_TRIGGERED' && event.data?.alert) {
            triggerAlertWithSiren(event.data.alert);
          } else if (event.data?.type === 'EMERGENCY_DISMISSED') {
            sirenAudio.stop();
            setIsSirenActive(false);
            setActiveAlert(null);
          }
        };
      } catch {}
    }

    // 5. Periodic polling (every 2.5 seconds)
    const pollInterval = setInterval(() => {
      const current = getActivePortalEmergency();
      if (current && (!activeAlert || activeAlert.id !== current.id)) {
        triggerAlertWithSiren(current);
      } else if (!current && activeAlert) {
        sirenAudio.stop();
        setIsSirenActive(false);
        setActiveAlert(null);
      }
    }, 2500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pq_emergency_alert', handleCustomAlert);
      window.removeEventListener('pq_emergency_dismissed', handleCustomDismiss);
      if (channel) channel.close();
      clearInterval(pollInterval);
    };
  }, [triggerAlertWithSiren, activeAlert]);

  // Clean exit: if no active alert or user is not in respective department, render nothing (no buttons!)
  if (!activeAlert || acknowledged || !shouldNotifyCurrentUser(activeAlert)) {
    return null;
  }

  return (
    /* Direct Center-Screen Emergency Pop-Up Modal */
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border-2 border-rose-600 bg-gradient-to-b from-rose-950/95 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-rose-950/90 text-white space-y-6">
        
        {/* Top Emergency Beacon & Department Header */}
        <div className="flex items-start space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-900 border-2 border-rose-500 text-rose-200 flex-shrink-0 animate-pulse shadow-xl shadow-rose-600/60">
            <Flame className="h-8 w-8 text-rose-300 animate-bounce" />
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-rose-900 px-2.5 py-0.5 text-[11px] font-mono font-black uppercase text-rose-100 border border-rose-600 animate-pulse tracking-wider">
                🚨 CODE BLUE EMERGENCY OVERRIDE
              </span>
              <span className="rounded bg-slate-950 border border-rose-500/80 px-2.5 py-0.5 text-[11px] font-mono font-bold text-quantum-300">
                DEPT: {activeAlert.targetDepartment.toUpperCase()}
              </span>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight pt-0.5">
              Emergency Break-Glass Activated
            </h3>
            <p className="text-xs text-rose-200/90">
              Immediate clinical notification for{' '}
              <strong className="text-white font-semibold">{activeAlert.targetDepartment}</strong> attending staff.
            </p>
          </div>
        </div>

        {/* Audio Siren Equalizer Indicator */}
        <div className="rounded-2xl border border-rose-700/80 bg-rose-950/40 p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Radio className="h-5 w-5 text-rose-400 animate-spin" />
            <div>
              <p className="text-xs font-bold text-rose-100">EMERGENCY SIREN SOUNDING</p>
              <p className="text-[11px] text-rose-300/80">
                Audible alert active for {activeAlert.targetDepartment} clinical cohort
              </p>
            </div>
          </div>

          {/* Equalizer animation */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-800">
            <span className="inline-block w-1 bg-rose-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4"></span>
            <span className="inline-block w-1 bg-rose-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-6"></span>
            <span className="inline-block w-1 bg-rose-400 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-3"></span>
            <span className="inline-block w-1 bg-rose-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-5"></span>
          </div>
        </div>

        {/* Target Patient & Clinical Information Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">Target Patient Record:</span>
            <span className="font-bold text-white text-right">
              {activeAlert.recordTitle}{' '}
              <span className="font-mono text-quantum-300">[{activeAlert.patientId}]</span>
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">Initiating Clinician:</span>
            <span className="text-slate-200">
              <strong className="text-white">{activeAlert.actorName}</strong> ({activeAlert.actorRole})
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">Severity Classification:</span>
            <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-800">
              {activeAlert.severity}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1 font-semibold uppercase text-[10px] tracking-wider">
              Mandatory Clinical Justification:
            </span>
            <p className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-slate-200 leading-relaxed italic">
              &quot;{activeAlert.justification}&quot;
            </p>
          </div>
        </div>

        {/* Primary Action Button: Acknowledge & Turn Off Siren */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleAcknowledgeAndOffSiren}
            className="w-full flex items-center justify-center space-x-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 px-6 py-4 text-sm font-black text-white shadow-2xl shadow-rose-950 hover:from-rose-500 hover:to-red-500 transition active:scale-[0.99] border border-rose-400/40"
          >
            <VolumeX className="h-5 w-5 text-white" />
            <span>Acknowledge Notification &amp; Turn Off Siren</span>
          </button>

          <div className="flex items-center justify-between text-xs px-1">
            <Link
              href={`/break-glass?patientId=${activeAlert.patientId}`}
              onClick={handleAcknowledgeAndOffSiren}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
            >
              <span>Inspect Emergency Record</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <span className="text-slate-400 font-mono text-[11px]">
              Token: {activeAlert.token}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
