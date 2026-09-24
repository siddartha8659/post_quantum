'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Copy,
  Check,
  Heart,
  Pill,
  Activity,
  FileSpreadsheet,
  AlertTriangle,
  Stethoscope,
  Terminal,
} from 'lucide-react';
import { EhrRecord, DecryptionResult, FhirEhrPayload } from '@/types/ehr';
import { useAuth } from '@/context/AuthContext';

interface DecryptionModalProps {
  record: EhrRecord | null;
  decryptionResult: DecryptionResult | null;
  isDecrypting: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export function DecryptionModal({
  record,
  decryptionResult,
  isDecrypting,
  onClose,
  onRetry,
}: DecryptionModalProps) {
  const { currentUser, switchUser, profiles } = useAuth();
  const [activeTab, setActiveTab] = useState<'clinical' | 'vitals' | 'meds' | 'allergies' | 'notes' | 'raw'>('clinical');
  const [copiedJson, setCopiedJson] = useState(false);

  if (!record) return null;

  const payload: FhirEhrPayload | undefined = decryptionResult?.decryptedPayload;
  const isGranted = decryptionResult?.success === true;
  const isDenied = decryptionResult && !decryptionResult.success;

  const handleCopyJson = () => {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl p-2 ${
                isGranted
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                  : isDenied
                  ? 'bg-rose-950 text-rose-400 border border-rose-800/80'
                  : 'bg-quantum-950 text-quantum-300 border border-quantum-800/80'
              }`}
            >
              {isGranted ? (
                <Unlock className="h-5 w-5" />
              ) : isDenied ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {record.recordTitle}
                </h3>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-300 border border-slate-700">
                  {record.patientId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Department: <span className="text-quantum-400 font-medium">{record.department}</span> •
                Classification Level: Tier-{record.classificationLevel} • KEM: {record.kemAlgorithm}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cryptographic Pipeline Status Bar */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/40 text-center py-2.5 px-4 text-xs font-mono">
          <div className="flex items-center justify-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5 text-quantum-400" />
            <span className="text-slate-400">FIPS 203 ML-KEM-768:</span>
            <span className="text-slate-200">1088B CT</span>
          </div>

          <div className="flex items-center justify-center space-x-1.5 border-x border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">AES-256-GCM:</span>
            <span className="text-slate-200">Grover-Resistant</span>
          </div>

          <div className="flex items-center justify-center space-x-1.5">
            <Activity className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-slate-400">Latency:</span>
            <span className="text-emerald-400 font-bold">
              {decryptionResult?.decryptionTimeMs ?? 0} ms
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* DECRYPTION IN PROGRESS */}
          {isDecrypting && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute h-full w-full animate-spin rounded-full border-4 border-quantum-500/20 border-t-quantum-400"></div>
                <Cpu className="h-8 w-8 text-quantum-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Executing Post-Quantum ABAC Evaluation...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Parsing subject attributes, computing ML-KEM-768 decapsulation, unrolling AES-256-GCM
                </p>
              </div>
            </div>
          )}

          {/* ACCESS DENIED STATE */}
          {isDenied && (
            <div className="space-y-6">
              <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4">
                <div className="flex items-start space-x-3">
                  <AlertOctagon className="h-6 w-6 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-rose-200">
                      Cryptographic Access Denied: ABAC Policy Violation
                    </h4>
                    <p className="text-xs text-rose-300/80">
                      The evaluating clinician does not satisfy the cryptographically required attributes
                      encoded within this EHR envelope. Decapsulation of the AES-256 DEK was blocked.
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnostic Attribute Breakdown */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-quantum-400" />
                  <span>Attribute Policy Evaluation Diagnostic Trace</span>
                </h5>

                <div className="space-y-2">
                  {decryptionResult?.evaluationTrace.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg p-3 text-xs border ${
                        step.passed
                          ? 'border-emerald-800/40 bg-emerald-950/20 text-emerald-300'
                          : 'border-rose-800/40 bg-rose-950/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {step.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-mono font-bold text-slate-200">{step.field}</span>
                          <span className="text-slate-400 mx-2">{step.operator}</span>
                          <span className="font-mono font-semibold text-slate-300">
                            {JSON.stringify(step.requiredValue)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] mr-2">Actual:</span>
                        <span
                          className={`font-mono font-bold ${
                            step.passed ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {String(step.actualValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {decryptionResult?.evaluationTrace.denialReasons.length > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <p className="text-xs font-semibold text-rose-300">Specific Denial Causes:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-xs text-slate-400">
                      {decryptionResult.evaluationTrace.denialReasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div>
                  <p className="text-xs font-semibold text-white">Need immediate access?</p>
                  <p className="text-[11px] text-slate-400">
                    Switch to an authorized clinician persona, or trigger emergency trauma override.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Switch to Dr. Sarah Rao */}
                  <button
                    onClick={() => {
                      const authorized = profiles.find((p) => p.department === record.department);
                      if (authorized) {
                        switchUser(authorized.id);
                        setTimeout(onRetry, 100);
                      }
                    }}
                    className="rounded-lg bg-quantum-600/20 border border-quantum-500/40 px-3 py-1.5 text-xs font-semibold text-quantum-300 hover:bg-quantum-600/30"
                  >
                    Switch to {record.department} Clinician
                  </button>

                  {/* Break Glass Link */}
                  <Link
                    href={`/break-glass?patientId=${record.patientId}&recordId=${record.id}`}
                    className="flex items-center space-x-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-500"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Emergency Break-Glass</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ACCESS GRANTED STATE: DECRYPTED FHIR CLINICAL RECORD */}
          {isGranted && payload && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-200">
                      Decryption Verified & Payload Unrolled
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                      ML-KEM-768 shared secret recovered • AES-256-GCM authentication tag verified in{' '}
                      {decryptionResult.decryptionTimeMs} ms
                    </p>
                  </div>
                </div>

                {decryptionResult.isBreakGlass && (
                  <span className="rounded bg-rose-950 px-2.5 py-1 text-xs font-bold text-rose-300 border border-rose-800 animate-pulse">
                    EMERGENCY OVERRIDE ACCESS
                  </span>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex space-x-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
                {[
                  { id: 'clinical', label: 'Summary & Patient', icon: Stethoscope },
                  { id: 'vitals', label: 'Vitals & Labs', icon: Activity },
                  { id: 'conditions', label: 'Conditions', icon: Heart },
                  { id: 'meds', label: 'Medications', icon: Pill },
                  { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
                  { id: 'notes', label: 'Clinical Notes', icon: FileSpreadsheet },
                  { id: 'raw', label: 'FHIR JSON', icon: Terminal },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 transition ${
                        activeTab === tab.id
                          ? 'bg-quantum-950 text-quantum-300 border border-quantum-700/60 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: SUMMARY & DEMOGRAPHICS */}
              {activeTab === 'clinical' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Patient Demographics
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Full Legal Name:</span>
                        <span className="font-bold text-white">{payload.demographics.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Date of Birth:</span>
                        <span className="font-mono text-slate-200">{payload.demographics.dob}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Gender / Blood Type:</span>
                        <span className="font-semibold text-quantum-400">
                          {payload.demographics.gender} • {payload.demographics.bloodType}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Medical Record Number (MRN):</span>
                        <span className="font-mono text-slate-300">{payload.demographics.mrn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Emergency Contact:</span>
                        <span className="text-slate-300">{payload.demographics.emergencyContact}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Active Primary Diagnoses
                    </h5>
                    <div className="space-y-2">
                      {payload.conditions.map((cond, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-slate-900 p-2.5 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">{cond.display}</p>
                            <p className="text-[11px] text-slate-400 font-mono">ICD-10: {cond.code}</p>
                          </div>
                          <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400 border border-emerald-800">
                            {cond.clinicalStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VITALS & LABS */}
              {activeTab === 'vitals' && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    FHIR Observation Observations & Laboratory Values
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {payload.vitalSigns.map((obs, i) => (
                      <div
                        key={i}
                        className={`rounded-xl p-3 border ${
                          obs.status === 'critical'
                            ? 'border-rose-800/80 bg-rose-950/30'
                            : obs.status === 'abnormal'
                            ? 'border-amber-800/80 bg-amber-950/30'
                            : 'border-slate-800 bg-slate-900/80'
                        }`}
                      >
                        <p className="text-xs text-slate-400">{obs.display}</p>
                        <p className="text-xl font-black text-white mt-1">
                          {obs.value}{' '}
                          <span className="text-xs font-normal text-slate-400">{obs.unit}</span>
                        </p>
                        <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Ref: {obs.referenceRange || 'N/A'}</span>
                          <span
                            className={`font-bold uppercase ${
                              obs.status === 'critical'
                                ? 'text-rose-400'
                                : obs.status === 'abnormal'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {obs.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: MEDICATIONS */}
              {activeTab === 'meds' && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Active Medications & Regimen
                  </h5>
                  <div className="space-y-2">
                    {payload.medications.map((med, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-slate-900 p-3 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <Pill className="h-4 w-4 text-quantum-400" />
                          <div>
                            <p className="font-bold text-white">{med.medication}</p>
                            <p className="text-[11px] text-slate-400">
                              Dosage: {med.dosage} • Route: {med.route}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-300">{med.frequency}</span>
                          <p className="text-[10px] text-emerald-400 uppercase font-bold">{med.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: ALLERGIES */}
              {activeTab === 'allergies' && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Known Drug Allergies & Critical Contraindications
                  </h5>
                  <div className="space-y-2">
                    {payload.allergies.map((allergy, i) => (
                      <div
                        key={i}
                        className={`rounded-xl p-3 border flex items-start space-x-3 ${
                          allergy.criticality === 'FATAL' || allergy.criticality === 'HIGH'
                            ? 'border-rose-800/80 bg-rose-950/40'
                            : 'border-amber-800/80 bg-amber-950/30'
                        }`}
                      >
                        <AlertTriangle
                          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            allergy.criticality === 'FATAL' ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-white text-xs">{allergy.substance}</p>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                allergy.criticality === 'FATAL'
                                  ? 'bg-rose-900 text-rose-200 border border-rose-600'
                                  : 'bg-amber-900 text-amber-200'
                              }`}
                            >
                              {allergy.criticality} CRITICALITY
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">Reaction: {allergy.reaction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: CLINICAL NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Physician Clinical Documentation
                    </h5>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {payload.clinicalNotes}
                    </p>
                  </div>

                  {payload.confidentialNotes && (
                    <div className="rounded-xl border border-purple-800/60 bg-purple-950/30 p-4 space-y-2">
                      <h5 className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Confidential Genomic / Specialized Restrictions</span>
                      </h5>
                      <p className="text-xs text-purple-200/90 leading-relaxed whitespace-pre-wrap">
                        {payload.confidentialNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: RAW FHIR JSON */}
              {activeTab === 'raw' && (
                <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <button
                    onClick={handleCopyJson}
                    className="absolute right-3 top-3 flex items-center space-x-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>

                  <pre className="overflow-x-auto text-[11px] font-mono text-quantum-300 max-h-96">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span>Evaluating Clinician:</span>
            <span className="font-semibold text-white">{currentUser?.fullName}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-quantum-400 font-mono">
              Tier-{currentUser?.clearanceLevel}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700 transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
