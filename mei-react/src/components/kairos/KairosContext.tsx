import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { useKairosController } from './useKairosController';
import type { KairosControllerValue } from './useKairosController';

export const KairosContext = createContext<KairosControllerValue | null>(null);

export function KairosProvider({ children }: PropsWithChildren) {
  const value = useKairosController();

  return (
    <KairosContext.Provider value={value}>
      {children}
    </KairosContext.Provider>
  );
}

export function useKairos() {
  const value = useContext(KairosContext);
  if (!value) {
    throw new Error('useKairos must be used within a KairosProvider');
  }
  return value;
}
