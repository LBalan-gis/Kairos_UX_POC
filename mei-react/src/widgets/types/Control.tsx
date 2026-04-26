import { useState } from 'react';

type ControlType = 'switch' | 'slider' | 'radio' | 'calendar' | 'clock' | 'checkbox' | 'select' | 'number' | 'text' | 'textarea' | 'button' | 'label' | 'badge';
type ControlValue = boolean | string | number | string[];

interface WidgetControlProps {
  controlType?: ControlType;
  label?: string;
  value?: ControlValue;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  action?: string;
  machineId?: string;
  onAction?: (data: { action?: string; machineId?: string; payload: ControlValue }) => void;
  dark?: boolean;
}

export function WidgetControl({ controlType = 'switch', label, value, options, min, max, step, action, machineId, onAction, dark = true }: WidgetControlProps) {
  const [val, setVal] = useState<ControlValue>(value ?? false);

  const handleChange = (newVal: ControlValue) => {
    setVal(newVal);
    onAction?.({ action, machineId, payload: newVal });
  };

  const labelColor  = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const textColor   = dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)';
  const dimColor    = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)';
  const inputBg     = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const inputBorder = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
  const inputColor  = dark ? '#fff'                   : '#111827';
  const accent      = dark ? '#2AF1E5'                : '#0284C7';
  const trackOff    = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const thumbOff    = dark ? '#fff'                   : '#6b7280';
  const colorScheme = dark ? 'dark' : 'light';

  const wrap = (child: React.ReactNode) => (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: labelColor, textTransform: 'uppercase' }}>{label}</div>}
      {child}
    </div>
  );

  switch (controlType) {
    case 'switch':
      return wrap(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => handleChange(!val)}>
          <div style={{ width: 40, height: 22, borderRadius: 11, background: val ? accent : trackOff, position: 'relative', transition: 'background 0.2s', boxShadow: val ? `0 0 8px ${accent}66` : 'none' }}>
            <div style={{ position: 'absolute', top: 2, left: val ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: val ? (dark ? '#060c16' : '#fff') : thumbOff, transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: val ? textColor : dimColor, letterSpacing: '0.05em' }}>{val ? 'ENABLED' : 'DISABLED'}</span>
        </div>
      );

    case 'slider':
      return wrap(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="range" min={min} max={max} step={step} value={val as number}
            onChange={e => handleChange(e.target.value)}
            style={{ flex: 1, accentColor: accent, cursor: 'grab' } as React.CSSProperties} />
          <div style={{ padding: '4px 8px', background: inputBg, borderRadius: 4, border: `1px solid ${inputBorder}`, minWidth: 44, textAlign: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{val as number}</span>
          </div>
        </div>
      );

    case 'radio':
      return wrap(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {options?.map(opt => (
            <button key={opt} onClick={() => handleChange(opt)} style={{
              padding: '8px 14px', fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
              background: val === opt ? (dark ? 'rgba(42,241,229,0.15)' : 'rgba(2,132,199,0.10)') : inputBg,
              border: `1px solid ${val === opt ? (dark ? 'rgba(42,241,229,0.50)' : 'rgba(2,132,199,0.40)') : inputBorder}`,
              color: val === opt ? accent : dimColor,
              transition: 'all 0.15s',
            }}>{opt}</button>
          ))}
        </div>
      );

    case 'calendar':
      return wrap(
        <input type="date" value={val as string} onChange={e => handleChange(e.target.value)}
          style={{ padding: '10px 14px', background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, borderRadius: 6, outline: 'none', cursor: 'text', colorScheme } as React.CSSProperties} />
      );

    case 'clock':
      return wrap(
        <input type="time" value={val as string} onChange={e => handleChange(e.target.value)}
          style={{ padding: '10px 14px', background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, borderRadius: 6, outline: 'none', cursor: 'text', colorScheme } as React.CSSProperties} />
      );

    case 'checkbox': {
      const isGroup = options && options.length > 0;
      const sel = Array.isArray(val) ? val : (val ? [String(val)] : []);
      const checkBox = (checked: boolean, lbl: string, onToggle: () => void) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onToggle}>
          <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${checked ? accent : inputBorder}`, background: checked ? (dark ? 'rgba(42,241,229,0.12)' : 'rgba(2,132,199,0.10)') : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
            {checked && <span style={{ fontSize: 10, color: accent, fontWeight: 800 }}>✓</span>}
          </div>
          <span style={{ fontSize: 11, color: checked ? textColor : dimColor, fontWeight: checked ? 600 : 400 }}>{lbl}</span>
        </div>
      );
      if (!isGroup) return wrap(checkBox(!!val, 'Enabled', () => handleChange(!val)));
      return wrap(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options!.map(opt => {
            const checked = sel.includes(opt);
            return checkBox(checked, opt, () => handleChange(checked ? sel.filter(o => o !== opt) : [...sel, opt]));
          })}
        </div>
      );
    }

    case 'select':
      return wrap(
        <select value={val as string} onChange={e => handleChange(e.target.value)}
          style={{ padding: '10px 14px', background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, borderRadius: 6, outline: 'none', cursor: 'pointer', width: '100%', colorScheme } as React.CSSProperties}>
          {(options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );

    case 'number':
      return wrap(
        <input type="number" min={min} max={max} step={step} value={val as number}
          onChange={e => handleChange(parseFloat(e.target.value))}
          style={{ padding: '10px 14px', background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, borderRadius: 6, outline: 'none', width: 110, fontSize: 14, fontWeight: 700 }} />
      );

    case 'text':
      return wrap(
        <input type="text" value={val as string} placeholder={options?.[0] ?? ''} onChange={e => handleChange(e.target.value)}
          style={{ padding: '10px 14px', background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
      );

    case 'textarea':
      return wrap(
        <textarea value={val as string} rows={4} placeholder={options?.[0] ?? ''} onChange={e => handleChange(e.target.value)}
          style={{ padding: '10px 14px', background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
      );

    case 'button':
      return wrap(
        <button onClick={() => handleChange(true)}
          style={{ padding: '10px 18px', background: dark ? 'rgba(42,241,229,0.07)' : 'rgba(2,132,199,0.07)', border: `1px solid ${dark ? 'rgba(42,241,229,0.28)' : 'rgba(2,132,199,0.28)'}`, borderRadius: 6, color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
          {label}
        </button>
      );

    case 'label':
      return (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: textColor, fontWeight: 500, lineHeight: 1.55 }}>{label}</div>
          {options?.[0] && <div style={{ fontSize: 10, color: dimColor, marginTop: 4 }}>{options[0]}</div>}
        </div>
      );

    case 'badge': {
      const BADGE: Record<string, [string, string, string]> = {
        info:     ['rgba(42,241,229,0.09)', 'rgba(42,241,229,0.28)', '#2AF1E5'],
        ok:       ['rgba(74,222,128,0.09)', 'rgba(74,222,128,0.28)', '#4ade80'],
        warning:  ['rgba(245,158,11,0.09)', 'rgba(245,158,11,0.28)', '#F59E0B'],
        critical: ['rgba(239,68,68,0.09)',  'rgba(239,68,68,0.28)',  '#EF4444'],
      };
      const [bg, border, color] = BADGE[val as string] ?? BADGE.info;
      return (
        <div style={{ padding: '14px 16px' }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', background: bg, border: `1px solid ${border}`, borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>{label}</span>
        </div>
      );
    }

    default:
      return wrap(<div style={{ fontSize: 10, color: '#f87171' }}>Unsupported control type: {controlType}</div>);
  }
}
