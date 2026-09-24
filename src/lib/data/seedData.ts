/**
 * PQ-ABAC-EHR: Seed Data Module
 * Realistic FHIR Clinical Records, User Profiles, and Seed Cryptographic Ledger
 */

import {
  UserProfile,
  FhirEhrPayload,
  EhrRecord,
  AuditLogEntry,
  KeyGovernanceAuthority,
} from '@/types/ehr';

// ============================================================================
// 1. DEMO USER PROFILES (With ABAC Attributes)
// ============================================================================

export const SEED_PROFILES: UserProfile[] = [
  {
    id: 'usr-sarah-rao',
    email: 'sarah.rao@apexhealth.org',
    fullName: 'Dr. Sarah Rao',
    role: 'Oncologist',
    department: 'Oncology',
    clearanceLevel: 3,
    hospitalId: 'HOSP-APEX-01',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-alex-nurse',
    email: 'alex.rivera@apexhealth.org',
    fullName: 'Nurse Alex',
    role: 'Triage_Nurse',
    department: 'Emergency',
    clearanceLevel: 1,
    hospitalId: 'HOSP-APEX-01',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-john-emergency',
    email: 'john.trauma@apexhealth.org',
    fullName: 'Dr. Emergency John',
    role: 'ER_Physician',
    department: 'Emergency',
    clearanceLevel: 2,
    hospitalId: 'HOSP-APEX-01',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-dave-researcher',
    email: 'dave.chen@regionalhealth.edu',
    fullName: 'Researcher Dave',
    role: 'Epidemiologist',
    department: 'Research',
    clearanceLevel: 1,
    hospitalId: 'HOSP-REGIONAL-09',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-elena-admin',
    email: 'elena.vance@apexhealth.org',
    fullName: 'Dr. Elena Vance (Chief Medical Officer)',
    role: 'Administrator',
    department: 'Administration',
    clearanceLevel: 3,
    hospitalId: 'HOSP-APEX-01',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1594824813576-96b5270d472d?w=150&auto=format&fit=crop&q=80',
  },
];

// ============================================================================
// 2. RAW FHIR CLINICAL RECORD PAYLOADS
// ============================================================================

export const SEED_FHIR_PAYLOADS: Record<string, FhirEhrPayload> = {
  'rec-onco-001': {
    resourceType: 'PatientRecord',
    patientId: 'PT-90210',
    demographics: {
      name: 'Eleanor Vance',
      dob: '1974-06-14',
      gender: 'Female',
      bloodType: 'A-Positive',
      mrn: 'MRN-ONCO-90210',
      emergencyContact: 'Thomas Vance (Spouse) - +1 (555) 234-9812',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '74', unit: 'bpm', referenceRange: '60-100', date: '2026-09-20', status: 'normal' },
      { code: '8480-6', display: 'Systolic Blood Pressure', value: '118', unit: 'mmHg', referenceRange: '90-120', date: '2026-09-20', status: 'normal' },
      { code: '8462-4', display: 'Diastolic Blood Pressure', value: '76', unit: 'mmHg', referenceRange: '60-80', date: '2026-09-20', status: 'normal' },
      { code: '29463-7', display: 'Body Weight', value: '62.4', unit: 'kg', referenceRange: '50-80', date: '2026-09-20', status: 'normal' },
      { code: '39156-5', display: 'BMI', value: '22.8', unit: 'kg/m²', referenceRange: '18.5-24.9', date: '2026-09-20', status: 'normal' },
    ],
    conditions: [
      { code: 'C34.90', display: 'Malignant Neoplasm of Bronchus and Lung (Stage IV Adenocarcinoma)', clinicalStatus: 'active', onsetDate: '2025-11-04' },
      { code: 'E11.9', display: 'Type 2 Diabetes Mellitus without complications', clinicalStatus: 'active', onsetDate: '2019-03-12' },
      { code: 'I10', display: 'Essential Hypertension', clinicalStatus: 'resolved', onsetDate: '2020-01-15' },
    ],
    medications: [
      { medication: 'Pembrolizumab (Keytruda)', dosage: '200 mg IV', frequency: 'Every 3 weeks', route: 'Intravenous', status: 'active' },
      { medication: 'Carboplatin AUC 5', dosage: '450 mg IV', frequency: 'Cycle 4 of 6', route: 'Intravenous', status: 'active' },
      { medication: 'Ondansetron (Zofran)', dosage: '8 mg PO', frequency: 'q8h PRN for nausea', route: 'Oral', status: 'active' },
      { medication: 'Metformin HCl', dosage: '500 mg PO', frequency: 'Twice daily with meals', route: 'Oral', status: 'active' },
    ],
    allergies: [
      { substance: 'Cisplatin', criticality: 'HIGH', reaction: 'Severe nephrotoxicity and persistent neuropathy (Grade 3)' },
      { substance: 'Sulfa Drugs', criticality: 'MODERATE', reaction: 'Maculopapular cutaneous rash' },
    ],
    clinicalNotes: `Dr. Sarah Rao, MD (Chief Thoracic Oncology): Patient Eleanor Vance presents for Cycle 4 re-evaluation. Next-Generation Sequencing (NGS) confirmed KRAS G12D driver mutation; PD-L1 Tumor Proportion Score (TPS) = 65%. Follow-up CT scan demonstrates a 38% partial radiological response with reduction in primary right upper lobe lesion (now 2.1 cm vs 3.4 cm baseline). Mild grade 1 fatigue noted, hematology stable with ANC 1,850/mcL. Continue current immunochemotherapy schedule.`,
    confidentialNotes: `CONFIDENTIAL GENOMIC RESTRICTION: Patient enrolled in Post-Quantum Decentralized Oncology Trial (PQ-DOT-401). Germline BRCA1/2 variants negative. Access strictly limited to Board-Certified Oncologists Tier-3 Clearance.`,
    lastUpdated: '2026-09-21T14:30:00Z',
  },

  'rec-er-002': {
    resourceType: 'PatientRecord',
    patientId: 'PT-84312',
    demographics: {
      name: 'Marcus Bennett',
      dob: '1988-11-03',
      gender: 'Male',
      bloodType: 'O-Negative (Universal Donor)',
      mrn: 'MRN-TRAUMA-84312',
      emergencyContact: 'Amanda Bennett (Sister) - +1 (555) 441-1029',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '138', unit: 'bpm', referenceRange: '60-100', date: '2026-09-24', status: 'critical' },
      { code: '8480-6', display: 'Systolic Blood Pressure', value: '78', unit: 'mmHg', referenceRange: '90-120', date: '2026-09-24', status: 'critical' },
      { code: '8462-4', display: 'Diastolic Blood Pressure', value: '44', unit: 'mmHg', referenceRange: '60-80', date: '2026-09-24', status: 'critical' },
      { code: '2708-6', display: 'Oxygen Saturation (SpO2)', value: '88', unit: '%', referenceRange: '95-100', date: '2026-09-24', status: 'critical' },
      { code: '1992-6', display: 'Glasgow Coma Scale (GCS)', value: '9', unit: 'points', referenceRange: '15', date: '2026-09-24', status: 'critical' },
    ],
    conditions: [
      { code: 'T07', display: 'Multiple Unspecified Injuries / High-Speed Motor Vehicle Collision', clinicalStatus: 'active', onsetDate: '2026-09-24' },
      { code: 'R57.1', display: 'Hypovolemic Hemorrhagic Shock Class III', clinicalStatus: 'active', onsetDate: '2026-09-24' },
      { code: 'S32.89', display: 'Unstable Pelvic Ring Fracture with retroperitoneal hematoma', clinicalStatus: 'active', onsetDate: '2026-09-24' },
    ],
    medications: [
      { medication: 'Tranexamic Acid (TXA)', dosage: '1 g IV bolus over 10 min', frequency: 'STAT', route: 'Intravenous', status: 'active' },
      { medication: 'Uncrossmatched O-Negative Packed RBCs', dosage: '4 Units Rapid Infuser', frequency: 'STAT continuous', route: 'Intravenous', status: 'active' },
      { medication: 'Fresh Frozen Plasma (FFP)', dosage: '4 Units', frequency: 'STAT 1:1 ratio', route: 'Intravenous', status: 'active' },
      { medication: 'Fentanyl Citrate', dosage: '50 mcg IV', frequency: 'q15m titrated for intubation', route: 'Intravenous', status: 'active' },
    ],
    allergies: [
      { substance: 'PENICILLIN & BETA-LACTAMS', criticality: 'FATAL', reaction: 'IMMEDIATE ANAPHYLACTIC SHOCK, LARYNGEAL EDEMA, VASCULAR COLLAPSE' },
      { substance: 'Succinylcholine', criticality: 'HIGH', reaction: 'Malignant hyperthermia susceptibility' },
    ],
    clinicalNotes: `EMERGENCY TRAUMA ALERT - LEVEL 1: 37-year-old male brought to trauma bay after vehicular collision at 70 mph. GCS 9 (E2V3M4), severe pelvic instability, FAST ultrasound positive in Morrison's pouch and spleno-renal recess. Pelvic binder placed. Massive Transfusion Protocol (MTP) activated. CRITICAL ALLERGY: DO NOT ADMINISTER CEFAZOLIN OR ANY PENICILLIN DERIVATIVE. Pre-op surgical clearance for emergency exploratory laparotomy and angioembolization.`,
    confidentialNotes: `EMERGENCY BREAK-GLASS AUTHORIZATION ACTIVE: Accessible to ER Physicians Tier-2+ and Emergency Break-Glass Override.`,
    lastUpdated: '2026-09-24T18:15:00Z',
  },

  'rec-cardio-003': {
    resourceType: 'PatientRecord',
    patientId: 'PT-77401',
    demographics: {
      name: 'David K. Chen',
      dob: '1961-02-18',
      gender: 'Male',
      bloodType: 'B-Positive',
      mrn: 'MRN-CARD-77401',
      emergencyContact: 'Grace Chen (Daughter) - +1 (555) 890-4122',
    },
    vitalSigns: [
      { code: '8867-4', display: 'Heart Rate', value: '82', unit: 'bpm', referenceRange: '60-100', date: '2026-09-23', status: 'normal' },
      { code: '8480-6', display: 'Systolic Blood Pressure', value: '134', unit: 'mmHg', referenceRange: '90-120', date: '2026-09-23', status: 'abnormal' },
      { code: '8462-4', display: 'Diastolic Blood Pressure', value: '84', unit: 'mmHg', referenceRange: '60-80', date: '2026-09-23', status: 'normal' },
      { code: '42719-5', display: 'Cardiac Troponin-I', value: '8.4', unit: 'ng/mL', referenceRange: '<0.04', date: '2026-09-23', status: 'critical' },
    ],
    conditions: [
      { code: 'I21.09', display: 'ST-Elevation Myocardial Infarction (STEMI) of Anterior Wall', clinicalStatus: 'active', onsetDate: '2026-09-23' },
      { code: 'I25.10', display: 'Atherosclerotic Heart Disease with 95% proximal LAD lesion', clinicalStatus: 'active', onsetDate: '2026-09-23' },
    ],
    medications: [
      { medication: 'Aspirin (Enteric Coated)', dosage: '81 mg PO', frequency: 'Daily', route: 'Oral', status: 'active' },
      { medication: 'Ticagrelor (Brilinta)', dosage: '90 mg PO', frequency: 'Twice daily', route: 'Oral', status: 'active' },
      { medication: 'Atorvastatin (Lipitor)', dosage: '80 mg PO', frequency: 'Nightly', route: 'Oral', status: 'active' },
      { medication: 'Metoprolol Succinate', dosage: '25 mg PO', frequency: 'Daily', route: 'Oral', status: 'active' },
    ],
    allergies: [
      { substance: 'Iodinated Radiocontrast Media', criticality: 'MODERATE', reaction: 'Urticaria (Pre-medicated with Prednisone & Benadryl)' },
    ],
    clinicalNotes: `Cath Lab Report: Successful primary PCI with placement of 3.0 x 18 mm Everolimus-Eluting Stent (Synergy) to proximal Left Anterior Descending artery. TIMI 3 flow restored. Post-procedure LVEF estimated at 48% on bedside transthoracic echocardiogram. Patient admitted to Coronary Care Unit (CCU).`,
    lastUpdated: '2026-09-23T20:00:00Z',
  },

  'rec-research-004': {
    resourceType: 'PatientRecord',
    patientId: 'PT-RES-B9882',
    demographics: {
      name: 'De-identified Subject #B9882',
      dob: '1992-08-22',
      gender: 'Other',
      bloodType: 'AB-Positive',
      mrn: 'MRN-COHORT-402',
      emergencyContact: 'Anonymized Clinical Trial Coordinator #04',
    },
    vitalSigns: [
      { code: '8310-5', display: 'Body Temperature', value: '38.8', unit: '°C', referenceRange: '36.5-37.5', date: '2026-09-18', status: 'abnormal' },
      { code: '8867-4', display: 'Heart Rate', value: '96', unit: 'bpm', referenceRange: '60-100', date: '2026-09-18', status: 'normal' },
      { code: '94500-6', display: 'SARS-CoV-3 Sub-lineage PCR Ct', value: '18.4', unit: 'cycles', referenceRange: '>35 (Negative)', date: '2026-09-18', status: 'critical' },
    ],
    conditions: [
      { code: 'U07.1', display: 'Novel Zoonotic Coronavirus Sub-lineage BA.9 Infection with S-gene Drop', clinicalStatus: 'active', onsetDate: '2026-09-15' },
      { code: 'J96.00', display: 'Acute respiratory distress syndrome (Mild)', clinicalStatus: 'active', onsetDate: '2026-09-17' },
    ],
    medications: [
      { medication: 'Ensitrelvir (Xocova) investigational', dosage: '375 mg PO Day 1, then 125 mg', frequency: 'Daily for 5 days', route: 'Oral', status: 'active' },
      { medication: 'Inhaled Budesonide', dosage: '800 mcg', frequency: 'Twice daily', route: 'Inhalation', status: 'active' },
    ],
    allergies: [
      { substance: 'Latex', criticality: 'LOW', reaction: 'Contact dermatitis' },
    ],
    clinicalNotes: `Epidemiology Cohort Analysis: Genomic sequencing completed on Oxford Nanopore PromethION platform. Sequence FASTA reveals 14 unique amino acid substitutions in Spike Receptor Binding Domain (RBD). Viral kinetic model exhibits 3.2x faster clearance under double-blind protease inhibitor arm. De-identified dataset authorized for regional health epidemiological modeling.`,
    lastUpdated: '2026-09-19T09:12:00Z',
  },
};

// ============================================================================
// 3. SEED EHR RECORDS (Pre-Encrypted with Hybrid AES-256-GCM + ML-KEM-768)
// ============================================================================

export const SEED_EHR_RECORDS: EhrRecord[] = [
  {
    id: 'rec-onco-001',
    patientId: 'PT-90210',
    recordTitle: 'Oncology Genomic Panel & Chemotherapy Protocol (Stage IV)',
    department: 'Oncology',
    classificationLevel: 3,
    encryptedPayload: '9j3Kf8Xv...[AES-256-GCM encrypted 14.8KB FHIR stream]',
    payloadIv: 'Z8uW2qO+4vLx91Ab',
    authTag: '84kLm2P0o1V+qWeRt98=',
    encapsulatedDek: 'eythbGc...[FIPS 203 ML-KEM-768 Enveloped DEK 1088B]',
    abacPolicy: {
      name: 'Oncology Specialist High-Clearance Policy',
      description: 'Restricted strictly to Board-Certified Oncologists with Tier-3 Security Clearance.',
      combinator: 'AND',
      requiredClearance: 3,
      emergencyAllowed: false,
      conditions: [
        {
          field: 'department',
          operator: '==',
          value: 'Oncology',
          description: 'Clinician must belong to Oncology Department',
        },
        {
          field: 'role',
          operator: '==',
          value: 'Oncologist',
          description: 'Clinician role must be Oncologist',
        },
      ],
    },
    createdBy: 'usr-sarah-rao',
    createdByName: 'Dr. Sarah Rao',
    createdAt: '2026-09-21T14:30:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
  {
    id: 'rec-er-002',
    patientId: 'PT-84312',
    recordTitle: 'Acute Polytrauma Resuscitation & Fatal Allergy Protocol (ER Level 1)',
    department: 'Emergency',
    classificationLevel: 2,
    encryptedPayload: '5k8Nm1Qw...[AES-256-GCM encrypted 12.2KB FHIR stream]',
    payloadIv: 'U7hY1vB8xZq90LkA',
    authTag: '33xVb90LkpMn78Qaz21=',
    encapsulatedDek: 'eythbGc...[FIPS 203 ML-KEM-768 Enveloped DEK 1088B]',
    abacPolicy: {
      name: 'Emergency Trauma Care Protocol',
      description: 'Accessible by Emergency Department staff with Clearance >= Tier-2, or Emergency Break-Glass override.',
      combinator: 'AND',
      requiredClearance: 2,
      emergencyAllowed: true,
      conditions: [
        {
          field: 'department',
          operator: '==',
          value: 'Emergency',
          description: 'Clinician must belong to Emergency Department',
        },
      ],
    },
    createdBy: 'usr-john-emergency',
    createdByName: 'Dr. Emergency John',
    createdAt: '2026-09-24T18:15:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
  {
    id: 'rec-cardio-003',
    patientId: 'PT-77401',
    recordTitle: 'Coronary Angiogram & Drug-Eluting Stent Surgical Report',
    department: 'Cardiology',
    classificationLevel: 2,
    encryptedPayload: '4r7Tg2Hj...[AES-256-GCM encrypted 9.8KB FHIR stream]',
    payloadIv: 'K9mL4nB2vXz10QwE',
    authTag: '99zXcVbNmMkLpOiUy76=',
    encapsulatedDek: 'eythbGc...[FIPS 203 ML-KEM-768 Enveloped DEK 1088B]',
    abacPolicy: {
      name: 'Cardiology & Acute Emergency Interdisciplinary Policy',
      description: 'Accessible by either Cardiology or Emergency departments with Tier-2+ Clearance.',
      combinator: 'OR',
      requiredClearance: 2,
      emergencyAllowed: true,
      conditions: [
        {
          field: 'department',
          operator: '==',
          value: 'Cardiology',
          description: 'Cardiology specialist clearance',
        },
        {
          field: 'department',
          operator: '==',
          value: 'Emergency',
          description: 'Emergency department physician clearance',
        },
        {
          field: 'department',
          operator: '==',
          value: 'Oncology',
          description: 'Cardio-oncology cross-consultation',
        },
      ],
    },
    createdBy: 'usr-sarah-rao',
    createdByName: 'Dr. Sarah Rao',
    createdAt: '2026-09-23T20:00:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
  {
    id: 'rec-research-004',
    patientId: 'PT-RES-B9882',
    recordTitle: 'Zoonotic Coronavirus Spike Mutation Kinetic Modeling (De-identified)',
    department: 'Research',
    classificationLevel: 1,
    encryptedPayload: '1z8Xb4Vn...[AES-256-GCM encrypted 11.4KB FHIR stream]',
    payloadIv: 'M2kL9pO0iUy87TrE',
    authTag: '77wQeRtYuIoPzXc4510=',
    encapsulatedDek: 'eythbGc...[FIPS 203 ML-KEM-768 Enveloped DEK 1088B]',
    abacPolicy: {
      name: 'Epidemiology Multi-Institutional Research Policy',
      description: 'Accessible by any licensed Epidemiologist or Research Department personnel.',
      combinator: 'OR',
      requiredClearance: 1,
      emergencyAllowed: false,
      conditions: [
        {
          field: 'role',
          operator: '==',
          value: 'Epidemiologist',
          description: 'User holds Epidemiologist credential',
        },
        {
          field: 'department',
          operator: '==',
          value: 'Research',
          description: 'User affiliated with Research division',
        },
      ],
    },
    createdBy: 'usr-dave-researcher',
    createdByName: 'Researcher Dave',
    createdAt: '2026-09-19T09:12:00Z',
    kemAlgorithm: 'ML-KEM-768',
  },
];

// ============================================================================
// 4. SEED AUDIT LOG LEDGER (Linked by SHA3-512 Hash Chain)
// ============================================================================

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-001',
    eventType: 'KEY_ROTATION',
    userId: 'usr-elena-admin',
    userName: 'Dr. Elena Vance (Chief Medical Officer)',
    userRole: 'Administrator',
    outcome: 'GRANTS',
    reason: 'Initial FIPS 203 ML-KEM-768 Master Root Key Generation and Genesis Audit Chain Init',
    sha3Hash: 'c7b508f7aa92a543e06a386ec9e3fe619c9048a97753e8e2fa51421b4a1b0cd9234850d99ef87b33783a48e65842880d64e9a031d8e12f66be979db742111100',
    previousHash: '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    signature: 'mldsa65:39ac98ef21d0144f890cbe0a187312...[3309B]',
    timestamp: '2026-09-19T08:00:00Z',
    metadata: { authority: 'Apex Health CA', algorithm: 'ML-KEM-768' },
  },
  {
    id: 'aud-002',
    eventType: 'RECORD_CREATED',
    userId: 'usr-sarah-rao',
    userName: 'Dr. Sarah Rao',
    userRole: 'Oncologist',
    recordId: 'rec-onco-001',
    recordTitle: 'Oncology Genomic Panel & Chemotherapy Protocol (Stage IV)',
    outcome: 'GRANTS',
    reason: 'New record encrypted with AES-256-GCM and enveloped with ML-KEM-768 public key.',
    sha3Hash: 'f4e198a2bb53c61093dae0941d402fa627710a12cf4601bc3d052843ef995b12854930129eac190283fa019284baef51029381cde390192834bba7611048201a',
    previousHash: 'c7b508f7aa92a543e06a386ec9e3fe619c9048a97753e8e2fa51421b4a1b0cd9234850d99ef87b33783a48e65842880d64e9a031d8e12f66be979db742111100',
    signature: 'mldsa65:55ba7621c900e281...[3309B]',
    timestamp: '2026-09-21T14:30:00Z',
  },
  {
    id: 'aud-003',
    eventType: 'DECRYPTION_ATTEMPT',
    userId: 'usr-alex-nurse',
    userName: 'Nurse Alex',
    userRole: 'Triage_Nurse',
    recordId: 'rec-onco-001',
    recordTitle: 'Oncology Genomic Panel & Chemotherapy Protocol (Stage IV)',
    outcome: 'DENIED',
    reason: 'ABAC Policy Violation: Clinician Dept (Emergency != Oncology) and Clearance (Tier-1 < Tier-3)',
    sha3Hash: '23ac91fe8811aa0984ef2981048270acde0291776510492830adfa89127364501928471018274619028374619284750192847561029384756102938475610293',
    previousHash: 'f4e198a2bb53c61093dae0941d402fa627710a12cf4601bc3d052843ef995b12854930129eac190283fa019284baef51029381cde390192834bba7611048201a',
    signature: 'mldsa65:84dc1920ae872...[3309B]',
    timestamp: '2026-09-22T09:44:12Z',
    metadata: { missingAttributes: ['department:Oncology', 'clearanceLevel:3'] },
  },
  {
    id: 'aud-004',
    eventType: 'DECRYPTION_ATTEMPT',
    userId: 'usr-sarah-rao',
    userName: 'Dr. Sarah Rao',
    userRole: 'Oncologist',
    recordId: 'rec-onco-001',
    recordTitle: 'Oncology Genomic Panel & Chemotherapy Protocol (Stage IV)',
    outcome: 'GRANTS',
    reason: 'ABAC Policy fully satisfied. ML-KEM-768 decapsulation & AES-256-GCM decryption completed in 4.2ms.',
    sha3Hash: '89ba447712ef09384102948571029485710294857102948571029485710294857102948571029485710294857102948571029485710294857102948571029485',
    previousHash: '23ac91fe8811aa0984ef2981048270acde0291776510492830adfa89127364501928471018274619028374619284750192847561029384756102938475610293',
    signature: 'mldsa65:110fa982bc129...[3309B]',
    timestamp: '2026-09-22T10:15:20Z',
  },
  {
    id: 'aud-005',
    eventType: 'BREAK_GLASS_ACCESS',
    userId: 'usr-john-emergency',
    userName: 'Dr. Emergency John',
    userRole: 'ER_Physician',
    recordId: 'rec-er-002',
    recordTitle: 'Acute Polytrauma Resuscitation & Fatal Allergy Protocol (ER Level 1)',
    outcome: 'BREAK_GLASS',
    reason: 'Emergency Break-Glass Override Activated: Unresponsive trauma patient in hemorrhagic shock (GCS 9, BP 78/44). Ephemeral token generated.',
    sha3Hash: 'ab441098273645109283746192847561029384756102938475610293847561029384756102938475610293847561029384756102938475610293847561029384',
    previousHash: '89ba447712ef09384102948571029485710294857102948571029485710294857102948571029485710294857102948571029485710294857102948571029485',
    signature: 'mldsa65:77ef092144ba9...[3309B]',
    timestamp: '2026-09-24T18:16:30Z',
    metadata: { severity: 'CRITICAL_OVERRIDE', targetPatient: 'PT-84312' },
  },
];

// ============================================================================
// 5. KEY GOVERNANCE AUTHORITIES & TELEMETRY
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
    createdAt: '2026-01-15T00:00:00Z',
    classicalComparison: {
      rsaEquivalentBits: 3072,
      pqcPublicKeyBytes: 1184, // ML-KEM-768
      classicalRsaBytes: 384,  // RSA-3072
      classicalEccBytes: 32,   // ECC P-256
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
    createdAt: '2026-02-01T00:00:00Z',
    classicalComparison: {
      rsaEquivalentBits: 3072,
      pqcPublicKeyBytes: 1952, // ML-DSA-65
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
    createdAt: '2026-03-10T00:00:00Z',
    classicalComparison: {
      rsaEquivalentBits: 15360, // Level 5
      pqcPublicKeyBytes: 1568,  // ML-KEM-1024
      classicalRsaBytes: 1920,  // RSA-15360
      classicalEccBytes: 64,
    },
  },
];
