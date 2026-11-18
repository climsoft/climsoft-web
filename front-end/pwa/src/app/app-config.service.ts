import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

interface RuntimeConfig {
  supersetPort: string;
  supersetUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _apiBaseUrl: string;
  private _supersetBaseUrl: Promise<string>;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this._apiBaseUrl = `${this.document.location.origin}/api`;

    // Superset can't share this origin (see nginx.conf's Superset server
    // block for why) — nginx serves it on its own port. Where it lives is
    // read at runtime from assets/config.json (synthesised by nginx, not a
    // real build artifact) rather than baked into the build, so the same PWA
    // image works across deployments. A supersetUrl, when set, is used as-is
    // (Superset reached through its own public hostname, e.g. a Cloudflare
    // tunnel). Otherwise it's this page's own protocol and hostname on
    // supersetPort, which works for any address that reaches this server —
    // an IP, localhost, or a hostname. Fetched lazily here, not awaited before
    // bootstrap in main.ts: an offline/slow fetch must never block app
    // startup for a feature (climate product dashboards) most sessions
    // won't touch immediately.
    // Deliberately using the raw fetch() API, not HttpClient: AppAuthInterceptor
    // (app.module.ts) applies to every HttpClient request app-wide with no
    // URL exclusion — it flips the app's global network status to OFFLINE
    // on a 0/504 response and logs the user out on a 403. Those are
    // sensible reactions to a real API call failing, but wrong for this
    // static, unauthenticated config file: a hiccup fetching it must not be
    // mistaken for the whole app being offline. Plain fetch() bypasses the
    // interceptor pipeline entirely, which is what we want here.
    const { protocol, hostname } = this.document.location;
    this._supersetBaseUrl = fetch('/assets/config.json')
      .then(res => res.json())
      .then((config: RuntimeConfig) => {
        if (config.supersetUrl) {
          return config.supersetUrl.replace(/\/+$/, '');
        }
        return config.supersetPort ? `${protocol}//${hostname}:${config.supersetPort}` : '';
      })
      .catch(() => '');
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  public getSupersetBaseUrl(): Promise<string> {
    return this._supersetBaseUrl;
  }
}
