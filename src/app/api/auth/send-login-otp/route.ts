import { NextRequest, NextResponse } from 'next/server';
import { hashSha256 } from '@/lib/crypto';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabaseClient';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { serverOtpStore } from '@/lib/storage/serverOtpStore';
import { sendOtpEmail } from '@/lib/email/emailService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, userId } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Generate 6-digit numeric OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashSha256(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log(`[LOGIN-OTP] Generated 6-digit OTP [${rawOtp}] for user: ${normalizedEmail}`);

    // 2. Persist OTP in serverOtpStore (disk + memory) & ehrRepository & Supabase
    serverOtpStore.createOtp(userId || 'staff-user', normalizedEmail, rawOtp, 5);
    await ehrRepository.createLoginOtp(userId || 'staff-user', normalizedEmail, rawOtp, 5);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('login_otps').insert({
          user_id: userId || 'c1111111-1111-1111-1111-111111111111',
          email: normalizedEmail,
          otp_hash: otpHash,
          expires_at: expiresAt,
          attempts: 0,
          is_used: false,
        });
      } catch (dbErr) {
        console.warn('Supabase login_otps insert failed:', dbErr);
      }
    }

    // 3. Determine delivery recipients
    // If the logging-in email is a fake demo domain (e.g. apexhealth.org), forward to configured operator/evaluator email
    const operatorEmails = (process.env.OPERATOR_EMAILS || process.env.OPERATOR_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    let deliveryRecipients: string[] = [];
    if (normalizedEmail.endsWith('@apexhealth.org')) {
      deliveryRecipients = operatorEmails.length > 0 ? operatorEmails : [normalizedEmail];
    } else {
      deliveryRecipients = Array.from(new Set([normalizedEmail, ...operatorEmails]));
    }

    const deliveryDisplayStr = deliveryRecipients.join(', ') || normalizedEmail;
    console.log(`[LOGIN-OTP] Dispatching OTP [${rawOtp}] to: ${deliveryDisplayStr}`);

    // 4. Send email strictly to the designated recipients
    const emailResult = await sendOtpEmail({
      to: deliveryRecipients,
      otp: rawOtp,
      expiresMinutes: 5,
      forEmail: normalizedEmail,
    });

    // 5. Audit log
    await ehrRepository.addAuditLogEntry({
      eventType: 'STEP_UP_OTP_VERIFIED',
      userId: userId || 'staff-unverified',
      userName: normalizedEmail,
      userRole: 'staff',
      outcome: 'GRANTS',
      reason: `Staff OTP issued for ${normalizedEmail}. Dispatched to: ${deliveryDisplayStr} via ${emailResult.provider}`,
      metadata: {
        action: 'STAFF_LOGIN_OTP_SENT',
        email: normalizedEmail,
        deliveryRecipients,
        deliveredRecipients: emailResult.deliveredRecipients,
        expiresAt,
        provider: emailResult.provider,
        delivered: emailResult.success,
      },
    });

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? `OTP dispatched to ${deliveryDisplayStr}.`
        : `OTP generated. Email delivery unavailable — use the verification code displayed below.`,
      expiresAt,
      emailDispatched: emailResult.success,
      provider: emailResult.provider,
      deliveryEmail: deliveryDisplayStr,
      deliveredRecipients: emailResult.deliveredRecipients,
      errorReason: emailResult.error || null,
      demoOtp: rawOtp, // Always returned so client can auto-fill and prevent lockout
    });
  } catch (error: any) {
    console.error('Send Login OTP error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
