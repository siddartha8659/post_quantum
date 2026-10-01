'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  PlusCircle,
  AlertTriangle,
  KeyRound,
  History,
  ChevronDown,
  LogOut,
  Database,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, isSupabaseActive, toggleAttributeRevocation } =
    useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRevocationPanel, setShowRevocationPanel] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push('/');
  };

  const isPatient = currentUser ? (currentUser.role || '').toLowerCase() === 'patient' : false;

  const navLinks = isPatient
    ? [
        { href: '/portal/patient', label: 'My Sovereign Portal', icon: FileText },
        {
          href: '/break-glass',
          label: 'Emergency Alert',
          icon: AlertTriangle,
          urgent: true,
        },
        { href: '/audit', label: 'Clinician Audit Trail', icon: History },
      ]
    : [
        { href: '/dashboard', label: 'Department EHR Explorer', icon: FileText },
        { href: '/records/new', label: 'Encrypt New EHR', icon: PlusCircle },
        {
          href: '/break-glass',
          label: 'Break-Glass Emergency',
          icon: AlertTriangle,
          urgent: true,
        },
        { href: '/keys', label: 'PQC Governance & Keys', icon: KeyRound },
        { href: '/audit', label: 'Immutable Audit Trail', icon: History },
      ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      {/* Top Banner: PQC Status & Crypto Telemetry */}
      <div className="flex h-7 items-center justify-between border-b border-slate-800/60 bg-slate-900/60 px-4 text-xs">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-quantum-400 font-mono font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-quantum-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-quantum-500"></span>
            </span>
            <span>FIPS 203 ML-KEM-768 ACTIVE</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="hidden font-mono text-slate-400 sm:inline">
            AES-256-GCM Hybrid Envelope Layer
          </span>
          <span className="text-slate-600">|</span>
          <span className="hidden font-mono text-slate-400 md:inline">
            FIPS 204 ML-DSA-65 Signatures
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <Database className="h-3 w-3 text-slate-400" />
            <span className="text-slate-400">Database:</span>
            {isSupabaseActive ? (
              <span className="rounded bg-emerald-950/80 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400 border border-emerald-800/60">
                SUPABASE LIVE
              </span>
            ) : (
              <span className="rounded bg-sky-950/80 px-1.5 py-0.2 text-[10px] font-semibold text-sky-400 border border-sky-800/60">
                SECURE LOCAL / HYBRID CACHE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link href={isPatient ? '/portal/patient' : '/dashboard'} className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-quantum-600 to-cyan-400 p-0.5 shadow-lg shadow-quantum-900/40 group-hover:scale-105 transition-transform">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Cpu className="h-5 w-5 text-quantum-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-black tracking-tight text-white">
                  PQ-ABAC<span className="text-quantum-400">-EHR</span>
                </span>
                <span className="rounded bg-quantum-950 px-1.5 py-0.5 text-[10px] font-mono font-bold text-quantum-300 border border-quantum-700/50">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 -mt-0.5 tracking-tight">
                Post-Quantum Attribute-Based Access Control
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? link.urgent
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                        : 'bg-quantum-950/80 text-quantum-300 border border-quantum-800/60 shadow-sm'
                      : link.urgent
                      ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${link.urgent ? 'text-rose-400' : ''}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-left transition hover:border-slate-700 hover:bg-slate-850"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-inner">
                    {currentUser.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>

                  <div className="hidden sm:block">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">
                        {currentUser.fullName}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${
                          currentUser.clearanceLevel === 3
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                            : currentUser.clearanceLevel === 2
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        Tier-{currentUser.clearanceLevel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span>{currentUser.role}</span>
                      <span>•</span>
                      <span className="text-quantum-400">{currentUser.department}</span>
                    </div>
                  </div>

                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {/* Profile & Security Details Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl backdrop-blur-xl z-50">
                    <div className="border-b border-slate-800 pb-3 px-1">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Authenticated Identity
                      </p>
                      <h4 className="text-sm font-bold text-white mt-0.5">{currentUser.fullName}</h4>
                      <p className="font-mono text-[11px] text-quantum-400 mt-0.5">{currentUser.email}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                          {currentUser.role}
                        </span>
                        <span className="rounded bg-quantum-950 border border-quantum-800 px-2 py-0.5 text-[10px] font-medium text-quantum-300">
                          {currentUser.department}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                          {currentUser.hospitalId}
                        </span>
                      </div>
                    </div>

                    {/* Attribute Revocation Simulator Quick Toggle */}
                    <div className="mt-2 border-b border-slate-800 pb-2 px-1">
                      <button
                        onClick={() => setShowRevocationPanel(!showRevocationPanel)}
                        className="flex w-full items-center justify-between text-[11px] font-medium text-amber-400 hover:text-amber-300 py-1"
                      >
                        <span className="flex items-center space-x-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Simulate Attribute Revocation</span>
                        </span>
                        <ChevronDown
                          className={`h-3 w-3 transform transition-transform ${
                            showRevocationPanel ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {showRevocationPanel && (
                        <div className="mt-2 space-y-1.5 rounded-lg bg-slate-950/80 p-2 border border-amber-900/40">
                          <p className="text-[10px] text-slate-400">
                            Toggle active attributes to test cryptographic access denial:
                          </p>
                          <div className="space-y-1">
                            {['clearanceLevel', 'department'].map((attr) => {
                              const isRevoked = (currentUser.revokedAttributes || []).includes(attr);
                              return (
                                <div
                                  key={attr}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="font-mono text-slate-300">{attr}</span>
                                  <button
                                    onClick={() => toggleAttributeRevocation(attr)}
                                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                                      isRevoked
                                        ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    }`}
                                  >
                                    {isRevoked ? 'REVOKED (CLICK TO RESTORE)' : 'ACTIVE'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-1 space-y-1">
                      <Link
                        href="/login"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      >
                        <LogOut className="h-3.5 w-3.5 text-slate-400" />
                        <span>Switch Account / Portal Login</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/50 hover:text-rose-200 transition"
                      >
                        <LogOut className="h-3.5 w-3.5 text-rose-400" />
                        <span>Sign Out & Return to Home</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Main Navbar Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center space-x-1.5 rounded-xl border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white transition shadow-sm"
                title="Sign Out & Return to Home"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-quantum-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-quantum-500"
            >
              Healthcare Portal Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
