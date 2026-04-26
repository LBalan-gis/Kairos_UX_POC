import type { KairosLogEntry, KairosMessage, KairosMessageData } from '../../types/kairos';

let msgId = 0;

export function mkMsg(role: string, data: KairosMessageData): KairosMessage {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const text = data.text ? data.text.toLowerCase() : '';
  const urgent = !!data.otifAlert || !!data.aegisTarget || !!data.cfrPending ||
    text.includes('critical') || text.includes('miss the friday') || text.includes('intercepted') || text.includes('drift');
  const cryptoHash = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
  const sig = `0x${cryptoHash}`;

  return { id: ++msgId, role, ts, sig, urgent, ...data };
}

export function mkLogEntry(type: string, text: string): KairosLogEntry {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return { id: `ov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts, type, text };
}

export function stageLog(
  addFn: (entry: KairosLogEntry) => void,
  entries: Array<[number, string, string]>
) {
  entries.forEach(([delay, type, text]) => {
    setTimeout(() => addFn(mkLogEntry(type, text)), delay);
  });
}
