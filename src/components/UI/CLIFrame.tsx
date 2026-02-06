'use client';

import { CSSProperties, ReactNode } from 'react';

interface CLIFrameProps {
  children: ReactNode;
  style?: CSSProperties;
}

const frameStyle: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.75)',
  border: '1px solid var(--amber)',
  fontFamily: 'monospace',
  color: 'var(--amber)',
  fontSize: '0.8rem',
  position: 'relative',
};

export function CLIFrame({ children, style }: CLIFrameProps) {
  return (
    <div style={{ ...frameStyle, ...style }}>
      {children}
    </div>
  );
}

interface CLISectionProps {
  children: ReactNode;
  label?: string;
  noBorderTop?: boolean;
  style?: CSSProperties;
}

export function CLISection({ children, label, noBorderTop, style }: CLISectionProps) {
  return (
    <div
      style={{
        padding: '0.5rem 0.75rem',
        borderTop: noBorderTop ? 'none' : '1px solid var(--amber)',
        position: 'relative',
        ...style,
      }}
    >
      {label && (
        <span
          style={{
            position: 'absolute',
            top: '-0.5rem',
            left: '0.5rem',
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '0 0.25rem',
            fontSize: '0.65rem',
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

interface CLIButtonProps {
  children: ReactNode;
  onClick: () => void;
  style?: CSSProperties;
}

export function CLIButton({ children, onClick, style }: CLIButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid var(--amber)',
        color: 'var(--amber)',
        fontFamily: 'monospace',
        fontSize: '0.65rem',
        padding: '0.15rem 0.4rem',
        cursor: 'pointer',
        opacity: 0.8,
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
    >
      {children}
    </button>
  );
}

export function CLIDivider() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--amber)',
        opacity: 0.5,
      }}
    />
  );
}
