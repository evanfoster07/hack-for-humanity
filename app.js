const {PLANT,HOME,createTrucks,planRoute,metrics,advance}=Delivery;
const $=id=>document.getElementById(id);
let trucks=createTrucks(),home={...HOME},router=null,selectedId=null,running=true,scenario='delay',alertTime=new Date();
const map=typeof L!=='undefined'?L.map('map',{zoomControl:false}).setView([58.46,-78.105],14):null;
const markers=new Map(), routeLines=new Map();
let homeMarker;
if(map) {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  homeMarker=L.marker([home.lat,home.lng],{draggable:true,icon:L.divIcon({className:'home-marker',html:'⌂',iconSize:[34,34]})}).addTo(map).bindTooltip('Your delivery location');
  L.marker([PLANT.lat,PLANT.lng],{icon:L.divIcon({className:'plant-marker',html:'◆',iconSize:[28,28]})}).addTo(map).bindPopup('<strong>Inukjuak Water Treatment Plant</strong><br>Real mapped facility · simulated departures');
  for(const truck of trucks) {
    const marker=L.marker([PLANT.lat,PLANT.lng],{icon:truckIcon(truck)}).addTo(map).bindTooltip(truck.id);
    marker.on('click',()=>showDetails(truck.id));markers.set(truck.id,marker);
    routeLines.set(truck.id,L.polyline([],{weight:3,opacity:.4,color:'#12718a'}).addTo(map));
  }
  map.on('click',e=>setHome(e.latlng.lat,e.latlng.lng));
  homeMarker.on('dragend',()=>{const p=homeMarker.getLatLng();setHome(p.lat,p.lng)});
}
function truckIcon(t) {return L.divIcon({className:`truck-marker ${t.blocked?'danger':t.delaySeconds?'caution':''}`,html:'🚚',iconSize:[38,38]});}
function distance(km) {return km<1?`${Math.round(km*1000)} m`:`${km.toFixed(1)} km`;}
function eta(t) {const m=metrics(t);return !m?'Unavailable':m.etaMinutes<.05?'Arrived':`${Math.max(1,Math.ceil(m.etaMinutes))} min`;}
function eligible() {return trucks.filter(t=>metrics(t)&&t.quality==='good').sort((a,b)=>metrics(a).etaMinutes-metrics(b).etaMinutes);}
function quality(t) {return t?.quality==='good'?['good','● Truck sample available']:t?['caution','! Water quality recheck']:['unknown','? Quality not confirmed'];}
function setQuality(el,t) {const [cls,label]=quality(t);el.className=`quality-indicator ${cls}`;el.textContent=label;}
function render() {
  const next=eligible()[0];
  $('next-eta').textContent=next?eta(next):'No estimate';
  if(next) {
    const minutes=metrics(next).etaMinutes;
    const date=new Date(Date.now()+minutes*60000);
    $('arrival-window').textContent=minutes<.05?'Truck at your roadside stop':`Around ${date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}${running?'':' · paused'}`;
    $('next-truck').textContent=`${next.id} · ${Math.max(0,next.stops.length-next.stopIndex)} stop${next.stops.length-next.stopIndex===1?'':'s'} before you${next.delaySeconds?' · delay included':''}`;
  } else {$('arrival-window').textContent='Choose a pin near a local road';$('next-truck').textContent='No available truck can reach this destination';}
  setQuality($('delivery-quality'),next);$('next-details').disabled=!next;
  const list=$('truck-list');
  const sorted=[...trucks].sort((a,b)=>(metrics(a)?.distanceKm??Infinity)-(metrics(b)?.distanceKm??Infinity));
  // Keep existing buttons stable while the simulation updates their text.
  for(const t of sorted) {
    let button=document.getElementById(`truck-${t.id}`);
    if(!button) {button=document.createElement('button');button.id=`truck-${t.id}`;button.type='button';button.addEventListener('click',()=>showDetails(t.id));}
    button.className=`truck-card${t.id===selectedId?' selected':''}`;
    const m=metrics(t),tag=t.blocked?'Out of service':t.quality==='caution'?'Quality recheck':t.delaySeconds?'Delayed':'On route';
    button.innerHTML=`<div class="truck-card-top"><strong>🚚 ${t.id}</strong><span class="chip ${t.blocked?'danger':t.delaySeconds||t.quality==='caution'?'caution':'good'}">${tag}</span></div><div class="truck-card-bottom"><span>${m?distance(m.distanceKm)+' by road':'No delivery available'}</span><strong>${t.quality==='caution'?'On hold':eta(t)}</strong></div>`;
    list.appendChild(button);
    markers.get(t.id)?.setLatLng([t.lat,t.lng]);
    const coords=t.route?[[t.lat,t.lng],...t.route.legs.slice(t.legIndex).map(l=>l.to)]:[];
    routeLines.get(t.id)?.setLatLngs(coords).setStyle({opacity:t.id===selectedId ? .9 : .35,weight:t.id===selectedId?5:3});
  }
  if($('truck-detail').open)renderDetails();
}
function renderDetails() {
  const t=trucks.find(t=>t.id===selectedId);if(!t)return;
  $('detail-title').textContent=t.id;
  $('detail-arrival').textContent=t.quality==='caution'?'Delivery on hold pending recheck':`Estimated arrival: ${eta(t)}${t.delaySeconds?' · delay included':''}`;
  setQuality($('detail-quality'),t);
  $('detail-action').textContent=t.quality==='good'?'A truck sample is available. Your household tank and tap still need a separate check.':'Truck held for a water sample recheck. Another available truck is used for your estimate.';
  $('readings').innerHTML=['pH','Turbidity','Chlorine','Temperature'].map((label,i)=>`<div><span>${label}</span><strong>${t.readings[i]}</strong></div>`).join('');
  $('detail-route').textContent=`${PLANT.name} → ${t.round} → your roadside stop. ${Math.max(0,t.stops.length-t.stopIndex)} scheduled stops remaining, 3 minutes per stop. Speeds use 80% of mapped limits or 20 km/h where unmapped.`;
}
function showDetails(id) {selectedId=id;renderDetails();render();$('truck-detail').showModal();}
function setHome(lat,lng) {
  if(!router){$('route-message').textContent='Roads are still loading. Please try again.';return;}
  home={lat,lng};homeMarker?.setLatLng([lat,lng]);
  $('location-name').textContent='Your selected location';
  for(const t of trucks)planRoute(router,t,home);
  const route=trucks.find(t=>t.route)?.route;
  $('route-message').textContent=route?`Location updated${route.endSnapMetres>8?` · delivery stops ${Math.round(route.endSnapMetres)} m away at the road`:''}.`:'No road access here. Choose a location closer to an Inukjuak road.';
  render();
}
function setTab(alerts) {$('delivery-panel').hidden=alerts;$('alerts-panel').hidden=!alerts;$('delivery-tab').setAttribute('aria-pressed',String(!alerts));$('alerts-tab').setAttribute('aria-pressed',String(alerts));}
function applyScenario() {
  for(const t of trucks){t.blocked=false;t.delaySeconds=0;t.quality='good';}
  if(scenario==='delay')trucks[2].delaySeconds=8*60;
  if(scenario==='crash')trucks[0].blocked=true;
  if(scenario==='quality'){trucks[1].quality='caution';trucks[1].blocked=true;}
  alertTime=new Date();renderAlerts();
  for(const t of trucks)if(map)markers.get(t.id).setIcon(truckIcon(t));
  render();
}
function renderAlerts() {
  const time=alertTime.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  const events=[];
  if(scenario==='delay')events.push(trucks[2].delaySeconds>0 ? ['delayed','Delivery delayed','WT-337 has an eight-minute loading delay. Remaining wait is included in your estimate.'] : ['good','Delay cleared','WT-337 has resumed its delivery round. Your estimate has been updated.']);
  if(scenario==='crash')events.push(['danger','Collision · truck unavailable','WT-104 is stopped following a simulated collision. It is excluded from delivery estimates; another truck is selected when a route is available.']);
  if(scenario==='quality')events.push(['caution','Water sample needs a recheck','WT-218 is on hold. It will not be offered as your next delivery.']);
  const active=events.filter(e=>e[0]!=='good').length;
  $('alert-count').textContent=active;$('alert-count').hidden=!active;
  $('alert-list').innerHTML=events.length?events.map(([cls,title,body])=>`<article class="alert-item ${cls}"><span class="alert-time">DEMO · ${time}</span><h3>${title}</h3><p>${body}</p></article>`).join(''):'<p>No active demo alerts.</p>';
}
function fitMap() {if(map)map.fitBounds([[home.lat,home.lng],[PLANT.lat,PLANT.lng],...trucks.map(t=>[t.lat,t.lng])],{padding:[55,55],maxZoom:15});}
function initialize() {
  trucks=createTrucks();
  for(const t of trucks) {planRoute(router,t,home);advance(t,t.seedSeconds);}
  applyScenario();$('route-message').textContent='Tap the map to change your delivery location.';fitMap();
}
$('delivery-tab').addEventListener('click',()=>setTab(false));$('alerts-tab').addEventListener('click',()=>setTab(true));
$('close-detail').addEventListener('click',()=>$('truck-detail').close());
$('next-details').addEventListener('click',()=>{const t=eligible()[0];if(t)showDetails(t.id)});
$('choose-location').addEventListener('click',()=>{
  if(!map){$('route-message').textContent='Map unavailable. Connect to the internet and refresh to choose a location.';return;}
  document.body.classList.remove('text-view');$('toggle-map').setAttribute('aria-pressed','false');$('toggle-map').textContent='Use text-only view';
  map.invalidateSize();$('map').scrollIntoView({behavior:'smooth',block:'center'});$('route-message').textContent='Tap a road on the map or drag the home pin.';
});
$('toggle-simulation').addEventListener('click',()=>{running=!running;$('toggle-simulation').textContent=running?'Pause':'Resume';render()});
$('scenario').addEventListener('change',e=>{scenario=e.target.value;applyScenario()});
$('reset-demo').addEventListener('click',()=>{if(!router)return;home={...HOME};homeMarker?.setLatLng([home.lat,home.lng]);$('location-name').textContent='Sample home · Inukjuak';initialize()});
$('reset-map').addEventListener('click',fitMap);
$('toggle-map').addEventListener('click',()=>{const on=document.body.classList.toggle('text-view');$('toggle-map').setAttribute('aria-pressed',String(on));$('toggle-map').textContent=on?'Show map':'Use text-only view';map?.invalidateSize()});
function setPreview(phone){document.body.classList.toggle('iphone-preview',phone);$('laptop-view').setAttribute('aria-pressed',String(!phone));$('iphone-view').setAttribute('aria-pressed',String(phone));$('preview-label').textContent=phone?'iPhone preview · 390px':'Laptop preview';requestAnimationFrame(()=>map?.invalidateSize({pan:false}));}
$('laptop-view').addEventListener('click',()=>setPreview(false));$('iphone-view').addEventListener('click',()=>setPreview(true));
function connection(){ $('connection-status').textContent=navigator.onLine?'Demo data · no live dispatch connected':'Offline · local routing continues; map tiles may be unavailable';}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if(!map)document.body.classList.add('text-view');
let last=performance.now(),lastRender=0;
function animate(now){const elapsed=Math.min((now-last)/1000,5);last=now;if(running&&router)for(const t of trucks){const wasDelayed=t.delaySeconds>0;advance(t,elapsed);if(wasDelayed && !t.delaySeconds){renderAlerts();if(map)markers.get(t.id).setIcon(truckIcon(t));}}if(now-lastRender>1000){render();lastRender=now;}requestAnimationFrame(animate);}
render();requestAnimationFrame(animate);
fetch('roads.json').then(r=>{if(!r.ok)throw Error('Road data unavailable');return r.json()}).then(data=>{router=new RoadRouter(data);initialize()}).catch(()=>{$('route-message').textContent='Road data could not load. Start the local server and refresh; no delivery estimate is available.'});
