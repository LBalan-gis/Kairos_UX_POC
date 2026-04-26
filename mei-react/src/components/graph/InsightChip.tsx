interface InsightChipProps {
  insight?: string;
  action?: string;
  confidence?: number | string;
  onClick?: () => void;
}

export function InsightChip({ insight, action, confidence, onClick }: InsightChipProps) {
  const confPct = confidence ? Math.round(parseFloat(String(confidence)) * 100) : null;

  return (
    <button
      className="insight-chip"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <div className="ic-header">
        <span className="ic-label">KairOS</span>
        {confPct && <span className="ic-conf">{confPct}%</span>}
      </div>
      <div className="ic-cause">{insight}</div>
      {action && <div className="ic-action">{action}</div>}
    </button>
  );
}
