import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ClientProviders } from '@/components/ClientProviders';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'PQ-ABAC-EHR | Post-Quantum Attribute-Based Access Control for Health Records',
  description:
    'End-to-End Quantum-Resistant Electronic Health Records Architecture with FIPS 203 ML-KEM-768, AES-256-GCM Envelope Layer, and Fine-Grained ABAC Policy Evaluation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 min-h-screen`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
