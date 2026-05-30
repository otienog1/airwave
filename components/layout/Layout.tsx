import React from 'react';
import { Header } from './Header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PersistentAudioPlayer } from '@/components/player/PersistentAudioPlayer';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <TooltipProvider>
            <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
                <Header />
                {children}
                <PersistentAudioPlayer />
            </div>
        </TooltipProvider>
    );
};
