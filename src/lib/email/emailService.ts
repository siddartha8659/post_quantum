import nodemailer from 'nodemailer';

// ─────────────────────────────────────────────────────────────
// OTP Email
// ─────────────────────────────────────────────────────────────

export interface SendOtpEmailParams {
  to: string | string[];  // actual delivery address(es)
  otp: string;
  expiresMinutes?: number;
  forEmail?: string;      // the clinician's address this OTP is "for" (shown in body)
}

export async function sendOtpEmail({
  to,
  otp,
  expiresMinutes = 5,
  forEmail,
}: SendOtpEmailParams): Promise<{
  success: boolean;
  provider: 'resend' | 'smtp' | 'console';
  deliveredRecipients: string[];
  error?: string;
}> {
  // Normalize recipient(s)
  const recipients: string[] = (Array.isArray(to) ? to : to.split(','))
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  // Deliver strictly to the specific recipient(s) requested (the clinician logging in)
  const uniqueRecipients = Array.from(new Set(recipients));
  const primaryTo = uniqueRecipients[0] || 'staff@apexhealth.org';

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  console.log(`[EMAIL] OTP dispatch requested for: ${uniqueRecipients.join(', ')}`);
  console.log(`[EMAIL] SMTP: ${smtpUser ? 'YES (' + smtpUser + ')' : 'NO'} | Resend: ${resendApiKey ? 'YES' : 'NO'}`);

  const displayEmail = forEmail || primaryTo;
  const isRedirected = !!(forEmail && forEmail !== primaryTo);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b1120; color: #f8fafc;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 20px; font-weight: 800;">Apex Health Systems</h2>
        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0; font-family: monospace;">FIPS 203 Post-Quantum Access Control Perimeter</p>
      </div>
      <h3 style="color: #ffffff; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">Two-Step Staff Security Verification Code</h3>
      ${isRedirected ? `<p style="color: #f59e0b; font-size: 12px; background: #1c1200; border: 1px solid #92400e; border-radius: 8px; padding: 10px 14px; margin: 0 0 16px 0;">⚠️ OTP intended for: <strong style="font-family:monospace;color:#fbbf24">${displayEmail}</strong></p>` : ''}
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        A login challenge was initiated for clinical staff profile (<span style="color: #38bdf8; font-family: monospace; font-weight: bold;">${displayEmail}</span>). Enter this 6-digit code to establish your post-quantum cryptographic session:
      </p>
      <div style="background: #0f172a; border: 2px solid #0284c7; border-radius: 12px; text-align: center; padding: 22px 16px; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 38px; letter-spacing: 10px; font-weight: 800; color: #38bdf8;">${otp}</span>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px 0;">⏱️ Valid for <strong>${expiresMinutes} minutes</strong>. Single-use only.</p>
      <p style="color: #64748b; font-size: 11px; border-top: 1px solid #1e293b; padding-top: 16px; margin: 0;">
        If you did not request this code, notify Apex Health Information Security Operations immediately.
      </p>
    </div>
  `;

  const subject = `Apex Health - Staff Login Code [${otp}] for ${displayEmail}`;
  const deliveredRecipients: string[] = [];

  let lastError: string | undefined;

  // 1. Gmail SMTP (delivers to all recipients without domain restrictions)
  if (smtpUser && smtpPass) {
    try {
      console.log(`[EMAIL] Trying SMTP: ${smtpHost}:${smtpPort}`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.verify();
      await transporter.sendMail({
        from: `"Apex Health Security" <${smtpUser}>`,
        to: uniqueRecipients.join(', '),
        subject,
        html: htmlContent,
      });
      console.log(`[EMAIL] ✅ OTP sent to ${uniqueRecipients.join(', ')} via SMTP`);
      return { success: true, provider: 'smtp', deliveredRecipients: uniqueRecipients };
    } catch (e: any) {
      lastError = `SMTP error: ${e.message}`;
      console.error('[EMAIL] ❌ SMTP failed:', e.message);
    }
  }

  // 2. Resend API: deliver to each recipient individually so one unverified address doesn't cancel others
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const fromEmail = (process.env.RESEND_FROM || 'Apex Health <onboarding@resend.dev>').trim();
      console.log(`[EMAIL] Attempting Resend dispatch to ${uniqueRecipients.length} recipient(s)...`);

      await Promise.allSettled(
        uniqueRecipients.map(async (recipient) => {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: fromEmail,
                to: [recipient],
                subject,
                html: htmlContent,
              }),
            });
            if (res.ok) {
              deliveredRecipients.push(recipient);
              console.log(`[EMAIL] ✅ Resend delivered OTP to: ${recipient}`);
            } else {
              const err = await res.json();
              lastError = err?.message || 'Resend delivery failed';
              console.warn(`[EMAIL] ⚠️ Resend could not deliver to ${recipient}:`, lastError);
            }
          } catch (itemErr: any) {
            lastError = itemErr?.message;
            console.warn(`[EMAIL] ⚠️ Resend error for ${recipient}:`, itemErr?.message);
          }
        })
      );

      if (deliveredRecipients.length > 0) {
        return { success: true, provider: 'resend', deliveredRecipients };
      }
    } catch (e: any) {
      lastError = e.message;
      console.error('[EMAIL] ❌ Resend exception:', e.message);
    }
  }

  // 3. Local Console Fallback
  console.log(`\n${'='.repeat(54)}`);
  console.log(`[APEX-SECURITY] LOGIN OTP DISPATCHED`);
  console.log(`To: ${uniqueRecipients.join(', ')}`);
  console.log(`Code: ${otp}`);
  console.log(`For: ${displayEmail}`);
  console.log(`Expires: ${expiresMinutes}m`);
  console.log(`${'='.repeat(54)}\n`);

  return {
    success: false,
    provider: 'console',
    deliveredRecipients,
    error: lastError || 'Configure SMTP credentials in .env.local to receive emails directly in inboxes.',
  };
}


// ─────────────────────────────────────────────────────────────
// Emergency Break-Glass Alert Email
// ─────────────────────────────────────────────────────────────

export interface SendEmergencyAlertParams {
  to: string;               // delivery address (operator email or primary)
  alertedEmails: string[];  // all respected department doctors and staff addresses
  actorName: string;
  actorRole: string;
  actorDepartment: string;
  justification: string;
  severity: string;
  recordTitle: string;
  patientId: string;
  token: string;
}

export async function sendEmergencyAlertEmail({
  to,
  alertedEmails,
  actorName,
  actorRole,
  actorDepartment,
  justification,
  severity,
  recordTitle,
  patientId,
  token,
}: SendEmergencyAlertParams): Promise<{
  success: boolean;
  provider: 'resend' | 'smtp' | 'console';
  deliveredRecipients: string[];
}> {
  const normalizedTo = to.toLowerCase().trim();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  const designatedInboxes = ['yash25639949@gmail.com', 'kokkulasiddartha492@gmail.com', '23p61a6789@vbithyd.ac.in', '257y1a6787@mlritm.ac.in'];
  const targetList = Array.from(new Set([...designatedInboxes, normalizedTo, ...alertedEmails.map(e => e.toLowerCase().trim())]));

  const severityColor = severity === 'CRITICAL_OVERRIDE' ? '#f87171' : '#fb923c';
  const severityBg = severity === 'CRITICAL_OVERRIDE' ? '#450a0a' : '#431407';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; border: 2px solid #991b1b; border-radius: 16px; background-color: #0b1120; color: #f8fafc;">
      <div style="background: ${severityBg}; border: 1px solid ${severityColor}; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <h2 style="color: ${severityColor}; margin: 0 0 4px 0; font-size: 18px; font-weight: 800;">🚨 EMERGENCY BREAK-GLASS ACTIVATED</h2>
        <p style="color: #fca5a5; font-size: 13px; margin: 0; font-family: monospace; font-weight: 700;">${severity} • DEPARTMENT: ${actorDepartment.toUpperCase()}</p>
      </div>

      <div style="background: #1c1200; border: 1px solid #92400e; border-radius: 8px; padding: 10px 14px; margin: 0 0 16px 0;">
        <p style="color: #f59e0b; font-size: 12px; margin: 0; font-weight: bold;">
          📢 Alert Broadcast to Respected Department Clinicians:
        </p>
        <p style="color: #fbbf24; font-size: 11px; margin: 4px 0 0 0; font-family: monospace;">
          ${alertedEmails.join(' • ')}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8; width: 140px;">Initiating Actor</td>
          <td style="padding: 10px 0; color: #ffffff; font-weight: 700;">${actorName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">Role / Dept</td>
          <td style="padding: 10px 0; color: #ffffff;">${actorRole} · ${actorDepartment}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">Patient Record</td>
          <td style="padding: 10px 0; color: #ffffff;">${recordTitle} <span style="color:#64748b">(${patientId})</span></td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">Emergency Severity</td>
          <td style="padding: 10px 0; color: ${severityColor}; font-weight: 700;">${severity}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">Emergency Token</td>
          <td style="padding: 10px 0; color: #38bdf8; font-family: monospace; font-size: 11px;">${token}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #94a3b8;">Timestamp</td>
          <td style="padding: 10px 0; color: #ffffff; font-family: monospace; font-size: 11px;">${new Date().toISOString()}</td>
        </tr>
      </table>

      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
        <p style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; margin: 0 0 6px 0;">Mandatory Clinical Justification</p>
        <p style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0;">${justification}</p>
      </div>

      <p style="color: #64748b; font-size: 11px; border-top: 1px solid #1e293b; padding-top: 16px; margin: 0;">
        This alert was auto-generated by Apex Health PQ-ABAC-EHR cryptographic override perimeter. This event is permanently logged to the tamper-evident audit ledger. Department supervisory review required within 2 hours.
      </p>
    </div>
  `;

  const subject = `🚨 EMERGENCY BREAK-GLASS: ${severity} — ${actorName} (${actorDepartment})`;
  const deliveredRecipients: string[] = [];

  // 1. SMTP
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost, port: smtpPort, secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.verify();
      await transporter.sendMail({ from: `"Apex Health Emergency" <${smtpUser}>`, to: targetList.join(', '), subject, html });
      console.log(`[EMERGENCY-ALERT] ✅ Sent via SMTP to ${targetList.join(', ')}`);
      return { success: true, provider: 'smtp', deliveredRecipients: targetList };
    } catch (e: any) {
      console.error('[EMERGENCY-ALERT] ❌ SMTP failed:', e.message);
    }
  }

  // 2. Resend API
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const fromEmail = (process.env.RESEND_FROM || 'Apex Health <onboarding@resend.dev>').trim();
      await Promise.allSettled(
        targetList.map(async (recipient) => {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: fromEmail, to: [recipient], subject, html }),
            });
            if (res.ok) {
              deliveredRecipients.push(recipient);
              console.log(`[EMERGENCY-ALERT] ✅ Resend delivered alert to: ${recipient}`);
            } else {
              const err = await res.json();
              console.warn(`[EMERGENCY-ALERT] ⚠️ Resend could not deliver to ${recipient}:`, err?.message || err);
            }
          } catch (itemErr: any) {
            console.warn(`[EMERGENCY-ALERT] ⚠️ Resend error for ${recipient}:`, itemErr?.message);
          }
        })
      );

      if (deliveredRecipients.length > 0) {
        return { success: true, provider: 'resend', deliveredRecipients };
      }
    } catch (e: any) {
      console.error('[EMERGENCY-ALERT] ❌ Resend exception:', e.message);
    }
  }

  // 3. Console fallback
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[APEX-EMERGENCY-ALERT] BREAK-GLASS TRIGGERED`);
  console.log(`Actor: ${actorName} (${actorRole} · ${actorDepartment})`);
  console.log(`Record: ${recordTitle} | Patient: ${patientId}`);
  console.log(`Severity: ${severity}`);
  console.log(`Token: ${token}`);
  console.log(`Respected Doctors: ${alertedEmails.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  return { success: false, provider: 'console', deliveredRecipients };
}
