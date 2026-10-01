/**
 * PQ-ABAC-EHR: Cryptographic Engine & Post-Quantum Security Primitives
 * 
 * Standards Compliant Implementations:
 * 1. FIPS 203 ML-KEM-768: Post-Quantum Key Encapsulation Mechanism (Module-LWE)
 * 2. AES-256-GCM: Symmetric Payload Encryption (Quantum-resistant to Grover's search)
 * 3. SHA3-512: Cryptographic Tamper-Proof Audit Hash Chaining (Keccak Permutations)
 * 4. SHA-256: Fast cryptographically secure hashing for 6-digit Login OTPs
 * 5. FIPS 204 ML-DSA-65: Post-Quantum Lattice Digital Signatures
 * 6. Dynamic ABAC Policy Engine: Evaluates Role, Department, Clearance Level, Hospital, and Revocations
 */

import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { sha3_512 } from '@noble/hashes/sha3.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  UserProfile,
  AbacPolicy,
  AbacEvaluationTrace,
  AbacEvaluationStep,
  FhirEhrPayload,
} from '@/types/ehr';

// Re-export underlying crypto services for complete compatibility
export * from './crypto/pqcCryptoService';

// ============================================================================
// Encoders & Conversion Utilities
// ============================================================================

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function fromHex(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateSecureRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto');
  return new Uint8Array(nodeCrypto.randomBytes(length));
}

// ============================================================================
// 1. AES-256-GCM ENCRYPTION & DECRYPTION (Grover-Resistant DEK)
// ============================================================================

export interface Aes256GcmCiphertext {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes)
  authTag: string;    // Base64 (16 bytes)
}

/**
 * Encrypts arbitrary text or JSON payload using standard AES-256-GCM.
 */
export async function encryptAes256Gcm(
  plaintext: string,
  keyBytes: Uint8Array
): Promise<Aes256GcmCiphertext> {
  const iv = generateSecureRandomBytes(12);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encoded = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        tagLength: 128,
      },
      cryptoKey,
      encoded as unknown as BufferSource
    );

    const fullCipher = new Uint8Array(encryptedBuffer);
    const ciphertextBytes = fullCipher.slice(0, fullCipher.length - 16);
    const authTagBytes = fullCipher.slice(fullCipher.length - 16);

    return {
      ciphertext: toBase64(ciphertextBytes),
      iv: toBase64(iv),
      authTag: toBase64(authTagBytes),
    };
  }

  // Node.js environment
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto');
  const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(keyBytes), Buffer.from(iv));
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: toBase64(iv),
    authTag: toBase64(authTag),
  };
}

/**
 * Decrypts AES-256-GCM ciphertext using the raw 32-byte DEK.
 */
export async function decryptAes256Gcm(
  ciphertextBase64: string,
  ivBase64: string,
  authTagBase64: string,
  keyBytes: Uint8Array
): Promise<string> {
  const iv = fromBase64(ivBase64);
  const authTag = fromBase64(authTagBase64);
  const ciphertext = fromBase64(ciphertextBase64);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        tagLength: 128,
      },
      cryptoKey,
      combined as unknown as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  // Node.js environment
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto');
  const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(keyBytes), Buffer.from(iv));
  decipher.setAuthTag(Buffer.from(authTag));
  let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============================================================================
// 2. FIPS 203 ML-KEM-768 POST-QUANTUM KEY ENCAPSULATION
// ============================================================================

export interface MlKemKeypair {
  publicKey: Uint8Array;       // 1184 bytes
  secretKey: Uint8Array;       // 2400 bytes
  publicKeyBase64: string;
  fingerprint: string;
}

export function generateMlKem768Keypair(): MlKemKeypair {
  const seed = generateSecureRandomBytes(64);
  const keys = ml_kem768.keygen(seed);
  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyBase64: toBase64(keys.publicKey),
    fingerprint: `pq:ml-kem-768:${toHex(keys.publicKey.slice(0, 16))}`,
  };
}

/**
 * Deterministic master authority keypair for Apex Health Systems
 */
const DETERMINISTIC_MASTER_SEED = new Uint8Array(64).fill(0x42);
export const MASTER_AUTHORITY_KEYPAIR = ml_kem768.keygen(DETERMINISTIC_MASTER_SEED);

/**
 * Encapsulates a 32-byte shared secret (or DEK wrapper) with ML-KEM-768
 */
export function encapsulateDekWithMlKem(
  recipientPublicKey: Uint8Array = MASTER_AUTHORITY_KEYPAIR.publicKey
): {
  sharedSecret: Uint8Array;      // 32 bytes DEK
  ciphertextBase64: string;      // 1088 bytes encapsulated cipher
} {
  const encResult = ml_kem768.encapsulate(recipientPublicKey);
  return {
    sharedSecret: encResult.sharedSecret,
    ciphertextBase64: toBase64(encResult.cipherText),
  };
}

/**
 * Decapsulates the 32-byte shared secret from ML-KEM-768 ciphertext
 */
export function decapsulateDekWithMlKem(
  ciphertextBase64: string,
  recipientSecretKey: Uint8Array = MASTER_AUTHORITY_KEYPAIR.secretKey
): Uint8Array {
  const ciphertextBytes = fromBase64(ciphertextBase64);
  return ml_kem768.decapsulate(ciphertextBytes, recipientSecretKey);
}

// ============================================================================
// 3. COMBINED ENVELOPE ENCRYPTION: AES-256-GCM + ML-KEM-768
// ============================================================================

export interface EnvelopedEhrData {
  encryptedPayload: string;  // Base64 AES-256-GCM
  payloadIv: string;         // Base64 12-byte IV
  authTag: string;           // Base64 16-byte tag
  encapsulatedDek: string;   // Base64 1088-byte ML-KEM ciphertext
}

/**
 * Encrypts an EHR record payload with a freshly generated AES-256 key
 * and wraps (encapsulates) the key using FIPS 203 ML-KEM-768.
 */
export async function encryptEhrPayloadWithPqc(
  payload: FhirEhrPayload | Record<string, any>
): Promise<EnvelopedEhrData> {
  const jsonString = JSON.stringify(payload);
  
  // 1. Generate 32-byte DEK and ML-KEM-768 encapsulation
  const { sharedSecret, ciphertextBase64: encapsulatedDek } = encapsulateDekWithMlKem();

  // 2. Encrypt plaintext payload with AES-256-GCM
  const aesResult = await encryptAes256Gcm(jsonString, sharedSecret);

  return {
    encryptedPayload: aesResult.ciphertext,
    payloadIv: aesResult.iv,
    authTag: aesResult.authTag,
    encapsulatedDek,
  };
}

/**
 * Unwraps the ML-KEM-768 encapsulated DEK and decrypts the AES-256-GCM EHR payload.
 */
export async function decryptEhrPayloadWithPqc(
  envelopedData: {
    encryptedPayload: string;
    payloadIv: string;
    authTag: string;
    encapsulatedDek: string;
  }
): Promise<FhirEhrPayload> {
  // 1. Decapsulate the 32-byte AES DEK via ML-KEM-768
  const dek = decapsulateDekWithMlKem(envelopedData.encapsulatedDek);

  // 2. Decrypt AES-256-GCM payload
  const decryptedJson = await decryptAes256Gcm(
    envelopedData.encryptedPayload,
    envelopedData.payloadIv,
    envelopedData.authTag,
    dek
  );

  return JSON.parse(decryptedJson) as FhirEhrPayload;
}

// ============================================================================
// 4. SHA3-512 & SHA-256 HASHING
// ============================================================================

/**
 * Computes a SHA3-512 tamper-proof hash (Keccak permutation)
 */
export function computeSha3_512(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBytes = sha3_512(bytes);
  return toHex(hashBytes);
}

/**
 * Computes a SHA-256 hash (used for OTP storage and verification)
 */
export function hashSha256(data: string): string {
  const bytes = new TextEncoder().encode(data);
  const hashBytes = sha256(bytes);
  return toHex(hashBytes);
}

/**
 * Computes an audit ledger hash block: H_i = SHA3-512(H_{i-1} || Action || Actor || Target || Timestamp)
 */
export function computeAuditLedgerHash(
  previousHash: string,
  action: string,
  actorEmail: string,
  targetRecordId?: string,
  timestamp?: string
): string {
  const blockData = `${previousHash}|${action}|${actorEmail}|${targetRecordId || 'N/A'}|${timestamp || new Date().toISOString()}`;
  return computeSha3_512(blockData);
}

// ============================================================================
// 5. ABAC POLICY EVALUATION ENGINE
// ============================================================================

export function evaluateAbacPolicy(
  policy: AbacPolicy,
  user: UserProfile
): AbacEvaluationTrace {
  const steps: AbacEvaluationStep[] = [];
  const denialReasons: string[] = [];

  // Check if active
  if (user.isActive === false) {
    denialReasons.push('User account is marked inactive in health directory');
  }

  // Check dynamic attribute revocations
  const revoked = user.revokedAttributes || [];

  for (const condition of policy.conditions) {
    const userVal = (user as any)[condition.field];
    const isRevoked = revoked.includes(condition.field);

    let passed = false;

    if (isRevoked) {
      passed = false;
      denialReasons.push(`Attribute '${condition.field}' is revoked by Cryptographic Authority`);
    } else {
      switch (condition.operator) {
        case '==':
          passed = String(userVal).toLowerCase() === String(condition.value).toLowerCase();
          break;
        case '!=':
          passed = String(userVal).toLowerCase() !== String(condition.value).toLowerCase();
          break;
        case '>=':
          passed = Number(userVal) >= Number(condition.value);
          break;
        case '<=':
          passed = Number(userVal) <= Number(condition.value);
          break;
        case '>':
          passed = Number(userVal) > Number(condition.value);
          break;
        case '<':
          passed = Number(userVal) < Number(condition.value);
          break;
        case 'IN':
          if (Array.isArray(condition.value)) {
            passed = condition.value.map((v: any) => String(v).toLowerCase()).includes(String(userVal).toLowerCase());
          }
          break;
        default:
          passed = false;
      }
    }

    steps.push({
      field: condition.field,
      operator: condition.operator,
      requiredValue: condition.value,
      actualValue: isRevoked ? `[REVOKED: ${userVal}]` : userVal,
      passed,
      description: condition.description || `${condition.field} ${condition.operator} ${condition.value}`,
    });

    if (!passed && !isRevoked) {
      denialReasons.push(
        `Failed condition: ${condition.field} requires ${condition.operator} ${condition.value} (Actual: ${userVal})`
      );
    }
  }

  const overallPassed =
    policy.combinator === 'OR'
      ? steps.some((s) => s.passed)
      : steps.every((s) => s.passed);

  return {
    passed: overallPassed && user.isActive !== false,
    combinator: policy.combinator,
    steps,
    denialReasons: overallPassed ? [] : denialReasons,
  };
}
