import type { Entity, Relation, ZoneId } from '../../types/domain';
import { getSeverityTone, getStateBadgeTone, getZoneColor } from './graphTheme';

export type ContributorVM = {
  id: string;
  label: string;
  severity: 'High' | 'Medium' | 'Normal';
  severityTone: string;
  zoneColor: string;
};

export type StateBadgeVM = {
  label: string;
  background: string;
  text: string;
  border: string;
};

export type MetricVM = {
  key: string;
  value: string;
  negative: boolean;
  tone: 'default' | 'negative';
};

export type DetailPanelVM = {
  zoneColor: string;
  description: string | null;
  confidence: number | null;
  stateBadge: StateBadgeVM | null;
  metrics: MetricVM[];
  contributors: ContributorVM[];
  whyItMatters: string;
};

export function buildGraphDetailPanelVM({
  entity,
  relations,
  entities,
  zoneMap,
  dark,
}: {
  entity: Entity;
  relations: Relation[];
  entities: Entity[];
  zoneMap: Record<string, ZoneId>;
  dark: boolean;
}): DetailPanelVM {
  const zoneColor = getZoneColor(zoneMap?.[entity.id], dark);
  const contributors = relations
    .filter((relation) => relation.to === entity.id)
    .map((relation) => entities.find((candidate) => candidate.id === relation.from))
    .filter((candidate): candidate is Entity => Boolean(candidate))
    .slice(0, 4)
    .map((contributor) => ({
      id: contributor.id,
      label: contributor.label,
      zoneColor: getZoneColor(zoneMap?.[contributor.id], dark),
      severity: contributor.state === 'critical' ? 'High' : contributor.state === 'warning' ? 'Medium' : 'Normal',
      severityTone: getSeverityTone(contributor.state === 'critical' ? 'High' : contributor.state === 'warning' ? 'Medium' : 'Normal'),
    }));

  const metrics = Object.entries(entity.metrics || {}).map(([key, rawValue]) => {
    const value = String(rawValue);
    const negative = value.startsWith('−') || value.startsWith('-');
    return {
      key,
      value,
      negative,
      tone: negative ? 'negative' : 'default',
    };
  });

  const badgeTone = getStateBadgeTone(entity.state);
  const stateBadge = badgeTone
    ? {
        label: entity.state?.toUpperCase() ?? '',
        background: badgeTone.background,
        text: badgeTone.text,
        border: badgeTone.border,
      }
    : null;

  const whyItMatters = entity.id === 'film_tension'
    ? 'Film tension drift is the confirmed root cause at 97% confidence. Every minute unresolved widens the output gap by 2.3 units.'
    : entity.id === 'hidden_loss'
      ? 'CT-1101 micro-jams are running below the 2-minute OEE logging threshold — they never appear in standard downtime reports yet drive 23 min of hidden loss.'
      : entity.id === 'planned_vs_actual'
        ? 'The shift will miss its target by 2,200 units — a £34K shift value impact — unless film tension is corrected within the next 15 minutes.'
        : entity.metadata?.description ?? 'This node is part of the active causal chain impacting batch OEE and output targets.';

  return {
    zoneColor,
    description: entity.metadata?.description ?? null,
    confidence: entity.root_cause_probability,
    stateBadge,
    metrics,
    contributors,
    whyItMatters,
  };
}
