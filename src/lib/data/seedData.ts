/**
 * PQ-ABAC-EHR: Seed Data Module
 * Pre-configured Sample Demo Accounts and Patient Cohorts
 * Strict Departmental Partitioning & Realistic FHIR Clinical Records
 */

import {
  UserProfile,
  Patient,
  DoctorPatientAssignment,
  FhirEhrPayload,
  EhrRecord,
  AuditLogEntry,
  KeyGovernanceAuthority,
} from '@/types/ehr';

// ============================================================================
// 1. PRE-CONFIGURED SAMPLE DEMO USERS (Exact Emails & Roles Requested)
// ============================================================================

export const SEED_PROFILES: UserProfile[] = [
  {
    id: 'usr-siddartha-doctor',
    email: 'kokkulasiddartha492@gmail.com',
    fullName: 'Dr. Siddartha Kokkula',
    role: 'doctor',
    department: 'Cardiology',
    clearanceLevel: 3,
    hospitalId: 'Apex Health',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-vbit-doctor',
    email: '23p61a6789@vbithyd.ac.in',
    fullName: 'Dr. Suresh',
    role: 'doctor',
    department: 'Oncology',
    clearanceLevel: 3,
    hospitalId: 'Apex Health',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-yash-cardio-nurse',
    email: 'yash25639949@gmail.com',
    fullName: 'Nurse Yash (Cardiology)',
    role: 'nurse',
    department: 'Cardiology',
    clearanceLevel: 2,
    hospitalId: 'Apex Health',
    isActive: true,
    assignedWard: 'Cardiology',
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-aliya-onco-nurse',
    email: 'aliya.nurse@apexhealth.org',
    fullName: 'Nurse Aliya (Oncology)',
    role: 'nurse',
    department: 'Oncology',
    clearanceLevel: 2,
    hospitalId: 'Apex Health',
    isActive: true,
    assignedWard: 'Oncology',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813576-96b5270d472d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-priya-er-doctor',
    email: '257y1a6787@mlritm.ac.in',
    fullName: 'Dr. Priya',
    role: 'er_doctor',
    department: 'Emergency',
    clearanceLevel: 3,
    hospitalId: 'Apex Health',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-riya-patient',
    email: 'riya.patient@apexhealth.org',
    fullName: 'Riya',
    role: 'patient',
    department: 'Cardiology',
    clearanceLevel: 1,
    hospitalId: 'Apex Health',
    isActive: true,
    patientId: 'pat-riya-001',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
];

// ============================================================================
// 2. EXPLICIT PATIENT REGISTRY (Department-Partitioned)
// ============================================================================

export const SEED_PATIENTS: Patient[] = [
  // Cardiology Department Cohort
  {
    id: 'pat-riya-001',
    userId: 'usr-riya-patient',
    fullName: 'Riya',
    dateOfBirth: '1998-05-14',
    gender: 'Female',
    contactEmail: 'riya.patient@apexhealth.org',
    bloodGroup: 'O-Positive',
    assignedDepartment: 'Cardiology',
    primaryDoctorId: 'usr-siddartha-doctor',
    researchConsent: true,
    mrn: 'CRD-98102',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'pat-anita-002',
    fullName: 'Anita Sharma',
    dateOfBirth: '1975-08-22',
    gender: 'Female',
    contactEmail: 'anita.sharma@apexhealth.org',
    bloodGroup: 'A-Positive',
    assignedDepartment: 'Cardiology',
    primaryDoctorId: 'usr-siddartha-doctor',
    researchConsent: false,
    mrn: 'CRD-75401',
    createdAt: '2026-02-01T11:30:00Z',
  },

  // Oncology Department Cohort
  {
    id: 'pat-rajesh-003',
    fullName: 'Rajesh Varma',
    dateOfBirth: '1968-11-04',
    gender: 'Male',
    contactEmail: 'rajesh.varma@apexhealth.org',
    bloodGroup: 'B-Positive',
    assignedDepartment: 'Oncology',
    primaryDoctorId: 'usr-vbit-doctor',
    researchConsent: true,
    mrn: 'ONC-68114',
    createdAt: '2026-01-20T14:15:00Z',
  },
  {
    id: 'pat-eleanor-004',
    fullName: 'Eleanor Vance',
    dateOfBirth: '1982-03-19',
    gender: 'Female',
    contactEmail: 'eleanor.vance@apexhealth.org',
    bloodGroup: 'AB-Negative',
    assignedDepartment: 'Oncology',
    primaryDoctorId: 'usr-vbit-doctor',
    researchConsent: true,
    mrn: 'ONC-82031',
    createdAt: '2026-02-10T16:00:00Z',
  },

  // Emergency Department Cohort
  {
    id: 'pat-vikram-005',
    fullName: 'Vikram Rao',
    dateOfBirth: '1991-09-30',
    gender: 'Male',
    contactEmail: 'vikram.rao@apexhealth.org',
    bloodGroup: 'O-Negative',
    assignedDepartment: 'Emergency',
    primaryDoctorId: 'usr-priya-er-doctor',
    researchConsent: false,
    mrn: 'EMR-91093',
    createdAt: '2026-02-28T03:45:00Z',
  },
];

// ============================================================================
// 3. DOCTOR-PATIENT CARE TEAM ASSIGNMENTS
// ============================================================================

export const SEED_ASSIGNMENTS: DoctorPatientAssignment[] = [
  {
    id: 'asgn-01',
    doctorId: 'usr-siddartha-doctor',
    patientId: 'pat-riya-001',
    assignmentType: 'PRIMARY',
    isActive: true,
    assignedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'asgn-02',
    doctorId: 'usr-siddartha-doctor',
    patientId: 'pat-anita-002',
    assignmentType: 'PRIMARY',
    isActive: true,
    assignedAt: '2026-02-01T11:30:00Z',
  },
  {
    id: 'asgn-03',
    doctorId: 'usr-vbit-doctor',
    patientId: 'pat-rajesh-003',
    assignmentType: 'PRIMARY',
    isActive: true,
    assignedAt: '2026-01-20T14:15:00Z',
  },
  {
    id: 'asgn-04',
    doctorId: 'usr-vbit-doctor',
    patientId: 'pat-eleanor-004',
    assignmentType: 'PRIMARY',
    isActive: true,
    assignedAt: '2026-02-10T16:00:00Z',
  },
  {
    id: 'asgn-05',
    doctorId: 'usr-priya-er-doctor',
    patientId: 'pat-vikram-005',
    assignmentType: 'PRIMARY',
    isActive: true,
    assignedAt: '2026-02-28T03:45:00Z',
  },
];

// ============================================================================
// 4. REALISTIC FHIR CLINICAL PAYLOADS (Encrypted Under AES-256-GCM)
// ============================================================================

export const SEED_FHIR_PAYLOADS: Record<string, FhirEhrPayload> = {
  'rec-crd-riya-001': {
    resourceType: 'PatientRecord',
    patientId: 'CRD-98102',
    demographics: {
      name: 'Riya',
      dob: '1998-05-14',
      gender: 'Female',
      bloodType: 'O-Positive',
      mrn: 'CRD-98102',
      emergencyContact: 'Family Contact: +91 98765 43210',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '72', unit: 'bpm', referenceRange: '60-100', date: '2026-03-01T08:30:00Z', status: 'normal' },
      { code: '8480-6', display: 'Blood Pressure (Systolic)', value: '118', unit: 'mmHg', referenceRange: '90-120', date: '2026-03-01T08:30:00Z', status: 'normal' },
      { code: '8462-4', display: 'Blood Pressure (Diastolic)', value: '76', unit: 'mmHg', referenceRange: '60-80', date: '2026-03-01T08:30:00Z', status: 'normal' },
      { code: '883-9', display: 'Echocardiogram Left Ventricular EF', value: '62', unit: '%', referenceRange: '55-70', date: '2026-02-28T14:00:00Z', status: 'normal' },
    ],
    conditions: [
      { code: 'I34.0', display: 'Nonrheumatic Mitral Valve Prolapse (Mild)', clinicalStatus: 'active', onsetDate: '2025-11-10' },
      { code: 'R00.1', display: 'Sinus Bradycardia (Nocturnal, Physiologic)', clinicalStatus: 'resolved', onsetDate: '2025-08-12' },
      { code: 'I47.1', display: 'Paroxysmal Supraventricular Tachycardia (Stress-Induced PACs)', clinicalStatus: 'recurrence', onsetDate: '2026-01-18' },
      { code: 'I10', display: 'Borderline Essential Hypertension (Stage 1 Trend)', clinicalStatus: 'active', onsetDate: '2026-02-05' },
      { code: 'G90.09', display: 'Vasovagal / Orthostatic Intolerance (Mild Episodic)', clinicalStatus: 'active', onsetDate: '2025-09-22' },
    ],
    medications: [
      { medication: 'Metoprolol Tartrate', dosage: '25mg', frequency: 'Once daily morning', route: 'Oral', status: 'active' },
      { medication: 'Coenzyme Q10 Supplement', dosage: '100mg', frequency: 'Daily with meal', route: 'Oral', status: 'active' },
    ],
    allergies: [
      { substance: 'Amoxicillin / Penicillin', criticality: 'MODERATE', reaction: 'Maculopapular rash, pruritus' },
    ],
    clinicalNotes:
      'Patient Riya presented for periodic cardiology follow-up. Normal sinus rhythm confirmed on 12-lead ECG. Echocardiogram reveals stable leaflet geometry with trivial regurgitation, hemodynamically benign. Continue current beta-blocker titration. Clearance for moderate physical exercise approved.',
    confidentialNotes:
      'Patient reports occasional stress-induced palpitations during graduate examinations. Holter 24h monitoring confirmed benign PACs. Reassured and counselled.',
    lastUpdated: '2026-03-01T09:15:00Z',
  },

  'rec-crd-anita-002': {
    resourceType: 'PatientRecord',
    patientId: 'CRD-75401',
    demographics: {
      name: 'Anita Sharma',
      dob: '1975-08-22',
      gender: 'Female',
      bloodType: 'A-Positive',
      mrn: 'CRD-75401',
      emergencyContact: 'Rajesh Sharma (Spouse) +91 98490 12345',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '84', unit: 'bpm', referenceRange: '60-100', date: '2026-02-25T10:00:00Z', status: 'normal' },
      { code: '8480-6', display: 'Blood Pressure (Systolic)', value: '138', unit: 'mmHg', referenceRange: '90-120', date: '2026-02-25T10:00:00Z', status: 'abnormal' },
      { code: '8462-4', display: 'Blood Pressure (Diastolic)', value: '88', unit: 'mmHg', referenceRange: '60-80', date: '2026-02-25T10:00:00Z', status: 'abnormal' },
    ],
    conditions: [
      { code: 'I10', display: 'Essential Hypertension (Stage 1)', clinicalStatus: 'active', onsetDate: '2024-03-12' },
      { code: 'E78.0', display: 'Pure Hypercholesterolemia', clinicalStatus: 'active', onsetDate: '2023-09-18' },
      { code: 'I25.10', display: 'Atherosclerotic Heart Disease (Early Stage Subclinical)', clinicalStatus: 'active', onsetDate: '2025-05-14' },
      { code: 'E11.9', display: 'Type 2 Diabetes Mellitus (Diet-Controlled, HbA1c 6.4%)', clinicalStatus: 'active', onsetDate: '2024-11-20' },
    ],
    medications: [
      { medication: 'Telmisartan', dosage: '40mg', frequency: 'Once daily', route: 'Oral', status: 'active' },
      { medication: 'Atorvastatin', dosage: '20mg', frequency: 'Nightly', route: 'Oral', status: 'active' },
    ],
    allergies: [
      { substance: 'Sulfa Drugs', criticality: 'HIGH', reaction: 'Angioedema, urticaria' },
    ],
    clinicalNotes:
      'Cardiology evaluation for Anita Sharma. Hypertension under sub-optimal control. Lipid panel demonstrates LDL 142 mg/dL. Up-titrated Telmisartan to 40mg. Follow-up carotid Doppler scheduled for next month.',
    lastUpdated: '2026-02-25T11:00:00Z',
  },

  'rec-onc-rajesh-003': {
    resourceType: 'PatientRecord',
    patientId: 'ONC-68114',
    demographics: {
      name: 'Rajesh Varma',
      dob: '1968-11-04',
      gender: 'Male',
      bloodType: 'B-Positive',
      mrn: 'ONC-68114',
      emergencyContact: 'Sunita Varma (Wife) +91 99887 65432',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '78', unit: 'bpm', referenceRange: '60-100', date: '2026-02-20T11:00:00Z', status: 'normal' },
      { code: '8480-6', display: 'Blood Pressure', value: '124/82', unit: 'mmHg', referenceRange: '120/80', date: '2026-02-20T11:00:00Z', status: 'normal' },
      { code: '2160-0', display: 'Serum Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.7-1.3', date: '2026-02-20T11:00:00Z', status: 'normal' },
    ],
    conditions: [
      { code: 'C34.9', display: 'Non-Small Cell Lung Carcinoma (Stage IIB)', clinicalStatus: 'active', onsetDate: '2025-06-18' },
      { code: 'J44.9', display: 'Chronic Obstructive Pulmonary Disease (Mild Bronchitic)', clinicalStatus: 'active', onsetDate: '2023-01-10' },
      { code: 'D64.9', display: 'Secondary Normocytic Anemia of Chronic Disease', clinicalStatus: 'active', onsetDate: '2025-08-04' },
    ],
    medications: [
      { medication: 'Osimertinib', dosage: '80mg', frequency: 'Once daily', route: 'Oral', status: 'active' },
      { medication: 'Ondansetron', dosage: '8mg', frequency: 'As needed for nausea', route: 'Oral', status: 'active' },
    ],
    allergies: [
      { substance: 'Contrast Dye (Iodinated)', criticality: 'HIGH', reaction: 'Bronchospasm' },
    ],
    clinicalNotes:
      'Oncology restaging assessment by Dr. VBIT. Restaging PET-CT indicates 42% metabolic reduction in right upper lobe primary lesion. EGFR exon 19 deletion targeted therapy well tolerated. Hemoglobin 12.8 g/dL, absolute neutrophil count 3,200/mcL. Continue current targeted chemotherapy cycle.',
    lastUpdated: '2026-02-20T13:45:00Z',
  },

  'rec-emr-vikram-005': {
    resourceType: 'PatientRecord',
    patientId: 'EMR-91093',
    demographics: {
      name: 'Vikram Rao',
      dob: '1991-09-30',
      gender: 'Male',
      bloodType: 'O-Negative',
      mrn: 'EMR-91093',
      emergencyContact: 'Emergency Services / Paramedic Dispatch #108',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '112', unit: 'bpm', referenceRange: '60-100', date: '2026-02-28T04:00:00Z', status: 'critical' },
      { code: '8480-6', display: 'Blood Pressure', value: '92/58', unit: 'mmHg', referenceRange: '120/80', date: '2026-02-28T04:00:00Z', status: 'critical' },
      { code: '2708-6', display: 'Oxygen Saturation (SpO2)', value: '91', unit: '%', referenceRange: '95-100', date: '2026-02-28T04:00:00Z', status: 'abnormal' },
    ],
    conditions: [
      { code: 'S27.0', display: 'Traumatic Pneumothorax (Right Hemithorax)', clinicalStatus: 'active', onsetDate: '2026-02-28' },
      { code: 'S22.3', display: 'Multiple Rib Fractures (Right 4th-6th)', clinicalStatus: 'active', onsetDate: '2026-02-28' },
      { code: 'T79.4', display: 'Traumatic Hemorrhagic Shock (Class II - Resuscitated)', clinicalStatus: 'recurrence', onsetDate: '2026-02-28' },
      { code: 'S06.0', display: 'Acute Cerebral Concussion (GCS 14 on arrival)', clinicalStatus: 'active', onsetDate: '2026-02-28' },
    ],
    medications: [
      { medication: 'Fentanyl IV', dosage: '50mcg', frequency: 'Stat dose for analgesia', route: 'Intravenous', status: 'completed' },
      { medication: 'Cefazolin IV', dosage: '2g', frequency: 'Prophylaxis', route: 'Intravenous', status: 'active' },
    ],
    allergies: [],
    clinicalNotes:
      'Emergency Department Trauma Admission by Dr. Priya. Motor vehicle collision. Right tube thoracostomy placed immediately with evacuation of 250mL hemothorax and rapid air egress. SpO2 improved to 98% on 4L nasal cannula. CT trauma pan-scan completed, awaiting vascular clearance.',
    lastUpdated: '2026-02-28T05:30:00Z',
  },
};

// ============================================================================
// 5. SEED EHR RECORDS (Pre-configured with ABAC Policies)
// ============================================================================

export const SEED_EHR_RECORDS: EhrRecord[] = [
  {
    id: 'rec-crd-riya-001',
    patientId: 'CRD-98102',
    patientRefId: 'pat-riya-001',
    recordTitle: 'Comprehensive Cardiology Workup & Mitral Valve Assessment',
    department: 'Cardiology',
    classificationLevel: 2,
    encryptedPayload: '', // Computed dynamically in ehrRepository init
    payloadIv: '',
    authTag: '',
    encapsulatedDek: '',
    abacPolicy: {
      name: 'Cardiology Department Tier-2 Access Policy',
      description: 'Permits Cardiology clinicians with Clearance >= 2 at Apex Health',
      combinator: 'AND',
      conditions: [
        { field: 'department', operator: '==', value: 'Cardiology', description: 'Department must be Cardiology' },
        { field: 'clearanceLevel', operator: '>=', value: 2, description: 'Clearance level must be at least Tier-2' },
        { field: 'hospitalId', operator: '==', value: 'Apex Health', description: 'Hospital must be Apex Health' },
      ],
    },
    createdBy: 'usr-siddartha-doctor',
    createdByName: 'Dr. Siddartha Kokkula',
    createdAt: '2026-03-01T09:15:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
  {
    id: 'rec-crd-anita-002',
    patientId: 'CRD-75401',
    patientRefId: 'pat-anita-002',
    recordTitle: 'Cardiovascular Risk Stratification & Hypertension Protocol',
    department: 'Cardiology',
    classificationLevel: 2,
    encryptedPayload: '',
    payloadIv: '',
    authTag: '',
    encapsulatedDek: '',
    abacPolicy: {
      name: 'Cardiology Staff Access Policy',
      description: 'Requires department == Cardiology and Clearance >= 2',
      combinator: 'AND',
      conditions: [
        { field: 'department', operator: '==', value: 'Cardiology', description: 'Department must be Cardiology' },
        { field: 'clearanceLevel', operator: '>=', value: 2, description: 'Clearance level must be at least Tier-2' },
      ],
    },
    createdBy: 'usr-siddartha-doctor',
    createdByName: 'Dr. Siddartha Kokkula',
    createdAt: '2026-02-25T11:00:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
  {
    id: 'rec-onc-rajesh-003',
    patientId: 'ONC-68114',
    patientRefId: 'pat-rajesh-003',
    recordTitle: 'Targeted Chemotherapy Cycle & Restaging PET-CT Evaluation',
    department: 'Oncology',
    classificationLevel: 2,
    encryptedPayload: '',
    payloadIv: '',
    authTag: '',
    encapsulatedDek: '',
    abacPolicy: {
      name: 'Oncology Department Clearance Policy',
      description: 'Permits Oncology clinicians with Clearance >= 2',
      combinator: 'AND',
      conditions: [
        { field: 'department', operator: '==', value: 'Oncology', description: 'Department must be Oncology' },
        { field: 'clearanceLevel', operator: '>=', value: 2, description: 'Clearance level must be at least Tier-2' },
      ],
    },
    createdBy: 'usr-vbit-doctor',
    createdByName: 'Dr. VBIT Oncologist',
    createdAt: '2026-02-20T13:45:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
  {
    id: 'rec-emr-vikram-005',
    patientId: 'EMR-91093',
    patientRefId: 'pat-vikram-005',
    recordTitle: 'Acute Trauma Resuscitation & Emergency Thoracostomy',
    department: 'Emergency',
    classificationLevel: 2,
    encryptedPayload: '',
    payloadIv: '',
    authTag: '',
    encapsulatedDek: '',
    abacPolicy: {
      name: 'Emergency Department Access Policy',
      description: 'Permits Emergency clinical staff with Clearance >= 2',
      combinator: 'AND',
      conditions: [
        { field: 'department', operator: '==', value: 'Emergency', description: 'Department must be Emergency' },
        { field: 'clearanceLevel', operator: '>=', value: 2, description: 'Clearance level must be at least Tier-2' },
      ],
    },
    createdBy: 'usr-priya-er-doctor',
    createdByName: 'Dr. Priya',
    createdAt: '2026-02-28T05:30:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
];

// ============================================================================
// 6. INITIAL AUDIT LEDGER (SHA3-512 Hash Chained)
// ============================================================================

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-genesis',
    eventType: 'RECORD_CREATED',
    userId: 'usr-siddartha-doctor',
    userName: 'Dr. Siddartha Kokkula',
    userRole: 'doctor',
    recordId: 'rec-crd-riya-001',
    recordTitle: 'Comprehensive Cardiology Workup & Mitral Valve Assessment',
    outcome: 'GRANTS',
    reason: 'Initial quantum envelope encapsulation under FIPS 203 ML-KEM-768',
    sha3Hash: 'a7f9c2d1e0b4a8e2e1f400112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
    previousHash: '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    signature: 'pq_sig_genesis_root',
    timestamp: '2026-03-01T09:15:00Z',
    metadata: {
      action: 'RECORD_CREATED',
      actor_department: 'Cardiology',
      kemAlgorithm: 'ML-KEM-768',
    },
  },
];

// ============================================================================
// 7. KEY GOVERNANCE AUTHORITIES
// ============================================================================

export const SEED_KEY_AUTHORITIES: KeyGovernanceAuthority[] = [
  {
    id: 'auth-apex-root',
    name: 'Apex Health Systems Root Cryptographic Authority',
    type: 'HOSPITAL_AUTHORITY',
    algorithm: 'ML-KEM-768',
    publicKeyFingerprint: 'pq:ml-kem-768:c7b508f7aa92a543e06a386ec9e3fe61',
    status: 'ACTIVE',
    issuedCredentialsCount: 1420,
    createdAt: '2026-01-01T00:00:00Z',
    classicalComparison: {
      rsaEquivalentBits: 3072,
      pqcPublicKeyBytes: 1184,
      classicalRsaBytes: 384,
      classicalEccBytes: 64,
    },
  },
  {
    id: 'auth-licensing-ca',
    name: 'State Board of Medical Examiners Post-Quantum CA',
    type: 'LICENSING_BOARD',
    algorithm: 'ML-DSA-65',
    publicKeyFingerprint: 'pq:ml-dsa-65:44a9bc8110ef9234850d99ef87b33783',
    status: 'ACTIVE',
    issuedCredentialsCount: 5210,
    createdAt: '2026-01-01T00:00:00Z',
    classicalComparison: {
      rsaEquivalentBits: 3072,
      pqcPublicKeyBytes: 1952,
      classicalRsaBytes: 384,
      classicalEccBytes: 64,
    },
  },
  {
    id: 'auth-consent-registry',
    name: 'National Patient Interoperability & Consent Registry',
    type: 'PATIENT_CONSENT_REGISTRY',
    algorithm: 'ML-KEM-1024',
    publicKeyFingerprint: 'pq:ml-kem-1024:190283fa019284baef51029381cde390',
    status: 'ACTIVE',
    issuedCredentialsCount: 98400,
    createdAt: '2026-01-01T00:00:00Z',
    classicalComparison: {
      rsaEquivalentBits: 4096,
      pqcPublicKeyBytes: 1568,
      classicalRsaBytes: 512,
      classicalEccBytes: 66,
    },
  },
];

export function anonymizeFhirPayload(payload: FhirEhrPayload): FhirEhrPayload {
  return {
    ...payload,
    demographics: {
      ...payload.demographics,
      name: `DE-IDENTIFIED SUBJECT [${payload.patientId}]`,
      emergencyContact: 'REDACTED UNDER HIPAA PRIVACY RULE',
      mrn: 'ANONYMIZED-RESEARCH-COHORT',
    },
    clinicalNotes: payload.clinicalNotes.replace(/(Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+/g, '[REDACTED]'),
    confidentialNotes: undefined,
  };
}
