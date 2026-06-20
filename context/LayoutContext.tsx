'use client';

import React, { createContext, useContext, useState } from 'react';
import { UserDrawer } from '@/components/layout/UserDrawer';
import { LoginModal } from '@/components/auth/LoginModal';
import { ProfileModal } from '@/components/auth/ProfileModal';

interface LayoutContextType {
  openDrawer: () => void;
  openLogin: () => void;
  openProfile: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
  openDrawer:  () => {},
  openLogin:   () => {},
  openProfile: () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [loginOpen, setLoginOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <LayoutContext.Provider value={{
      openDrawer:  () => setDrawerOpen(true),
      openLogin:   () => setLoginOpen(true),
      openProfile: () => setProfileOpen(true),
    }}>
      {children}
      <UserDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEditProfile={() => { setProfileOpen(true); setDrawerOpen(false); }}
        onSignIn={() => { setLoginOpen(true); setDrawerOpen(false); }}
      />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
