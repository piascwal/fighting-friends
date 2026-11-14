/* Modèle du service worker : vite.config.ts le remplit à chaque déploiement (numéro de version, liste des fichiers)
   et le publie sous le nom sw.js. Ce fichier-ci n'est jamais servi tel quel.

   Chaque déploiement a son propre cache, rempli d'un coup à l'installation : une page ne mélange jamais les fichiers
   de deux versions. La page et version.json passent par le réseau d'abord (pour voir les mises à jour) ; tout le
   reste vient du cache de la version courante (jouable hors ligne). */
const VERSION = __VERSION__;
const FILES = __FILES__;
const CACHE = `fighting-friends-${VERSION}`;

// installation : tout le jeu en cache. « reload » : jamais la copie du cache HTTP du navigateur
// (GitHub Pages la garde 10 minutes), sinon le nouveau cache pourrait contenir d'anciens fichiers.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// activation : on garde la version précédente (une page encore ouverte peut en avoir besoin),
// on efface les plus anciennes, et on prend la main sur les pages ouvertes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const older = keys.filter((key) => key.startsWith('fighting-friends-') && key !== CACHE);
        return Promise.all(older.slice(0, -1).map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim()),
  );
});

// un réseau lent ou capricieux ne doit pas bloquer le jeu : au-delà de ce délai, on sert le cache
const NETWORK_TIMEOUT = 3000;
const withTimeout = (promise) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('réseau trop lent')), NETWORK_TIMEOUT);
    promise.then(
      (response) => (clearTimeout(timer), resolve(response)),
      (error) => (clearTimeout(timer), reject(error)),
    );
  });

// la version courante d'abord : un fichier de même nom (image d'un personnage) peut exister dans le cache précédent
const fromCache = (request) =>
  caches
    .open(CACHE)
    .then((cache) => cache.match(request, { ignoreSearch: true }))
    .then((response) => response || caches.match(request, { ignoreSearch: true }));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const networkFirst = request.mode === 'navigate' || request.url.includes('version.json');
  if (networkFirst) {
    // « no-cache » : sans ça, le navigateur peut ressortir une page de sa mémoire qui réclame
    // les fichiers d'une version déjà effacée (écran vide)
    event.respondWith(
      withTimeout(fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })).catch(() =>
        fromCache(request).then((response) => response || caches.match('./')),
      ),
    );
    return;
  }
  event.respondWith(
    fromCache(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
