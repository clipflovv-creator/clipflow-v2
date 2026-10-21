// Who / where a request comes from, for download analytics. No raw IP is stored: only the country
// (from the hosting proxy's geo headers, else an offline IP → country lookup) and a coarse browser / OS.
import type { Request } from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// geoip-country: offline, country-only database (~20 MB RAM), no external service to call or pay for.
const geoip: { lookup(ip: string): { country: string; name?: string; continent?: string } | null } = require('geoip-country');

export interface ClientInfo {
  country?: string;       // ISO 3166-1 alpha-2, e.g. "IN"
  countryName?: string;
  continent?: string;     // "AS", "EU", ...
  region?: string;        // only when the proxy provides it (Vercel)
  city?: string;
  browser?: string;
  os?: string;
  device?: 'mobile' | 'tablet' | 'desktop';
}

export function clientIp(req: Request): string | undefined {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || String(req.headers['x-real-ip'] || '') || req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '') || undefined;
}

const header = (req: Request, name: string) => {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  try { return decodeURIComponent(s); } catch { return s; }
};

export function parseUserAgent(ua: string): Pick<ClientInfo, 'browser' | 'os' | 'device'> {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : undefined;
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : undefined;
  const device = /iPad|Tablet/.test(ua) ? 'tablet' : /Mobi|Android|iPhone/.test(ua) ? 'mobile' : 'desktop';
  return { browser, os, device };
}

export function clientInfo(req: Request): ClientInfo {
  const info: ClientInfo = parseUserAgent(String(req.headers['user-agent'] || ''));
  // Proxy geo headers first (Vercel / Cloudflare), they are more accurate than the IP database.
  const hdrCountry = header(req, 'x-vercel-ip-country') || header(req, 'cf-ipcountry');
  info.region = header(req, 'x-vercel-ip-country-region');
  info.city = header(req, 'x-vercel-ip-city');
  const ip = clientIp(req);
  const geo = ip ? geoip.lookup(ip) : null;
  info.country = (hdrCountry && hdrCountry !== 'XX' ? hdrCountry : geo?.country)?.toUpperCase();
  if (geo && geo.country === info.country) {
    info.countryName = geo.name;
    info.continent = geo.continent;
  }
  return info;
}
