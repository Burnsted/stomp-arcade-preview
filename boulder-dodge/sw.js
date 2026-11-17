/* boulder-dodge-0.9.61-lives-gate */
const C='boulder-dodge-0.9.61-lives-gate';
const OWN=k=>k.indexOf('boulder-dodge-')===0;
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>OWN(k)&&k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const path=url.pathname;
  const isHTML=req.mode==='navigate'||path.endsWith('.html')||path.endsWith('/')||/\/boulder-dodge\/?$/.test(path);
  const isAtlas=/bd-atlas|bd-rider-rig|\.webp$|\.json$/i.test(path);
  if(isHTML||isAtlas){
    e.respondWith(
      fetch(req).then(res=>{
        if(res&&res.ok){const copy=res.clone();caches.open(C).then(c=>c.put(req,copy));}
        return res;
      }).catch(()=>caches.match(req).then(r=>r||(isHTML?caches.match('./index.html'):undefined)))
    );
    return;
  }
  e.respondWith(
    caches.open(C).then(async cache=>{
      const cached=await cache.match(req);
      const net=fetch(req).then(res=>{if(res&&res.ok)cache.put(req,res.clone());return res;}).catch(()=>cached);
      return cached||net;
    })
  );
});
