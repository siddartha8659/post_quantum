export interface PortalEmergencyAlert {
  id: string;
  targetDepartment: string;
  recordTitle: string;
  patientId: string;
  actorName: string;
  actorRole: string;
  severity: 'CRITICAL_OVERRIDE' | 'URGENT_TRAUMA';
  justification: string;
  token: string;
  timestamp: number;
}

const STORAGE_KEY = 'pq_abac_active_siren_alert';
const CHANNEL_NAME = 'pq_abac_emergency_alerts';

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/**
 * Dispatches an emergency alert across all portal tabs and browser windows.
 */
export function broadcastPortalEmergency(alert: PortalEmergencyAlert): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Persist to localStorage for cross-window and reload detection
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alert));

    // 2. Transmit via modern BroadcastChannel
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'EMERGENCY_TRIGGERED', alert });
      channel.close();
    }

    // 3. Fire custom event for the current window
    window.dispatchEvent(new CustomEvent('pq_emergency_alert', { detail: alert }));
  } catch (err) {
    console.warn('[EMERGENCY-BROADCAST] Error broadcasting alert:', err);
  }
}

/**
 * Clears and silences the active emergency alert.
 */
export function dismissActivePortalEmergency(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'EMERGENCY_DISMISSED' });
      channel.close();
    }
    window.dispatchEvent(new CustomEvent('pq_emergency_dismissed'));
  } catch (err) {
    console.warn('[EMERGENCY-BROADCAST] Error dismissing alert:', err);
  }
}

/**
 * Retrieves the currently active emergency alert if fresh (< 10 minutes old).
 */
export function getActivePortalEmergency(): PortalEmergencyAlert | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const alert: PortalEmergencyAlert = JSON.parse(raw);
    const ageMs = Date.now() - (alert.timestamp || 0);

    // Auto-expire alerts older than 10 minutes
    if (ageMs > 10 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return alert;
  } catch {
    return null;
  }
}
