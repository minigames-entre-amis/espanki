/* Espanki : fonctionnement hors ligne.
   - la page : réseau d'abord (pour recevoir les mises à jour), copie en cache si pas de réseau ;
   - audios, images, icônes : cache d'abord (ils ne changent jamais : le nom dépend du contenu). */
const V = 'espanki-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {           /* police Nunito : cache après le 1er chargement */
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))
      e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); return res; })));
    return;
  }
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); }
    return res;
  })));
});
/* « Tout télécharger pour le hors-ligne » : la page envoie la liste des fichiers */
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'precache') return;
  e.waitUntil(caches.open(V).then(async c => {
    let n = 0;
    for (const u of e.data.urls) {
      if (!(await c.match(u))) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (_) {} }
      if (++n % 50 === 0 || n === e.data.urls.length) e.source && e.source.postMessage({ type: 'precache', n, total: e.data.urls.length });
    }
  }));
});
