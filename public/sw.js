/* Service worker : rend le jeu jouable hors ligne une fois installé.
   Fichier JavaScript simple (et non TypeScript) car le navigateur le charge tel quel, sans passer par Vite.
   - pages : réseau d'abord (pour recevoir les mises à jour), copie locale si hors ligne ;
   - fichiers versionnés de Vite (assets/…-hash.js|css) : copie locale d'abord, ils ne changent jamais ;
   - le reste (icônes, sprites des personnages) : copie locale tout de suite, mise à jour en arrière-plan. */
const CACHE = 'fighting-friends-v1';
const PRECACHE = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // supprime les caches des versions précédentes
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Garde une copie de la réponse si elle est valide. */
async function remember(request, response) {
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await remember(request, await fetch(request));
  } catch {
    return (await caches.match(request)) ?? (await caches.match('./'));
  }
}

async function cacheFirst(request) {
  return (await caches.match(request)) ?? remember(request, await fetch(request));
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const update = fetch(request)
    .then((response) => remember(request, response))
    .catch(() => cached);
  return cached ?? update;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(networkFirst(request));
  else if (url.pathname.includes('/assets/') && /-[\w-]{8}\.(js|css)$/.test(url.pathname))
    event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});
