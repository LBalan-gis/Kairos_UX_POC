// ── Widget — Compound Component Barrel ────────────────────────────────────────
// Re-exports each widget type from its own code-split module.
// Use this for direct React composition (not SDUI):
//   import { Widget } from '../widgets/Widget';
//   <Widget.Gauge value={78} max={100} variant="radial" />
//
// For SDUI (JSON payload → WidgetRenderer), the registry uses React.lazy()
// pointing directly at the type files — each widget is its own Vite chunk.

export { WidgetGauge   as Gauge   } from './types/Gauge';
export { WidgetChart   as Chart   } from './types/Chart';
export { WidgetStat    as Stat    } from './types/Stat';
export { WidgetTable   as Table   } from './types/Table';
export { WidgetAction  as Action  } from './types/Action';
export { WidgetLayout  as Layout  } from './types/Layout';
export { WidgetControl as Control } from './types/Control';

// Namespace object for convenience:  Widget.Gauge, Widget.Chart, etc.
import { WidgetGauge   } from './types/Gauge';
import { WidgetChart   } from './types/Chart';
import { WidgetStat    } from './types/Stat';
import { WidgetTable   } from './types/Table';
import { WidgetAction  } from './types/Action';
import { WidgetLayout  } from './types/Layout';
import { WidgetControl } from './types/Control';

export const Widget = {
  Gauge:   WidgetGauge,
  Chart:   WidgetChart,
  Stat:    WidgetStat,
  Table:   WidgetTable,
  Action:  WidgetAction,
  Layout:  WidgetLayout,
  Control: WidgetControl,
};
