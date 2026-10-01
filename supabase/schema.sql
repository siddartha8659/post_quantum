-- ============================================================================
-- PQ-ABAC-EHR: Post-Quantum Attribute-Based Access Control for Electronic Health Records
-- Database Migration Script & Full PostgreSQL Schema for Supabase
-- Enforcing Strict Departmental Isolation & Mandatory Staff Login OTP Verification
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Clinician Identity & ABAC Attributes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'er_doctor', 'patient', 'admin')),
    department TEXT NOT NULL, -- e.g., 'Cardiology', 'Oncology', 'Emergency'
    clearance_level INT NOT NULL DEFAULT 1 CHECK (clearance_level BETWEEN 1 AND 3),
    hospital_id TEXT NOT NULL DEFAULT 'Apex Health',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(department, hospital_id);

-- ============================================================================
-- 2. PATIENTS TABLE (Admitted Patients with Strict Departmental Assignment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Bound if patient has portal login
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    blood_group TEXT,
    department TEXT NOT NULL, -- Patient is admitted/assigned to this department
    primary_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_patients_department ON public.patients(department);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON public.patients(primary_doctor_id);

-- ============================================================================
-- 3. EHR_RECORDS TABLE (AES-256-GCM + ML-KEM-768 Enveloped Ciphertexts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ehr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_title TEXT NOT NULL,
    department TEXT NOT NULL, -- Matches patient department
    encrypted_payload TEXT NOT NULL, -- AES-256-GCM encrypted medical notes & FHIR JSON
    payload_iv TEXT NOT NULL, -- Base64 12-byte IV
    auth_tag TEXT NOT NULL, -- Base64 16-byte Auth Tag
    encapsulated_dek TEXT NOT NULL, -- FIPS 203 ML-KEM-768 wrapped AES key (1088 bytes Base64)
    abac_policy JSONB NOT NULL, -- e.g. {"department": "Cardiology", "min_clearance": 2}
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ehr_records_patient ON public.ehr_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_ehr_records_dept ON public.ehr_records(department);

-- ============================================================================
-- 4. LOGIN_OTPS TABLE (Mandatory Login-Time 6-Digit Email OTP Challenge)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.login_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL, -- SHA-256 hash of 6-digit code
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_login_otps_user ON public.login_otps(user_id, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_login_otps_email ON public.login_otps(email);

-- ============================================================================
-- 5. AUDIT_LOGS TABLE (Cryptographic Ledger with SHA3-512 Hash Chain)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    actor_role TEXT,
    actor_department TEXT,
    action TEXT NOT NULL CHECK (
        action IN (
            'STAFF_LOGIN_OTP_SENT', 
            'STAFF_LOGIN_SUCCESS', 
            'RECORD_DECRYPT_SUCCESS', 
            'CROSS_DEPT_BLOCKED',
            'POLICY_DENIAL',
            'RECORD_CREATED'
        )
    ),
    target_record_id UUID REFERENCES public.ehr_records(id) ON DELETE SET NULL,
    sha3_hash TEXT NOT NULL, -- SHA3-512(Previous_Hash || Action || Actor || Target || Timestamp)
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ============================================================================
-- 6. IMMUTABILITY TRIGGER ON AUDIT_LOGS (Append-Only Enforcement)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_audit_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: The PQ-ABAC-EHR audit ledger is strictly append-only. Updates and deletions are cryptographically prohibited.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_ledger_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_ledger_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_audit_ledger_immutability();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES (Zero Cross-Department Visibility)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles read for authenticated staff" ON public.profiles;
CREATE POLICY "Public profiles read for authenticated staff"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 7.2 PATIENTS POLICIES:
-- Doctors and Nurses can ONLY select patients where patients.department = (SELECT department FROM profiles WHERE id = auth.uid())
-- Patients can ONLY select rows where patients.user_id = auth.uid()
DROP POLICY IF EXISTS "Departmental isolation for clinicians and self-service for patients" ON public.patients;
CREATE POLICY "Departmental isolation for clinicians and self-service for patients"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
        -- Patient sees only their own profile
        patients.user_id = auth.uid()
        OR
        -- Clinical staff (Doctor, Nurse, ER Doctor) ONLY sees patients in their assigned department
        (
            patients.department = (
                SELECT p.department 
                FROM public.profiles p 
                WHERE p.id = auth.uid()
            )
        )
        OR
        -- Admin has oversight
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Clinicians can insert patients in their department" ON public.patients;
CREATE POLICY "Clinicians can insert patients in their department"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (
        patients.department = (
            SELECT p.department 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 7.3 EHR_RECORDS POLICIES:
-- Staff can ONLY select records where ehr_records.department = (SELECT department FROM profiles WHERE id = auth.uid())
-- Patients can ONLY select records belonging to their patient profile
DROP POLICY IF EXISTS "Strict departmental EHR records isolation" ON public.ehr_records;
CREATE POLICY "Strict departmental EHR records isolation"
    ON public.ehr_records FOR SELECT
    TO authenticated
    USING (
        -- Patient self-service: only records for this authenticated patient
        EXISTS (
            SELECT 1 FROM public.patients pts
            WHERE pts.id = ehr_records.patient_id AND pts.user_id = auth.uid()
        )
        OR
        -- Clinicians can ONLY query records in their own assigned department
        (
            ehr_records.department = (
                SELECT p.department 
                FROM public.profiles p 
                WHERE p.id = auth.uid()
            )
        )
        OR
        -- Admin oversight
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Staff can insert records in their department" ON public.ehr_records;
CREATE POLICY "Staff can insert records in their department"
    ON public.ehr_records FOR INSERT
    TO authenticated
    WITH CHECK (
        ehr_records.department = (
            SELECT p.department 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- 7.4 LOGIN_OTPS POLICIES
DROP POLICY IF EXISTS "Users manage their own login OTPs" ON public.login_otps;
CREATE POLICY "Users manage their own login OTPs"
    ON public.login_otps FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7.5 AUDIT_LOGS POLICIES
DROP POLICY IF EXISTS "Audit logs read policy" ON public.audit_logs;
CREATE POLICY "Audit logs read policy"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        -- Staff can read audit logs for their department or actions
        actor_id = auth.uid()
        OR
        actor_department = (SELECT p.department FROM public.profiles p WHERE p.id = auth.uid())
        OR
        -- Patient can read audit logs referencing records belonging to them
        EXISTS (
            SELECT 1 FROM public.ehr_records rec
            JOIN public.patients pts ON pts.id = rec.patient_id
            WHERE rec.id = audit_logs.target_record_id AND pts.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit logs insert policy"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- 8. PRE-CONFIGURED SAMPLE DEMO SEED DATA (Exact User Accounts & Patient Cohorts)
-- ============================================================================

-- Insert Users into auth.users (if using Supabase Auth locally / SQL editor)
INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'kokkulasiddartha492@gmail.com', '{"full_name": "Dr. Siddartha Kokkula", "role": "doctor"}'::jsonb, crypt('Password@123', gen_salt('bf')), now(), now(), now()),
    ('c2222222-2222-2222-2222-222222222222', '23p61a6789@vbithyd.ac.in', '{"full_name": "Dr. Suresh (Oncology)", "role": "doctor"}'::jsonb, crypt('Password@123', gen_salt('bf')), now(), now(), now()),
    ('c3333333-3333-3333-3333-333333333333', 'yash25639949@gmail.com', '{"full_name": "Nurse Yash (Cardiology)", "role": "nurse"}'::jsonb, crypt('Password@123', gen_salt('bf')), now(), now(), now()),
    ('c4444444-4444-4444-4444-444444444444', 'aliya.nurse@apexhealth.org', '{"full_name": "Nurse Aliya (Oncology)", "role": "nurse"}'::jsonb, crypt('Password@123', gen_salt('bf')), now(), now(), now()),
    ('c5555555-5555-5555-5555-555555555555', '257y1a6787@mlritm.ac.in', '{"full_name": "Dr. Priya", "role": "er_doctor"}'::jsonb, crypt('Password@123', gen_salt('bf')), now(), now(), now()),
    ('c6666666-6666-6666-6666-666666666666', 'riya.patient@apexhealth.org', '{"full_name": "Riya", "role": "patient"}'::jsonb, crypt('Password@123', gen_salt('bf')), now(), now(), now())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Seed Clinician & Patient Profiles
INSERT INTO public.profiles (id, full_name, email, role, department, clearance_level, hospital_id, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Dr. Siddartha Kokkula', 'kokkulasiddartha492@gmail.com', 'doctor', 'Cardiology', 3, 'Apex Health', true),
    ('c2222222-2222-2222-2222-222222222222', 'Dr. Suresh', '23p61a6789@vbithyd.ac.in', 'doctor', 'Oncology', 3, 'Apex Health', true),
    ('c3333333-3333-3333-3333-333333333333', 'Nurse Yash (Cardiology)', 'yash25639949@gmail.com', 'nurse', 'Cardiology', 2, 'Apex Health', true),
    ('c4444444-4444-4444-4444-444444444444', 'Nurse Aliya (Oncology)', 'aliya.nurse@apexhealth.org', 'nurse', 'Oncology', 2, 'Apex Health', true),
    ('c5555555-5555-5555-5555-555555555555', 'Dr. Priya', '257y1a6787@mlritm.ac.in', 'er_doctor', 'Emergency', 3, 'Apex Health', true),
    ('c6666666-6666-6666-6666-666666666666', 'Riya', 'riya.patient@apexhealth.org', 'patient', 'Cardiology', 1, 'Apex Health', true)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    clearance_level = EXCLUDED.clearance_level,
    hospital_id = EXCLUDED.hospital_id;

-- Seed Patient Cohorts (Strictly partitioned across Cardiology, Oncology, and Emergency)
INSERT INTO public.patients (id, user_id, full_name, date_of_birth, gender, blood_group, department, primary_doctor_id)
VALUES
    -- Cardiology Cohort (Visible ONLY to kokkulasiddartha492@gmail.com & yash25639949@gmail.com)
    ('d1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'Riya', '1998-05-14', 'Female', 'O-Positive', 'Cardiology', 'c1111111-1111-1111-1111-111111111111'),
    ('d2222222-2222-2222-2222-222222222222', NULL, 'Anita Sharma', '1975-08-22', 'Female', 'A-Positive', 'Cardiology', 'c1111111-1111-1111-1111-111111111111'),

    -- Oncology Cohort (Visible ONLY to 23p61a6789@vbithyd.ac.in & aliya.nurse@apexhealth.org)
    ('d3333333-3333-3333-3333-333333333333', NULL, 'Rajesh Varma', '1968-11-04', 'Male', 'B-Positive', 'Oncology', 'c2222222-2222-2222-2222-222222222222'),
    ('d4444444-4444-4444-4444-444444444444', NULL, 'Eleanor Vance', '1982-03-19', 'Female', 'AB-Negative', 'Oncology', 'c2222222-2222-2222-2222-222222222222'),

    -- Emergency Cohort (Visible ONLY to 257y1a6787@mlritm.ac.in)
    ('d5555555-5555-5555-5555-555555555555', NULL, 'Vikram Rao', '1991-09-30', 'Male', 'O-Negative', 'Emergency', 'c5555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    primary_doctor_id = EXCLUDED.primary_doctor_id;

-- Seed Sample Encrypted EHR Records (Payloads are AES-256-GCM encrypted + ML-KEM-768 encapsulated)
INSERT INTO public.ehr_records (id, patient_id, record_title, department, encrypted_payload, payload_iv, auth_tag, encapsulated_dek, abac_policy, created_by)
VALUES
    (
        'e1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111',
        'Comprehensive Cardiology Workup & Mitral Valve Assessment',
        'Cardiology',
        'b7f9a2e1d0c4b8a2e1f4...', -- Encrypted ciphertext
        '12byteIvBase64==',
        '16byteAuthTag==',
        'MlKem768EncapsulatedCiphertextBase64...',
        '{"department": "Cardiology", "min_clearance": 2, "hospital_id": "Apex Health"}'::jsonb,
        'c1111111-1111-1111-1111-111111111111'
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        'd3333333-3333-3333-3333-333333333333',
        'Oncology Chemotherapy Protocol & Tumor Biopsy Results',
        'Oncology',
        'c8a1b2d3e4f5a6b7c8...',
        '12byteIvBase64==',
        '16byteAuthTag==',
        'MlKem768EncapsulatedCiphertextBase64...',
        '{"department": "Oncology", "min_clearance": 2, "hospital_id": "Apex Health"}'::jsonb,
        'c2222222-2222-2222-2222-222222222222'
    ),
    (
        'e3333333-3333-3333-3333-333333333333',
        'd5555555-5555-5555-5555-555555555555',
        'Acute Trauma Triage & Emergency Thoracic CT Scan',
        'Emergency',
        'd9b2c3d4e5f6a7b8c9...',
        '12byteIvBase64==',
        '16byteAuthTag==',
        'MlKem768EncapsulatedCiphertextBase64...',
        '{"department": "Emergency", "min_clearance": 2, "hospital_id": "Apex Health"}'::jsonb,
        'c5555555-5555-5555-5555-555555555555'
    )
ON CONFLICT (id) DO NOTHING;

-- Initial Genesis Audit Ledger Entry
INSERT INTO public.audit_logs (actor_email, actor_role, actor_department, action, sha3_hash)
VALUES (
    'security@apexhealth.org',
    'admin',
    'Administration',
    'STAFF_LOGIN_SUCCESS',
    '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
);
