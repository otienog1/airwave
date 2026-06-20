import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/context/AuthContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { ThemeProvider } from 'next-themes';
import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Toaster } from '@/components/ui/sonner';
import { GlobalShortcuts } from '@/components/GlobalShortcuts';
import { GoogleProvider } from '@/components/providers/GoogleProvider';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: "MBR Radio",
    description: "Stream Kenya's best radio stations live",
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'MBR',
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport: Viewport = {
    themeColor: '#6366f1',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange={false}>
                    <GoogleProvider>
                        <AuthProvider>
                            <PlayerProvider>
                                <GlobalShortcuts />
                                {children}
                                <Toaster position="bottom-right" />
                                <Analytics />
                            </PlayerProvider>
                        </AuthProvider>
                    </GoogleProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
