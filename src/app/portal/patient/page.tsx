'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Unlock,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import {
  EhrRecord,
  DecryptionResult,
  AuditLogEntry,
  Patient,
} from '@/types/ehr';
import { DecryptionModal } from '@/components/DecryptionModal';
import { Navigation } from '@/components/Navigation';

export default function PatientPortalPage() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [patientRecord, setPatientRecord] = useState<EhrRecord | null>(null);
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
  const [accessLogs, setAccessLogs] = useState<AuditLogEntry[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<EhrRecord | null>(null);
  const [decryptionResult, setDecryptionResult] = useState<DecryptionResult | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const loadPatientData = useCallback(async () => {
    if (!currentUser) return;

    // Load patient's personal record
    const scoped = await ehrRepository.getScopedRecordsForUser(currentUser);
    if (scoped.records.length > 0) {
      setPatientRecord(scoped.records[0]);
    }

    let activePatient = scoped.patientProfile;
    if (!activePatient) {
      const allPatients = await ehrRepository.getPatients();
      const targetRecord = scoped.records[0];
      activePatient =
        allPatients.find(
          (p) =>
            p.id === targetRecord?.patientRefId ||
            p.mrn === targetRecord?.patientId ||
            p.userId === currentUser.id
        ) || allPatients[0];
    }

    if (activePatient) {
      setPatientProfile(activePatient);
      const logs = await ehrRepository.getAccessLogsForPatient(
        activePatient.id,
        scoped.records.map((r) => r.id)
      );
      setAccessLogs(logs);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  const handleDecryptOwnRecord = async (record: EhrRecord) => {
    if (!currentUser) return;

    setSelectedRecord(record);
    setIsDecrypting(true);

    try {
      const res = await fetch('/api/records/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          user: currentUser,
        }),
      });

      const data = await res.json();
      setIsDecrypting(false);

      if (data.success) {
        setDecryptionResult({
          success: true,
          record,
          decryptedPayload: data.decryptedPayload,
          evaluationTrace: data.evaluationTrace || {
            passed: true,
            combinator: 'AND',
            steps: [
              {
                field: 'patient_sovereign_identity',
                operator: '==',
                requiredValue: 'VERIFIED',
                actualValue: 'VERIFIED',
                passed: true,
                description: 'Sovereign Patient Direct Access Granted',
              },
            ],
            denialReasons: [],
          },
          decryptionTimeMs: data.decryptionTimeMs || 10,
          kemAlgorithm: data.kemAlgorithm || 'ML-KEM-768',
          kemCiphertextSize: 1088,
          aesIvSize: 12,
          authTagVerified: true,
        });
      } else {
        setDecryptionResult({
          success: false,
          error: data.error || 'Access denied by ABAC security policy',
          record,
          evaluationTrace: data.evaluationTrace || {
            passed: false,
            combinator: 'AND',
            steps: [],
            denialReasons: [data.error || 'Access denied'],
          },
          decryptionTimeMs: 0,
          kemAlgorithm: 'ML-KEM-768',
          kemCiphertextSize: 1088,
          aesIvSize: 12,
          authTagVerified: false,
        });
      }
    } catch (err: any) {
      setIsDecrypting(false);
      setDecryptionResult({
        success: false,
        error: err.message || 'Decryption service error',
        record,
        evaluationTrace: {
          passed: false,
          combinator: 'AND',
          steps: [],
          denialReasons: [err.message || 'Network or decryption service failure'],
        },
        decryptionTimeMs: 0,
        kemAlgorithm: 'ML-KEM-768',
        kemCiphertextSize: 1088,
        aesIvSize: 12,
        authTagVerified: false,
      });
    }
  };

  return (
    <div className="min-h-screen quantum-grid-bg text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Patient Demographic Banner */}
        <div className="rounded-3xl border border-cyan-800/50 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-950 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                  Sovereign Patient Health Portal
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span>{patientProfile?.fullName || currentUser?.fullName || 'Riya'}</span>
                <span className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-mono font-bold text-cyan-300 border border-cyan-800">
                  MRN: {patientProfile?.mrn || 'CRD-98102'}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>DOB: {patientProfile?.dateOfBirth || '1998-05-14'} ({patientProfile?.gender || 'Female'})</span>
                <span>•</span>
                <span>Blood Group: <strong className="text-white">{patientProfile?.bloodGroup || 'O-Positive'}</strong></span>
                <span>•</span>
                <span>Assigned Department: <strong className="text-cyan-300">{patientProfile?.assignedDepartment || 'Cardiology'}</strong></span>
                <span>•</span>
                <span>Primary Doctor: <strong className="text-white">Dr. Siddartha Kokkula</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400 space-y-1">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Cryptographic Tenancy
                </div>
                <div>Hospital: Apex Health Systems</div>
                <div className="font-mono text-[11px] text-cyan-400">{currentUser?.email || 'riya.patient@apexhealth.org'}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="flex items-center justify-center space-x-2 rounded-2xl border border-rose-800/80 bg-rose-950/40 px-4 py-3 text-xs font-bold text-rose-200 hover:bg-rose-900/60 hover:text-white transition shadow-lg shadow-rose-950/50"
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Sign Out & Return Home</span>
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-4 flex items-start space-x-3 text-xs text-cyan-200">
            <ShieldCheck className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Zero Data Leakage Boundary: </span>
              You have sovereign, exclusive visibility strictly to your individual health records.
              Attending clinicians in Cardiology can access records for treatment purposes under cryptographic ABAC policy enforcement.
            </div>
          </div>

          {/* Emergency Alert & Break-Glass Access for Patient */}
          <div className="mt-4 rounded-2xl border border-rose-900/60 bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-950 border border-rose-700/80 text-rose-400 flex-shrink-0 animate-pulse">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-rose-200">Emergency Medical Distress or Resuscitation Triage?</p>
                <p className="text-[11px] text-slate-300">
                  Trigger the Emergency Break-Glass Console to immediately alert Cardiology clinicians and unlock vital allergy/triage data.
                </p>
              </div>
            </div>
            <Link
              href={`/break-glass?patientId=${patientProfile?.mrn || 'CRD-98102'}&recordId=${patientRecord?.id || ''}`}
              className="flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-rose-950 hover:from-rose-500 hover:to-red-500 transition whitespace-nowrap"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Emergency Break-Glass Console</span>
            </Link>
          </div>
        </div>

        {/* Section 1: Patient's Personal Health Records */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <span>My Encrypted Electronic Health Records</span>
              </h2>
              <p className="text-xs text-slate-400">
                Your medical data is encrypted with AES-256-GCM and enveloped using FIPS 203 ML-KEM-768 post-quantum key encapsulation.
              </p>
            </div>
          </div>

          {patientRecord ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-800/60">
                    [{patientRecord.department}]
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                    Tier-{patientRecord.classificationLevel}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {patientRecord.recordTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  Created by: <span className="text-slate-200">Dr. Siddartha Kokkula</span> • Last updated March 2026
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDecryptOwnRecord(patientRecord)}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 to-quantum-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-950 hover:from-cyan-500 hover:to-quantum-500 transition"
              >
                <Unlock className="h-4 w-4" />
                <span>Decrypt & View My Medical Notes</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              No health records found for your account.
            </div>
          )}
        </div>

        {/* Section 2: Real-time Audit Ledger for Clinician Decryption Events */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <Clock className="h-5 w-5 text-cyan-400" />
                <span>Clinician Decryption & Access History (Tamper-Proof)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Immutable audit ledger recording every time an attending clinician or ward nurse accesses your medical data.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono font-semibold text-slate-300">
              {accessLogs.length} Events Recorded
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Clinician Name</th>
                  <th className="px-4 py-3 font-semibold">Action / Event</th>
                  <th className="px-4 py-3 font-semibold">Outcome</th>
                  <th className="px-4 py-3 font-semibold font-mono">SHA3-512 Ledger Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {accessLogs.length > 0 ? (
                  accessLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-xs">{log.userName}</div>
                        <div className="text-[10px] text-slate-400">{log.userRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-quantum-300 border border-slate-800">
                          {log.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center space-x-1 font-semibold text-[11px] ${
                            log.outcome === 'GRANTS' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {log.outcome === 'GRANTS' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          <span>{log.outcome}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 truncate max-w-[200px]" title={log.sha3Hash}>
                        {log.sha3Hash.slice(0, 24)}...
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                      No clinician access events recorded yet for your record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Decryption Viewer Modal */}
      <DecryptionModal
        record={selectedRecord}
        decryptionResult={decryptionResult}
        isDecrypting={isDecrypting}
        onClose={() => setSelectedRecord(null)}
        onRetry={() => selectedRecord && handleDecryptOwnRecord(selectedRecord)}
      />
    </div>
  );
}
