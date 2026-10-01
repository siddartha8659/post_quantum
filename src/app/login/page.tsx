'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  AlertCircle,
  Database,
  CheckCircle2,
  Atom,
  ShieldCheck,
  Mail,
  KeyRound,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  Stethoscope,
  HeartPulse,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserProfile } from '@/types/ehr';

// Pre-configured accounts for project representation (Suresh, Yash, Riya, Aliya, Siddartha)
const DEMO_PRESETS = [
  {
    name: 'Dr. Siddartha Kokkula',
    email: 'kokkulasiddartha492@gmail.com',
    role: 'doctor',
    roleLabel: 'Attending Cardiologist',
    department: 'Cardiology',
    clearance: 'Tier-3',
    hospital: 'Apex Health',
    badgeColor: 'border-red-500/40 bg-red-950/30 text-red-300',
    icon: Stethoscope,
  },
  {
    name: 'Dr. Suresh',
    email: '23p61a6789@vbithyd.ac.in',
    role: 'doctor',
    roleLabel: 'Attending Oncologist',
    department: 'Oncology',
    clearance: 'Tier-3',
    hospital: 'Apex Health',
    badgeColor: 'border-purple-500/40 bg-purple-950/30 text-purple-300',
    icon: Stethoscope,
  },
  {
    name: 'Nurse Yash',
    email: 'yash25639949@gmail.com',
    role: 'nurse',
    roleLabel: 'Cardiology Ward Nurse',
    department: 'Cardiology',
    clearance: 'Tier-2',
    hospital: 'Apex Health',
    badgeColor: 'border-blue-500/40 bg-blue-950/30 text-blue-300',
    icon: HeartPulse,
  },
  {
    name: 'Nurse Aliya',
    email: 'aliya.nurse@apexhealth.org',
    role: 'nurse',
    roleLabel: 'Oncology Ward Nurse',
    department: 'Oncology',
    clearance: 'Tier-2',
    hospital: 'Apex Health',
    badgeColor: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
    icon: HeartPulse,
  },
  {
    name: 'Dr. Priya',
    email: '257y1a6787@mlritm.ac.in',
    role: 'er_doctor',
    roleLabel: 'Emergency Trauma Physician',
    department: 'Emergency',
    clearance: 'Tier-3',
    hospital: 'Apex Health',
    badgeColor: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
    icon: ShieldAlert,
  },
  {
    name: 'Riya',
    email: 'riya.patient@apexhealth.org',
    role: 'patient',
    roleLabel: 'Cardiology Patient (Self-Service)',
    department: 'Cardiology',
    clearance: 'Tier-1',
    hospital: 'Apex Health',
    badgeColor: 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300',
    icon: User,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { authenticateCredentials, completeStaffOtpLogin, loginAsPatient } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mandatory Staff Login OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingStaffProfile, setPendingStaffProfile] = useState<UserProfile | null>(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  // In-app OTP fallback: shown when email delivery fails
  const [inAppOtp, setInAppOtp] = useState<string | null>(null);
  const [otpDeliveryEmail, setOtpDeliveryEmail] = useState<string | null>(null);
  const [otpProvider, setOtpProvider] = useState<string | null>(null);
  const [otpErrorReason, setOtpErrorReason] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isVerifyingRef = useRef(false);

  // Timer countdown for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOtpModal && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP digit input when modal opens
  useEffect(() => {
    if (showOtpModal) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [showOtpModal]);

  /**
   * Dispatches login OTP to backend
   */
  const dispatchLoginOtp = async (staffProfile: UserProfile) => {
    try {
      const res = await fetch('/api/auth/send-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: staffProfile.email,
          userId: staffProfile.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPendingStaffProfile(staffProfile);
        setShowOtpModal(true);
        setTimeLeft(300);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setResendCooldown(30);
        setInAppOtp(data.demoOtp || null);
        setOtpDeliveryEmail(data.deliveryEmail || staffProfile.email);
        setOtpProvider(data.provider || null);
        setOtpErrorReason(data.errorReason || null);
      } else {
        setErrorMsg(data.error || 'Failed to dispatch Security Login OTP.');
      }
    } catch {
      setErrorMsg('Network error connecting to OTP security service.');
    }
  };

  /**
   * Step 1 Submission: Credentials verification
   */
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter an email address.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await authenticateCredentials(email, password);
      if (!result.success || !result.profile) {
        setErrorMsg(result.error || 'Invalid credentials or unregistered clinician email.');
        return;
      }

      // Patient login: bypass staff OTP challenge and redirect to patient portal
      if (result.isPatient) {
        loginAsPatient(result.profile);
        router.push('/portal/patient');
        return;
      }

      // Staff member (doctor, nurse, er_doctor): MANDATORY 6-digit Email OTP
      await dispatchLoginOtp(result.profile);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fast 1-Click Demographic Preset Login
   */
  const handlePresetSelect = async (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Password@123');
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await authenticateCredentials(presetEmail, 'Password@123');
      if (!result.success || !result.profile) {
        setErrorMsg(result.error || 'Unable to authenticate preset account.');
        return;
      }

      if (result.isPatient) {
        loginAsPatient(result.profile);
        router.push('/portal/patient');
        return;
      }

      await dispatchLoginOtp(result.profile);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2 OTP Verification
   */
  const handleOtpInput = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    if (clean.length > 1) {
      // User typed or pasted multi-digit string into this box
      setOtpDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < clean.length && index + i < 6; i++) {
          next[index + i] = clean[i];
        }
        const full = next.join('');
        if (full.length === 6) {
          verifyOtpCode(full);
        }
        return next;
      });
      const nextIdx = Math.min(5, index + clean.length);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      const full = next.join('');
      if (full.length === 6) {
        verifyOtpCode(full);
      }
      return next;
    });

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clean = e.clipboardData.getData('text').replace(/\D/g, '');
    if (clean.length >= 6) {
      const code = clean.slice(0, 6);
      const digits = code.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      verifyOtpCode(code);
    }
  };

  const handleAutoFillAndVerify = (code: string) => {
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length === 6) {
      setOtpDigits(clean.split(''));
      verifyOtpCode(clean);
    }
  };

  const verifyOtpCode = async (code: string) => {
    const cleanCode = (code || '').trim().replace(/\D/g, '');
    if (!pendingStaffProfile || cleanCode.length !== 6 || isVerifyingRef.current) return;

    isVerifyingRef.current = true;
    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const res = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingStaffProfile.email,
          otp: cleanCode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        completeStaffOtpLogin(pendingStaffProfile, data.token);
        setShowOtpModal(false);
        router.push('/dashboard');
      } else {
        setOtpError(data.error || 'Invalid 6-digit OTP code.');
      }
    } catch {
      setOtpError('Verification request failed. Please check network.');
    } finally {
      setIsVerifyingOtp(false);
      isVerifyingRef.current = false;
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen quantum-grid-bg flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* LEFT COLUMN: Cryptographic Security Mesh Architecture */}
        <div className="lg:col-span-6 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-quantum-950/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-quantum-600 to-cyan-400 p-0.5 shadow-lg shadow-quantum-900/40">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                  <Atom className="h-6 w-6 text-quantum-300 animate-spin-slow" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">
                  PQ-ABAC<span className="text-quantum-400">-EHR</span>
                </h1>
                <p className="text-xs font-medium text-slate-400">
                  Post-Quantum Attribute-Based Access Control
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Quantum-Resistant Clinical Data Governance.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Protecting Electronic Health Records against quantum-scale adversaries with
                FIPS 203 ML-KEM-768 lattice key encapsulation, strict departmental data isolation,
                and mandatory login-time email OTP security challenges for clinical staff.
              </p>
            </div>

            {/* Cryptographic Primitives Checklist */}
            <div className="space-y-3">
              {[
                {
                  title: 'Strict Departmental Isolation',
                  desc: 'Zero cross-department visibility enforced at Supabase RLS and API filters',
                  badge: 'ZERO LEAKAGE',
                },
                {
                  title: 'Mandatory Staff Login OTP',
                  desc: 'Immediate 6-digit numeric email challenge for all attending clinicians & nurses',
                  badge: '2-STEP MFA',
                },
                {
                  title: 'FIPS 203 ML-KEM-768',
                  desc: 'Module-LWE Post-Quantum Key Encapsulation (1088-byte ciphertext)',
                  badge: 'NIST LEVEL 3',
                },
                {
                  title: 'AES-256-GCM Envelope Layer',
                  desc: 'Symmetric payload encryption natively resilient to Grover’s search algorithm',
                  badge: '256-BIT DEK',
                },
                {
                  title: 'SHA3-512 & FIPS 204 ML-DSA-65',
                  desc: 'Tamper-proof append-only audit ledger chained with Keccak permutations',
                  badge: 'IMMUTABLE',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 flex items-start space-x-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-quantum-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{item.title}</span>
                      <span className="rounded bg-quantum-950 px-1.5 py-0.5 text-[9px] font-mono font-bold text-quantum-400 border border-quantum-800/50">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Apex Health Systems Cryptographic Mesh</span>
            <span className="font-mono text-quantum-400">FIPS PUB 203 / 204</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Demographic Presets & Login Form */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Healthcare Portal Authentication
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a verified clinical staff demographic preset or authenticate via Supabase credentials.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Project Representation / Team Members */}
            <div className="mb-4 rounded-2xl border border-quantum-500/30 bg-quantum-950/40 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-quantum-300 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Project Representation</span>
                </div>
                <span className="text-[10px] font-mono text-quantum-400 bg-quantum-900/80 px-2 py-0.5 rounded-full border border-quantum-700/40">
                  Team Members
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Suresh', 'Yash', 'Riya', 'Aliya', 'Priya', 'Siddartha'].map((name) => (
                  <span
                    key={name}
                    className="rounded-lg border border-slate-700/70 bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-slate-200 shadow-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Demo Presets (Exact 6 Accounts) */}
            <div className="mb-6 space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-quantum-400 flex items-center justify-between">
                <span>Pre-Configured Demo Accounts (1-Click Test Login)</span>
                <span className="text-[10px] text-slate-500 font-normal">Department Partitioned</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.email}
                      type="button"
                      onClick={() => handlePresetSelect(preset.email)}
                      disabled={isLoading}
                      className={`rounded-xl border p-3 text-left transition hover:scale-[1.02] hover:border-slate-500 ${preset.badgeColor}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="font-bold text-xs text-white truncate max-w-[130px]">
                            {preset.name}
                          </span>
                        </div>
                        <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                          {preset.clearance}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">
                        {preset.roleLabel}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono truncate max-w-[140px]">{preset.email}</span>
                        <span className="font-semibold text-slate-300">[{preset.department}]</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase">
                Or Sign In With Email & Password
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Healthcare System Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. kokkulasiddartha492@gmail.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Master Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-quantum-900/30 hover:from-quantum-500 hover:to-cyan-400 transition"
              >
                <span>{isLoading ? 'Verifying Credentials...' : 'Sign In & Trigger Security Challenge'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Database className="h-3.5 w-3.5 text-quantum-400" />
              <span>Supabase Auth & PostgreSQL RLS</span>
            </div>
            <span>HIPAA & FIPS 203 Compliant</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MANDATORY STAFF LOGIN OTP CHALLENGE MODAL                                  */}
      {/* ========================================================================= */}
      {showOtpModal && pendingStaffProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-quantum-600/30 to-cyan-500/20 border border-quantum-500/40 p-2 shadow-lg mb-3">
                <ShieldCheck className="h-7 w-7 text-quantum-400" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Two-Step Staff Security Verification
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                A 6-digit numeric login code has been dispatched to:
              </p>
              <p className="font-mono text-xs text-quantum-300 font-semibold mt-0.5">
                {otpDeliveryEmail || pendingStaffProfile.email}
              </p>
              <div className="mt-2 inline-flex items-center space-x-1.5 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">{pendingStaffProfile.fullName}</span>
                <span>•</span>
                <span className="text-quantum-400">[{pendingStaffProfile.department}]</span>
              </div>
            </div>

            {/* Email Delivery Status */}
            <div className="mb-4 rounded-2xl border border-cyan-800/60 bg-cyan-950/40 p-3.5 flex items-start space-x-3 text-xs text-cyan-200">
              <Mail className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <p className="font-semibold text-white">Security Code Dispatched</p>
                <p className="text-[11px] text-cyan-300/80 leading-relaxed">
                  A 6-digit login verification code was sent to{' '}
                  <span className="font-mono text-cyan-200 font-semibold">
                    {otpDeliveryEmail || pendingStaffProfile.email}
                  </span>
                  {otpProvider && (
                    <span className="ml-1 text-slate-400">via {otpProvider}</span>
                  )}
                  . Enter it below.
                </p>
                {otpErrorReason && (
                  <p className="text-[10px] text-amber-300/80 mt-1 font-mono">
                    Note: {otpErrorReason}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Demo Helper & In-App Auto Fill */}
            {inAppOtp && (
              <div className="mb-4 rounded-2xl border border-quantum-500/40 bg-gradient-to-r from-slate-950 via-quantum-950/40 to-slate-950 p-3 text-xs text-quantum-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="font-bold text-white text-[11px]">Instant Verification Assistant</span>
                  </div>
                  <span className="rounded bg-quantum-900/60 px-2 py-0.5 text-[9px] font-mono text-quantum-400 border border-quantum-700/50">
                    Active Code
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2">
                  <div className="font-mono text-xl font-black tracking-[0.25em] text-quantum-300">
                    {inAppOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFillAndVerify(inAppOtp)}
                    disabled={isVerifyingOtp}
                    className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-quantum-600 to-cyan-500 px-3 py-1.5 text-xs font-bold text-white hover:from-quantum-500 hover:to-cyan-400 transition shadow-md shadow-quantum-950 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>⚡ Auto-Fill & Verify</span>
                  </button>
                </div>
              </div>
            )}

            {otpError && (
              <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* 6-Digit Auto-Focus Inputs */}
            <div className="flex justify-center space-x-2 sm:space-x-3 mb-6" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isVerifyingOtp}
                  className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-slate-700 bg-slate-950 text-center font-mono text-xl font-bold text-white shadow-inner focus:border-quantum-400 focus:outline-none focus:ring-2 focus:ring-quantum-500/20 disabled:opacity-50"
                />
              ))}
            </div>

            {/* Countdown Timer & Resend */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-6 px-1">
              <div className="flex items-center space-x-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Code expires in:</span>
                <span className="font-mono font-semibold text-slate-200">{formatTimer(timeLeft)}</span>
              </div>

              <button
                type="button"
                onClick={() => dispatchLoginOtp(pendingStaffProfile)}
                disabled={resendCooldown > 0 || isVerifyingOtp}
                className="flex items-center space-x-1 text-quantum-400 hover:text-quantum-300 disabled:text-slate-600 transition"
              >
                <RefreshCw className={`h-3 w-3 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>

            {/* Manual Verify Button */}
            <button
              type="button"
              onClick={() => verifyOtpCode(otpDigits.join(''))}
              disabled={isVerifyingOtp || otpDigits.some((d) => !d)}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 py-3 text-xs font-bold text-white shadow-lg shadow-quantum-900/40 hover:from-quantum-500 hover:to-cyan-400 transition disabled:opacity-50"
            >
              <span>{isVerifyingOtp ? 'Establishing Quantum Session...' : 'Verify OTP & Enter Clinical Portal'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
