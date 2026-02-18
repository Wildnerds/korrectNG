import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import InstallPrompt from '@/components/InstallPrompt';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'KorrectNG - Find Verified Artisans in Nigeria',
    template: '%s | KorrectNG',
  },
  description:
    "Nigeria's leading platform for verified artisans. Find trusted mechanics, electricians, plumbers, and more with verified reviews and warranty protection.",
  keywords: [
    'artisans Nigeria',
    'verified mechanic Lagos',
    'plumber Nigeria',
    'electrician Lagos',
    'KorrectNG',
    'trusted artisans',
  ],
  manifest: '/manifest.json',
  themeColor: '#22C55E',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KorrectNG',
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: 'KorrectNG',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-brand-black bg-white min-h-screen flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <EmailVerificationBanner />
            <main className="flex-1">{children}</main>
            <Footer />
            <InstallPrompt />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
