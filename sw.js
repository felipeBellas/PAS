const CACHE_NAME = 'provas-pwa-v1';

// Caminhos relativos sem a barra inicial para funcionar no GitHub Pages
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './professor.html',
  './prova.html',
  './assets/css/style.css',
  './assets/js/firebase-config.js',
  './assets/js/professor.js',
  './assets/js/prova.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos addAll com tratamento de erro para evitar que uma falha de recurso quebre todo o PWA
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Falha ao armazenar alguns recursos no cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
