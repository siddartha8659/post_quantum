import { NextRequest, NextResponse } from 'next/server';
import { toHex, generateSecureRandomBytes } from '@/lib/crypto';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { serverOtpStore } from '@/lib/storage/serverOtpStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and 6-digit OTP are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim().replace(/\s+/g, '');

    console.log(`[VERIFY-OTP] Verifying login code [${cleanOtp}] for email: ${normalizedEmail}`);

    // 1. Verify OTP with serverOtpStore (persistent across workers & restarts)
    let verification = serverOtpStore.verifyOtp(normalizedEmail, cleanOtp);

    // Fallback to ehrRepository in-memory store if serverOtpStore did not validate
    if (!verification.valid) {
      console.log(`[VERIFY-OTP] serverOtpStore did not match, checking ehrRepository in-memory...`);
      const repoVerification = await ehrRepository.verifyLoginOtp(normalizedEmail, cleanOtp);
      if (repoVerification.valid) {
        verification = { valid: true };
      }
    }

    if (!verification.valid) {
      console.warn(`[VERIFY-OTP] ❌ Verification failed for ${normalizedEmail}: ${verification.reason}`);

      // Record failed attempt in audit ledger
      await ehrRepository.addAuditLogEntry({
        eventType: 'POLICY_DENIAL',
        userId: 'unverified-session',
        userName: normalizedEmail,
        userRole: 'staff',
        outcome: 'DENIED',
        reason: `Failed Staff Login OTP verification: ${verification.reason}`,
        metadata: {
          action: 'STAFF_LOGIN_OTP_FAILED',
          email: normalizedEmail,
        },
      });

      return NextResponse.json(
        { success: false, error: verification.reason || 'Invalid OTP code.' },
        { status: 401 }
      );
    }

    // 2. Lookup profile
    const profile = await ehrRepository.getProfileByEmail(normalizedEmail);

    // 3. Issue Post-Quantum Authenticated Session Token
    const sessionBytes = generateSecureRandomBytes(32);
    const pqSessionToken = `pq_sess_${toHex(sessionBytes)}`;

    // 4. Record Audit Log: STAFF_LOGIN_SUCCESS
    await ehrRepository.addAuditLogEntry({
      eventType: 'STEP_UP_OTP_VERIFIED',
      userId: profile?.id || 'staff-verified',
      userName: profile?.fullName || normalizedEmail,
      userRole: profile?.role || 'doctor',
      outcome: 'GRANTS',
      reason: `Staff Login-Time Email OTP verified. Post-quantum session token issued.`,
      metadata: {
        action: 'STAFF_LOGIN_SUCCESS',
        email: normalizedEmail,
        department: profile?.department,
        hospital_id: profile?.hospitalId || 'Apex Health',
      },
    });

    console.log(`[VERIFY-OTP] ✅ Success for ${normalizedEmail}. PQ Token: ${pqSessionToken.slice(0, 16)}...`);

    return NextResponse.json({
      success: true,
      message: 'Staff login OTP successfully verified.',
      token: pqSessionToken,
      user: profile,
    });
  } catch (error: any) {
    console.error('Verify Login OTP error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const otps = serverOtpStore.getAllOtps();
  return NextResponse.json({
    activeCount: otps.length,
    activeOtps: otps.map((o) => ({
      email: o.email,
      expiresAt: o.expiresAt,
      isUsed: o.isUsed,
      attempts: o.attempts,
    })),
  });
}
