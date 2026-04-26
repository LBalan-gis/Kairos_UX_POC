interface PastSegment {
  from: number;
  to: number;
  blister_machine: string;
  cartoner: string;
}

const PAST_STATES: PastSegment[] = [
  { from: -480, to: -420, blister_machine: 'normal',  cartoner: 'normal'   },
  { from: -420, to: -360, blister_machine: 'warning', cartoner: 'normal'   },
  { from: -360, to: -240, blister_machine: 'normal',  cartoner: 'normal'   },
  { from: -240, to: -180, blister_machine: 'warning', cartoner: 'normal'   },
  { from: -180, to:  -90, blister_machine: 'normal',  cartoner: 'normal'   },
  { from:  -90, to:  -60, blister_machine: 'warning', cartoner: 'normal'   },
  { from:  -60, to:  -28, blister_machine: 'warning', cartoner: 'warning'  },
  { from:  -28, to:  -12, blister_machine: 'warning', cartoner: 'normal'   },
  { from:  -12, to:    0, blister_machine: 'warning', cartoner: 'critical' },
];

export function lookupPastStates(time: number): Record<string, string> {
  const segment =
    PAST_STATES.find((entry) => time >= entry.from && time < entry.to) ??
    PAST_STATES[PAST_STATES.length - 1];

  return {
    blister_machine: segment.blister_machine,
    cartoner: segment.cartoner,
  };
}

