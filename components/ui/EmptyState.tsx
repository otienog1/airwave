import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  body: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  heading,
  body,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.18)',
      }}
      aria-hidden="true"
    >
      <span style={{ color: 'var(--color-accent)' }} className="flex items-center justify-center">
        {icon}
      </span>
    </div>

    <div className="space-y-1.5" style={{ maxWidth: 280 }}>
      <p
        className="text-base font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {heading}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {body}
      </p>
    </div>

    {action && (
      <button
        onClick={action.onClick}
        className="mt-1 px-6 h-10 rounded-full text-sm font-semibold text-white transition-transform active:scale-95 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        }}
      >
        {action.label}
      </button>
    )}
  </div>
);
