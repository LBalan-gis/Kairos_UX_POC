import { useRef, useState } from 'react';
import { useKairos } from './KairosContext';

export function KairosInput() {
  const { submit } = useKairos();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const isReady = input.trim().length > 0;

  return (
    <div className="kairos-input-shell">
      <div className="kairos-input-box">
        <textarea
          ref={inputRef}
          className="kai-input kairos-input-field"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (isReady) {
                submit(input);
                setInput('');
              }
            }
          }}
          placeholder="Ask KairOS..."
          rows={Math.min(4, input.split('\n').length || 1)}
        />
        <button
          onClick={() => {
            if (isReady) {
              submit(input);
              setInput('');
            }
          }}
          className={`kairos-input-send${isReady ? ' is-ready' : ''}`}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
