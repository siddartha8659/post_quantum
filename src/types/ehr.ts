/**
 * PQ-ABAC-EHR: Post-Quantum Attribute-Based Access Control for Electronic Health Records
 * Core Domain Type Definitions
 */

export type ClearanceLevel = 1 | 2 | 3;

export type CanonicalRole = 'patient' | 'doctor' | 'nurse' | 'researcher' | 'er_doctor' | 'admin';

export type UserRole =
  | 'Oncologist'
  | 'Triage_Nurse'
  | 'ER_Physician'
  | 'Epidemiologist'
  | 'Cardiologist'
  | 'Administrator'
  | 'Patient'
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'researcher'
  | 'er_doctor'
  | 'admin';

export function getCanonicalRole(role: string): CanonicalRole {
  const lower = (role || '').toLowerCase();
  if (lower === 'patient') return 'patient';
  if (lower === 'nurse' || lower.includes('triage') || lower.includes('nurse')) return 'nurse';
  if (lower === 'er_doctor' || lower.includes('er_') || lower.includes('emergency')) return 'er_doctor';
  if (lower === 'researcher' || lower.includes('epidemiologist') || lower.includes('research')) return 'researcher';
  if (lower === 'admin' || lower.includes('administrator')) return 'admin';
  return 'doctor';
}

export type Department =
  | 'Oncology'
  | 'Emergency'
  | 'Research'
  | 'Cardiology'
  | 'General'
  | 'Administration';

export interface Patient {
  id: string;
  userId?: string; // Linked if patient has a portal login
  fullName: string;
  dateOfBirth: string;
  gender: string;
  contactEmail?: string;
  bloodGroup?: string;
  assignedDepartment: string;
  primaryDoctorId?: string;
  researchConsent: boolean;
  mrn?: string;
  createdAt?: string;
}

export interface DoctorPatientAssignment {
  id: string;
  doctorId: string;
  patientId: string;
  assignmentType: 'PRIMARY' | 'CONSULTING' | 'SPECIALIST';
  isActive: boolean;
  assignedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: Department;
  clearanceLevel: ClearanceLevel;
  hospitalId: string;
  isActive: boolean;
  revokedAttributes?: string[]; // e.g. ['clearanceLevel', 'department'] for live revocation tests
  avatarUrl?: string;
  patientId?: string; // Bound patient record if role is patient
  assignedWard?: string; // e.g. "Cardiology", "Emergency Ward"
}

export type AbacOperator = '==' | '!=' | '>=' | '<=' | '>' | '<' | 'IN' | 'CONTAINS';

export interface AbacCondition {
  field: 'role' | 'department' | 'clearanceLevel' | 'hospitalId' | 'isActive' | string;
  operator: AbacOperator;
  value: any;
  description?: string;
}

export interface AbacPolicy {
  id?: string;
  name: string;
  description: string;
  combinator: 'AND' | 'OR';
  conditions: AbacCondition[];
  requiredClearance?: number;
  emergencyAllowed?: boolean;
}

export interface FhirCondition {
  code: string;
  display: string;
  clinicalStatus: 'active' | 'recurrence' | 'resolved' | 'remission';
  onsetDate: string;
}

export interface FhirObservation {
  code: string;
  display: string;
  value: string;
  unit: string;
  referenceRange?: string;
  date: string;
  status: 'normal' | 'abnormal' | 'critical';
}

export interface FhirMedication {
  medication: string;
  dosage: string;
  frequency: string;
  route: string;
  status: 'active' | 'completed' | 'on-hold';
}

export interface FhirAllergy {
  substance: string;
  criticality: 'LOW' | 'MODERATE' | 'HIGH' | 'FATAL';
  reaction: string;
}

export interface FhirEhrPayload {
  resourceType: 'PatientRecord';
  patientId: string;
  demographics: {
    name: string;
    dob: string;
    gender: 'Female' | 'Male' | 'Other';
    bloodType: string;
    mrn: string;
    emergencyContact: string;
  };
  vitalSigns: FhirObservation[];
  conditions: FhirCondition[];
  medications: FhirMedication[];
  allergies: FhirAllergy[];
  clinicalNotes: string;
  confidentialNotes?: string;
  lastUpdated: string;
}

export type SensitivityLevel = 'STANDARD' | 'SENSITIVE' | 'HIGHLY_CONFIDENTIAL';

export interface EhrRecord {
  id: string;
  patientId: string;
  patientRefId?: string; // Foreign key referencing public.patients(id)
  recordTitle: string;
  department: Department;
  classificationLevel: ClearanceLevel;
  sensitivityLevel?: SensitivityLevel;
  requireStepUpOtp?: boolean;
  encryptedPayload: string; // Base64 of AES-256-GCM ciphertext
  payloadIv: string; // Base64 12-byte IV
  authTag: string; // Base64 16-byte Auth Tag
  encapsulatedDek: string; // Base64 ML-KEM-768 ciphertext (1088 bytes)
  abacPolicy: AbacPolicy;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  kemAlgorithm: 'ML-KEM-768' | 'ML-KEM-1024';
}

export interface AbacEvaluationStep {
  field: string;
  operator: string;
  requiredValue: any;
  actualValue: any;
  passed: boolean;
  description: string;
}

export interface AbacEvaluationTrace {
  passed: boolean;
  combinator: 'AND' | 'OR';
  steps: AbacEvaluationStep[];
  denialReasons: string[];
}

export interface DecryptionResult {
  success: boolean;
  error?: string;
  record?: EhrRecord;
  decryptedPayload?: FhirEhrPayload;
  evaluationTrace?: AbacEvaluationTrace;
  decryptionTimeMs: number;
  kemAlgorithm: string;
  kemCiphertextSize: number;
  aesIvSize: number;
  authTagVerified: boolean;
  isBreakGlass?: boolean;
}

export interface AuditLogEntry {
  id: string;
  eventType:
    | 'DECRYPTION_ATTEMPT'
    | 'RECORD_CREATED'
    | 'POLICY_DENIAL'
    | 'BREAK_GLASS_ACCESS'
    | 'ATTRIBUTE_REVOKED'
    | 'KEY_ROTATION'
    | 'STEP_UP_OTP_VERIFIED'
    | 'CONSENT_UPDATED'
    | 'CROSS_DEPT_QUERY';
  userId: string;
  userName: string;
  userRole: string;
  recordId?: string;
  recordTitle?: string;
  policyEvaluated?: AbacPolicy;
  outcome: 'GRANTS' | 'DENIED' | 'BREAK_GLASS';
  reason?: string;
  sha3Hash: string;
  previousHash: string;
  signature: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface EmergencyBreakGlassEvent {
  id: string;
  recordId: string;
  recordTitle: string;
  patientId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  justification: string;
  timestamp: string;
  severity: 'CRITICAL_OVERRIDE' | 'URGENT_TRAUMA';
  token: string;
}

export interface KeyGovernanceAuthority {
  id: string;
  name: string;
  type: 'HOSPITAL_AUTHORITY' | 'LICENSING_BOARD' | 'PATIENT_CONSENT_REGISTRY';
  algorithm: 'ML-KEM-768' | 'ML-KEM-1024' | 'ML-DSA-65';
  publicKeyFingerprint: string;
  status: 'ACTIVE' | 'ROTATING' | 'REVOKED';
  issuedCredentialsCount: number;
  createdAt: string;
  classicalComparison: {
    rsaEquivalentBits: number;
    pqcPublicKeyBytes: number;
    classicalRsaBytes: number;
    classicalEccBytes: number;
  };
}
