import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

interface RuntimeConfig {
  supersetHostname: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _apiBaseUrl: string;
  private _supersetBaseUrl: Promise<string>;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this._apiBaseUrl = `${this.document.location.origin}/api`;

    // Superset can't share this origin (see nginx.conf's SUPERSET_HOSTNAME
    // server block for why) — it's reverse-proxied on its own hostname,
    // discovered at runtime from assets/config.json (synthesised by nginx
    // from SUPERSET_HOSTNAME, not a real build artifact) rather than baked
    // into the build, so the same PWA image works across deployments with
    // different Superset hostnames. Fetched lazily here, not awaited before
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
    const port = this.document.location.port ? `:${this.document.location.port}` : '';
    this._supersetBaseUrl = fetch('/assets/config.json')
      .then(res => res.json())
      .then((config: RuntimeConfig) => `${this.document.location.protocol}//${config.supersetHostname}${port}`)
      .catch(() => '');
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  public getSupersetBaseUrl(): Promise<string> {
    return this._supersetBaseUrl;
  }
}
