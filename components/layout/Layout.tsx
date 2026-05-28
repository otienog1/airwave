import React from 'react';
import { Header } from './Header';
import { TooltipProvider } from '@/components/ui/tooltip';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <TooltipProvider>
            <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
                <Header />
                {children}
            </div>
        </TooltipProvider>
    );
};
