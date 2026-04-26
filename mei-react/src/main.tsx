import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

import { FactoryConfig } from './tenants/factory/index';

createRoot(document.getElementById('root')!).render(
  <App config={FactoryConfig} />
);
