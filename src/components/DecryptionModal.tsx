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
  Calendar,
  Info,
  Layers,
} from 'lucide-react';
import { EhrRecord, DecryptionResult, FhirEhrPayload, getCanonicalRole, FhirCondition } from '@/types/ehr';
import { anonymizeFhirPayload } from '@/lib/data/seedData';
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
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'clinical' | 'vitals' | 'conditions' | 'meds' | 'allergies' | 'notes' | 'raw'>('clinical');
  const [copiedJson, setCopiedJson] = useState(false);

  if (!record) return null;

  const isResearcher = currentUser ? getCanonicalRole(currentUser.role) === 'researcher' : false;
  const rawPayload: FhirEhrPayload | undefined = decryptionResult?.decryptedPayload;
  const payload = rawPayload && isResearcher ? anonymizeFhirPayload(rawPayload) : rawPayload;
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
                      {decryptionResult?.error ||
                        'The evaluating identity does not satisfy the cryptographically required attributes encoded within this EHR envelope. Decapsulation of the AES-256 DEK was blocked.'}
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
                  {decryptionResult?.evaluationTrace?.steps && decryptionResult.evaluationTrace.steps.length > 0 ? (
                    decryptionResult.evaluationTrace.steps.map((step, idx) => (
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
                    ))
                  ) : (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-200">Zero Cross-Department / Boundary Barrier Active</p>
                      <p className="text-[11px] text-slate-400">
                        {decryptionResult?.error ||
                          'The cryptographic access control barrier rejected the request before individual attribute evaluation.'}
                      </p>
                    </div>
                  )}
                </div>

                {Boolean(decryptionResult?.evaluationTrace?.denialReasons && decryptionResult.evaluationTrace.denialReasons.length > 0) && (
                  <div className="mt-3 rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <p className="text-xs font-semibold text-rose-300">Specific Denial Causes:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-xs text-slate-400">
                      {decryptionResult?.evaluationTrace?.denialReasons?.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended Emergency Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div>
                  <p className="text-xs font-semibold text-white">Need emergency clinical access?</p>
                  <p className="text-[11px] text-slate-400">
                    If this is a life-threatening patient scenario, initiate a cryptographically logged emergency override.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Break Glass Link */}
                  <Link
                    href={`/break-glass?patientId=${record.patientId}&recordId=${record.id}`}
                    className="flex items-center space-x-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-rose-500 transition"
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

              {/* Researcher Demographics Redaction Notice */}
              {isResearcher && (
                <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/30 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Clinical Research De-Identification Active (HIPAA Safe Harbor 45 CFR §164.514)</span>
                  </div>
                  <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-800/60">
                    ANONYMIZED COHORT
                  </span>
                </div>
              )}

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

              {/* TAB: CONDITIONS & CLINICAL DIAGNOSES */}
              {activeTab === 'conditions' && (
                <div className="space-y-4">
                  {/* Top Header & Clinical Stats Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/60 border border-red-800/60 text-red-400">
                        <Heart className="h-4 w-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                          Active Clinical Problem List & ICD-10 Diagnoses
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Longitudinal medical diagnoses verified under FIPS 203 encrypted FHIR condition registry
                        </p>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center space-x-2 text-[11px] font-mono">
                      <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-1 text-slate-300">
                        Total: <strong className="text-white">{payload.conditions.length}</strong>
                      </span>
                      <span className="rounded-full bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 text-emerald-300">
                        Active: <strong className="text-emerald-200">{payload.conditions.filter(c => c.clinicalStatus === 'active').length}</strong>
                      </span>
                      {payload.conditions.filter(c => c.clinicalStatus === 'recurrence').length > 0 && (
                        <span className="rounded-full bg-amber-950/70 border border-amber-800/60 px-2.5 py-1 text-amber-300">
                          Recurrent: <strong className="text-amber-200">{payload.conditions.filter(c => c.clinicalStatus === 'recurrence').length}</strong>
                        </span>
                      )}
                      {payload.conditions.filter(c => c.clinicalStatus === 'resolved').length > 0 && (
                        <span className="rounded-full bg-slate-950 border border-slate-700 px-2.5 py-1 text-slate-400">
                          Resolved: <strong className="text-slate-300">{payload.conditions.filter(c => c.clinicalStatus === 'resolved').length}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conditions List */}
                  <div className="space-y-3">
                    {payload.conditions.map((cond, i) => {
                      const codeUpper = (cond.code || '').toUpperCase();
                      const dispLower = (cond.display || '').toLowerCase();

                      // Clinical enrichment data per diagnosis
                      let category = 'Cardiovascular Condition';
                      let severity = 'Mild';
                      let severityBadge = 'border-cyan-800/60 bg-cyan-950/40 text-cyan-300';
                      let diagnosticTool = '12-Lead ECG & Transthoracic Echo';
                      let clinicalPoints: string[] = [
                        'Clinical presentation consistent with diagnostic coding parameters.',
                        'Longitudinal telemetry stable with regular medication adherence.',
                        'No evidence of acute hemodynamic compromise.',
                        'Recommendation: Scheduled annual clinical review and surveillance.',
                      ];

                      if (codeUpper.includes('I34') || dispLower.includes('mitral')) {
                        category = 'Valvular Heart Disease';
                        severity = 'Mild (Grade 1)';
                        severityBadge = 'border-cyan-800/60 bg-cyan-950/40 text-cyan-300';
                        diagnosticTool = '2D Transthoracic Echocardiogram & Color Doppler';
                        clinicalPoints = [
                          'Posterior mitral leaflet redundancy with 2.1mm late-systolic billowing into left atrium.',
                          'Color Doppler reveals trace trivial regurgitant jet; hemodynamically benign with peak gradient 3.2 mmHg.',
                          'Left ventricular dimensions fully preserved: LVEDD 44 mm, LVESD 28 mm, Ejection Fraction 62%.',
                          'Absence of chordal rupture, annular dilatation, or secondary pulmonary hypertension (PASP 22 mmHg).',
                          'Clinical Plan: Conservative outpatient surveillance, annual echocardiography, prophylactic antibiotic not required.',
                        ];
                      } else if (codeUpper.includes('R00') || dispLower.includes('bradycardia')) {
                        category = 'Electrophysiology / Autonomic Tone';
                        severity = 'Physiologic / Benign';
                        severityBadge = 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300';
                        diagnosticTool = '24-Hour Ambulatory Holter Monitor & 12-Lead ECG';
                        clinicalPoints = [
                          'Resting nocturnal heart rates averaging 52–58 bpm during deep non-REM sleep cycles.',
                          'High parasympathetic (vagal) tone consistent with aerobic cardiovascular conditioning.',
                          'Normal chronotropic competence demonstrated on treadmill stress testing (maximum HR 172 bpm, 98% predicted).',
                          'PR interval 148 ms, QRS duration 86 ms, QTc 418 ms; absence of pauses > 2.0 seconds.',
                          'Clinical Plan: Clinical reassurance provided; no pacemaker intervention or pharmacotherapy needed.',
                        ];
                      } else if (codeUpper.includes('I47') || codeUpper.includes('I49') || dispLower.includes('tachycardia') || dispLower.includes('pac')) {
                        category = 'Supraventricular Arrhythmia';
                        severity = 'Mild-Moderate (Stress-Triggered)';
                        severityBadge = 'border-amber-800/60 bg-amber-950/40 text-amber-300';
                        diagnosticTool = 'Event Cardiac Telemetry & Serum Electrolytes';
                        clinicalPoints = [
                          'Infrequent self-limiting episodes of sudden palpitations lasting 1–3 minutes during acute cognitive stressors.',
                          'Isolated premature atrial contractions (PACs) with overall ectopic burden < 1.1% over 48 hours.',
                          'Serum electrolytes within optimal electrophysiologic balance (K+ 4.2 mEq/L, Mg2+ 2.1 mg/dL, TSH 1.8 mIU/L).',
                          'Absence of Wolff-Parkinson-White delta waves, AV nodal re-entrant circuits, or atrial fibrillation triggers.',
                          'Clinical Plan: Low-dose beta-blocker titration (Metoprolol 25mg QD), caffeine reduction, stress biofeedback.',
                        ];
                      } else if (codeUpper.includes('I10') || dispLower.includes('hypertension')) {
                        category = 'Systemic Vascular Disease';
                        severity = 'Stage 1 (Borderline Trend)';
                        severityBadge = 'border-amber-800/60 bg-amber-950/40 text-amber-300';
                        diagnosticTool = 'Serial Outpatient Sphygmomanometry & Renal Panel';
                        clinicalPoints = [
                          'Clinic blood pressure readings fluctuating between 128/82 and 136/88 mmHg across 3 consecutive assessments.',
                          'Renal ultrasound and serum creatinine (0.9 mg/dL) confirm absence of renovascular pathology.',
                          'Funduscopic examination shows no arteriolar narrowing or hypertensive retinopathy (Keith-Wagener Grade 0).',
                          'Urine albumin-to-creatinine ratio (UACR) < 15 mg/g, confirming preserved glomerular barrier integrity.',
                          'Clinical Plan: Dietary Approaches to Stop Hypertension (DASH) protocol, sodium restriction < 2g/day, bi-weekly home BP log.',
                        ];
                      } else if (codeUpper.includes('G90') || dispLower.includes('orthostatic') || dispLower.includes('vasovagal')) {
                        category = 'Neurovascular / Dysautonomia';
                        severity = 'Mild Episodic';
                        severityBadge = 'border-purple-800/60 bg-purple-950/40 text-purple-300';
                        diagnosticTool = 'Active Stand Test & Autonomic Reflex Profile';
                        clinicalPoints = [
                          'Transient postural lightheadedness occurring predominantly upon rapid transition from supine to upright posture.',
                          'Active standing test demonstrated 16 mmHg systolic decrease with spontaneous autoregulation within 40 seconds.',
                          'Absence of syncopal loss of consciousness, pre-syncope collapse, or associated motor phenomena.',
                          'Cardiac autonomic reflexes intact with normal Valsalva maneuver response ratio (1.45).',
                          'Clinical Plan: Maintenance of oral fluid intake (2.5L/day), lower-limb isometric counterpressure maneuvers.',
                        ];
                      } else if (codeUpper.includes('E78') || dispLower.includes('cholesterol')) {
                        category = 'Metabolic & Lipid Disorder';
                        severity = 'Moderate Dyslipidemia';
                        severityBadge = 'border-amber-800/60 bg-amber-950/40 text-amber-300';
                        diagnosticTool = 'Fasting Lipid Electrophoresis & ApoB Immunoassay';
                        clinicalPoints = [
                          'Total cholesterol 218 mg/dL with LDL-C 138 mg/dL, HDL-C 52 mg/dL, Triglycerides 140 mg/dL.',
                          'Atherosclerotic Cardiovascular Disease (ASCVD) 10-year risk profile quantified at 3.8% (low-borderline).',
                          'Liver enzymes AST 22 U/L, ALT 24 U/L within normal baseline prior to statin optimization.',
                          'Absence of tendon xanthomas or corneal arcus on physical examination.',
                          'Clinical Plan: Atorvastatin 20mg nocte titration, Mediterranean cardiovascular dietary regimen, repeat lipid panel in 90 days.',
                        ];
                      } else if (codeUpper.includes('C34') || codeUpper.includes('C50') || dispLower.includes('carcinoma') || dispLower.includes('lung') || dispLower.includes('cancer')) {
                        category = 'Thoracic Oncology / Neoplasm';
                        severity = 'Stage IIB (Active Targeted Regimen)';
                        severityBadge = 'border-rose-800/60 bg-rose-950/40 text-rose-300';
                        diagnosticTool = 'Contrast PET-CT & Molecular Targeted Biomarker Panel';
                        clinicalPoints = [
                          'Restaging fluorodeoxyglucose (FDG) PET-CT reveals 42% decrease in SUVmax of right upper lobe primary lesion.',
                          'EGFR exon 19 deletion identified via next-generation sequencing (NGS); absence of T790M resistance mutation.',
                          'Complete blood count shows stable bone marrow function: Hemoglobin 12.8 g/dL, ANC 3,200/mcL, Platelets 210,000/mcL.',
                          'Absence of distant visceral, skeletal, or central nervous system metastasis.',
                          'Clinical Plan: Continuation of Osimertinib 80mg targeted oral therapy, 3-month cycle evaluation.',
                        ];
                      } else if (codeUpper.includes('S27') || codeUpper.includes('S22') || dispLower.includes('trauma') || dispLower.includes('pneumothorax')) {
                        category = 'Acute Thoracic Trauma';
                        severity = 'Critical (Post-Resuscitation Stable)';
                        severityBadge = 'border-rose-800/60 bg-rose-950/40 text-rose-300';
                        diagnosticTool = 'Emergency CT Pan-Scan & Bedside Focused Sonography (eFAST)';
                        clinicalPoints = [
                          'Right traumatic hemopneumothorax following motor vehicle collision with 35% pulmonary parenchymal collapse.',
                          'Immediate 28 Fr intercostal thoracostomy tube placed; 250 mL non-coagulated blood evacuated with immediate air egress.',
                          'Post-intervention chest radiography confirms > 90% right lung re-expansion with water-seal oscillation.',
                          'Multiple non-displaced fractures of right 4th, 5th, and 6th ribs without flail chest segment.',
                          'Clinical Plan: Continuous underwater chest drainage monitoring, multimodal IV analgesia, pulmonary toilet protocol.',
                        ];
                      }

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 hover:border-slate-700 transition"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-mono font-bold text-quantum-300 border border-slate-700">
                                  ICD-10: {cond.code}
                                </span>
                                <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-[10px] text-slate-300 flex items-center space-x-1">
                                  <Layers className="h-3 w-3 text-slate-400" />
                                  <span>{category}</span>
                                </span>
                                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${severityBadge}`}>
                                  {severity}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white tracking-tight">
                                {cond.display}
                              </h4>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span
                                className={`rounded px-2.5 py-1 text-[11px] font-bold uppercase border ${
                                  cond.clinicalStatus === 'active'
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                    : cond.clinicalStatus === 'recurrence'
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                    : cond.clinicalStatus === 'resolved'
                                    ? 'bg-slate-900 text-slate-400 border-slate-700'
                                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                }`}
                              >
                                {cond.clinicalStatus}
                              </span>
                            </div>
                          </div>

                          {/* Diagnostic Info Line */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="h-3 w-3 text-quantum-400" />
                              <span>Onset: <strong className="text-slate-200">{cond.onsetDate}</strong></span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center space-x-1.5">
                              <Info className="h-3 w-3 text-cyan-400" />
                              <span>Confirmation: <span className="text-slate-300">{diagnosticTool}</span></span>
                            </div>
                          </div>

                          {/* Detailed Clinical Findings / Demo Points */}
                          <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 p-3 space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Clinical Assessment & Diagnostic Findings:
                            </p>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {clinicalPoints.map((point, ptIdx) => (
                                <li key={ptIdx} className="flex items-start space-x-2">
                                  <span className="text-quantum-400 font-bold mt-0.5">•</span>
                                  <span className="leading-relaxed">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
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
