import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { buildFaviconUri } from '@/lib/build-favicon-uri';
import { getLogoSrc } from '@/lib/get-logo-src';
import { inter, FONT_CLASS_MAP } from '@/lib/fonts';
import { TemplateLayout } from '@/components/custom/template-layout';
import { LogoSrcProvider } from '@/components/custom/logo-src-provider';
import { KeepAlive } from '@/components/custom/keep-alive';
import '@/app/globals.css';
import './globals.css';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';
import './custom.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export function generateMetadata(): Metadata {
  const faviconUri = buildFaviconUri();
  return {
    title: process.env.NEXT_PUBLIC_DERIV_APP_NAME || 'Deriv Rise/Fall Trading App',
    description: 'A white-label trading application powered by Deriv',
    ...(faviconUri ? { icons: { icon: faviconUri } } : {}),
  };
}

/* MOBILE FIX: added viewportFit: 'cover' so the page uses the full screen on
   iPhones with notches/Dynamic Island. userScalable: false (paired with
   maximumScale: 1) prevents the user from accidentally zooming the page,
   which was breaking scroll and touch on mobile. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const fontClass =
  FONT_CLASS_MAP[process.env.NEXT_PUBLIC_FONT_FAMILY ?? 'Inter'] ??
  inter.className;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const logoSrc = getLogoSrc();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontClass} ${ibmPlexSans.variable} bg-background flex min-h-dvh flex-col overflow-x-hidden lg:block lg:h-auto lg:min-h-screen lg:overflow-y-auto`}
      >
        <KeepAlive />
        <TemplateLayout>
          <LogoSrcProvider logoSrc={logoSrc}>{children}</LogoSrcProvider>
        </TemplateLayout>
      </body>
    </html>
  );
}
