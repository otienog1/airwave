import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PersistentAudioPlayer } from '@/components/player/PersistentAudioPlayer';
import { LayoutProvider } from '@/context/LayoutContext';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <TooltipProvider>
            <LayoutProvider>
                <div className="min-h-dvh" style={{ background: 'var(--color-bg)' }}>
                    <Header />
                    <Sidebar />
                    <div className="sm:pl-16">{children}</div>
                    <PersistentAudioPlayer />
                    <TabBar />
                </div>
            </LayoutProvider>
        </TooltipProvider>
    );
};
