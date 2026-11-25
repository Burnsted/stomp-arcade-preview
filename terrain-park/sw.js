/* terrain-park-rollback-34b87be — network-first; clears older terrain-park-* tip caches */
const C='terrain-park-rollback-34b87be';
const ASSETS=['./','./index.html','./sw.js'];
const OWN=k=>k.indexOf('terrain-park-')===0;
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>OWN(k)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const isHTML=req.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  const isSW=url.pathname.endsWith('/sw.js')||url.pathname.endsWith('sw.js');
  if(isHTML||isSW){
    e.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(C).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')||caches.match('./play.html'))));
    return;
  }
  e.respondWith(caches.open(C).then(async cache=>{
    const cached=await cache.match(req);
    const net=fetch(req).then(res=>{cache.put(req,res.clone());return res;}).catch(()=>cached);
    return cached||net;
  }));
});
