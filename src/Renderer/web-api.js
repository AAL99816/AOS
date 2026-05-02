'use strict';

/* ══ WEB API SHIM ══
   Provides browser equivalents of Electron's contextBridge APIs.
   Only activates when window.api is not already set by preload.js.
   Safe to load in both Electron and browser — Electron's preload
   sets these first, so the if-guards below never overwrite them.
══ */

if (!window.api) {
  window.api = {

    async cacheLoad() {
      try {
        const raw = localStorage.getItem('aos_cache');
        return raw ? { ok: true, data: raw } : { ok: false };
      } catch { return { ok: false }; }
    },

    async cacheSave(data) {
      try {
        localStorage.setItem('aos_cache', data);
        return { ok: true };
      } catch { return { ok: false }; }
    },

    async exportData(json) {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `aos-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { ok: true };
      } catch { return { ok: false }; }
    },

    async importData() {
      return new Promise(resolve => {
        const input  = document.createElement('input');
        input.type   = 'file';
        input.accept = '.json,application/json';
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return resolve({ ok: false });
          const reader = new FileReader();
          reader.onload  = ev => resolve({ ok: true, data: ev.target.result });
          reader.onerror = ()  => resolve({ ok: false });
          reader.readAsText(file);
        };
        input.click();
      });
    }
  };
}

/* ── Updater: no-op in browser ── */
if (!window.updater) {
  window.updater = { onEvent: () => {}, install: () => {} };
}

/* ── Auth bridge: no-op in browser ──
   Supabase handles redirects natively via detectSessionInUrl + DOMContentLoaded. ── */
if (!window.authBridge) {
  window.authBridge = { onDeepLink: () => {} };
}

/* ── Handle email confirmation / magic-link redirects ──
   When Supabase redirects back to the web app after email confirmation,
   the URL contains a hash like #access_token=...
   We parse it and call handleAuthDeepLink (defined in auth.js) after
   all scripts have loaded. The DOMContentLoaded guard in auth.js then
   finds an active session and boots the app normally. ── */
const _hasWebAuthCallback = typeof window !== 'undefined' && (
  window.location.hash.includes('access_token') ||
  new URLSearchParams(window.location.search).has('token_hash')
);

if (typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.protocol === 'http:') &&
    _hasWebAuthCallback) {

  window.addEventListener('DOMContentLoaded', async () => {
    if (typeof handleAuthDeepLink === 'function') {
      await handleAuthDeepLink(window.location.href);
      /* Remove auth tokens from the URL bar without reloading. */
      history.replaceState(null, '', window.location.pathname);
    }
  }, { once: true });
}
