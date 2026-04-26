export function InsightChip({ insight, action, confidence, onClick }) {
  const confPct = confidence ? Math.round(parseFloat(confidence) * 100) : null;

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
