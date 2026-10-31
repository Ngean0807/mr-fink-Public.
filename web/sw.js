// Mr. Fink service worker: the installed app opens offline with the last data it saw.
// Network first for everything, so a new deploy or a new 13F is never hidden behind a cache.
const CACHE = "mrfink-v1";
const SHELL = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;  // prices, fonts: straight to network
  const key = new Request(url.origin + url.pathname);  // ignore cache-busting query strings
  e.respondWith(
    fetch(e.request).then((res) => {
      // Keep the shell and the main data files for offline use (not the 600 company files).
      if (res.ok && (SHELL.some((p) => url.pathname.endsWith(p.replace("./", "/"))) || /\/data\/(dashboard|quotes|status)\.json$/.test(url.pathname))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(key, copy));
      }
      return res;
    }).catch(() => caches.match(key).then((hit) => hit || caches.match("index.html")))
  );
});
