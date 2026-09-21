const CACHE='shambhu-shed-qc-v20260919-2';
const CORE=['./','./index.html','./manifest.json','./offline.html','./shambhu-shed-32.png','./shambhu-shed-180.png','./shambhu-shed-192.png','./shambhu-shed-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(cached=>{const net=fetch(event.request).then(res=>{if(res.ok&&new URL(event.request.url).origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res}).catch(()=>cached||caches.match('./offline.html'));return cached||net}))});
