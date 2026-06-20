'use client';
import React from 'react';
import { Share2, Check } from 'lucide-react';
import { useShare } from '@/hooks/useShare';

interface ShareButtonProps {
  stationName: string;
  stationSlug: string;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  stationName,
  stationSlug,
  className = '',
}) => {
  const { share, copied } = useShare();

  const handleShare = () => {
    const url = `${window.location.origin}/station/${stationSlug}`;
    share({
      title: `${stationName} on MBR Radio`,
      text: `Listen to ${stationName} live on MBR Radio`,
      url,
    });
  };

  return (
    <button
      onClick={handleShare}
      className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 active:scale-90 cursor-pointer ${className}`}
      style={{
        color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      }}
      aria-label={copied ? 'Link copied!' : `Share ${stationName}`}
      title={copied ? 'Link copied!' : 'Share station'}
    >
      {copied
        ? <Check className="w-5 h-5" />
        : <Share2 className="w-5 h-5" />
      }
    </button>
  );
};
