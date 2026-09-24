'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  Lock,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import {
  encryptAes256Gcm,
  envelopeWrapDek,
  getRandomBytes,
  MASTER_HOSPITAL_AUTHORITY_KEYPAIR,
} from '@/lib/crypto/pqcCryptoService';
import { AbacPolicy, AbacCondition, FhirEhrPayload, Department } from '@/types/ehr';

export default function NewRecordPage() {
  const { currentUser } = useAuth();

  // Form State: Patient Demographics & Clinical Information
  const [patientId, setPatientId] = useState('PT-' + Math.floor(10000 + Math.random() * 90000));
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState('1985-05-12');
  const [gender, setGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [bloodType, setBloodType] = useState('O-Positive');
  const [department, setDepartment] = useState<Department>('Oncology');
  const [classificationLevel, setClassificationLevel] = useState<number>(2);
  const [recordTitle, setRecordTitle] = useState('');
  const [diagnosisDisplay, setDiagnosisDisplay] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('C50.91');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [confidentialNotes, setConfidentialNotes] = useState('');

  // Policy Builder State
  const [policyPreset, setPolicyPreset] = useState<string>('CUSTOM');
  const [policyName, setPolicyName] = useState('Custom Clinical Access Policy');
  const [policyDescription, setPolicyDescription] = useState('Fine-grained ABAC condition tree.');
  const [policyCombinator, setPolicyCombinator] = useState<'AND' | 'OR'>('AND');
  const [requiredClearance, setRequiredClearance] = useState<number>(2);
  const [conditions, setConditions] = useState<AbacCondition[]>([
    { field: 'department', operator: '==', value: 'Oncology', description: 'Requires Oncology Department affiliation' },
  ]);

  // Submission / Encryption State
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState<string>('');
  const [successRecordId, setSuccessRecordId] = useState<string | null>(null);

  // Policy Presets
  const handlePresetSelect = (preset: string) => {
    setPolicyPreset(preset);
    if (preset === 'ONCO_HIGH') {
      setPolicyName('Oncology Specialist High-Clearance Policy');
      setPolicyDescription('Restricted strictly to Board-Certified Oncologists with Tier-3 Clearance.');
      setPolicyCombinator('AND');
      setRequiredClearance(3);
      setConditions([
        { field: 'department', operator: '==', value: 'Oncology' },
        { field: 'role', operator: '==', value: 'Oncologist' },
      ]);
    } else if (preset === 'EMERGENCY_RAPID') {
      setPolicyName('Emergency Trauma Urgent Care Protocol');
      setPolicyDescription('Accessible by Emergency personnel Tier-2+ and Emergency Break-Glass.');
      setPolicyCombinator('AND');
      setRequiredClearance(2);
      setConditions([
        { field: 'department', operator: '==', value: 'Emergency' },
      ]);
    } else if (preset === 'RESEARCH_OPEN') {
      setPolicyName('Multi-Institution Epidemiology Cohort Access');
      setPolicyDescription('Open to any licensed Epidemiologist or Research Personnel.');
      setPolicyCombinator('OR');
      setRequiredClearance(1);
      setConditions([
        { field: 'role', operator: '==', value: 'Epidemiologist' },
        { field: 'department', operator: '==', value: 'Research' },
      ]);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'role', operator: '==', value: 'Oncologist', description: '' },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updated: Partial<AbacCondition>) => {
    const copy = [...conditions];
    copy[index] = { ...copy[index], ...updated };
    setConditions(copy);
  };

  const handleCreateAndEncrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsEncrypting(true);

    try {
      // Step 1: Assemble Standard FHIR Record
      setEncryptionStep('Structuring FHIR JSON payload and clinical observations...');
      await new Promise((r) => setTimeout(r, 400));

      const fhirPayload: FhirEhrPayload = {
        resourceType: 'PatientRecord',
        patientId,
        demographics: {
          name: patientName || 'Eleanor Vance',
          dob,
          gender,
          bloodType,
          mrn: `MRN-${department.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
          emergencyContact: 'Primary Kin / Attending Guardian (+1 555-0199)',
        },
        vitalSigns: [
          { code: '8867-4', display: 'Heart Rate', value: '72', unit: 'bpm', referenceRange: '60-100', date: new Date().toISOString().split('T')[0], status: 'normal' },
          { code: '8480-6', display: 'Blood Pressure Systolic', value: '120', unit: 'mmHg', referenceRange: '90-120', date: new Date().toISOString().split('T')[0], status: 'normal' },
        ],
        conditions: [
          {
            code: diagnosisCode,
            display: diagnosisDisplay || 'Clinical Observation Evaluated',
            clinicalStatus: 'active',
            onsetDate: new Date().toISOString().split('T')[0],
          },
        ],
        medications: [
          { medication: 'Standard Clinical Regimen', dosage: 'Per Protocol', frequency: 'Daily', route: 'Oral', status: 'active' },
        ],
        allergies: [],
        clinicalNotes: clinicalNotes || 'Standard clinical examination performed. Vitals stable.',
        confidentialNotes: confidentialNotes || undefined,
        lastUpdated: new Date().toISOString(),
      };

      // Step 2: Generate AES-256 Symmetric DEK
      setEncryptionStep('Generating 256-bit AES Data Encryption Key (DEK) via CSPRNG...');
      await new Promise((r) => setTimeout(r, 400));
      const dek = getRandomBytes(32);

      // Step 3: Encrypt payload with AES-256-GCM
      setEncryptionStep('Encrypting FHIR record with AES-256-GCM (12B IV + 16B Auth Tag)...');
      await new Promise((r) => setTimeout(r, 400));
      const jsonPayload = JSON.stringify(fhirPayload);
      const encData = await encryptAes256Gcm(jsonPayload, dek);

      // Step 4: ML-KEM-768 Encapsulation
      setEncryptionStep('Executing FIPS 203 ML-KEM-768 Encapsulation (1088-byte ciphertext)...');
      await new Promise((r) => setTimeout(r, 500));
      const envelopedDek = await envelopeWrapDek(dek, MASTER_HOSPITAL_AUTHORITY_KEYPAIR.publicKeyBytes);

      // Step 5: Construct ABAC Policy Tree
      const abacPolicy: AbacPolicy = {
        name: policyName,
        description: policyDescription,
        combinator: policyCombinator,
        requiredClearance,
        conditions,
      };

      // Step 6: Commit to Supabase / Repository
      setEncryptionStep('Committing ciphertext to Supabase EHR table & generating SHA3-512 audit block...');
      await new Promise((r) => setTimeout(r, 400));

      const newRecord = await ehrRepository.createRecord({
        patientId,
        recordTitle: recordTitle || `${department} Clinical Assessment for ${patientName || 'Eleanor Vance'}`,
        department,
        classificationLevel: classificationLevel as any,
        encryptedPayload: encData.ciphertextBase64,
        payloadIv: encData.ivBase64,
        authTag: encData.authTagBase64,
        encapsulatedDek: envelopedDek,
        abacPolicy,
        createdBy: currentUser.id,
        createdByName: currentUser.fullName,
        kemAlgorithm: 'ML-KEM-768',
      }, fhirPayload);

      setSuccessRecordId(newRecord.id);
      setIsEncrypting(false);
    } catch (err: any) {
      console.error('Failed to encrypt record:', err);
      setIsEncrypting(false);
      alert('Encryption failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen quantum-grid-bg flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to EHR Directory</span>
        </Link>

        {/* Page Header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-quantum-950 text-quantum-400 border border-quantum-800 shadow">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Create & Encrypt New EHR
              </h1>
              <p className="text-xs text-slate-400">
                Hybrid FIPS 203 ML-KEM-768 Encapsulation & AES-256-GCM Patient Record Generator
              </p>
            </div>
          </div>
        </div>

        {/* SUCCESS STATE */}
        {successRecordId ? (
          <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/40 p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-200">
              Record Encrypted & Enveloped Successfully!
            </h2>
            <p className="text-xs text-emerald-300/80 max-w-lg mx-auto">
              Your patient EHR has been encrypted with a 256-bit symmetric DEK, encapsulated using
              FIPS 203 ML-KEM-768 (1088-byte ciphertext), committed to the database, and stamped into the
              tamper-proof SHA3-512 audit chain.
            </p>

            <div className="pt-4 flex items-center justify-center space-x-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-quantum-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-quantum-500 shadow"
              >
                Inspect in EHR Directory
              </Link>
              <button
                onClick={() => {
                  setSuccessRecordId(null);
                  setPatientName('');
                  setRecordTitle('');
                  setClinicalNotes('');
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Encrypt Another Record
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateAndEncrypt} className="space-y-6">
            {/* STEP 1: PATIENT DEMOGRAPHICS & CLINICAL DATA */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4 text-quantum-400" />
                  <span>1. Patient Clinical Demographics (FHIR Resource)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Plaintext fields that will be transformed into FHIR JSON and encrypted with AES-256-GCM.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Patient ID / MRN</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-quantum-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-quantum-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-quantum-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Blood Type</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="A-Positive">A-Positive</option>
                    <option value="A-Negative">A-Negative</option>
                    <option value="B-Positive">B-Positive</option>
                    <option value="B-Negative">B-Negative</option>
                    <option value="O-Positive">O-Positive</option>
                    <option value="O-Negative (Universal)">O-Negative (Universal Donor)</option>
                    <option value="AB-Positive">AB-Positive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department Scope</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Oncology">Oncology</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Research">Research</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Classification Level</label>
                  <select
                    value={classificationLevel}
                    onChange={(e) => setClassificationLevel(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="1">Tier-1 Minimum</option>
                    <option value="2">Tier-2 Minimum</option>
                    <option value="3">Tier-3 Minimum</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Record Title / Summary
                  </label>
                  <input
                    type="text"
                    value={recordTitle}
                    onChange={(e) => setRecordTitle(e.target.value)}
                    placeholder="e.g. Oncology Targeted Genomic Biopsy & Chemotherapy Regimen"
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-quantum-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Primary Clinical Diagnosis
                    </label>
                    <input
                      type="text"
                      value={diagnosisDisplay}
                      onChange={(e) => setDiagnosisDisplay(e.target.value)}
                      placeholder="e.g. Invasive Ductile Carcinoma (Stage IIB)"
                      required
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-quantum-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ICD-10 Diagnostic Code
                    </label>
                    <input
                      type="text"
                      value={diagnosisCode}
                      onChange={(e) => setDiagnosisCode(e.target.value)}
                      placeholder="e.g. C50.91"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-quantum-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Attending Physician Notes
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Enter comprehensive clinical assessment, treatment schedule, lab findings..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-quantum-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1">
                    Confidential Genomic / Specialized Restrictions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={confidentialNotes}
                    onChange={(e) => setConfidentialNotes(e.target.value)}
                    placeholder="Protected genomic markers, sensitive psychiatric evaluations, trial protocols..."
                    className="w-full rounded-lg border border-purple-900/60 bg-purple-950/20 p-3 text-xs text-purple-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: ABAC ACCESS CONTROL POLICY BUILDER */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-quantum-400" />
                    <span>2. ABAC Access Control Policy Definition</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defines mathematical attribute constraints required to decapsulate the ML-KEM envelope.
                  </p>
                </div>

                {/* Preset Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-medium">Templates:</span>
                  <select
                    value={policyPreset}
                    onChange={(e) => handlePresetSelect(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-quantum-300 font-semibold focus:outline-none"
                  >
                    <option value="CUSTOM">Custom Rule Tree</option>
                    <option value="ONCO_HIGH">Oncology Specialist Tier-3</option>
                    <option value="EMERGENCY_RAPID">Emergency Trauma Care Tier-2</option>
                    <option value="RESEARCH_OPEN">Epidemiology Research Open</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Policy Title</label>
                  <input
                    type="text"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Combinator Logic</label>
                  <select
                    value={policyCombinator}
                    onChange={(e) => setPolicyCombinator(e.target.value as 'AND' | 'OR')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono font-bold focus:outline-none"
                  >
                    <option value="AND">AND (All conditions must be satisfied)</option>
                    <option value="OR">OR (Any condition satisfied)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Minimum Clearance Level
                  </label>
                  <select
                    value={requiredClearance}
                    onChange={(e) => setRequiredClearance(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="1">Tier-1 (General Staff / Research)</option>
                    <option value="2">Tier-2 (Specialist Clinicians & ER)</option>
                    <option value="3">Tier-3 (Chief Specialists & Sensitive)</option>
                  </select>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Subject Attribute Conditions
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="flex items-center space-x-1 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-quantum-300 hover:bg-slate-700"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Condition</span>
                  </button>
                </div>

                {conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs"
                  >
                    {/* Field */}
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(idx, { field: e.target.value })}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-white font-mono"
                    >
                      <option value="department">department</option>
                      <option value="role">role</option>
                      <option value="clearanceLevel">clearanceLevel</option>
                      <option value="hospitalId">hospitalId</option>
                      <option value="isActive">isActive</option>
                    </select>

                    {/* Operator */}
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-quantum-400 font-mono font-bold"
                    >
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="IN">IN</option>
                    </select>

                    {/* Value */}
                    <input
                      type="text"
                      value={String(cond.value)}
                      onChange={(e) => updateCondition(idx, { value: e.target.value })}
                      placeholder="Expected attribute value"
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-white"
                    />

                    {/* Delete Condition */}
                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(idx)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SUBMIT BUTTON WITH ENCRYPTION PIPELINE STATUS */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-white">Cryptographic Envelope Target:</p>
                <p className="text-[11px] font-mono text-slate-400">
                  AES-256-GCM + FIPS 203 ML-KEM-768 Root Authority Key (1184-byte PK)
                </p>
              </div>

              <button
                type="submit"
                disabled={isEncrypting}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-quantum-900/40 hover:from-quantum-500 hover:to-cyan-400 transition"
              >
                {isEncrypting ? (
                  <>
                    <Cpu className="h-4 w-4 animate-spin" />
                    <span>{encryptionStep}</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Encrypt & Envelop EHR Payload</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
