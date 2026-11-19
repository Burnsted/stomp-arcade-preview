/* Haven's Garden 1bbb40a — cache bust + skipWaiting/clients.claim */
const CACHE = 'havens-garden-1bbb40a';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './js/garden.js',
  './art/meadow.jpg',
  './art/field.jpg',
  './art/greenhouse.jpg',
  './art/pot.png',
  './art/shelf-wood.png',
  './art/hive.jpg',
  './art/franz/haven-front.png',
  './art/franz/haven-walk-01.png',
  './art/franz/haven-walk-02.png',
  './art/franz/haven-pick.png',
  './art/franz/haven-water.png',
  './art/franz/haven-plant.png',
  './art/runner/haven-run-01.png',
  './art/runner/haven-run-02.png',
  './art/runner/haven-jump.png',
  './art/runner/haven-duck.png',
  './art/runner/haven-stumble.png',
  './art/runner/obs-log.png',
  './art/runner/obs-rock.png',
  './art/runner/obs-fence.png',
  './art/runner/flower-daisy.png',
  './art/runner/flower-tulip.png',
  './art/runner/flower-sunflower.png',
  './art/daisy.png',
  './art/tulip.png',
  './art/sunflower.png',
  './art/bee.png',
  './art/butterfly.png',
  './art/butterfly-pink.png',
  './art/butterfly-blue.png',
  './art/butterfly-orange.png',
  './art/butterfly-lilac.png',
  './art/color-daisy.png',
  './art/color-bee.png',
  './art/color-tulip.png'
];

const OWN = (k) => k.indexOf('havens-garden-') === 0;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => OWN(k) && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  const isHTML =
    e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html') ||
    u.pathname.endsWith('.html') ||
    u.pathname.endsWith('/');
  const isSW = u.pathname.endsWith('/sw.js') || u.pathname.endsWith('sw.js');
  const isJS = u.pathname.endsWith('.js');

  if (isHTML || isSW || isJS) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
    )
  );
});
