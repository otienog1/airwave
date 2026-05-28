import React from 'react';
import { Header } from './Header';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
            <Header />
            {children}
        </div>
    );
};
