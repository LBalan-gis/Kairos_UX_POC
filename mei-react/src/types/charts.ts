export type ChartKey = 'oee' | 'tension' | 'planned' | 'reject' | 'golden' | 'speed';

export interface KairosChartConfig {
  type: 'bar' | 'line';
  label: string;
  data: unknown;
  getOptions: (dark: boolean) => Record<string, unknown>;
}

export type KairosChartMap = Record<ChartKey, KairosChartConfig>;
