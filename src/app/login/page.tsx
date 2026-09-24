'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  AlertCircle,
  Database,
  CheckCircle2,
  Atom,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      router.push('/dashboard');
    } else {
      setErrorMsg('Invalid credentials or unregistered clinician profile.');
    }
  };

  const handleQuickLogin = async (presetEmail: string) => {
    setErrorMsg('');
    setIsLoading(true);
    const success = await login(presetEmail, 'demo-password-2026');
    setIsLoading(false);
    if (success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen quantum-grid-bg flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* LEFT COLUMN: PQC Cryptographic Architecture Showcase */}
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
                Electronic Health Records protected against Shor’s algorithm and Grover’s attack
                via standard FIPS 203 ML-KEM-768 lattice key encapsulation and fine-grained ABAC policy trees.
              </p>
            </div>

            {/* Cryptographic Primitives Checklist */}
            <div className="space-y-3">
              {[
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
                  title: 'Dynamic ABAC Policy Engine',
                  desc: 'Multi-attribute evaluation (Role, Dept, Clearance, Hospital, Revocation)',
                  badge: 'BOOLEAN TREE',
                },
                {
                  title: 'FIPS 204 ML-DSA-65 & SHA3-512',
                  desc: 'Tamper-evident audit ledger chained with Keccak permutations',
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

        {/* RIGHT COLUMN: Dedicated Healthcare Login & 1-Click Fast Presets */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Healthcare Portal Authentication
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticate with Supabase credentials or select a verified clinician demographic preset.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Demo Presets (Requested by prompt) */}
            <div className="mb-6 space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-quantum-400 flex items-center justify-between">
                <span>Fast Demographic Presets (1-Click Test Login)</span>
                <span className="text-[10px] text-slate-500 font-normal">Instant Role Simulation</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    name: 'Dr. Sarah Rao',
                    role: 'Oncologist',
                    dept: 'Oncology',
                    clearance: 'Tier-3',
                    hospital: 'Apex Health',
                    email: 'sarah.rao@apexhealth.org',
                    color: 'border-purple-800/60 bg-purple-950/30 text-purple-200',
                  },
                  {
                    name: 'Nurse Alex',
                    role: 'Triage_Nurse',
                    dept: 'Emergency',
                    clearance: 'Tier-1',
                    hospital: 'Apex Health',
                    email: 'alex.rivera@apexhealth.org',
                    color: 'border-blue-800/60 bg-blue-950/30 text-blue-200',
                  },
                  {
                    name: 'Dr. Emergency John',
                    role: 'ER_Physician',
                    dept: 'Emergency',
                    clearance: 'Tier-2',
                    hospital: 'Apex Health',
                    email: 'john.trauma@apexhealth.org',
                    color: 'border-rose-800/60 bg-rose-950/30 text-rose-200',
                  },
                  {
                    name: 'Researcher Dave',
                    role: 'Epidemiologist',
                    dept: 'Research',
                    clearance: 'Tier-1',
                    hospital: 'Regional Health',
                    email: 'dave.chen@regionalhealth.edu',
                    color: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-200',
                  },
                ].map((preset) => (
                  <button
                    key={preset.email}
                    type="button"
                    onClick={() => handleQuickLogin(preset.email)}
                    disabled={isLoading}
                    className={`rounded-xl border p-3 text-left transition hover:scale-[1.02] hover:border-slate-600 ${preset.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{preset.name}</span>
                      <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                        {preset.clearance}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      <span>{preset.role}</span>
                      <span className="mx-1">•</span>
                      <span>{preset.dept}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{preset.hospital}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase">
                Or Enter Email & Password
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Healthcare System Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah.rao@apexhealth.org"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Master Key / Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-quantum-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-quantum-900/30 hover:from-quantum-500 hover:to-cyan-400 transition"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Secure Portal'}</span>
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
    </div>
  );
}
