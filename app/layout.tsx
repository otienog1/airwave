import { AuthProvider } from '@/context/AuthContext';
import type { Metadata } from "next";
// import localFont from "next/font/local";
import "./globals.css";

// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });


import { Source_Sans_3 } from 'next/font/google'

// If loading a variable font, you don't need to specify the font weight
const font = Source_Sans_3({ weight: ['400'], subsets: ['latin'] })


export const metadata: Metadata = {
    title: "Airwave Radio",
    description: "Online platform for streaming Kenyan radio stations",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${font.className}`}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}