'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Lock,
  Unlock,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { EhrRecord, DecryptionResult } from '@/types/ehr';
import { executeAbacDecryption } from '@/lib/crypto/pqcCryptoService';
import { DecryptionModal } from '@/components/DecryptionModal';
import { Navigation } from '@/components/Navigation';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<EhrRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');

  // Modal & Decryption State
  const [selectedRecord, setSelectedRecord] = useState<EhrRecord | null>(null);
  const [decryptionResult, setDecryptionResult] = useState<DecryptionResult | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadRecords = async () => {
    const list = await ehrRepository.getRecords();
    setRecords(list);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleInspectRecord = async (record: EhrRecord) => {
    if (!currentUser) return;
    setSelectedRecord(record);
    setModalOpen(true);
    setIsDecrypting(true);
    setDecryptionResult(null);

    // Simulate network & lattice decapsulation time
    const result = await executeAbacDecryption(record, currentUser, false);

    // Record access attempt into immutable audit log
    await ehrRepository.addAuditLogEntry({
      eventType: 'DECRYPTION_ATTEMPT',
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      recordId: record.id,
      recordTitle: record.recordTitle,
      policyEvaluated: record.abacPolicy,
      outcome: result.success ? 'GRANTS' : 'DENIED',
      reason: result.success
        ? `ABAC Policy verified. AES-256 DEK decapsulated via ${record.kemAlgorithm} in ${result.decryptionTimeMs}ms.`
        : `ABAC Policy Denied: ${result.evaluationTrace.denialReasons.join('; ')}`,
      metadata: {
        kemAlgorithm: record.kemAlgorithm,
        evaluatorDept: currentUser.department,
        evaluatorClearance: currentUser.clearanceLevel,
        latencyMs: result.decryptionTimeMs,
      },
    });

    setIsDecrypting(false);
    setDecryptionResult(result);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.recordTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || r.department === selectedDept;
    const matchesClearance =
      selectedClassification === 'ALL' ||
      r.classificationLevel === parseInt(selectedClassification, 10);

    return matchesSearch && matchesDept && matchesClearance;
  });

  return (
    <div className="min-h-screen quantum-grid-bg flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Clinician Overview & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                EHR Record Directory & ABAC Simulator
              </h1>
              <span className="rounded bg-quantum-950 px-2 py-0.5 text-xs font-mono font-bold text-quantum-300 border border-quantum-800">
                FIPS 203 ML-KEM-768
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select any encrypted electronic health record below to initiate post-quantum decapsulation
              and evaluate clinical attributes in real-time.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/records/new"
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-quantum-900/40 hover:from-quantum-500 hover:to-cyan-400 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Encrypt New EHR</span>
            </Link>

            <Link
              href="/break-glass"
              className="flex items-center space-x-2 rounded-xl border border-rose-800/80 bg-rose-950/60 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
            >
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>Break-Glass Override</span>
            </Link>
          </div>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Protected Records</p>
            <p className="text-2xl font-black text-white mt-1">{records.length}</p>
            <p className="text-[11px] text-quantum-400 mt-1 font-mono">100% AES-GCM Enveloped</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Evaluating Clinician</p>
            <p className="text-sm font-bold text-white mt-1 truncate">
              {currentUser?.fullName || 'Not Authenticated'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {currentUser?.role} • {currentUser?.department}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Clearance Tier</p>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`text-2xl font-black ${
                  currentUser?.clearanceLevel === 3
                    ? 'text-purple-400'
                    : currentUser?.clearanceLevel === 2
                    ? 'text-blue-400'
                    : 'text-slate-300'
                }`}
              >
                Tier-{currentUser?.clearanceLevel}
              </span>
              {(currentUser?.revokedAttributes || []).includes('clearanceLevel') && (
                <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-800">
                  REVOKED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Hospital: {currentUser?.hospitalId}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Lattice Parameter</p>
            <p className="text-base font-mono font-bold text-quantum-300 mt-1">k=3, q=3329</p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">ML-KEM-768 (1088B CT)</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search records by title, patient ID, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Dept:</span>
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="Oncology">Oncology</option>
              <option value="Emergency">Emergency</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Research">Research</option>
            </select>

            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Clearances</option>
              <option value="1">Tier-1 Minimum</option>
              <option value="2">Tier-2 Minimum</option>
              <option value="3">Tier-3 Minimum</option>
            </select>
          </div>
        </div>

        {/* Records Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((record) => {
            // Quick preview simulation of pass/fail for badge
            return (
              <div
                key={record.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-md transition hover:border-slate-700 hover:bg-slate-850"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-quantum-400 border border-slate-700">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                          {record.patientId}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-400 font-medium">
                          {record.department}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          record.classificationLevel === 3
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : record.classificationLevel === 2
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        Tier-{record.classificationLevel} Req
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-white group-hover:text-quantum-300 transition">
                    {record.recordTitle}
                  </h3>

                  {/* ABAC Policy Summary */}
                  <div className="mt-3 rounded-xl bg-slate-950/70 p-3 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">
                        {record.abacPolicy.name}
                      </span>
                      <span className="text-[10px] font-mono text-quantum-400 font-bold">
                        {record.abacPolicy.combinator} LOGIC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {record.abacPolicy.description}
                    </p>
                  </div>

                  {/* Ciphertext Telemetry */}
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Enveloped DEK: 1088 Bytes (ML-KEM)</span>
                    <span>IV: 12B • Tag: 16B</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Created by: <span className="text-slate-300">{record.createdByName}</span>
                  </div>

                  <button
                    onClick={() => handleInspectRecord(record)}
                    className="flex items-center space-x-1.5 rounded-lg bg-quantum-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-quantum-500 transition"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Evaluate & Decrypt</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 space-y-3">
            <FileText className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No EHR records matched your filter</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your search query, department filter, or click &quot;Encrypt New EHR&quot; to add a new record.
            </p>
          </div>
        )}
      </main>

      {/* Decryption Inspector Modal */}
      {modalOpen && (
        <DecryptionModal
          record={selectedRecord}
          decryptionResult={decryptionResult}
          isDecrypting={isDecrypting}
          onClose={() => setModalOpen(false)}
          onRetry={() => selectedRecord && handleInspectRecord(selectedRecord)}
        />
      )}
    </div>
  );
}
