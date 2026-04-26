import { useKairos } from './KairosContext';
import { KAIROS_QUICK_ACTIONS } from '../../services/kairos/quickActions';

export function KairosChipRail() {
  const { submit } = useKairos();

  return (
    <div className="kairos-chiprail">
      <div className="kairos-chiprail-fade is-left" />
      <div className="kairos-chiprail-fade is-right" />
      <div className="kai-chips kairos-chiprail-track">
        {KAIROS_QUICK_ACTIONS.map((item) => (
          <button
            key={item.label}
            className="kai-chip"
            onClick={() => submit(item.cmd)}
            type="button"
          >
            <span className="kai-chip-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
