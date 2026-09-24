'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  RefreshCw,
  BarChart3,
  AlertOctagon,
  Play,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';
import { ehrRepository } from '@/lib/storage/ehrRepository';
import { KeyGovernanceAuthority } from '@/types/ehr';
import {
  mlKem768Encapsulate,
  mlKem768Decapsulate,
  MASTER_HOSPITAL_AUTHORITY_KEYPAIR,
} from '@/lib/crypto/pqcCryptoService';

export default function KeysPage() {
  const { currentUser, profiles, toggleAttributeRevocation } = useAuth();
  const [authorities, setAuthorities] = useState<KeyGovernanceAuthority[]>([]);
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('');
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<{
    encapTimeMs: number;
    decapTimeMs: number;
    opsPerSec: number;
    iterations: number;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      const authList = await ehrRepository.getKeyAuthorities();
      setAuthorities(authList);
      if (profiles.length > 0) {
        setSelectedClinicianId(profiles[0].id);
      }
    };
    init();
  }, [profiles]);

  const selectedClinician = profiles.find((p) => p.id === selectedClinicianId) || currentUser;

  // Run Real-time In-Browser Microbenchmark for ML-KEM-768
  const runPqcBenchmark = async () => {
    setBenchmarkRunning(true);
    await new Promise((r) => setTimeout(r, 100)); // Allow UI to update

    const iterations = 50;
    const pk = MASTER_HOSPITAL_AUTHORITY_KEYPAIR.publicKeyBytes;
    const sk = MASTER_HOSPITAL_AUTHORITY_KEYPAIR.secretKeyBytes;

    const t0 = performance.now();
    const cts: Uint8Array[] = [];

    // Encapsulation loop
    for (let i = 0; i < iterations; i++) {
      const res = mlKem768Encapsulate(pk);
      cts.push(res.ciphertext);
    }
    const t1 = performance.now();

    // Decapsulation loop
    for (let i = 0; i < iterations; i++) {
      mlKem768Decapsulate(cts[i], sk);
    }
    const t2 = performance.now();

    const totalEncapMs = t1 - t0;
    const totalDecapMs = t2 - t1;
    const avgEncap = Math.round((totalEncapMs / iterations) * 100) / 100;
    const avgDecap = Math.round((totalDecapMs / iterations) * 100) / 100;
    const totalTimeSec = (t2 - t0) / 1000;
    const opsPerSec = Math.round((iterations * 2) / totalTimeSec);

    setBenchmarkResults({
      encapTimeMs: avgEncap,
      decapTimeMs: avgDecap,
      opsPerSec,
      iterations,
    });
    setBenchmarkRunning(false);
  };

  return (
    <div className="min-h-screen quantum-grid-bg flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-quantum-950 text-quantum-400 border border-quantum-800 shadow">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Post-Quantum Cryptographic & Key Governance Center
                </h1>
                <p className="text-xs text-slate-400">
                  FIPS 203 ML-KEM-768/1024 Lattice Parameters, Multi-Authority Root Keys & Dynamic Revocation
                </p>
              </div>
            </div>

            <button
              onClick={runPqcBenchmark}
              disabled={benchmarkRunning}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-quantum-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-quantum-900/40 hover:from-quantum-500 hover:to-cyan-400 disabled:opacity-50 transition"
            >
              {benchmarkRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Benchmarking Module-LWE...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Run PQC Microbenchmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BENCHMARK RESULTS TELEMETRY */}
        {benchmarkResults && (
          <div className="rounded-2xl border border-quantum-700/80 bg-slate-900/90 p-5 shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[11px] text-slate-400">Avg Encapsulation Latency</p>
              <p className="text-xl font-black text-quantum-400 mt-1">
                {benchmarkResults.encapTimeMs} ms
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">FIPS 203 ML-KEM-768 Encap</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[11px] text-slate-400">Avg Decapsulation Latency</p>
              <p className="text-xl font-black text-cyan-400 mt-1">
                {benchmarkResults.decapTimeMs} ms
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">FIPS 203 ML-KEM-768 Decap</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[11px] text-slate-400">Throughput Velocity</p>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {benchmarkResults.opsPerSec} ops/sec
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">WebAssembly / V8 Engine</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[11px] text-slate-400">Quantum Security Level</p>
              <p className="text-xl font-black text-purple-400 mt-1">NIST Level 3</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Module-LWE 192-bit Quantum</p>
            </div>
          </div>
        )}

        {/* SECTION 1: MULTI-AUTHORITY STATUS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-quantum-400" />
              <span>Multi-Authority Root Cryptographic Mesh</span>
            </h2>
            <span className="text-xs text-slate-400">Decentralized Trust Anchors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {authorities.map((auth) => (
              <div
                key={auth.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 backdrop-blur-md"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="rounded bg-quantum-950 px-2 py-0.5 text-[10px] font-mono font-bold text-quantum-300 border border-quantum-800">
                      {auth.algorithm}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">{auth.name}</h3>
                  </div>
                  <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                    {auth.status}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 text-xs space-y-1.5 font-mono">
                  <p className="text-[10px] text-slate-500 uppercase">Public Key Fingerprint</p>
                  <p className="text-slate-300 truncate">{auth.publicKeyFingerprint}</p>
                </div>

                <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Issued Credentials:</span>
                  <span className="font-bold text-white">
                    {auth.issuedCredentialsCount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: PQC VS CLASSICAL KEY SIZE TELEMETRY */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                <span>Post-Quantum vs. Classical Cryptographic Overhead Telemetry</span>
              </h2>
              <p className="text-xs text-slate-400">
                Key size and transmission footprint comparison across NIST post-quantum standards vs legacy algorithms.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Cryptographic Primitive</th>
                  <th className="p-3">Quantum Resistance</th>
                  <th className="p-3">Public Key Size</th>
                  <th className="p-3">Ciphertext / Signature Size</th>
                  <th className="p-3">Security Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr className="bg-quantum-950/20 text-white font-semibold">
                  <td className="p-3 text-quantum-300">FIPS 203 ML-KEM-768 (Active)</td>
                  <td className="p-3 text-emerald-400">YES (Module-LWE)</td>
                  <td className="p-3">1,184 Bytes</td>
                  <td className="p-3">1,088 Bytes</td>
                  <td className="p-3">NIST Level 3 (AES-192)</td>
                </tr>
                <tr>
                  <td className="p-3 text-quantum-300">FIPS 203 ML-KEM-1024</td>
                  <td className="p-3 text-emerald-400">YES (Module-LWE)</td>
                  <td className="p-3">1,568 Bytes</td>
                  <td className="p-3">1,568 Bytes</td>
                  <td className="p-3">NIST Level 5 (AES-256)</td>
                </tr>
                <tr>
                  <td className="p-3 text-purple-300">FIPS 204 ML-DSA-65 (Signatures)</td>
                  <td className="p-3 text-emerald-400">YES (Lattice MSIS)</td>
                  <td className="p-3">1,952 Bytes</td>
                  <td className="p-3">3,309 Bytes</td>
                  <td className="p-3">NIST Level 3 (Lattice)</td>
                </tr>
                <tr className="text-slate-500">
                  <td className="p-3">RSA-3072 (Classical)</td>
                  <td className="p-3 text-rose-400">Vulnerable (Shor)</td>
                  <td className="p-3">384 Bytes</td>
                  <td className="p-3">384 Bytes</td>
                  <td className="p-3">128-bit Classical</td>
                </tr>
                <tr className="text-slate-500">
                  <td className="p-3">ECC P-256 / ECDH (Classical)</td>
                  <td className="p-3 text-rose-400">Vulnerable (Shor)</td>
                  <td className="p-3">32 Bytes</td>
                  <td className="p-3">64 Bytes</td>
                  <td className="p-3">128-bit Classical</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: DYNAMIC ATTRIBUTE REVOCATION TOOL */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 backdrop-blur-md">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <AlertOctagon className="h-4 w-4 text-amber-400" />
              <span>Dynamic Attribute Revocation Simulator</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select a clinician and invalidate specific clearance attributes in real-time. Subsequent
              decryption queries will fail immediately upon ABAC evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clinician Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Select Clinician to Manage:
              </label>
              <select
                value={selectedClinicianId}
                onChange={(e) => setSelectedClinicianId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} - {p.role} ({p.department}, Tier-{p.clearanceLevel})
                  </option>
                ))}
              </select>

              {selectedClinician && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clinician:</span>
                    <span className="font-bold text-white">{selectedClinician.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-quantum-400">{selectedClinician.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clearance Level:</span>
                    <span className="font-mono text-purple-300 font-bold">
                      Tier-{selectedClinician.clearanceLevel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Affiliated Hospital:</span>
                    <span className="text-slate-300">{selectedClinician.hospitalId}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Revocation Controls */}
            {selectedClinician && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Attribute Revocation Controls:
                </label>

                <div className="space-y-2">
                  {['clearanceLevel', 'department', 'role'].map((attribute) => {
                    const isRevoked = (selectedClinician.revokedAttributes || []).includes(attribute);
                    return (
                      <div
                        key={attribute}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"
                      >
                        <div>
                          <p className="font-mono font-bold text-white">{attribute}</p>
                          <p className="text-[11px] text-slate-500">
                            Current Value: {String((selectedClinician as any)[attribute])}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleAttributeRevocation(attribute)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                            isRevoked
                              ? 'bg-rose-900/80 text-rose-200 border border-rose-700 hover:bg-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                          }`}
                        >
                          {isRevoked ? 'REVOKED (RESTORE)' : 'ACTIVE (REVOKE)'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-400 mt-2">
                  When revoked, the ABAC engine flags the attribute as revoked and blocks decapsulation
                  of any EHR records requiring it.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
