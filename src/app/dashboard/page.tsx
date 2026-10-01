'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Unlock,
  Search,
  PlusCircle,
  AlertTriangle,
  ShieldAlert,
  Users,
  CheckCircle2,
  Building,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import {
  EhrRecord,
  DecryptionResult,
  Patient,
  getCanonicalRole,
} from '@/types/ehr';
import { DecryptionModal } from '@/components/DecryptionModal';
import { Navigation } from '@/components/Navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const [records, setRecords] = useState<EhrRecord[]>([]);
  const [deptPatients, setDeptPatients] = useState<Patient[]>([]);
  const [scopingNotice, setScopingNotice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<EhrRecord | null>(null);
  const [decryptionResult, setDecryptionResult] = useState<DecryptionResult | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [denialAlert, setDenialAlert] = useState<string>('');

  const canonicalRole = currentUser ? getCanonicalRole(currentUser.role) : 'doctor';

  // If patient logs into dashboard, redirect directly to sovereign patient portal
  useEffect(() => {
    if (currentUser && canonicalRole === 'patient') {
      router.push('/portal/patient');
    }
  }, [currentUser, canonicalRole, router]);

  const loadDepartmentData = useCallback(async () => {
    if (!currentUser) return;

    // 1. Fetch strictly department-scoped patients
    const patients = await ehrRepository.getDepartmentScopedPatients(currentUser);
    setDeptPatients(patients);

    // 2. Fetch strictly department-scoped EHR records
    const scoped = await ehrRepository.getScopedRecordsForUser(currentUser);
    setRecords(scoped.records);
    setScopingNotice(scoped.scopingNotice);
  }, [currentUser]);

  useEffect(() => {
    loadDepartmentData();
  }, [loadDepartmentData]);

  /**
   * Decrypt Record Action: Calls backend /api/records/decrypt to enforce ABAC & ML-KEM
   */
  const handleDecryptRecord = async (record: EhrRecord) => {
    if (!currentUser) return;

    setSelectedRecord(record);
    setIsDecrypting(true);
    setDenialAlert('');

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
            steps: [],
            denialReasons: [],
          },
          decryptionTimeMs: data.decryptionTimeMs,
          kemAlgorithm: data.kemAlgorithm || 'ML-KEM-768',
          kemCiphertextSize: data.kemCiphertextSize || 1088,
          aesIvSize: data.aesIvSize || 12,
          authTagVerified: data.authTagVerified ?? true,
        });
      } else {
        setDecryptionResult({
          success: false,
          error: data.error || 'Access Denied: ABAC policy violation.',
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
        setDenialAlert(data.error || 'Access Denied: ABAC policy violation.');
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
          denialReasons: [err.message || 'Decryption service error'],
        },
        decryptionTimeMs: 0,
        kemAlgorithm: 'ML-KEM-768',
        kemCiphertextSize: 1088,
        aesIvSize: 12,
        authTagVerified: false,
      });
    }
  };

  // Filter records by search query within department
  const filteredRecords = records.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.recordTitle.toLowerCase().includes(query) ||
      r.patientId.toLowerCase().includes(query) ||
      r.department.toLowerCase().includes(query)
    );
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen quantum-grid-bg flex items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 max-w-md shadow-2xl backdrop-blur-xl">
          <ShieldAlert className="h-12 w-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unauthenticated Session</h2>
          <p className="text-xs text-slate-400 mb-6">
            Please log in with verified clinical staff credentials and complete the 2-step OTP challenge.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 rounded-xl bg-quantum-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-quantum-500 transition"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen quantum-grid-bg text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Clinician Identity & Department Security Header */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Post-Quantum Verified Session Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span>{currentUser.fullName}</span>
                <span className="rounded-full bg-quantum-950 px-3 py-1 text-xs font-mono font-bold text-quantum-300 border border-quantum-800">
                  [{currentUser.department}]
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center space-x-1">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold uppercase tracking-wide">{currentUser.role}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-quantum-400" />
                  <span className="font-semibold text-quantum-300">Clearance Tier-{currentUser.clearanceLevel}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>{currentUser.hospitalId}</span>
                </span>
                <span>•</span>
                <span className="font-mono text-slate-400">{currentUser.email}</span>
              </div>
            </div>

            {/* Sign Out & Return to Home Button */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="flex items-center space-x-2.5 rounded-2xl border border-rose-800/80 bg-rose-950/40 px-5 py-3 text-xs font-bold text-rose-200 hover:bg-rose-900/60 hover:text-white transition shadow-lg shadow-rose-950/50"
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Sign Out & Return to Home</span>
              </button>
            </div>
          </div>

          {/* Scoping Enforcement Notice */}
          <div className="mt-6 rounded-2xl border border-quantum-800/50 bg-quantum-950/30 p-4 flex items-start space-x-3 text-xs text-quantum-200">
            <ShieldCheck className="h-5 w-5 text-quantum-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Strict Departmental Isolation Boundary: </span>
              <span>{scopingNotice}</span>
            </div>
          </div>
        </div>

        {/* Global Security Denial Alert */}
        {denialAlert && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/50 p-4 flex items-center space-x-3 text-xs text-rose-200 animate-in fade-in">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <span>{denialAlert}</span>
          </div>
        )}

        {/* Section 1: Patient Cohort Directory (Strictly Department-Scoped) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <Users className="h-5 w-5 text-quantum-400" />
                <span>Admitted Patient Cohort: {currentUser.department} Department</span>
              </h2>
              <p className="text-xs text-slate-400">
                Returned patient roster is strictly filtered by your assigned department. Cross-department browsing is prohibited.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono font-semibold text-slate-300">
              {deptPatients.length} Admitted Patients
            </span>
          </div>

          {/* Patients Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Patient Name & MRN</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">DOB & Gender</th>
                  <th className="px-4 py-3 font-semibold">Blood Group</th>
                  <th className="px-4 py-3 font-semibold">Contact Email</th>
                  <th className="px-4 py-3 font-semibold text-right">Tenancy Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {deptPatients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-xs">{pat.fullName}</div>
                      <div className="font-mono text-[10px] text-quantum-400">{pat.mrn || pat.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-quantum-950 px-2 py-0.5 text-[10px] font-mono font-semibold text-quantum-300 border border-quantum-800/60">
                        {pat.assignedDepartment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span>{pat.dateOfBirth}</span>
                      <span className="text-slate-500 mx-1">•</span>
                      <span>{pat.gender}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{pat.bloodGroup || 'N/A'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {pat.contactEmail || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>In-Dept Cohort</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Scoped Electronic Health Records & Decryption */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <FileText className="h-5 w-5 text-quantum-400" />
                <span>Department Electronic Health Records ({currentUser.department})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ciphertexts enveloped with FIPS 203 ML-KEM-768 and AES-256-GCM.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in department..."
                  className="rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
                />
              </div>

              {/* Create Record Button */}
              <Link
                href="/records/new"
                className="flex items-center space-x-1.5 rounded-xl bg-quantum-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-quantum-500 transition shadow-md shadow-quantum-900/30"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New EHR</span>
              </Link>
            </div>
          </div>

          {/* Record Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="rounded bg-quantum-950 px-2 py-0.5 text-[10px] font-mono font-bold text-quantum-400 border border-quantum-800/60">
                      [{rec.department}]
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      Tier-{rec.classificationLevel}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug mb-1">
                    {rec.recordTitle}
                  </h3>

                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>
                      <span>Patient ID: </span>
                      <span className="font-mono text-slate-200">{rec.patientId}</span>
                    </div>
                    <div>
                      <span>Created By: </span>
                      <span className="text-slate-300">{rec.createdByName || 'Attending Physician'}</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Badges & Decrypt Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                    <span className="rounded bg-slate-950 px-1.5 py-0.5 border border-slate-800">
                      ML-KEM-768
                    </span>
                    <span className="rounded bg-slate-950 px-1.5 py-0.5 border border-slate-800">
                      AES-256-GCM
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDecryptRecord(rec)}
                    className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-quantum-900/30 hover:from-quantum-500 hover:to-cyan-400 transition"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Open & Decrypt EHR</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                No electronic health records found in {currentUser.department} matching your search.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Decryption Viewer Modal */}
      <DecryptionModal
        record={selectedRecord}
        decryptionResult={decryptionResult}
        isDecrypting={isDecrypting}
        onClose={() => setSelectedRecord(null)}
        onRetry={() => selectedRecord && handleDecryptRecord(selectedRecord)}
      />
    </div>
  );
}
