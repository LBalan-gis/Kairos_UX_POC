import { useState, useRef } from 'react';
import { useKairos } from './KairosContext';

export function KairosInput() {
  const { submit, dark } = useKairos();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const T = dark ? {
    divider:     'rgba(255,255,255,0.08)',
    inputBg:     'rgba(0,0,0,0.2)',
    inputBorder: 'rgba(255,255,255,0.15)',
    inputColor:  '#FFFFFF',
  } : {
    divider:     'rgba(0,0,0,0.06)',
    inputBg:     '#FFFFFF',
    inputBorder: 'rgba(0,0,0,0.12)',
    inputColor:  '#111827',
  };

  return (
    <div style={{ padding:'10px 14px 14px', borderTop:`1px solid ${T.divider}`, display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
      <input
        ref={inputRef}
        className="kai-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); setInput(''); } }}
        placeholder="Ask anything about the line…"
        data-dark={String(dark)}
        style={{
          flex:1, background:T.inputBg, border:`1px solid ${T.inputBorder}`,
          borderRadius:50, padding:'9px 16px', fontSize:13, color:T.inputColor,
          transition:'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      <button className="kai-send" onClick={() => { submit(input); setInput(''); }} style={{
        background:'linear-gradient(135deg,#7A5CAD,#4A5AA8)', border:'none', borderRadius:50,
        width:36, height:36, flexShrink:0,
        fontSize:14, color:'#fff', cursor:'pointer', fontWeight:700,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background 0.15s',
      }}>↑</button>
    </div>
  );
}
