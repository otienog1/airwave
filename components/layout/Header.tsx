'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { Radio, User, LogOut, Settings, Heart } from 'lucide-react';

export const Header: React.FC = () => {
    const { user, logout, isAuthenticated, loading } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    if (loading) {
        return (
            <header className="sticky top-0 z-40 bg-black/20 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600  flex items-center justify-center">
                                <Radio className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">AirWave</h1>
                        </div>
                        <div className="w-8 h-8 bg-white/10  animate-pulse"></div>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <>
            <header className="sticky top-0 z-40 bg-black/20 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600  flex items-center justify-center">
                                <Radio className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">AirWave</h1>
                                <span className="text-xs text-gray-400 hidden sm:block">Kenyan Radio</span>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="relative">
                            {isAuthenticated ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 glass-morphism hover:bg-white/20  px-3 py-2 text-white transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600  flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="hidden sm:inline font-medium">{user?.username}</span>
                                    </button>

                                    {showUserMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowUserMenu(false)}
                                            />
                                            <div className="absolute right-0 mt-2 w-48 bg-white  shadow-lg py-2 z-20 border border-gray-200">
                                                <div className="px-4 py-2 border-b border-gray-200">
                                                    <p className="font-semibold text-gray-800">{user?.username}</p>
                                                    <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                                                </div>

                                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 transition-colors">
                                                    <Heart className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-700">My Favorites</span>
                                                </button>

                                                {user?.is_admin && (
                                                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 transition-colors">
                                                        <Settings className="w-4 h-4 text-gray-500" />
                                                        <span className="text-gray-700">Admin Panel</span>
                                                    </button>
                                                )}

                                                <hr className="my-1" />

                                                <button
                                                    onClick={() => {
                                                        logout();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowLoginModal(true)}
                                    className="btn-primary text-xs uppercase"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </>
    );
};