import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { extensionBridge } from './services/extensionBridge'

// Dev/e2e only: lets DevTools and Playwright call the extension bridge directly.
if (import.meta.env.DEV) (window as any).extensionBridge = extensionBridge

// Only the home page is for search engines. Every other route (editor, login, settings, storage) is an app
// screen, so tell crawlers not to index it. The home page is the only indexed URL (see robots.txt and sitemap.xml).
if (window.location.pathname !== '/') {
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, nofollow';
  document.head.appendChild(robots);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
