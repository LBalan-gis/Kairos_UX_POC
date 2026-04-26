import type { ReactNode } from 'react';

interface WidgetLayoutProps {
  title?: string;
  children?: ReactNode;
}

export function WidgetLayout({ title, children }: WidgetLayoutProps) {
  return (
    <div style={{ padding: title ? '10px 14px' : 0 }}>
      {title && (
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export default WidgetLayout;
