import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'identity',  label: 'Equipment Identity' },
  { id: 'docs',      label: 'Documentation'      },
  { id: 'tags',      label: 'Tag Discovery'      },
  { id: 'mapping',   label: 'Tag Mapping'        },
  { id: 'physics',   label: 'Physics & Limits'   },
  { id: 'review',    label: 'Review & Submit'    },
];

const MACHINE_TYPES = [
  { value: 'BlisterMachine',       label: 'Blister Former'           },
  { value: 'Cartoner',             label: 'Cartoner'                 },
  { value: 'SerializationStation', label: 'Serialization / Aggregation' },
  { value: 'InspectionMachine',    label: 'Vision Inspection System' },
  { value: 'Checkweigher',         label: 'Checkweigher'             },
  { value: 'Labeler',              label: 'Labeler'                  },
];

const SEMANTIC_VARS = [
  'film_tension','blister_speed','seal_temp','seal_pressure',
  'pack_rate','jam_count','run_status','film_break',
  'scan_rate','reject_count','throughput','reject_rate',
  'mean_weight','std_dev','label_rate','oee',
];

interface TagEntry {
  desc: string;
  type: string;
  unit: string;
  suggested: string;
  enabled?: boolean;
  semantic?: string;
  setpoint?: string;
  lolo?: string;
  lo?: string;
  hi?: string;
  hihi?: string;
  [key: string]: unknown;
}

const MOCK_TAGS: Record<string, TagEntry[]> = {
  BlisterMachine: [
    { desc:'Film Tension',      type:'AI', unit:'N',     suggested:'film_tension'   },
    { desc:'Blister Speed',     type:'AI', unit:'bpm',   suggested:'blister_speed'  },
    { desc:'Seal Temperature',  type:'AI', unit:'°C',    suggested:'seal_temp'      },
    { desc:'Sealing Pressure',  type:'AI', unit:'bar',   suggested:'seal_pressure'  },
    { desc:'Machine Running',   type:'DI', unit:'—',     suggested:'run_status'     },
    { desc:'Film Break Alarm',  type:'DI', unit:'—',     suggested:'film_break'     },
  ],
  Cartoner: [
    { desc:'Pack Rate',         type:'AI', unit:'cpm',   suggested:'pack_rate'      },
    { desc:'Jam Count',         type:'AI', unit:'count', suggested:'jam_count'      },
    { desc:'Machine Running',   type:'DI', unit:'—',     suggested:'run_status'     },
    { desc:'Leaflet Missing',   type:'DI', unit:'—',     suggested:'film_break'     },
  ],
  SerializationStation: [
    { desc:'Scan Rate',         type:'AI', unit:'%',     suggested:'scan_rate'      },
    { desc:'Reject Count',      type:'AI', unit:'count', suggested:'reject_count'   },
    { desc:'Machine Running',   type:'DI', unit:'—',     suggested:'run_status'     },
  ],
  InspectionMachine: [
    { desc:'Throughput',        type:'AI', unit:'u/min', suggested:'throughput'     },
    { desc:'Reject Rate',       type:'AI', unit:'%',     suggested:'reject_rate'    },
    { desc:'Machine Running',   type:'DI', unit:'—',     suggested:'run_status'     },
  ],
  Checkweigher: [
    { desc:'Mean Weight',       type:'AI', unit:'mg',    suggested:'mean_weight'    },
    { desc:'Std Dev',           type:'AI', unit:'mg',    suggested:'std_dev'        },
    { desc:'Reject Count',      type:'AI', unit:'count', suggested:'reject_count'   },
    { desc:'Machine Running',   type:'DI', unit:'—',     suggested:'run_status'     },
  ],
  Labeler: [
    { desc:'Label Rate',        type:'AI', unit:'/min',  suggested:'label_rate'     },
    { desc:'Reject Count',      type:'AI', unit:'count', suggested:'reject_count'   },
    { desc:'Machine Running',   type:'DI', unit:'—',     suggested:'run_status'     },
  ],
};

// ─── Theme-aware styles ───────────────────────────────────────────────────────

function mkS(dark: boolean) {
  const d = dark;
  return {
    // structural
    overlay: {
      position: 'fixed', inset: 0, zIndex: 300,
      background: d ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.30)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as CSSProperties,
    panel: {
      width: 640, maxHeight: '90vh',
      background: d ? 'rgba(13,17,23,0.97)' : 'rgba(250,248,254,0.99)',
      border: d ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(100,60,160,0.12)',
      borderRadius: 16,
      boxShadow: d
        ? '0 1px 0 0 rgba(255,255,255,0.10) inset,0 32px 80px rgba(0,0,0,0.65)'
        : '0 32px 80px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    } as CSSProperties,
    header: {
      padding: '14px 20px 12px',
      borderBottom: d ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      background: d ? 'transparent' : 'rgba(122,92,173,0.04)',
    } as CSSProperties,
    body: { flex: 1, overflowY: 'auto', padding: '20px 24px' } as CSSProperties,
    footer: {
      padding: '12px 20px',
      borderTop: d ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      background: d ? 'transparent' : 'rgba(0,0,0,0.02)',
    } as CSSProperties,
    // form elements
    label: {
      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6,
      color: d ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
    } as CSSProperties,
    input: {
      width: '100%', borderRadius: 7, padding: '8px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
      background: d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      border: d ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.10)',
      color: d ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
    } as CSSProperties,
    select: {
      width: '100%', borderRadius: 7, padding: '8px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
      background: d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      border: d ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.10)',
      color: d ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
    } as CSSProperties,
    sectionTitle: {
      fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12, marginTop: 20,
      color: d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    } as CSSProperties,
    btnPrimary: {
      background: '#7A5CAD', border: 'none', borderRadius: 8, padding: '8px 20px',
      fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', letterSpacing: '0.04em',
    } as CSSProperties,
    btnSecondary: {
      borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
      border: d ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.10)',
      color: d ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    } as CSSProperties,
    pill: (col: string): CSSProperties => ({
      display: 'inline-flex', alignItems: 'center',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 3,
      background: col === 'AI' ? 'rgba(88,166,255,0.12)' : 'rgba(34,197,94,0.12)',
      color: col === 'AI' ? '#58a6ff' : '#4ade80',
      border: `1px solid ${col === 'AI' ? 'rgba(88,166,255,0.25)' : 'rgba(34,197,94,0.25)'}`,
    }),
    // convenience color tokens for inline usage in steps
    textHeavy:  d ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
    textMed:    d ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
    textMuted:  d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    textDim:    d ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
    textFaint:  d ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.18)',
    surface:    d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    surfaceUp:  d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    borderWeak: d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    borderMed:  d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    closeColor: d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    brandText:  d ? '#A990D4' : '#7A5CAD',
    lineUnsel:  d ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.40)']
                  : ['rgba(0,0,0,0.10)',        'rgba(0,0,0,0.03)',       'rgba(0,0,0,0.40)'],
  };
}

type WizardStyles = ReturnType<typeof mkS>;

interface FormState {
  id: string;
  serial: string;
  type: string;
  manufacturer: string;
  model: string;
  line: string;
  ccRef: string;
}

interface DocEntry {
  name: string;
  size: number;
  type: string;
  status: string;
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepIdentity({ form, setForm, s }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; s: WizardStyles }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={s.label}>Equipment ID *</div>
          <input style={s.input} value={form.id} placeholder="e.g. CW-1301"
            onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))} />
        </div>
        <div>
          <div style={s.label}>Serial Number</div>
          <input style={s.input} value={form.serial} placeholder="Manufacturer serial"
            onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} />
        </div>
      </div>
      <div>
        <div style={s.label}>Machine Type *</div>
        <select style={s.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="">— Select type —</option>
          {MACHINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={s.label}>Manufacturer</div>
          <input style={s.input} value={form.manufacturer} placeholder="e.g. Uhlmann"
            onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
        </div>
        <div>
          <div style={s.label}>Model</div>
          <input style={s.input} value={form.model} placeholder="e.g. UPS 4"
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
        </div>
      </div>
      <div>
        <div style={s.label}>Line Assignment *</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Line 1','Line 2'].map(l => (
            <button key={l} onClick={() => setForm(f => ({ ...f, line: l }))} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: form.line === l ? '1px solid rgba(122,92,173,0.6)' : `1px solid ${s.lineUnsel[0]}`,
              background: form.line === l ? 'rgba(122,92,173,0.18)' : s.lineUnsel[1],
              color: form.line === l ? s.brandText : s.lineUnsel[2],
              transition: 'all 0.12s',
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={s.label}>Change Control Reference</div>
        <input style={s.input} value={form.ccRef} placeholder="e.g. CC-2026-0041"
          onChange={e => setForm(f => ({ ...f, ccRef: e.target.value }))} />
      </div>
    </div>
  );
}

function StepDocs({ docs, setDocs, s }: { docs: DocEntry[]; setDocs: React.Dispatch<React.SetStateAction<DocEntry[]>>; s: WizardStyles }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const docTypes = ['Equipment Manual','P&ID Drawing','IQ Protocol','OQ Protocol','PQ Protocol','Validation Summary'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        border: '1.5px dashed rgba(122,92,173,0.35)', borderRadius: 10,
        padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
        background: 'rgba(122,92,173,0.04)', transition: 'border-color 0.15s',
      }} onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          setDocs(d => [...d, ...files.map(f => ({ name: f.name, size: f.size, type: guessDocType(f.name), status: 'uploaded' }))]);
        }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 13, color: s.textMuted }}>Drop files here or <span style={{ color: s.brandText, fontWeight: 600 }}>browse</span></div>
        <div style={{ fontSize: 10, color: s.textFaint, marginTop: 4 }}>PDF, DOCX, XLSX accepted</div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.xlsx" style={{ display: 'none' }}
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            setDocs(d => [...d, ...files.map(f => ({ name: f.name, size: f.size, type: guessDocType(f.name), status: 'uploaded' }))]);
          }} />
      </div>

      <div>
        <div style={s.sectionTitle}>Required Documents</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docTypes.map(dt => {
            const uploaded = docs.some(d => d.type === dt);
            return (
              <div key={dt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 7, background: uploaded ? 'rgba(34,197,94,0.06)' : s.surface, border: `1px solid ${uploaded ? 'rgba(34,197,94,0.20)' : s.borderWeak}` }}>
                <span style={{ fontSize: 12, color: uploaded ? '#4ade80' : s.textFaint }}>{uploaded ? '✓' : '○'}</span>
                <span style={{ fontSize: 12, color: uploaded ? s.textMed : s.textDim }}>{dt}</span>
                {uploaded && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4ade80', fontWeight: 600 }}>Uploaded</span>}
                {!uploaded && <span style={{ marginLeft: 'auto', fontSize: 9, color: s.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Required</span>}
              </div>
            );
          })}
        </div>
      </div>

      {docs.length > 0 && (
        <div>
          <div style={s.sectionTitle}>Uploaded Files</div>
          {docs.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: `1px solid ${s.borderWeak}` }}>
              <span style={{ fontSize: 14 }}>📎</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: s.textMed, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontSize: 10, color: s.textDim }}>{d.type} · {(d.size / 1024).toFixed(0)} KB</div>
              </div>
              <button onClick={() => setDocs(dcs => dcs.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: s.textDim, cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function guessDocType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('manual') || n.includes('user')) return 'Equipment Manual';
  if (n.includes('pid') || n.includes('p&id') || n.includes('piping')) return 'P&ID Drawing';
  if (n.includes('iq')) return 'IQ Protocol';
  if (n.includes('oq')) return 'OQ Protocol';
  if (n.includes('pq')) return 'PQ Protocol';
  if (n.includes('valid') || n.includes('summary')) return 'Validation Summary';
  return 'Equipment Manual';
}

function StepTags({ tags, setTags, parsing, setTagPrefix, s }: { machineType: string; tags: TagEntry[]; setTags: React.Dispatch<React.SetStateAction<TagEntry[]>>; parsing: boolean; setTagPrefix: (v: string) => void; s: WizardStyles }) {
  if (parsing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7A5CAD', animation: `kaiPulse 1.2s ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <div style={{ fontSize: 13, color: s.textMuted }}>Parsing manual — extracting instrument tags…</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={s.label}>Tag Prefix</div>
        <input style={{ ...s.input, width: 160 }} placeholder="e.g. 1301"
          onChange={e => setTagPrefix(e.target.value)} />
        <div style={{ fontSize: 10, color: s.textFaint, marginTop: 4 }}>Tags will be numbered FT-1301, ST-1301, etc.</div>
      </div>
      <div>
        <div style={s.sectionTitle}>Discovered Tags — {tags.length} found</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tags.map((tag, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: s.surface, border: `1px solid ${s.borderWeak}` }}>
              <span style={s.pill(tag.type)}>{tag.type}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: s.textHeavy, fontWeight: 600 }}>{tag.desc}</div>
              </div>
              <div style={{ fontSize: 11, color: s.textDim, fontFamily: 'monospace' }}>{tag.unit}</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={tag.enabled !== false} onChange={e => setTags(ts => ts.map((t, j) => j === i ? { ...t, enabled: e.target.checked } : t))} />
                <span style={{ fontSize: 10, color: s.textDim }}>Include</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepMapping({ tags, setTags, s }: { tags: TagEntry[]; setTags: React.Dispatch<React.SetStateAction<TagEntry[]>>; s: WizardStyles }) {
  const enabledTags = tags.filter(t => t.enabled !== false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: s.textMuted, marginBottom: 8 }}>
        Map each discovered tag to a semantic process variable. KairOS uses these to reason about plant state.
      </div>
      {enabledTags.map((tag, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: s.surface, border: `1px solid ${s.borderWeak}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={s.pill(tag.type)}>{tag.type}</span>
              <span style={{ fontSize: 12, color: s.textMed, fontWeight: 600 }}>{tag.desc}</span>
            </div>
            <div style={{ fontSize: 10, color: s.textDim, marginTop: 2 }}>Unit: {tag.unit}</div>
          </div>
          <select style={{ ...s.select, fontSize: 12 }} value={tag.semantic || ''} onChange={e => setTags(ts => ts.map(t => t.desc === tag.desc ? { ...t, semantic: e.target.value } : t))}>
            <option value="">— Map to variable —</option>
            {SEMANTIC_VARS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function StepPhysics({ tags, setTags, s }: { tags: TagEntry[]; setTags: React.Dispatch<React.SetStateAction<TagEntry[]>>; s: WizardStyles }) {
  const enabledAI = tags.filter(t => t.enabled !== false && t.type === 'AI');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: s.textMuted, marginBottom: 8 }}>
        Define operating setpoints and alarm limits. These gate the physics engine and trigger KairOS predictions.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 0 }}>
        {['Parameter','Setpoint','Lo Lo','Lo','Hi','Hi Hi'].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.textDim, padding: '4px 8px', borderBottom: `1px solid ${s.borderWeak}` }}>{h}</div>
        ))}
      </div>
      {enabledAI.map((tag, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 0, borderBottom: `1px solid ${s.borderWeak}` }}>
          <div style={{ padding: '6px 8px' }}>
            <div style={{ fontSize: 12, color: s.textMed, fontWeight: 600 }}>{tag.desc}</div>
            <div style={{ fontSize: 10, color: s.textDim }}>{tag.unit}</div>
          </div>
          {(['setpoint','lolo','lo','hi','hihi'] as const).map(field => (
            <input key={field} type="number" style={{ ...s.input, padding: '5px 7px', fontSize: 12, borderRadius: 0, borderColor: 'transparent', borderBottom: `1px solid ${s.borderWeak}` }}
              value={(tag[field] as string) || ''} placeholder="—"
              onChange={e => setTags(ts => ts.map(t => t.desc === tag.desc ? { ...t, [field]: e.target.value } : t))} />
          ))}
        </div>
      ))}
    </div>
  );
}

function StepReview({ form, docs, tags, s }: { form: FormState; docs: DocEntry[]; tags: TagEntry[]; s: WizardStyles }) {
  const enabledTags = tags.filter(t => t.enabled !== false);
  const mappedTags  = enabledTags.filter(t => t.semantic);
  const docTypes    = ['Equipment Manual','IQ Protocol','OQ Protocol'];
  const missingDocs = docTypes.filter(dt => !docs.some(d => d.type === dt));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {missingDocs.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 2 }}>Missing required documents</div>
            <div style={{ fontSize: 11, color: 'rgba(217,119,6,0.75)' }}>{missingDocs.join(', ')} — machine will be held at Pending IQ/OQ until uploaded</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([
          ['Equipment ID', form.id || '—'],
          ['Type', MACHINE_TYPES.find(t => t.value === form.type)?.label || '—'],
          ['Manufacturer', form.manufacturer || '—'],
          ['Model', form.model || '—'],
          ['Line', form.line || '—'],
          ['Change Control', form.ccRef || '—'],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ padding: '8px 12px', borderRadius: 7, background: s.surface, border: `1px solid ${s.borderWeak}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: s.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 13, color: s.textHeavy, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {([
          ['Documents', docs.length, 'uploaded'],
          ['Tags', enabledTags.length, 'enabled'],
          ['Mapped', mappedTags.length, 'of ' + enabledTags.length],
        ] as [string, number, string][]).map(([label, val, sub]) => (
          <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: s.surface, border: `1px solid ${s.borderMed}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.brandText, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{label}</div>
            <div style={{ fontSize: 9, color: s.textFaint, marginTop: 1 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.15)' }}>
        <div style={{ fontSize: 11, color: 'rgba(88,166,255,0.80)', lineHeight: 1.6 }}>
          Submitting will add <strong style={{ color: '#58a6ff' }}>{form.id || 'this machine'}</strong> to the floor map as <strong style={{ color: '#58a6ff' }}>Pending IQ/OQ</strong>.
          It will not influence OEE calculations or predictions until all qualification protocols are approved.
        </div>
      </div>
    </div>
  );
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

const SCAN_SEQUENCE = [
  { delay: 200,  text: 'Binding to local MQTT broker · port 1883...' },
  { delay: 700,  text: 'Scanning EtherCAT bus segment 0x00–0xFF...' },
  { delay: 1400, text: 'Listening for device handshake packets...' },
  { delay: 2100, text: 'Device beacon received · decoding payload...' },
  { delay: 2700, text: 'Resolved: Bosch i.26 Checkweigher · SN BOS-CW-20260042' },
];

interface DiscoveredDevice {
  id: string;
  serial: string;
  type: string;
  manufacturer: string;
  model: string;
  line: string;
}

const MOCK_DISCOVERED: DiscoveredDevice = {
  id: 'CW-1301', serial: 'BOS-CW-20260042',
  type: 'Checkweigher', manufacturer: 'Bosch', model: 'i.26 Series', line: 'Line 1',
};

function ScannerScreen({ onConfirm, onManual }: { onConfirm: (d: DiscoveredDevice) => void; onManual: () => void }) {
  const [log, setLog]     = useState<string[]>([]);
  const [found, setFound] = useState(false);
  const logRef            = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timers = SCAN_SEQUENCE.map(({ delay, text }, i) =>
      setTimeout(() => {
        setLog(l => [...l, text]);
        if (i === SCAN_SEQUENCE.length - 1) setTimeout(() => setFound(true), 400);
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  return (
    <>
      <style>{`
        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes radarPing   { 0% { transform: scale(0.3); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0E16', borderRadius: '0 0 14px 14px' }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

          {/* ── Radar panel ── */}
          <div style={{ width: 220, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.40)', borderRight: '1px solid rgba(42,241,229,0.10)' }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              {/* Rings */}
              {[1, 0.67, 0.33].map((sc, i) => (
                <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(42,241,229,0.14)', transform: `scale(${sc})`, transformOrigin: 'center' }} />
              ))}
              {/* Cross-hairs */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: '100%', height: 1, background: 'rgba(42,241,229,0.10)' }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 1, height: '100%', background: 'rgba(42,241,229,0.10)' }} />
              </div>
              {/* Sweep */}
              <div style={{ position: 'absolute', inset: 0, animation: 'radarSweep 2.4s linear infinite', transformOrigin: 'center', borderRadius: '50%', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '50%', height: 2, transformOrigin: 'left center', background: 'linear-gradient(to right, transparent, rgba(42,241,229,0.70))' }} />
              </div>
              {/* Ping when found */}
              {found && (
                <div style={{ position: 'absolute', top: '32%', left: '60%', width: 10, height: 10, borderRadius: '50%', background: '#2AF1E5', boxShadow: '0 0 8px #2AF1E5' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid #2AF1E5', animation: 'radarPing 1.4s ease-out infinite' }} />
                </div>
              )}
            </div>
          </div>

          {/* ── Terminal log ── */}
          <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', fontFamily: '"Fira Code","Cascadia Code","Consolas",monospace', fontSize: 11, lineHeight: 1.9, color: 'rgba(42,241,229,0.70)' }}>
            <div style={{ color: 'rgba(42,241,229,0.40)', marginBottom: 8, fontSize: 10 }}>// KAIROS_SYS auto-discovery · MQTT+EtherCAT scan</div>
            {log.map((line, i) => (
              <div key={i} style={{ color: i === log.length - 1 ? '#2AF1E5' : 'rgba(42,241,229,0.55)' }}>
                <span style={{ color: 'rgba(255,255,255,0.20)', marginRight: 8 }}>{'>'}</span>{line}
              </div>
            ))}
            {!found && log.length > 0 && (
              <div style={{ display: 'inline-block', width: 8, height: 14, background: 'rgba(42,241,229,0.55)', marginLeft: 4, animation: 'kaiPulse 1s ease-in-out infinite', verticalAlign: 'middle' }} />
            )}
          </div>
        </div>

        {/* ── Discovered device card ── */}
        <AnimatePresence>
          {found && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ borderTop: '1px solid rgba(42,241,229,0.15)', padding: '14px 20px', background: 'rgba(42,241,229,0.03)', flexShrink: 0 }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(42,241,229,0.60)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>Device Detected</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px 12px' }}>
                  {([['ID', MOCK_DISCOVERED.id], ['Type', MOCK_DISCOVERED.type], ['Manufacturer', MOCK_DISCOVERED.manufacturer], ['Model', MOCK_DISCOVERED.model], ['Serial', MOCK_DISCOVERED.serial], ['Line', MOCK_DISCOVERED.line]] as [string, string][]).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: k === 'ID' || k === 'Serial' ? 'monospace' : 'inherit' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => onConfirm(MOCK_DISCOVERED)} style={{ background: '#7A5CAD', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                    Confirm →
                  </button>
                  <button onClick={onManual} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 18px', fontSize: 11, color: 'rgba(255,255,255,0.40)', cursor: 'pointer' }}>
                    Manual entry
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Stepper nav ──────────────────────────────────────────────────────────────

function StepNav({ current, s }: { current: number; s: WizardStyles }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 24px 14px', flexShrink: 0 }}>
      {STEPS.map((st, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={st.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                background: done ? '#7A5CAD' : active ? 'rgba(122,92,173,0.25)' : s.surfaceUp,
                border: active ? '1.5px solid #7A5CAD' : done ? 'none' : `1px solid ${s.borderMed}`,
                color: done ? '#fff' : active ? s.brandText : s.textDim,
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 8, fontWeight: active ? 700 : 500, color: active ? s.brandText : s.textDim, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                {st.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? 'rgba(122,92,173,0.50)' : s.borderWeak, margin: '0 4px', marginTop: -14 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MachineOnboardingWizard() {
  const onboardingOpen    = useAppStore(s => s.onboardingOpen);
  const closeOnboarding   = useAppStore(s => s.closeOnboarding);
  const addPendingMachine = useAppStore(s => s.addPendingMachine);
  const dark              = useAppStore(s => s.dark);
  const S                 = mkS(dark);

  const [step, setStep]           = useState(0);
  const [parsing, setParsing]     = useState(false);
  const [tagPrefix, setTagPrefix] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [scanPhase, setScanPhase] = useState<'scanning' | null>('scanning');

  const [form, setForm] = useState<FormState>({ id:'', serial:'', type:'', manufacturer:'', model:'', line:'', ccRef:'' });
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [tags, setTags] = useState<TagEntry[]>([]);

  // suppress unused warning — tagPrefix is set but currently only used for display
  void tagPrefix;

  // Reset scanner when wizard opens
  useEffect(() => { if (onboardingOpen) setScanPhase('scanning'); }, [onboardingOpen]);

  const canNext = () => {
    if (step === 0) return form.id && form.type && form.line;
    if (step === 2) return !parsing && tags.length > 0;
    return true;
  };

  const goNext = () => {
    if (step === 1 && tags.length === 0 && form.type) {
      // Trigger simulated parsing
      setParsing(true);
      setStep(2);
      setTimeout(() => {
        const baseTags = (MOCK_TAGS[form.type] || []).map(t => ({ ...t, enabled: true }));
        setTags(baseTags);
        setParsing(false);
      }, 2200);
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = () => {
    addPendingMachine({ ...form, docs, tags: tags.filter(t => t.enabled !== false), submittedAt: new Date().toISOString() });
    setSubmitted(true);
  };

  const handleScanConfirm = (discovered: DiscoveredDevice) => {
    setForm(f => ({
      ...f,
      id: discovered.id, serial: discovered.serial,
      type: Object.keys(MOCK_TAGS).find(k => k.toLowerCase().includes(discovered.type.toLowerCase().split(' ')[0])) || '',
      manufacturer: discovered.manufacturer, model: discovered.model,
      line: discovered.line,
    }));
    setScanPhase(null);
  };

  const handleClose = () => {
    closeOnboarding();
    // Reset after close animation
    setTimeout(() => {
      setStep(0); setScanPhase('scanning');
      setForm({ id:'', serial:'', type:'', manufacturer:'', model:'', line:'', ccRef:'' });
      setDocs([]); setTags([]); setSubmitted(false); setParsing(false);
    }, 300);
  };

  return (
    <AnimatePresence>
      {onboardingOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={S.overlay}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={S.panel}
          >
            {/* Header */}
            <div style={S.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7A5CAD', boxShadow: '0 0 6px #7A5CAD' }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: S.brandText }}>
                  Machine Onboarding
                </span>
              </div>
              <button onClick={handleClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: S.closeColor, lineHeight: 1 }}>×</button>
            </div>

            {submitted ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
                <div style={{ fontSize: 40 }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: S.brandText }}>{form.id} submitted</div>
                <div style={{ fontSize: 13, color: S.textMuted, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
                  Machine added to the floor map as <strong style={{ color: '#58a6ff' }}>Pending IQ/OQ</strong>.
                  It will go live once qualification protocols are approved and all required documents are on file.
                </div>
                <button onClick={handleClose} style={S.btnPrimary}>Close</button>
              </div>
            ) : scanPhase === 'scanning' ? (
              <>
                {/* Scanner header label */}
                <div style={{ padding: '8px 20px 0', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: S.brandText, letterSpacing: '0.10em', textTransform: 'uppercase' }}>Auto-Discovery · Network Scan</div>
                </div>
                <ScannerScreen
                  onConfirm={handleScanConfirm}
                  onManual={() => setScanPhase(null)}
                />
              </>
            ) : (
              <>
                {/* Step nav */}
                <div style={{ paddingTop: 16 }}>
                  <StepNav current={step} s={S} />
                </div>

                {/* Step body */}
                <div style={S.body}>
                  <AnimatePresence mode="wait">
                    <motion.div key={step}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}>
                      {step === 0 && <StepIdentity form={form} setForm={setForm} s={S} />}
                      {step === 1 && <StepDocs docs={docs} setDocs={setDocs} s={S} />}
                      {step === 2 && <StepTags machineType={form.type} tags={tags} setTags={setTags} parsing={parsing} setTagPrefix={setTagPrefix} s={S} />}
                      {step === 3 && <StepMapping tags={tags} setTags={setTags} s={S} />}
                      {step === 4 && <StepPhysics tags={tags} setTags={setTags} s={S} />}
                      {step === 5 && <StepReview form={form} docs={docs} tags={tags} s={S} />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div style={S.footer}>
                  <button onClick={() => setStep(s => Math.max(0, s - 1))} style={S.btnSecondary} disabled={step === 0}>
                    ← Back
                  </button>
                  <div style={{ fontSize: 10, color: S.textFaint }}>
                    Step {step + 1} of {STEPS.length}
                  </div>
                  {step < STEPS.length - 1 ? (
                    <button onClick={goNext} style={{ ...S.btnPrimary, opacity: canNext() ? 1 : 0.4, cursor: canNext() ? 'pointer' : 'not-allowed' }} disabled={!canNext()}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={handleSubmit} style={{ ...S.btnPrimary, background: '#16a34a' }}>
                      Submit for IQ/OQ
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
