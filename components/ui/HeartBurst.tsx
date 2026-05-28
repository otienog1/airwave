'use client';
import React from 'react';
import { Heart } from 'lucide-react';

export const HeartBurst: React.FC = () => (
    <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 9999 }}
    >
        <Heart
            style={{
                width: 120,
                height: 120,
                color: '#f43f5e',
                fill: '#f43f5e',
                animation: 'heart-burst 650ms ease forwards',
                filter: 'drop-shadow(0 0 24px rgba(244,63,94,0.6))',
            }}
        />
    </div>
);
