import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { extensionBridge } from './services/extensionBridge'

// Dev/e2e only: lets DevTools and Playwright call the extension bridge directly.
if (import.meta.env.DEV) (window as any).extensionBridge = extensionBridge

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
