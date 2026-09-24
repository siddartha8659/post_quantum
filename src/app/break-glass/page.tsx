'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Flame,
  Activity,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Unlock,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { executeAbacDecryption } from '@/lib/crypto/pqcCryptoService';
import { EhrRecord, EmergencyBreakGlassEvent, FhirEhrPayload } from '@/types/ehr';

function BreakGlassContent() {
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();

  const [records, setRecords] = useState<EhrRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL_OVERRIDE' | 'URGENT_TRAUMA'>('CRITICAL_OVERRIDE');
  const [confirmUnderPenalty, setConfirmUnderPenalty] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [unlockedPayload, setUnlockedPayload] = useState<FhirEhrPayload | null>(null);
  const [recentEvents, setRecentEvents] = useState<EmergencyBreakGlassEvent[]>([]);

  useEffect(() => {
    const init = async () => {
      const recs = await ehrRepository.getRecords();
      setRecords(recs);

      const events = await ehrRepository.getBreakGlassEvents();
      setRecentEvents(events);

      const paramRecId = searchParams.get('recordId');
      if (paramRecId) {
        setSelectedRecordId(paramRecId);
      } else if (recs.length > 0) {
        // Default to ER record
        const erRec = recs.find((r) => r.department === 'Emergency') || recs[0];
        setSelectedRecordId(erRec.id);
      }
    };
    init();
  }, [searchParams]);

  const selectedRecord = records.find((r) => r.id === selectedRecordId);

  const handleExecuteBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedRecord || !confirmUnderPenalty) return;

    setIsExecuting(true);

    try {
      // 1. Record Emergency Event and broadcast immutable high-severity log
      const event = await ehrRepository.createBreakGlassEvent({
        recordId: selectedRecord.id,
        recordTitle: selectedRecord.recordTitle,
        patientId: selectedRecord.patientId,
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        justification,
        severity,
      });

      setGeneratedToken(event.token);

      // 2. Perform Emergency Cryptographic Bypass Decryption
      const result = await executeAbacDecryption(selectedRecord, currentUser, true);

      if (result.success && result.decryptedPayload) {
        setUnlockedPayload(result.decryptedPayload);
        setOverrideSuccess(true);
      }

      const refreshedEvents = await ehrRepository.getBreakGlassEvents();
      setRecentEvents(refreshedEvents);
    } catch (err: any) {
      alert('Break-glass execution failed: ' + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen quantum-grid-bg flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Urgent Warning Banner */}
        <div className="rounded-2xl border border-rose-700/80 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-900/60 text-rose-300 border border-rose-600/80 flex-shrink-0 animate-pulse">
              <Flame className="h-6 w-6 text-rose-400" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-rose-100 tracking-tight">
                  Emergency &quot;Break-Glass&quot; Cryptographic Console
                </h1>
                <span className="rounded bg-rose-900 px-2 py-0.5 text-xs font-mono font-bold text-rose-200 border border-rose-600">
                  LIFE-OR-DEATH OVERRIDE
                </span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Notice: Invoking this emergency console bypasses standard ABAC attribute policies.
                A cryptographically signed, immutable high-severity entry will be written to the
                Supabase audit ledger, triggering immediate hospital compliance and supervisory alerts.
              </p>
            </div>
          </div>
        </div>

        {/* OVERRIDE SUCCESS: EMERGENCY TRIAGE VIEW */}
        {overrideSuccess && unlockedPayload ? (
          <div className="rounded-2xl border border-emerald-800 bg-slate-900/90 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Emergency Payload Decrypted & Unlocked
                  </h2>
                  <p className="text-xs text-slate-400">
                    Emergency Token: <span className="font-mono text-quantum-300 font-bold">{generatedToken}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setOverrideSuccess(false);
                  setUnlockedPayload(null);
                }}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Close Override View
              </button>
            </div>

            {/* CRITICAL ALLERGIES ALERT */}
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 space-y-2">
              <h3 className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center space-x-2">
                <AlertOctagon className="h-4 w-4 text-rose-400" />
                <span>Life-Threatening Allergies & Contraindications</span>
              </h3>
              {unlockedPayload.allergies.map((allergy, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{allergy.substance}</span>
                  <span className="text-rose-300 font-semibold">{allergy.reaction}</span>
                </div>
              ))}
            </div>

            {/* CORE TRIAGE VITALS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {unlockedPayload.vitalSigns.map((obs, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[11px] text-slate-400">{obs.display}</p>
                  <p className="text-xl font-black text-white mt-1">
                    {obs.value} <span className="text-xs text-slate-400 font-normal">{obs.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* CLINICAL SUMMARY & SURGICAL NOTES */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Emergency Physician Documentation
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {unlockedPayload.clinicalNotes}
              </p>
            </div>
          </div>
        ) : (
          /* BREAK-GLASS OVERRIDE FORM */
          <form onSubmit={handleExecuteBreakGlass} className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Emergency Override Parameters</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Select Target Patient Record
                  </label>
                  <select
                    value={selectedRecordId}
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    {records.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.patientId} - {r.recordTitle} ({r.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Emergency Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-rose-300 font-semibold focus:outline-none"
                  >
                    <option value="CRITICAL_OVERRIDE">CRITICAL_OVERRIDE (Unresponsive Trauma / Code Blue)</option>
                    <option value="URGENT_TRAUMA">URGENT_TRAUMA (Active Resuscitation Protocol)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Clinical Justification (Logged to Audit Table)
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g. Unresponsive trauma patient in hemorrhagic shock (GCS 9, BP 78/44). Patient unable to provide consent; immediate access required to identify fatal drug allergies and blood type."
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Legal Confirmation Checkbox */}
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmUnderPenalty}
                    onChange={(e) => setConfirmUnderPenalty(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs text-rose-200">
                    I attest under penalty of administrative revocation and federal audit sanction
                    that this emergency access is clinically justified to prevent irreversible patient
                    mortality or severe morbidity.
                  </span>
                </label>
              </div>
            </div>

            {/* Execute Button */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="text-xs text-slate-400">
                Actor: <span className="text-white font-semibold">{currentUser?.fullName}</span> •{' '}
                <span className="text-quantum-400">{currentUser?.role}</span>
              </div>

              <button
                type="submit"
                disabled={isExecuting || !confirmUnderPenalty}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-rose-950 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 transition"
              >
                {isExecuting ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>Authorizing Emergency Decryption...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Authorize Emergency Break-Glass Override</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* RECENT BREAK-GLASS INCIDENTS LEDGER */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Clock className="h-4 w-4 text-quantum-400" />
            <span>Emergency Break-Glass Audit Trail Stream</span>
          </h3>

          <div className="space-y-2">
            {recentEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{ev.actorName}</span>
                    <span className="text-slate-400">({ev.actorRole})</span>
                    <span className="rounded bg-rose-900 px-1.5 py-0.2 text-[10px] font-bold text-rose-200">
                      {ev.severity}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{ev.justification}</p>
                <div className="flex items-center space-x-3 text-[10px] font-mono text-quantum-400">
                  <span>Record: {ev.recordTitle}</span>
                  <span>•</span>
                  <span>Token: {ev.token}</span>
                </div>
              </div>
            ))}

            {recentEvents.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                No emergency overrides recorded in active ledger.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BreakGlassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen quantum-grid-bg flex items-center justify-center">
          <div className="flex items-center space-x-3 text-quantum-400 font-mono text-sm">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Loading Emergency Console...</span>
          </div>
        </div>
      }
    >
      <BreakGlassContent />
    </Suspense>
  );
}
