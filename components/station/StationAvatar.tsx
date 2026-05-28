import React, { useState } from 'react';

interface StationAvatarProps {
  name: string;
  logoUrl?: string;
  accentColor?: string;
  size?: number;
  className?: string;
  hideInitials?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export const StationAvatar: React.FC<StationAvatarProps> = ({
  name,
  logoUrl,
  accentColor = '#6366f1',
  size = 36,
  className = '',
  hideInitials = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const showImage = logoUrl && !imgError;

  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: showImage ? 'transparent' : accentColor + '20',
        border: `1px solid ${accentColor}25`,
      }}
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="object-contain w-full h-full"
          onError={() => setImgError(true)}
        />
      ) : !hideInitials ? (
        <span
          className="font-bold select-none"
          style={{ color: accentColor, fontSize: size * 0.36 }}
        >
          {getInitials(name)}
        </span>
      ) : null}
    </div>
  );
};
