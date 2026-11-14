// CropLink compatibility worker: immediately retire older caches and release control.
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('croplink-shell-'))await caches.delete(key)}await self.registration.unregister();await self.clients.claim()})())});
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)))}});
