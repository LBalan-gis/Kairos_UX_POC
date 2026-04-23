import { useKairos } from './KairosContext';

const QUICK = [
  { label:'OEE by batch',       cmd:'show me oee by batch' },
  { label:'OTIF risk',          cmd:'otif delivery risk friday' },
  { label:'Film tension drift', cmd:'film tension drift' },
  { label:'Planned vs actual',  cmd:'show me planned vs actual' },
  { label:'Machine health',     cmd:'show machine health panel bm-1101' },
  { label:'Shift handover',     cmd:'generate shift report' },
  { label:'Incident report',    cmd:'generate incident report' },
  { label:'Restore all',        cmd:'restore all machines' },
];

export function KairosChipRail() {
  const { submit, dark } = useKairos();

  const T = dark ? {
    fadeBg:    'rgba(16,20,28,0.95)',
    chipBorder:'rgba(255,255,255,0.12)',
    chipBg:    'rgba(255,255,255,0.06)',
    chipColor: 'rgba(255,255,255,0.70)',
    divider:   'rgba(255,255,255,0.08)',
  } : {
    fadeBg:    'rgba(245,247,250,0.95)',
    chipBorder:'rgba(0,0,0,0.18)',
    chipBg:    'rgba(0,0,0,0.07)',
    chipColor: 'rgba(0,0,0,0.80)',
    divider:   'rgba(0,0,0,0.06)',
  };

  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:20, background:`linear-gradient(to right,${T.fadeBg},transparent)`, pointerEvents:'none', zIndex:1 }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:20, background:`linear-gradient(to left,${T.fadeBg},transparent)`, pointerEvents:'none', zIndex:1 }} />
      <div className="kai-chips" style={{ padding:'8px 18px', borderTop:`1px solid ${T.divider}`, display:'flex', gap:6, overflowX:'auto' }}>
        {QUICK.map((q,i) => (
          <button key={i} className="kai-chip" data-dark={String(dark)} onClick={() => submit(q.cmd)} style={{
            fontSize:10.5, padding:'4px 11px', borderRadius:50,
            border:`1px solid ${T.chipBorder}`, background:T.chipBg,
            color:T.chipColor, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontWeight:500,
            letterSpacing:'0.01em',
          }}>{q.label}</button>
        ))}
      </div>
    </div>
  );
}
