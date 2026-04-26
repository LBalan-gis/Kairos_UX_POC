interface WidgetTableProps {
  title?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  statusCol?: string;
  dark?: boolean;
}

export function WidgetTable({ title, columns = [], rows = [], statusCol, dark = true }: WidgetTableProps) {
  const titleColor = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const thColor    = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const thBorder   = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const tdColor    = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.78)';
  const tdBorder   = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const rowHover   = dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';

  return (
    <div style={{ padding: '16px 0 8px' }}>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: titleColor, textTransform: 'uppercase', padding: '0 16px 14px' }}>
          {title}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ padding: '8px 16px', color: thColor, fontWeight: 700, letterSpacing: '0.05em', borderBottom: `1px solid ${thBorder}` }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}
                onMouseEnter={e => (e.currentTarget.style.background = rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map(col => (
                  <td key={col} style={{ padding: '10px 16px', color: tdColor, borderBottom: `1px solid ${tdBorder}`, fontWeight: 500 }}>
                    {col === statusCol ? (
                      <span style={{
                        display: 'inline-block', padding: '3px 8px', borderRadius: 4,
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                        background: row[col] === 'warning' ? 'rgba(245,158,11,0.10)' : row[col] === 'ok' ? 'rgba(74,222,128,0.10)' : 'rgba(239,68,68,0.10)',
                        border: `1px solid ${row[col] === 'warning' ? 'rgba(245,158,11,0.30)' : row[col] === 'ok' ? 'rgba(74,222,128,0.30)' : 'rgba(239,68,68,0.30)'}`,
                        color: row[col] === 'warning' ? '#F59E0B' : row[col] === 'ok' ? '#4ade80' : '#EF4444',
                      }}>{String(row[col])}</span>
                    ) : String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
