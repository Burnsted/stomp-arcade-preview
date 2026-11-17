/* Backcountry Climb — network-first; sha-named cache; delete older bc-* caches */
const C = 'bc-dd9dcaf';
const ASSETS = ['./', './play.html', './sw.js', './index.html'];
const OWN = (k) => k.indexOf('bc-') === 0;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => OWN(k) && k !== C).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isHTML =
    req.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/play.html');
  // Network-first for HTML + this SW tip
  if (isHTML || url.pathname.endsWith('/sw.js')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(C).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./play.html')))
    );
    return;
  }
  // Network-first for everything else (art/fonts); cache as fallback
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(C).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
