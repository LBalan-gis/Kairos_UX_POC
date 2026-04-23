import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useKairos, mkMsg, mkLogEntry, stageLog } from './KairosContext';

export function KairosCFRGate() {
  const {
    cfrPending, setCfrPending,
    cfrPin, setCfrPin,
    cfrError, setCfrError,
    setMessages,
    addActionLog,
  } = useKairos();

  const setMachineOffline = useAppStore(s => s.setMachineOffline);

  return (
    <AnimatePresence>
      {cfrPending && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.18 }}
          style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,8,0.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <motion.div
            initial={{ opacity:0, scale:0.90, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.94 }}
            transition={{ type:'spring', stiffness:340, damping:28 }}
            style={{ width:440, background:'rgba(10,6,20,0.99)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:16, overflow:'hidden', boxShadow:'0 0 0 1px rgba(239,68,68,0.10), 0 32px 80px rgba(0,0,0,0.80)' }}
          >
            {/* Warning header */}
            <div style={{ padding:'16px 20px 14px', background:'rgba(239,68,68,0.07)', borderBottom:'1px solid rgba(239,68,68,0.15)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>⚿</span>
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#f87171', marginBottom:2 }}>ACTION PENDING — HUMAN AUTHORIZATION REQUIRED</div>
                <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.60)' }}>21 CFR Part 11 · ALCOA+ Compliance Gate</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding:'18px 20px 20px', display:'flex', flexDirection:'column', gap:14 }}>
              {/* Action summary */}
              <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(239,68,68,0.70)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:4 }}>Proposed PLC Write</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', fontFamily:'"Fira Code","Consolas",monospace' }}>Execute Override: {cfrPending.label} → OFFLINE</div>
              </div>

              {/* Regulatory notice */}
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>
                This action will be permanently logged to the GxP audit trail under your operator ID.
                The AI identified this command — but a <strong style={{ color:'rgba(255,255,255,0.80)' }}>human must authorize</strong> all PLC write operations.
                Entry cannot be deleted or modified after submission (ALCOA+ Attributable / Permanent).
              </div>

              {/* PIN input */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:6 }}>Operator PIN</div>
                <input
                  autoFocus
                  type="password"
                  value={cfrPin}
                  onChange={e => { setCfrPin(e.target.value); setCfrError(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') document.getElementById('cfr-authorize-btn')?.click(); }}
                  placeholder="Enter PIN to authorize"
                  style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:`1px solid ${cfrError ? 'rgba(239,68,68,0.60)' : 'rgba(255,255,255,0.12)'}`, borderRadius:8, padding:'9px 14px', fontSize:13, color:'#fff', outline:'none' }}
                />
                {cfrError && <div style={{ fontSize:10, color:'#f87171', marginTop:4 }}>Incorrect PIN. Try again.</div>}
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setCfrPending(null); setCfrPin(''); setCfrError(false); }} style={{ flex:1, padding:'9px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.50)' }}>
                  Cancel
                </button>
                <button id="cfr-authorize-btn" onClick={() => {
                  if (cfrPin.toUpperCase() === 'ASTELLAS' || cfrPin === '1234') {
                    stageLog(addActionLog, [
                      [0,   'ok',  `Authorization accepted · operator PIN verified`],
                      [300, 'sys', `Writing OFFLINE state → ${cfrPending.machineId}`],
                      [700, 'warn',`${cfrPending.label} OFFLINE · audit record created`],
                    ]);
                    setMachineOffline(cfrPending.machineId);
                    setMessages(prev => [...prev, mkMsg('kairos', { text:`Override authorized and executed. ${cfrPending.label} is now offline. Audit record written to GxP trail — operator-signed, timestamped, immutable.`, actions:[] })]);
                    setCfrPending(null); setCfrPin(''); setCfrError(false);
                  } else {
                    setCfrError(true);
                  }
                }} style={{ flex:2, padding:'9px 0', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', background:'rgba(239,68,68,0.18)', border:'1px solid rgba(239,68,68,0.40)', color:'#f87171' }}>
                  Authorize Override
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
