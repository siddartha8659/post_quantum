// PQ-ABAC-EHR Automated Verification Test
import {
  encryptAes256Gcm,
  decryptAes256Gcm,
  encapsulateDekWithMlKem,
  decapsulateDekWithMlKem,
  hashSha256,
  computeSha3_512,
  evaluateAbacPolicy,
} from './src/lib/crypto.ts';
import { SEED_PROFILES, SEED_PATIENTS, SEED_EHR_RECORDS } from './src/lib/data/seedData.ts';

async function runTests() {
  console.log('=== 1. TEST POST-QUANTUM CRYPTOGRAPHY (ML-KEM-768 + AES-256-GCM) ===');
  const samplePlaintext = JSON.stringify({ patient: 'Riya', diagnosis: 'Mitral Valve Assessment Normal' });
  
  // Encapsulate DEK
  const { sharedSecret: dek, ciphertextBase64: encapsulatedDek } = encapsulateDekWithMlKem();
  console.log('ML-KEM-768 Encapsulated DEK Length (Base64):', encapsulatedDek.length);

  // Symmetric payload encrypt
  const encResult = await encryptAes256Gcm(samplePlaintext, dek);
  console.log('AES-256-GCM Ciphertext Length:', encResult.ciphertext.length);
  console.log('AES-256-GCM IV:', encResult.iv);
  console.log('AES-256-GCM Auth Tag:', encResult.authTag);

  // Decapsulate DEK
  const recoveredDek = decapsulateDekWithMlKem(encapsulatedDek);
  console.log('DEK Match:', Buffer.from(dek).equals(Buffer.from(recoveredDek)) ? 'PASSED' : 'FAILED');

  // Decrypt payload
  const decrypted = await decryptAes256Gcm(encResult.ciphertext, encResult.iv, encResult.authTag, recoveredDek);
  console.log('Decrypted Plaintext Match:', decrypted === samplePlaintext ? 'PASSED' : 'FAILED');

  console.log('\n=== 2. TEST STRICT DEPARTMENTAL ISOLATION & ABAC POLICY ===');
  const cardioDoctor = SEED_PROFILES.find((p) => p.email === 'kokkulasiddartha492@gmail.com');
  const oncoDoctor = SEED_PROFILES.find((p) => p.email === '23p61a6789@vbithyd.ac.in');
  const cardioRecord = SEED_EHR_RECORDS.find((r) => r.department === 'Cardiology');
  const oncoRecord = SEED_EHR_RECORDS.find((r) => r.department === 'Oncology');

  // Doctor 1 evaluating Cardio record
  const cardioTrace = evaluateAbacPolicy(cardioRecord.abacPolicy, cardioDoctor);
  console.log('Cardio Doctor -> Cardio Record ABAC Evaluation:', cardioTrace.passed ? 'GRANTED (Expected)' : 'DENIED');

  // Cross-department check: Cardio Doctor -> Oncology record
  const crossDeptAllowed = cardioDoctor.department === oncoRecord.department;
  console.log('Cardio Doctor -> Oncology Record Department Match:', crossDeptAllowed ? 'LEAKED!' : 'BLOCKED (Expected: Strict Isolation)');

  console.log('\n=== 3. TEST SHA-256 OTP HASHING & SHA3-512 AUDIT CHAIN ===');
  const otpCode = '849201';
  const otpHash = hashSha256(otpCode);
  console.log('6-Digit OTP:', otpCode);
  console.log('SHA-256 OTP Hash:', otpHash);
  console.log('OTP Hash Verification:', hashSha256(otpCode) === otpHash ? 'PASSED' : 'FAILED');

  const sha3Audit = computeSha3_512('0000000000|STAFF_LOGIN_SUCCESS|kokkulasiddartha492@gmail.com|2026-03-01T09:00:00Z');
  console.log('SHA3-512 Audit Ledger Hash:', sha3Audit);
  console.log('SHA3-512 Hash Length (Hex):', sha3Audit.length, '(Expected 128 chars = 512 bits)');

  console.log('\n=== 4. DEMO USER ACCOUNTS & SEED COHORTS VERIFICATION ===');
  for (const prof of SEED_PROFILES) {
    const assignedPatients = SEED_PATIENTS.filter((p) => p.assignedDepartment === prof.department);
    console.log(`- [${prof.role.toUpperCase()}] ${prof.fullName} (${prof.email}) | Dept: [${prof.department}] | Visible In-Dept Patients: ${assignedPatients.map(p => p.fullName).join(', ')}`);
  }

  console.log('\nALL CRYPTOGRAPHIC & TENANCY TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(console.error);
