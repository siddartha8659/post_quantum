'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { AuditLogEntry } from '@/types/ehr';

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('ALL');
  const [selectedEventType, setSelectedEventType] = useState('ALL');

  // Ledger verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    verifiedBlocksCount: number;
    errorBlockIndex?: number;
    tipHash: string;
  } | null>(null);

  const loadAuditLogs = async () => {
    const logs = await ehrRepository.getAuditLogs();
    setAuditLogs(logs);
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleVerifyLedger = async () => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 600)); // Visual simulation of traversal
    const res = await ehrRepository.verifyAuditLedgerIntegrity();
    setVerificationResult(res);
    setIsVerifying(false);
  };

  const filteredLogs = auditLogs.filter((entry) => {
    const matchesSearch =
      entry.userName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (entry.recordTitle && entry.recordTitle.toLowerCase().includes(searchFilter.toLowerCase())) ||
      entry.eventType.toLowerCase().includes(searchFilter.toLowerCase()) ||
      entry.sha3Hash.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesOutcome = selectedOutcome === 'ALL' || entry.outcome === selectedOutcome;
    const matchesEvent = selectedEventType === 'ALL' || entry.eventType === selectedEventType;

    return matchesSearch && matchesOutcome && matchesEvent;
  });

  return (
    <div className="min-h-screen quantum-grid-bg flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-quantum-950 text-quantum-400 border border-quantum-800 shadow">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Immutable Security Audit Log Ledger
                </h1>
                <p className="text-xs text-slate-400">
                  SHA3-512 Cryptographic Hash Chaining & FIPS 204 ML-DSA-65 Tamper-Proof Clinical Telemetry
                </p>
              </div>
            </div>

            <button
              onClick={handleVerifyLedger}
              disabled={isVerifying}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 transition"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Traversing Hash Chain...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify Ledger Integrity</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* LEDGER INTEGRITY VERIFICATION BANNER */}
        {verificationResult && (
          <div
            className={`rounded-2xl border p-5 shadow-xl transition-all ${
              verificationResult.valid
                ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-200'
                : 'border-rose-800/80 bg-rose-950/40 text-rose-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {verificationResult.valid ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                ) : (
                  <XCircle className="h-8 w-8 text-rose-400" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {verificationResult.valid
                      ? 'Ledger Cryptographic Integrity Fully Verified'
                      : 'Cryptographic Hash Chain Tampering Detected!'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {verificationResult.valid
                      ? `Successfully validated all ${verificationResult.verifiedBlocksCount} chronological blocks. Zero bit modifications or history rewrites.`
                      : `Chain verification failed at block index ${verificationResult.errorBlockIndex}.`}
                  </p>
                </div>
              </div>

              <span className="rounded bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-300 border border-slate-700">
                Tip: {verificationResult.tipHash.slice(0, 16)}...
              </span>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter audit records by actor, record, hash..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={selectedOutcome}
              onChange={(e) => setSelectedOutcome(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Outcomes</option>
              <option value="GRANTS">GRANTS (Access Permitted)</option>
              <option value="DENIED">DENIED (Policy Violation)</option>
              <option value="BREAK_GLASS">BREAK_GLASS (Emergency)</option>
            </select>

            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="DECRYPTION_ATTEMPT">Decryption Attempts</option>
              <option value="RECORD_CREATED">Record Creation</option>
              <option value="BREAK_GLASS_ACCESS">Emergency Overrides</option>
              <option value="ATTRIBUTE_REVOKED">Attribute Revocations</option>
            </select>
          </div>
        </div>

        {/* Audit Log Stream Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Outcome</th>
                  <th className="p-3.5">Timestamp (UTC)</th>
                  <th className="p-3.5">Clinician Actor</th>
                  <th className="p-3.5">Target Record / Event</th>
                  <th className="p-3.5">Evaluation Diagnostics</th>
                  <th className="p-3.5">SHA3-512 Hash Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-850/60 transition">
                    {/* Outcome Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          entry.outcome === 'GRANTS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                            : entry.outcome === 'BREAK_GLASS'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/80 animate-pulse'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                        }`}
                      >
                        {entry.outcome}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="p-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>

                    {/* Clinician Actor */}
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-semibold text-white">{entry.userName}</p>
                      <p className="text-[11px] text-slate-400">{entry.userRole}</p>
                    </td>

                    {/* Target Record */}
                    <td className="p-3.5">
                      <p className="font-semibold text-white">
                        {entry.recordTitle || entry.eventType}
                      </p>
                      <span className="text-[10px] font-mono text-quantum-400">
                        {entry.eventType}
                      </span>
                    </td>

                    {/* Diagnostic Reason */}
                    <td className="p-3.5 max-w-xs text-[11px] text-slate-400">
                      {entry.reason}
                    </td>

                    {/* SHA3-512 Hash & Signature */}
                    <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex flex-col space-y-0.5">
                        <span className="text-quantum-300 font-bold" title={entry.sha3Hash}>
                          H: {entry.sha3Hash.slice(0, 16)}...
                        </span>
                        <span className="text-slate-500 text-[10px]" title={entry.previousHash}>
                          Prev: {entry.previousHash.slice(0, 12)}...
                        </span>
                        <span className="text-purple-400 text-[10px]">
                          Sig: {entry.signature}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              No audit log entries matched the filter criteria.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
