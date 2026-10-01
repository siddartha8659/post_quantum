import { NextRequest, NextResponse } from 'next/server';
import { ehrRepository } from '@/lib/storage/ehrRepository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actorName,
      actorRole,
      actorDepartment,
      recordDepartment,
      justification,
      severity,
      recordTitle,
      patientId,
      token,
    } = body;

    const targetDept = recordDepartment || actorDepartment || 'Cardiology';

    console.log(`\n======================================================`);
    console.log(`[IN-PORTAL EMERGENCY SIREN ALERT TRIGGERED]`);
    console.log(`Target Department: ${targetDept.toUpperCase()}`);
    console.log(`Severity: ${severity}`);
    console.log(`Actor: ${actorName} (${actorRole})`);
    console.log(`Patient Record: ${recordTitle} [${patientId}]`);
    console.log(`Token: ${token}`);
    console.log(`Justification: ${justification}`);
    console.log(`Notice: Per operational policy, alert broadcast via in-portal audible siren HUD (no email spam).`);
    console.log(`======================================================\n`);

    // Audit log entry for emergency break-glass alert registration
    await ehrRepository.addAuditLogEntry({
      eventType: 'BREAK_GLASS_ACCESS',
      userId: actorName || 'emergency-actor',
      userName: actorName,
      userRole: actorRole || 'clinician',
      outcome: 'GRANTS',
      reason: `Emergency in-portal siren alert sounded for ${targetDept}: ${justification}`,
      metadata: {
        targetDepartment: targetDept,
        patientId,
        recordTitle,
        severity,
        token,
        channel: 'IN_PORTAL_SIREN_HUD',
      },
    });

    return NextResponse.json({
      success: true,
      mode: 'IN_PORTAL_SIREN',
      targetDepartment: targetDept,
      sirenActive: true,
      message: `Emergency alert sounded via in-portal siren HUD for ${targetDept} clinical staff.`,
    });
  } catch (error: any) {
    console.error('[BREAK-GLASS-ALERT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Alert dispatch failed' },
      { status: 500 }
    );
  }
}
