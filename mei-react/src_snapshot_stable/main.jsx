import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AstellasConfig } from './tenants/astellas/index';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App config={AstellasConfig} />
  </StrictMode>,
)
