import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { FactoryConfig } from './tenants/factory/index';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App config={FactoryConfig} />
  </StrictMode>,
)
