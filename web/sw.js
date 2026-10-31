// Mr. Fink service worker: the installed app opens offline with the last data it saw.
// Network first for everything, so a new deploy or a new 13F is never hidden behind a cache.
const CACHE = "mrfink-v2";
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

// Push notifications from the Mr. Fink push server (worker/): show them, open the page on tap.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: "Mr. Fink", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Mr. Fink", {
    body: d.body || "", tag: d.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
