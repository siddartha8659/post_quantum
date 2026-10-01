import fs from 'fs';
import path from 'path';
import { hashSha256 } from '@/lib/crypto';
import { StoredLoginOtp } from '@/lib/storage/ehrRepository';

const CACHE_DIR = path.join(process.cwd(), '.next', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'pq_login_otps.json');

// In-memory fallback
let memoryOtps: StoredLoginOtp[] = [];

function loadOtpsFromDisk(): StoredLoginOtp[] {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return memoryOtps;
    }
    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      // Merge memory and disk
      const map = new Map<string, StoredLoginOtp>();
      for (const item of memoryOtps) {
        if (item?.id) map.set(item.id, item);
      }
      for (const item of parsed) {
        if (item?.id) map.set(item.id, item);
      }
      memoryOtps = Array.from(map.values());
      return memoryOtps;
    }
  } catch (err) {
    console.warn('[SERVER-OTP] Failed reading OTP cache file:', err);
  }
  return memoryOtps;
}

function saveOtpsToDisk(otps: StoredLoginOtp[]): void {
  memoryOtps = otps;
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(otps, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SERVER-OTP] Failed writing OTP cache file:', err);
  }
}

export const serverOtpStore = {
  /**
   * Records a freshly generated 6-digit OTP challenge
   */
  createOtp(userId: string, email: string, rawOtp: string, expiresMinutes = 5): StoredLoginOtp {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = rawOtp.trim().replace(/\s+/g, '');
    const otpHash = hashSha256(cleanOtp);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

    const currentOtps = loadOtpsFromDisk();

    // Clean up expired OTPs older than 15 minutes to prevent unbounded growth
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const activeOtps = currentOtps.filter((o) => new Date(o.createdAt) >= cutoff);

    const newOtp: StoredLoginOtp & { rawOtp?: string } = {
      id: `otp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      email: cleanEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      isUsed: false,
      createdAt: new Date().toISOString(),
    };

    activeOtps.push(newOtp);
    saveOtpsToDisk(activeOtps);

    console.log(`[SERVER-OTP] Stored OTP challenge for ${cleanEmail} (ID: ${newOtp.id}, Hash: ${otpHash.slice(0, 10)}...)`);
    return newOtp;
  },

  /**
   * Verifies an OTP against all active, unexpired challenges for this email
   */
  verifyOtp(email: string, rawOtp: string): { valid: boolean; reason?: string; otpRecord?: StoredLoginOtp } {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = rawOtp.trim().replace(/\s+/g, '');
    const inputHash = hashSha256(cleanOtp);
    const now = new Date();

    const allOtps = loadOtpsFromDisk();
    const userOtps = allOtps.filter((o) => o.email.toLowerCase().trim() === cleanEmail);

    if (userOtps.length === 0) {
      console.warn(`[SERVER-OTP] No OTP records found for email: ${cleanEmail}`);
      return { valid: false, reason: 'No active login OTP challenge found. Please request a new code.' };
    }

    // Find unexpired, unused OTPs
    const unexpiredUnused = userOtps.filter((o) => !o.isUsed && new Date(o.expiresAt) >= now);

    if (unexpiredUnused.length === 0) {
      // Check if recent OTPs expired
      const expired = userOtps.filter((o) => !o.isUsed && new Date(o.expiresAt) < now);
      if (expired.length > 0) {
        return { valid: false, reason: 'Login OTP has expired. Security timeout is 5 minutes. Please request a new code.' };
      }
      return { valid: false, reason: 'This verification code has already been used. Please request a new code.' };
    }

    // Check if input matches ANY unexpired OTP challenge issued for this email
    const matched = unexpiredUnused.find((o) => o.otpHash === inputHash);

    if (!matched) {
      // Increment attempt counter on the latest challenge
      const latest = unexpiredUnused.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      latest.attempts = (latest.attempts || 0) + 1;
      saveOtpsToDisk(allOtps);

      console.warn(
        `[SERVER-OTP] Verification failed for ${cleanEmail}. Attempt ${latest.attempts}/5. Input: ${cleanOtp} (hash: ${inputHash.slice(0, 8)})`
      );

      if (latest.attempts >= 5) {
        return { valid: false, reason: 'Maximum OTP verification attempts exceeded (5). Please request a new code.' };
      }

      return { valid: false, reason: 'Invalid 6-digit verification code. Please check your email.' };
    }

    // Match found! Mark this OTP and all other pending OTPs for this email as used
    matched.isUsed = true;
    for (const o of userOtps) {
      o.isUsed = true;
    }
    saveOtpsToDisk(allOtps);

    console.log(`[SERVER-OTP] ✅ OTP verified successfully for ${cleanEmail} (matched ID: ${matched.id})`);
    return { valid: true, otpRecord: matched };
  },

  /**
   * Retrieves all OTPs for debugging / inspection
   */
  getAllOtps(): StoredLoginOtp[] {
    return loadOtpsFromDisk();
  },
};
