import type { KairosMessage } from '../../types/kairos';
import type { MessageSeverity } from './threadTheme';

type BubbleMessage = KairosMessage & {
  signedRecord?: unknown;
  cfrPending?: boolean;
  text?: string;
  otifAlert?: boolean;
  metrics?: unknown;
  aegisTarget?: string;
};

export function getMessageSeverity(msg: BubbleMessage): MessageSeverity {
  if (msg.urgent || msg.aegisTarget) return 'CRITICAL';
  if (msg.otifAlert || msg.metrics) return 'WARNING';
  return 'ADVISORY';
}

export function buildBubbleRoleState(msg: BubbleMessage) {
  const isKairos = msg.role === 'kairos';
  const isOperator = msg.role === 'operator' || msg.role === 'user';
  const isSystem = msg.role === 'system';
  const isSigned = isKairos && !!msg.signedRecord;
  const severity = isKairos ? getMessageSeverity(msg) : 'ADVISORY';
  const cfr = isKairos && (!!msg.cfrPending || !!msg.text?.toLowerCase().includes('cfr'));

  return {
    severity,
    isKairos,
    isOperator,
    isSystem,
    isSigned,
    cfr,
    senderLabel: isSystem ? 'System' : isOperator ? null : 'Kairos',
    badgeLabel: isSystem ? 'ACTION' : isOperator ? 'OPERATOR' : isSigned ? 'SIGNED RECORD' : severity,
  };
}
