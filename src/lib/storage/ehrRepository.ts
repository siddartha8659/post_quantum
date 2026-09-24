/**
 * PQ-ABAC-EHR: Storage Repository & Supabase Sync Layer
 * Manages Profiles, Encrypted EHR Records, Audit Logs, and Break-Glass Events.
 * Automatically synchronizes with Supabase PostgreSQL when credentials are provided,
 * and maintains a high-fidelity reactive offline cache for immediate turn-key execution.
 */

import {
  UserProfile,
  EhrRecord,
  FhirEhrPayload,
  AuditLogEntry,
  EmergencyBreakGlassEvent,
  KeyGovernanceAuthority,
} from '@/types/ehr';
import {
  SEED_PROFILES,
  SEED_FHIR_PAYLOADS,
  SEED_EHR_RECORDS,
  SEED_AUDIT_LOGS,
  SEED_KEY_AUTHORITIES,
} from '@/lib/data/seedData';
import {
  encryptAes256Gcm,
  envelopeWrapDek,
  computeAuditBlockHash,
  signWithMlDsa65,
  getRandomBytes,
  uint8ArrayToHex,
  MASTER_HOSPITAL_AUTHORITY_KEYPAIR,
} from '@/lib/crypto/pqcCryptoService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabaseClient';

const STORAGE_KEYS = {
  PROFILES: 'pq_abac_profiles_v1',
  RECORDS: 'pq_abac_records_v1',
  AUDIT_LOGS: 'pq_abac_audit_logs_v1',
  BREAK_GLASS: 'pq_abac_break_glass_v1',
  AUTHORITIES: 'pq_abac_authorities_v1',
  INITIALIZED: 'pq_abac_seeded_v1',
};

class EhrRepository {
  private profiles: UserProfile[] = [...SEED_PROFILES];
  private records: EhrRecord[] = [];
  private auditLogs: AuditLogEntry[] = [...SEED_AUDIT_LOGS];
  private breakGlassEvents: EmergencyBreakGlassEvent[] = [];
  private authorities: KeyGovernanceAuthority[] = [...SEED_KEY_AUTHORITIES];
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initializes real AES-256-GCM ciphertexts and ML-KEM-768 encapsulated DEKs
   * for all seed records on first launch.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window !== 'undefined') {
      const storedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
      const storedRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
      const storedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const storedBreakGlass = localStorage.getItem(STORAGE_KEYS.BREAK_GLASS);

      if (storedProfiles) {
        try {
          this.profiles = JSON.parse(storedProfiles);
        } catch {}
      }
      if (storedAudit) {
        try {
          this.auditLogs = JSON.parse(storedAudit);
        } catch {}
      }
      if (storedBreakGlass) {
        try {
          this.breakGlassEvents = JSON.parse(storedBreakGlass);
        } catch {}
      }

      if (storedRecords) {
        try {
          this.records = JSON.parse(storedRecords);
          this.isInitialized = true;
          return;
        } catch {}
      }
    }

    // Generate genuine cryptographic payloads for seed records
    const initializedRecords: EhrRecord[] = [];

    for (const seedRec of SEED_EHR_RECORDS) {
      const payload = SEED_FHIR_PAYLOADS[seedRec.id];
      if (payload) {
        // Generate fresh 256-bit DEK
        const dek = getRandomBytes(32);
        const jsonStr = JSON.stringify(payload);

        // Encrypt with AES-256-GCM
        const encData = await encryptAes256Gcm(jsonStr, dek);

        // Encapsulate DEK with ML-KEM-768
        const envelopedDek = await envelopeWrapDek(
          dek,
          MASTER_HOSPITAL_AUTHORITY_KEYPAIR.publicKeyBytes
        );

        initializedRecords.push({
          ...seedRec,
          encryptedPayload: encData.ciphertextBase64,
          payloadIv: encData.ivBase64,
          authTag: encData.authTagBase64,
          encapsulatedDek: envelopedDek,
        });
      } else {
        initializedRecords.push(seedRec);
      }
    }

    this.records = initializedRecords;
    this.isInitialized = true;
    this.persistAll();
  }

  private persistAll() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(this.profiles));
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(this.records));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEYS.BREAK_GLASS, JSON.stringify(this.breakGlassEvents));
      localStorage.setItem(STORAGE_KEYS.AUTHORITIES, JSON.stringify(this.authorities));
    } catch {}
  }

  // ============================================================================
  // PROFILES
  // ============================================================================

  public async getProfiles(): Promise<UserProfile[]> {
    await this.init();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            email: d.email,
            fullName: d.full_name,
            role: d.role,
            department: d.department,
            clearanceLevel: d.clearance_level,
            hospitalId: d.hospital_id,
            isActive: d.is_active,
            revokedAttributes: d.revoked_attributes || [],
            avatarUrl: d.avatar_url,
          }));
        }
      } catch {}
    }
    return [...this.profiles];
  }

  public async getProfileById(id: string): Promise<UserProfile | undefined> {
    const list = await this.getProfiles();
    return list.find((p) => p.id === id);
  }

  public async updateProfile(updated: UserProfile): Promise<UserProfile> {
    await this.init();
    const idx = this.profiles.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      this.profiles[idx] = updated;
    } else {
      this.profiles.push(updated);
    }
    this.persistAll();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: updated.fullName,
            role: updated.role,
            department: updated.department,
            clearance_level: updated.clearanceLevel,
            is_active: updated.isActive,
            revoked_attributes: updated.revokedAttributes || [],
          })
          .eq('id', updated.id);
      } catch {}
    }

    return updated;
  }

  // ============================================================================
  // EHR RECORDS
  // ============================================================================

  public async getRecords(): Promise<EhrRecord[]> {
    await this.init();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('ehr_records').select('*');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            patientId: d.patient_id,
            recordTitle: d.record_title,
            department: d.department,
            classificationLevel: d.classification_level,
            encryptedPayload: d.encrypted_payload,
            payloadIv: d.payload_iv,
            authTag: d.auth_tag,
            encapsulatedDek: d.encapsulated_dek,
            abacPolicy: d.abac_policy,
            createdBy: d.created_by,
            createdByName: d.created_by_name,
            createdAt: d.created_at,
            kemAlgorithm: d.kem_algorithm,
          }));
        }
      } catch {}
    }
    return [...this.records];
  }

  public async getRecordById(id: string): Promise<EhrRecord | undefined> {
    const list = await this.getRecords();
    return list.find((r) => r.id === id);
  }

  public async createRecord(
    newRecord: Omit<EhrRecord, 'id' | 'createdAt'>,
    fhirPayload?: FhirEhrPayload
  ): Promise<EhrRecord> {
    await this.init();
    const id = `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    const record: EhrRecord = {
      ...newRecord,
      id,
      createdAt,
    };

    this.records.unshift(record);
    this.persistAll();

    // Also write to audit log
    await this.addAuditLogEntry({
      eventType: 'RECORD_CREATED',
      userId: record.createdBy,
      userName: record.createdByName || 'Unknown Clinician',
      userRole: 'Clinician',
      recordId: record.id,
      recordTitle: record.recordTitle,
      policyEvaluated: record.abacPolicy,
      outcome: 'GRANTS',
      reason: `New EHR encrypted with AES-256-GCM and encapsulated with ML-KEM-768 under ${record.abacPolicy.name}.`,
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ehr_records').insert([
          {
            id: record.id,
            patient_id: record.patientId,
            record_title: record.recordTitle,
            department: record.department,
            classification_level: record.classificationLevel,
            encrypted_payload: record.encryptedPayload,
            payload_iv: record.payloadIv,
            auth_tag: record.authTag,
            encapsulated_dek: record.encapsulatedDek,
            abac_policy: record.abacPolicy,
            created_by_name: record.createdByName,
            kem_algorithm: record.kemAlgorithm,
          },
        ]);
      } catch {}
    }

    return record;
  }

  // ============================================================================
  // AUDIT LOGS (Immutable SHA3-512 Hash Chain)
  // ============================================================================

  public async getAuditLogs(): Promise<AuditLogEntry[]> {
    await this.init();
    return [...this.auditLogs];
  }

  public async addAuditLogEntry(
    entry: Omit<AuditLogEntry, 'id' | 'sha3Hash' | 'previousHash' | 'signature' | 'timestamp'>
  ): Promise<AuditLogEntry> {
    await this.init();
    const id = `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();

    const lastEntry = this.auditLogs[0];
    const previousHash = lastEntry
      ? lastEntry.sha3Hash
      : '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    const sha3Hash = computeAuditBlockHash(previousHash, {
      eventType: entry.eventType,
      userId: entry.userId,
      recordId: entry.recordId,
      outcome: entry.outcome,
      timestamp,
    });

    const signature = signWithMlDsa65(sha3Hash);

    const fullEntry: AuditLogEntry = {
      ...entry,
      id,
      sha3Hash,
      previousHash,
      signature,
      timestamp,
    };

    this.auditLogs.unshift(fullEntry);
    this.persistAll();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('audit_logs').insert([
          {
            id: fullEntry.id,
            event_type: fullEntry.eventType,
            user_id: fullEntry.userId.startsWith('usr-') ? null : fullEntry.userId,
            user_name: fullEntry.userName,
            user_role: fullEntry.userRole,
            record_title: fullEntry.recordTitle,
            policy_evaluated: fullEntry.policyEvaluated,
            outcome: fullEntry.outcome,
            reason: fullEntry.reason,
            sha3_hash: fullEntry.sha3Hash,
            previous_hash: fullEntry.previousHash,
            signature: fullEntry.signature,
            metadata: fullEntry.metadata || {},
            timestamp: fullEntry.timestamp,
          },
        ]);
      } catch {}
    }

    return fullEntry;
  }

  // ============================================================================
  // EMERGENCY BREAK GLASS
  // ============================================================================

  public async getBreakGlassEvents(): Promise<EmergencyBreakGlassEvent[]> {
    await this.init();
    return [...this.breakGlassEvents];
  }

  public async createBreakGlassEvent(
    event: Omit<EmergencyBreakGlassEvent, 'id' | 'timestamp' | 'token'>
  ): Promise<EmergencyBreakGlassEvent> {
    await this.init();
    const id = `bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();
    const token = `EMERGENCY-OVERRIDE-${uint8ArrayToHex(getRandomBytes(16)).toUpperCase()}`;

    const fullEvent: EmergencyBreakGlassEvent = {
      ...event,
      id,
      timestamp,
      token,
    };

    this.breakGlassEvents.unshift(fullEvent);
    this.persistAll();

    // Broadcast high-severity audit log
    await this.addAuditLogEntry({
      eventType: 'BREAK_GLASS_ACCESS',
      userId: event.actorId,
      userName: event.actorName,
      userRole: event.actorRole,
      recordId: event.recordId,
      recordTitle: event.recordTitle,
      outcome: 'BREAK_GLASS',
      reason: `EMERGENCY BREAK-GLASS ACTIVATED: ${event.justification} (Token: ${token})`,
      metadata: {
        severity: event.severity,
        patientId: event.patientId,
        emergencyToken: token,
      },
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('emergency_break_glass_events').insert([
          {
            id: fullEvent.id,
            patient_id: fullEvent.patientId,
            actor_name: fullEvent.actorName,
            actor_role: fullEvent.actorRole,
            justification: fullEvent.justification,
            severity: fullEvent.severity,
            token: fullEvent.token,
            timestamp: fullEvent.timestamp,
          },
        ]);
      } catch {}
    }

    return fullEvent;
  }

  // ============================================================================
  // KEY AUTHORITIES & AUDIT VERIFICATION
  // ============================================================================

  public async getKeyAuthorities(): Promise<KeyGovernanceAuthority[]> {
    await this.init();
    return [...this.authorities];
  }

  /**
   * Verifies the cryptographic integrity of the entire audit hash chain.
   * Walks chronological history and checks every SHA3-512 block linkage.
   */
  public async verifyAuditLedgerIntegrity(): Promise<{
    valid: boolean;
    verifiedBlocksCount: number;
    errorBlockIndex?: number;
    tipHash: string;
  }> {
    await this.init();
    const chronological = [...this.auditLogs].reverse();

    if (chronological.length === 0) {
      return { valid: true, verifiedBlocksCount: 0, tipHash: 'EMPTY' };
    }

    let prevHash =
      '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < chronological.length; i++) {
      const block = chronological[i];
      if (i > 0 && block.previousHash !== prevHash) {
        return {
          valid: false,
          verifiedBlocksCount: i,
          errorBlockIndex: i,
          tipHash: block.sha3Hash,
        };
      }

      // Recompute SHA3-512
      const expectedHash = computeAuditBlockHash(block.previousHash, {
        eventType: block.eventType,
        userId: block.userId,
        recordId: block.recordId,
        outcome: block.outcome,
        timestamp: block.timestamp,
      });

      if (block.sha3Hash !== expectedHash) {
        return {
          valid: false,
          verifiedBlocksCount: i,
          errorBlockIndex: i,
          tipHash: block.sha3Hash,
        };
      }

      prevHash = block.sha3Hash;
    }

    return {
      valid: true,
      verifiedBlocksCount: chronological.length,
      tipHash: prevHash,
    };
  }
}

export const ehrRepository = new EhrRepository();
