interface SchematicNode {
  label: string;
  sub?: string;
}

interface SchematicNodes {
  focus: SchematicNode;
  upstream?: SchematicNode[];
  downstream?: SchematicNode[];
}

interface SchematicProps {
  payload?: { nodes?: SchematicNodes };
  dark?: boolean;
}

export function Schematic({ payload, dark = true }: SchematicProps) {
  if (!payload?.nodes) return null;

  const { focus, upstream = [], downstream = [] } = payload.nodes;

  const dimColor = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
  const lineCol  = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const Node = ({ node, central = false }: { node: SchematicNode; central?: boolean }) => (
    <div style={{
      padding: '10px 12px',
      background: central ? (dark ? 'rgba(239,68,68,0.15)' : '#FEF2F2') : (dark ? 'rgba(255,255,255,0.03)' : '#FFFFFF'),
      border: `1px solid ${central ? '#EF4444' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
      borderRadius: 8, minWidth: 110, textAlign: 'center', position: 'relative' as const,
      boxShadow: central ? (dark ? '0 0 16px rgba(239,68,68,0.3)' : '0 1px 12px rgba(239,68,68,0.2)') : (dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'),
      zIndex: 2,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: central ? '#EF4444' : (dark ? '#FFFFFF' : '#111827'), marginBottom: 2 }}>{node.label}</div>
      <div style={{ fontSize: 9, color: central ? '#EF4444' : dimColor }}>{node.sub}</div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 24,
      padding: '12px 16px', position: 'relative',
      background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
      borderRadius: 8,
    }}>
      <div style={{ position: 'absolute', top: '50%', left: 40, right: 40, height: 1.5, background: lineCol, zIndex: 1, transform: 'translateY(-50%)' }} />
      {upstream.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {upstream.map((n, i) => <Node key={i} node={n} />)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Node node={focus} central />
      </div>
      {downstream.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {downstream.map((n, i) => <Node key={i} node={n} />)}
        </div>
      )}
    </div>
  );
}
