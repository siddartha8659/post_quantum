'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  ArrowRight,
  FileSpreadsheet,
  AlertTriangle,
  History,
  KeyRound,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  // Redirect logged-in users directly to their portal — they shouldn't linger on the home page
  useEffect(() => {
    if (!currentUser) return;
    const role = (currentUser.role || '').toLowerCase();
    if (role === 'patient') {
      router.replace('/portal/patient');
    } else {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  // While checking auth / redirecting, show nothing (avoids flash of home page)
  if (currentUser) {
    return (
      <div className="min-h-screen quantum-grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-quantum-400 border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-slate-400">Redirecting to your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen quantum-grid-bg flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {/* HERO SECTION */}
        <section className="text-center space-y-6 pt-8 pb-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 rounded-full border border-quantum-500/30 bg-quantum-950/80 px-4 py-1.5 text-xs font-mono font-medium text-quantum-300 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-quantum-400 animate-pulse"></span>
            <span>FIPS 203 ML-KEM-768 &amp; FIPS 204 ML-DSA-65 Standards Active</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Post-Quantum Attribute-Based Access Control for{' '}
            <span className="bg-gradient-to-r from-quantum-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
              Electronic Health Records
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminating harvest-now-decrypt-later (HNDL) threats on protected health information (PHI)
            using Module-Lattice Key Encapsulation, AES-256-GCM symmetric envelopes, and zero-trust
            ABAC clinical evaluation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-quantum-900/40 hover:from-quantum-500 hover:to-cyan-400 hover:scale-105 transition"
            >
              <span>Clinician &amp; Patient Login (MFA OTP)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* CORE ARCHITECTURE MODULE CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/login"
            className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl transition hover:border-quantum-600 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-quantum-950 text-quantum-400 border border-quantum-800 group-hover:scale-110 transition">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-quantum-300 transition">
                EHR Directory &amp; Live Decryption Simulator
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse encrypted patient records. Select any record to watch the ABAC engine evaluate
                clinician attributes, decapsulate ML-KEM-768 ciphertext, and render FHIR data.
              </p>
            </div>
            <div className="mt-6 flex items-center space-x-1.5 text-xs font-semibold text-quantum-400">
              <span>Login to Explore</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            href="/login"
            className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl transition hover:border-rose-600 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950 text-rose-400 border border-rose-800 group-hover:scale-110 transition">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-rose-300 transition">
                Emergency &quot;Break-Glass&quot; Console
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Life-or-death emergency override console. Clinicians enter critical trauma justification,
                generate ephemeral emergency tokens, unlock allergy lists, and broadcast high-severity audit logs.
              </p>
            </div>
            <div className="mt-6 flex items-center space-x-1.5 text-xs font-semibold text-rose-400">
              <span>Login to Access</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            href="/login"
            className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl transition hover:border-cyan-600 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800 group-hover:scale-110 transition">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                Key Governance &amp; Telemetry Center
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect Multi-Authority root keys, run browser microbenchmarks for ML-KEM-768, view PQC vs
                Classical byte overhead, and simulate dynamic clinician attribute revocation.
              </p>
            </div>
            <div className="mt-6 flex items-center space-x-1.5 text-xs font-semibold text-cyan-400">
              <span>Login to View</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </section>

        {/* SECURITY SPECIFICATIONS TABLE */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Cryptographic Primitives &amp; Regulatory Compliance
              </h2>
              <p className="text-xs text-slate-400">
                Detailed mapping of clinical data protection layers against NIST and HIPAA specifications.
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center space-x-1.5 text-xs font-bold text-quantum-400 hover:text-quantum-300"
            >
              <History className="h-4 w-4" />
              <span>Verify Immutable Audit Chain</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-quantum-400 uppercase">
                KEM Standard
              </span>
              <p className="text-sm font-bold text-white">FIPS 203 ML-KEM-768</p>
              <p className="text-xs text-slate-400">
                Module Learning With Errors (M-LWE) lattice KEM. Public key: 1,184B, Ciphertext: 1,088B.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                Symmetric Payload
              </span>
              <p className="text-sm font-bold text-white">AES-256-GCM</p>
              <p className="text-xs text-slate-400">
                Grover-resistant 256-bit symmetric DEK with 96-bit random IV and 128-bit authentication tag.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
                Digital Signatures
              </span>
              <p className="text-sm font-bold text-white">FIPS 204 ML-DSA-65</p>
              <p className="text-xs text-slate-400">
                Module-Lattice digital signatures verifying audit block provenance and break-glass authority.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                Provenance Hash
              </span>
              <p className="text-sm font-bold text-white">SHA3-512 Hash Chain</p>
              <p className="text-xs text-slate-400">
                Keccak permutation chaining each audit block to its ancestor, strictly append-only.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/80 py-5 px-6 text-center space-y-2">
        <p className="text-[11px] font-mono text-slate-500">
          Apex Health Systems · FIPS PUB 203 / 204 · HIPAA Compliant ·{' '}
          <span className="text-quantum-500">PQ-ABAC-EHR v2.4</span>
        </p>
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1 text-xs text-slate-400 font-mono">
          <span className="text-quantum-400 font-semibold">Project Representation:</span>
          <span className="text-slate-200">Suresh · Yash · Riya · Aliya · Priya · Siddartha</span>
        </div>
      </footer>
    </div>
  );
}
