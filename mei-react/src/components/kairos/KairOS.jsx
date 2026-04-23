/**
 * KairOS compound component.
 *
 * Usage:
 *   <KairOS.Provider>
 *     <KairOS.Panel onClose={...} />   ← or compose manually:
 *     <KairOS.Thread />
 *     <KairOS.ChipRail />
 *     <KairOS.Input />
 *     <KairOS.CFRGate />
 *   </KairOS.Provider>
 */
import { KairosProvider } from './KairosContext';
import { KairosThread }   from './KairosThread';
import { KairosChipRail } from './KairosChipRail';
import { KairosInput }    from './KairosInput';
import { KairosCFRGate }  from './KairosCFRGate';

export const KairOS = {
  Provider: KairosProvider,
  Thread:   KairosThread,
  ChipRail: KairosChipRail,
  Input:    KairosInput,
  CFRGate:  KairosCFRGate,
};
