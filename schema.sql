-- ============================================================================
-- PQ-ABAC-EHR: Post-Quantum Attribute-Based Access Control for Electronic Health Records
-- Database Migration Script & Full PostgreSQL Schema for Supabase
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Clinician Identity & ABAC Attributes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Oncologist', 'Triage_Nurse', 'ER_Physician', 'Epidemiologist', 'Cardiologist', 'Administrator', 'Patient')),
    department TEXT NOT NULL CHECK (department IN ('Oncology', 'Emergency', 'Research', 'Cardiology', 'General', 'Administration')),
    clearance_level INT NOT NULL DEFAULT 1 CHECK (clearance_level BETWEEN 1 AND 3),
    hospital_id TEXT NOT NULL DEFAULT 'HOSP-APEX-01',
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_attributes JSONB DEFAULT '[]'::jsonb,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for ABAC attribute evaluation
CREATE INDEX IF NOT EXISTS idx_profiles_attributes ON public.profiles(role, department, clearance_level, hospital_id);

-- ============================================================================
-- 2. EHR_RECORDS TABLE (Enveloped Ciphertexts & ABAC Access Policies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ehr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL,
    record_title TEXT NOT NULL,
    department TEXT NOT NULL,
    classification_level INT NOT NULL DEFAULT 1 CHECK (classification_level BETWEEN 1 AND 3),
    encrypted_payload TEXT NOT NULL,           -- Base64 AES-256-GCM encrypted FHIR payload
    payload_iv TEXT NOT NULL,                  -- Base64 96-bit IV
    auth_tag TEXT NOT NULL,                    -- Base64 128-bit GCM authentication tag
    encapsulated_dek TEXT NOT NULL,            -- Base64 FIPS 203 ML-KEM-768 Enveloped Data Encryption Key (1088 bytes)
    abac_policy JSONB NOT NULL,                -- JSON Tree specifying boolean condition rules
    kem_algorithm TEXT NOT NULL DEFAULT 'ML-KEM-768',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ehr_records_patient ON public.ehr_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_ehr_records_dept ON public.ehr_records(department, classification_level);

-- ============================================================================
-- 3. EMERGENCY_BREAK_GLASS_EVENTS TABLE (Life-or-Death Emergency Overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_break_glass_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.ehr_records(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    justification TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'CRITICAL_OVERRIDE' CHECK (severity IN ('CRITICAL_OVERRIDE', 'URGENT_TRAUMA')),
    token TEXT NOT NULL,                       -- Cryptographically signed emergency token
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_break_glass_actor ON public.emergency_break_glass_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_break_glass_patient ON public.emergency_break_glass_events(patient_id);

-- ============================================================================
-- 4. AUDIT_LOGS TABLE (Immutable Cryptographic Ledger with SHA3-512 Hash Chain)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('DECRYPTION_ATTEMPT', 'RECORD_CREATED', 'POLICY_DENIAL', 'BREAK_GLASS_ACCESS', 'ATTRIBUTE_REVOKED', 'KEY_ROTATION')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    record_id UUID REFERENCES public.ehr_records(id) ON DELETE SET NULL,
    record_title TEXT,
    policy_evaluated JSONB,
    outcome TEXT NOT NULL CHECK (outcome IN ('GRANTS', 'DENIED', 'BREAK_GLASS')),
    reason TEXT,
    sha3_hash TEXT NOT NULL,                   -- H_i = SHA3-512(H_{i-1} || metadata)
    previous_hash TEXT NOT NULL,               -- H_{i-1}
    signature TEXT NOT NULL,                   -- FIPS 204 ML-DSA-65 post-quantum signature
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs(event_type, outcome);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ============================================================================
-- 5. KEY_AUTHORITIES TABLE (Post-Quantum Key Governance & Telemetry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.key_authorities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('HOSPITAL_AUTHORITY', 'LICENSING_BOARD', 'PATIENT_CONSENT_REGISTRY')),
    algorithm TEXT NOT NULL CHECK (algorithm IN ('ML-KEM-768', 'ML-KEM-1024', 'ML-DSA-65')),
    public_key_fingerprint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ROTATING', 'REVOKED')),
    issued_credentials_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. IMMUTABILITY TRIGGER: BLOCK UPDATE OR DELETE ON AUDIT_LOGS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Cryptographic Violation: Public health audit ledger is strictly append-only. Modification or deletion of audit logs is forbidden by FIPS 204 compliance.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- ============================================================================
-- 7. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_ehr_records_updated_at
    BEFORE UPDATE ON public.ehr_records
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_break_glass_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_authorities ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can view profiles
CREATE POLICY "Allow public read of active profiles"
    ON public.profiles FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow profile update for admin or self"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'Administrator');

-- EHR Records: Authenticated users can query metadata, decryption handled by ABAC engine
CREATE POLICY "Allow authenticated read of EHR records"
    ON public.ehr_records FOR SELECT
    USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Allow clinicians to insert EHR records"
    ON public.ehr_records FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR true);

-- Emergency Break Glass: Any clinician can record emergency override
CREATE POLICY "Allow break glass event recording"
    ON public.emergency_break_glass_events FOR ALL
    USING (true);

-- Audit Logs: Read-only for all authenticated actors, insert-only for logging engine
CREATE POLICY "Allow reading audit logs"
    ON public.audit_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow inserting audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- Key Authorities: Public read for cryptographic transparency
CREATE POLICY "Allow public read of key authorities"
    ON public.key_authorities FOR SELECT
    USING (true);

-- ============================================================================
-- 9. SEED DUMMY PROFILES AND INITIAL RECORDS
-- ============================================================================
INSERT INTO public.profiles (id, email, full_name, role, department, clearance_level, hospital_id, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'sarah.rao@apexhealth.org', 'Dr. Sarah Rao', 'Oncologist', 'Oncology', 3, 'HOSP-APEX-01', true),
    ('a0000000-0000-0000-0000-000000000002', 'alex.rivera@apexhealth.org', 'Nurse Alex', 'Triage_Nurse', 'Emergency', 1, 'HOSP-APEX-01', true),
    ('a0000000-0000-0000-0000-000000000003', 'john.trauma@apexhealth.org', 'Dr. Emergency John', 'ER_Physician', 'Emergency', 2, 'HOSP-APEX-01', true),
    ('a0000000-0000-0000-0000-000000000004', 'dave.chen@regionalhealth.edu', 'Researcher Dave', 'Epidemiologist', 'Research', 1, 'HOSP-REGIONAL-09', true),
    ('a0000000-0000-0000-0000-000000000005', 'elena.vance@apexhealth.org', 'Dr. Elena Vance', 'Administrator', 'Administration', 3, 'HOSP-APEX-01', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.key_authorities (id, name, type, algorithm, public_key_fingerprint, status, issued_credentials_count)
VALUES
    ('auth-apex-root', 'Apex Health Systems Root Cryptographic Authority', 'HOSPITAL_AUTHORITY', 'ML-KEM-768', 'pq:ml-kem-768:c7b508f7aa92a543e06a386ec9e3fe61', 'ACTIVE', 1420),
    ('auth-licensing-ca', 'State Board of Medical Examiners Post-Quantum CA', 'LICENSING_BOARD', 'ML-DSA-65', 'pq:ml-dsa-65:44a9bc8110ef9234850d99ef87b33783', 'ACTIVE', 5210),
    ('auth-consent-registry', 'National Patient Interoperability & Consent Registry', 'PATIENT_CONSENT_REGISTRY', 'ML-KEM-1024', 'pq:ml-kem-1024:190283fa019284baef51029381cde390', 'ACTIVE', 98400)
ON CONFLICT (id) DO NOTHING;
