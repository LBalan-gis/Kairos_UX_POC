import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraphBoard } from './GraphBoard';
import { ZoneSwimlanes } from './ZoneSwimlanes';
import { EdgeLayer } from './EdgeLayer';
import { NodeLayer } from './NodeLayer';
import { MiniMap } from './MiniMap';
import { MetricSparkline } from './MetricSparkline';
import { useWhiteboardController } from './useWhiteboardController';
import type { CSSProperties } from 'react';
import type { Entity, Relation, ZoneId } from '../../types/domain';
import { LEGEND_ITEMS, getGraphSurfaceTheme } from './graphTheme';
import { buildGraphDetailPanelVM } from './graphViewModel';
import './GraphWhiteboardLayer.css';
import './graph.css';

type GraphLegendProps = {
  dark: boolean;
  hiddenCount: number;
  onRevealAll: () => void;
  onResetLayout?: () => void;
};

function GraphLegend({ dark, hiddenCount, onRevealAll, onResetLayout }: GraphLegendProps) {
  const theme = getGraphSurfaceTheme(dark);

  return (
    <div
      className="graph-legend-bar"
      style={{
        '--graph-legend-bg': theme.legendBg,
        '--graph-legend-border': theme.legendBorder,
        '--graph-legend-dim': theme.legendDim,
      } as CSSProperties}
    >
      <span className="graph-legend-label">LEGEND</span>
      {LEGEND_ITEMS.map(({ type, color, label }) => (
        <div key={label} className="graph-legend-item">
          {type === 'line' && <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>}
          {type === 'dashed' && <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" /></svg>}
          {type === 'circle' && <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" /></svg>}
          {type === 'ring' && <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="none" stroke={color} strokeWidth="1.5" /><circle cx="5" cy="5" r="1.5" fill={color} /></svg>}
          <span className="graph-legend-text">{label}</span>
        </div>
      ))}
      <div className="graph-legend-actions">
        {hiddenCount > 0 && (
          <button onClick={onRevealAll} className="graph-legend-link graph-legend-link-warn">
            +{hiddenCount} hidden
          </button>
        )}
        {onResetLayout && (
          <button onClick={onResetLayout} className="graph-legend-link">
            Reset layout
          </button>
        )}
      </div>
    </div>
  );
}

type GraphDetailPanelProps = {
  entity: Entity;
  relations: Relation[];
  entities: Entity[];
  zoneMap: Record<string, ZoneId>;
  dark: boolean;
  onClose: () => void;
};

function GraphDetailPanel({ entity, relations, entities, zoneMap, dark, onClose }: GraphDetailPanelProps) {
  const [tab, setTab] = useState('details');
  const { label, type, insight, action } = entity;
  const viewModel = useMemo(() => buildGraphDetailPanelVM({ entity, relations, entities, zoneMap, dark }), [entity, relations, entities, zoneMap, dark]);

  const dispatchCmd = (cmd: string) => window.dispatchEvent(new CustomEvent('kairos-cmd', { detail: cmd }));

  const tabs = ['Details', 'Why it matters', 'History'];

  return (
    <motion.div
      className="gdp-shell"
      style={{ '--gdp-zone-color': viewModel.zoneColor } as CSSProperties}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 300, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      <div className="gdp-inner">
        <div className="gdp-header">
          <div className="gdp-header-copy">
            <div className="gdp-type">{type}</div>
            <div className="gdp-title">{label}</div>
            {viewModel.stateBadge && (
              <div
                className="gdp-badge"
                style={{
                  '--gdp-badge-bg': viewModel.stateBadge.background,
                  '--gdp-badge-text': viewModel.stateBadge.text,
                  '--gdp-badge-border': viewModel.stateBadge.border,
                } as CSSProperties}
              >
                {viewModel.stateBadge.label}
              </div>
            )}
          </div>
          <button className="gdp-close" onClick={onClose}>✕</button>
        </div>

        <div className="gdp-tabs">
          {tabs.map((item) => (
            <button
              key={item}
              className={`gdp-tab${tab === item.toLowerCase().replace(' ', '_') ? ' active' : ''}`}
              onClick={() => setTab(item.toLowerCase().replace(/ /g, '_'))}
            >{item}</button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="gdp-body">
            {viewModel.description && (
              <p className="gdp-desc">{viewModel.description}</p>
            )}

            {viewModel.metrics.length > 0 && (
              <div className="gdp-section">
                {viewModel.metrics.map(({ key, value, negative }) => {
                  return (
                    <div className="gdp-metric" key={key}>
                      <span className="gdp-metric-k">{key}</span>
                      <span className={`gdp-metric-v${negative ? ' is-negative' : ''}`}>{value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="gdp-section">
              <div className="gdp-section-label">Trend</div>
              <MetricSparkline entityId={entity.id} simulatedTime={null} />
            </div>

            {viewModel.confidence !== null && viewModel.confidence !== undefined && (
              <div className="gdp-conf gdp-conf-accent">
                <span>Confidence</span>
                <strong>{Math.round(viewModel.confidence * 100)}%</strong>
              </div>
            )}

            {viewModel.contributors.length > 0 && (
              <div className="gdp-section">
                <div className="gdp-section-label">Contributing factors</div>
                {viewModel.contributors.map((contributor) => {
                  return (
                    <div className="gdp-factor" key={contributor.id}>
                      <span className="gdp-factor-dot" style={{ '--gdp-factor-color': contributor.zoneColor } as CSSProperties} />
                      <span className="gdp-factor-label">{contributor.label}</span>
                      <span className="gdp-factor-sev" style={{ '--gdp-factor-severity': contributor.severityTone } as CSSProperties}>{contributor.severity}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {(insight || action) && (
              <div className="gdp-section">
                <div className="gdp-section-label">Recommended actions</div>
                {insight && (
                  <div className="gdp-action-row">
                    <span className="gdp-action-icon">⚡</span>
                    <div>
                      <div className="gdp-action-title">{insight}</div>
                      {action && <div className="gdp-action-impact">High impact</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="gdp-footer">
              <button
                className="gdp-cta"
                onClick={() => dispatchCmd(action ?? 'show affected systems')}
              >
                + Add to action list
              </button>
              <button className="gdp-audit" onClick={() => dispatchCmd('generate incident report')}>
                View audit trail →
              </button>
            </div>
          </div>
        )}

        {tab === 'why_it_matters' && (
          <div className="gdp-body">
            <p className="gdp-desc">
              {viewModel.whyItMatters}
            </p>
            {viewModel.confidence !== null && viewModel.confidence !== undefined && (
              <div className="gdp-conf gdp-conf-accent">
                <span>Confidence</span>
                <strong>{Math.round(viewModel.confidence * 100)}%</strong>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="gdp-body">
            <p className="gdp-desc gdp-desc-compact">Signal history and prior incidents for this node.</p>
            <div className="gdp-section">
              <MetricSparkline entityId={entity.id} simulatedTime={null} />
            </div>
            <div className="gdp-conf gdp-conf-muted">
              <span>Last updated</span>
              <strong>Just now</strong>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const GraphWhiteboardLayer = () => {
  const {
    dark, entities, relations, effectiveEntities, focusId, focusOn, focusedEntity,
    focusNeighborhood, focusEdgeIds, hiddenCount, simulatedTime,
    isSimulating, positions, sizes, zoneMap, zoneLabels, entityStateMap,
    fitTransform, boardRef, actualSizes, mvReg,
    enterFocus, exitFocus, revealAll,
    handleRegister, handleSizeChange, handleNodeDrag, handleNodeDragEnd,
    handleNodeClick, handleBoardClick, handleResetLayout, boardEntities,
  } = useWhiteboardController();
  const theme = getGraphSurfaceTheme(dark);

  return (
    <div
      className="graph-shell"
      style={{
        '--graph-text-primary': theme.textPrimary,
        '--graph-text-secondary': theme.textSecondary,
        '--graph-badge-bg': theme.badgeBg,
        '--graph-show-all-bg': theme.showAllBg,
        '--graph-show-all-border': theme.border,
        '--graph-focus-track-off': theme.focusTrackOff,
      } as CSSProperties}
    >
      <div className="graph-header">
        <div className="graph-header-left">
          <span className="graph-header-title">Active causal path</span>
          <span className="graph-header-badge">
            4 main drivers
          </span>
          <span className="graph-header-desc">
            CT-1101 micro-stops are causing hidden loss that is impacting OEE and batch risk.
          </span>
        </div>
        <div className="graph-header-right">
          {focusOn && (
            <span className="graph-header-status">Showing critical path</span>
          )}
          <label className="graph-focus-toggle">
            <input
              type="checkbox"
              checked={focusOn}
              onChange={(event) => event.target.checked ? enterFocus('film_tension') : exitFocus()}
            />
            <span className="graph-focus-track" style={{ '--graph-focus-track-bg': focusOn ? '#6366F1' : theme.focusTrackOff } as CSSProperties} />
            <span className="graph-focus-label">Focus mode</span>
          </label>
          <button
            className="graph-show-all-btn"
            onClick={revealAll}
          >
            Show all ({entities.length})
          </button>
        </div>
      </div>

      <div className="graph-body">
        <div className="graph-canvas-area">
          {isSimulating && (
            <div className="graph-sim-badge">
              +{Math.round(simulatedTime)}m SIMULATED
            </div>
          )}
          <GraphBoard ref={boardRef} initialTransform={fitTransform} onBoardClick={handleBoardClick}>
            <ZoneSwimlanes
              entities={boardEntities} positions={positions} sizes={sizes}
              mvReg={mvReg} actualSizesRef={actualSizes} zoneMap={zoneMap} zoneLabels={zoneLabels}
            />
            <EdgeLayer
              relations={relations} positions={positions} sizes={sizes}
              actualSizesRef={actualSizes} focusEdgeIds={focusEdgeIds} focusId={focusId}
              mvReg={mvReg} isSimulating={isSimulating} entityStateMap={entityStateMap}
              zoneMap={zoneMap}
            />
            <NodeLayer
              entities={boardEntities} positions={positions} sizes={sizes}
              visibleIds={focusNeighborhood} focusId={focusId} simulatedTime={simulatedTime}
              zoneMap={zoneMap}
              onNodeClick={handleNodeClick} onNodeDragEnd={handleNodeDragEnd}
              onNodeDrag={handleNodeDrag} onRegister={handleRegister} onSizeChange={handleSizeChange}
            />
          </GraphBoard>

          <MiniMap
            boardEntities={boardEntities} positions={positions} sizes={sizes}
            mvReg={mvReg} actualSizesRef={actualSizes} boardRef={boardRef} zoneMap={zoneMap}
            dark={dark}
          />
        </div>

        <AnimatePresence>
          {focusedEntity && (
            <GraphDetailPanel
              key={focusedEntity.id}
              entity={focusedEntity}
              relations={relations}
              entities={effectiveEntities}
              zoneMap={zoneMap}
              dark={dark}
              onClose={exitFocus}
            />
          )}
        </AnimatePresence>
      </div>

      <GraphLegend
        dark={dark}
        hiddenCount={hiddenCount}
        onRevealAll={revealAll}
        onResetLayout={handleResetLayout}
      />
    </div>
  );
};
