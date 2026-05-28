import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from 'next-themes';
import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: "AirWave Radio",
    description: "Stream Kenya's best radio stations live",
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'AirWave',
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
                    <AuthProvider>
                        {children}
                        <Toaster position="bottom-right" />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
