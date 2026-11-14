/* Filet de sécurité, hors du paquet du jeu : si le jeu n'a pas démarré au bout de 6 secondes (une page sortie d'un
   cache qui réclame les fichiers d'une version effacée), on vide le cache hors ligne et on recharge, une seule fois.
   Hors ligne, on ne vide rien : le cache est justement ce qui permet de jouer. */
setTimeout(function () {
  if (document.documentElement.dataset.started === '1') return;
  try {
    if (sessionStorage.getItem('ff-rescue')) return;
    sessionStorage.setItem('ff-rescue', '1');
  } catch {
    return;
  }
  if (navigator.onLine === false) return;
  var cleanups = [];
  if ('serviceWorker' in navigator)
    cleanups.push(
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        return Promise.all(
          registrations.map(function (registration) {
            return registration.unregister();
          }),
        );
      }),
    );
  if (window.caches)
    cleanups.push(
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return caches.delete(key);
          }),
        );
      }),
    );
  Promise.all(cleanups)
    .catch(function () {})
    .then(function () {
      location.replace(location.pathname + '?v=' + Date.now());
    });
}, 6000);
