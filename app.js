const {PLANT,INTAKE,HOME,createTrucks,planRoute,metrics,advance,activity,projectedCoordinates}=Delivery;
const $=id=>document.getElementById(id);
let trucks=createTrucks(),home={...HOME},router=null,selectedId=null,running=true,scenario='normal',alertTime=new Date();
let offlineDemo=false,offlineActive=false,speed=1,demoTime=Date.now(),initialDemoTime=demoTime,lastOnlineTime=demoTime,onlineFleet=null,offlineSnapshot=null;
function duration(seconds){const mins=Math.max(0,Math.ceil(seconds/60));return mins>=60?`${Math.floor(mins/60)}h ${mins%60}m`:`${mins} min`;}
function elapsedDuration(seconds){return seconds<60?`${Math.max(0,Math.floor(seconds))} sec`:duration(Math.floor(seconds/60)*60);}
function timeLabel(ms){return new Date(ms).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
const map=typeof L!=='undefined'?L.map('map',{zoomControl:false}).setView([58.46,-78.105],14):null;
const markers=new Map(), routeLines=new Map();
let homeMarker;
let locationEditing=false;
if(map) {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  homeMarker=L.marker([home.lat,home.lng],{draggable:false,icon:L.divIcon({className:'home-marker',html:'⌂',iconSize:[34,34]})}).addTo(map).bindTooltip('Your delivery location');
  L.marker([PLANT.lat,PLANT.lng],{icon:L.divIcon({className:'plant-marker',html:'◆',iconSize:[28,28]})}).addTo(map).bindPopup('<strong>Inukjuak Water Treatment Plant</strong><br>Real mapped facility · simulated departures');
  L.marker([INTAKE.lat,INTAKE.lng],{icon:L.divIcon({className:'intake-marker',html:'≈',iconSize:[28,28]})}).addTo(map).bindPopup('<strong>Innuksuac River intake</strong><br>Raw water is pumped through a 3 km heated pipeline to the treatment plant. No truck stop or live process timing.');
  for(const truck of trucks) {
    const marker=L.marker([PLANT.lat,PLANT.lng],{icon:truckIcon(truck)}).addTo(map).bindTooltip(truck.id);
    marker.on('click',()=>showDetails(truck.id));markers.set(truck.id,marker);
    routeLines.set(truck.id,L.polyline([],{weight:3,opacity:.4,color:'#12718a'}).addTo(map));
  }
  map.on('click',e=>setHome(e.latlng.lat,e.latlng.lng));
  homeMarker.on('dragend',()=>{const p=homeMarker.getLatLng();setHome(p.lat,p.lng)});
}
function truckIcon(t) {return L.divIcon({className:`truck-marker ${t.assigned?'assigned-truck':''} ${t.blocked?'danger':t.delaySeconds?'caution':''}`,html:'🚚',iconSize:[38,38]});}
function distance(km) {return km<1?`${Math.round(km*1000)} m`:`${km.toFixed(1)} km`;}
function eta(t) {const m=metrics(t);return !m?'Unavailable':m.delivering?(offlineActive?'Predicted at stop':'Filling tank'):duration(m.etaMinutes*60);}
function eligible() {return trucks.filter(t=>t.assigned&&metrics(t)&&t.quality==='good');}
function assignDelivery() {
  if(offlineActive||!router)return;
  const current=trucks.find(t=>t.assigned);
  if(current&&metrics(current)&&current.quality==='good')return;
  const candidates=trucks.filter(t=>!t.blocked&&t.quality==='good').map(t=>{
    const candidate=cloneFleet([t])[0];candidate.assigned=true;planRoute(router,candidate,home);
    return {truck:t,eta:metrics(candidate)?.etaMinutes??Infinity};
  }).filter(c=>Number.isFinite(c.eta)).sort((a,b)=>a.eta-b.eta);
  const selected=candidates[0]?.truck;
  for(const t of trucks){const assigned=t===selected;if(t.assigned!==assigned){t.assigned=assigned;planRoute(router,t,home);}}
}
function nearbyDistance(t){return router?.route(t,home)?.distanceKm??Infinity;}

function quality(t) {return t?.quality==='good'?['quality-safe','Safe']:t?['quality-unsafe','Unsafe']:['unknown','Not confirmed'];}
function setQuality(el,t) {
  const [cls,label]=quality(t);
  el.className=`quality-indicator ${cls}`;
  el.innerHTML=`<div class="quality-title"><span class="status-dot ${offlineActive?'offline':''}" aria-hidden="true"></span><strong>${label}</strong><span class="quality-demo">SIMULATED</span></div><small>${offlineActive?`Offline — based on the last update at ${timeLabel(lastOnlineTime)}. Current quality is unconfirmed.`:'Demo status only — not a drinking-water safety assessment.'}</small>`;
}
function render() {
  const next=eligible()[0];
  $('next-eta').textContent=next?eta(next):'No estimate';
  if(next) {
    const minutes=metrics(next).etaMinutes;
    const date=new Date(demoTime+minutes*60000);
    $('arrival-window').textContent=metrics(next).delivering?(offlineActive?'Predicted arrival · not confirmed':'At your roadside stop · filling inferred'):`${offlineActive?'Predicted around':'Around'} ${timeLabel(date.getTime())}${running?'':' · paused'}`;
    $('next-truck').textContent=`${next.id} · Your assigned truck · ${activity(next).label}${next.delaySeconds?' · delay included':''}`;
  } else {$('arrival-window').textContent='Choose a pin near a local road';$('next-truck').textContent='No available truck can reach this destination';}
  setQuality($('delivery-quality'),next);$('next-details').disabled=!next;
  const list=$('truck-list');
  const sorted=trucks.map(t=>({truck:t,km:nearbyDistance(t)})).sort((a,b)=>a.km-b.km).map(item=>item.truck);
  // Keep existing buttons stable while the simulation updates their text.
  for(const t of sorted) {
    let button=document.getElementById(`truck-${t.id}`);
    if(!button) {button=document.createElement('button');button.id=`truck-${t.id}`;button.type='button';button.addEventListener('click',()=>showDetails(t.id));}
    button.className=`truck-card${t.id===selectedId?' selected':''}`;
    const m=metrics(t),a=activity(t),tag=t.blocked?'On hold':t.delaySeconds?'Delayed':t.jobs[0]?.type==='dwell'?'Stopped':'Moving';
    button.innerHTML=`<div class="truck-card-top"><strong>🚚 ${t.id}${t.assigned?' · Yours':''}</strong><span class="chip ${t.blocked?'danger':t.delaySeconds||t.quality==='caution'?'caution':'good'}">${offlineActive?'~ ':''}${tag}</span></div><div class="truck-card-bottom"><span>${a.label.replace(' · inferred','').replace(' · planned','')}</span><strong>${!t.assigned?'Other household':t.quality==='caution'?'On hold':eta(t)}${t.assigned&&m&&!m.delivering&&t.quality!=='caution'?' to you':''}</strong></div>`;
    list.appendChild(button);
    markers.get(t.id)?.setLatLng([t.lat,t.lng]);
    const coords=projectedCoordinates(t,offlineActive,offlineSnapshot?.find(report=>report.id===t.id));
    const iconState=`${t.assigned}-${t.blocked}-${!!t.delaySeconds}-${t.jobs[0]?.type}`;
    if(map && t.iconState!==iconState){markers.get(t.id).setIcon(truckIcon(t)).bindTooltip(`${t.id}${t.assigned?' · Your delivery':''}`);t.iconState=iconState;}
    routeLines.get(t.id)?.setLatLngs(coords).setStyle({opacity:.9,weight:5,dashArray:offlineActive?'8 8':null});
  }
  renderConnection();
  if($('truck-detail').open)renderDetails();
}
function renderDetails() {
  const t=trucks.find(t=>t.id===selectedId);if(!t)return;
  $('detail-title').textContent=t.id;
  const a=activity(t),job=t.jobs[0];
  $('detail-activity').textContent=(offlineActive?'Predicted: ':'')+a.label;
  $('detail-place').textContent=job?.type==='travel'?`Heading to ${a.place}`:`At ${a.place}`;
  $('detail-elapsed').textContent=`${offlineActive?'Estimated stopped':'Stopped'}: ${elapsedDuration(t.stationarySeconds)}`;
  $('detail-remaining').textContent=a.remainingSeconds===null?'No completion estimate':`${duration(a.remainingSeconds)} ${job?.type==='travel'?'to next stop':'remaining (assumed)'}`;
  $('detail-provenance').textContent=offlineActive?`Projected from the last simulated GPS update at ${timeLabel(lastOnlineTime)} · ${elapsedDuration((demoTime-lastOnlineTime)/1000)} old. Arrivals and work are unconfirmed.`:'Activity inferred from simulated GPS position and time stopped; no loading or flow sensor is connected.';
  $('detail-shift').textContent=`Demo shift start: ${timeLabel(initialDemoTime-(t.shiftOffsetHours*3600+1800)*1000)} · starts staggered 2 hours apart`;
  $('detail-arrival').textContent=t.quality==='caution'?'Unsafe demo sample · delivery on hold':`${t.assigned?'Assigned to your household':'Serving another household'} · ${eta(t)}${t.delaySeconds?' · delay included':''}`;
  setQuality($('detail-quality'),t);
  $('detail-action').textContent=t.quality==='good'?'Safe is a simulated sample status, not a conclusion from these sensor readings. Household tank and tap safety are not confirmed.':'Unsafe is a simulated sample status. This truck is held for a recheck and is not assigned to your delivery.';
  $('readings').innerHTML=['pH','Turbidity','Chlorine','Temperature'].map((label,i)=>`<div><span>${label}</span><strong>${t.readings[i]}</strong></div>`).join('');
  $('detail-route').textContent=`${PLANT.name} → ${t.round} household → ${t.assigned?'your tank':'community tank'} → plant. Loading: ${t.loadMinutes} min; round stop: ${t.fillMinutes} min; your tank: 8 min. All dwell durations are assumptions. ${metrics(t)?distance(metrics(t).distanceKm)+' road travel before its assigned delivery.':''}`;
}
function showDetails(id) {selectedId=id;renderDetails();render();$('truck-detail').showModal();}
function setLocationEditing(enabled) {
  locationEditing=enabled;
  if(enabled)homeMarker?.dragging?.enable();else homeMarker?.dragging?.disable();
  $('choose-location').textContent=enabled?'Cancel location change':'Choose on map';
  $('choose-location').setAttribute('aria-pressed',String(enabled));
  $('map-hint').textContent=enabled?'Choose once: tap the map or drag your home pin':'Home locked · use “Choose on map” to change it';
  document.body.classList.toggle('choosing-location',enabled);
}
function setHome(lat,lng) {
  if(offlineActive){homeMarker?.setLatLng([home.lat,home.lng]);$('route-message').textContent='Reconnect to change your delivery pin. Offline forecasts follow the last known route.';return;}
  if(!locationEditing){homeMarker?.setLatLng([home.lat,home.lng]);return;}
  if(!router){$('route-message').textContent='Roads are still loading. Please try again.';return;}
  setLocationEditing(false);
  home={lat,lng};homeMarker?.setLatLng([lat,lng]);
  $('location-name').textContent='Your selected location';
  for(const t of trucks)planRoute(router,t,home);
  assignDelivery();
  const route=eligible().map(metrics).find(Boolean);
  $('route-message').textContent=route?`Home locked${route.endSnapMetres>8?` · delivery stops ${Math.round(route.endSnapMetres)} m away at the road`:''}.`:'Home locked, but no road access here. Use Choose on map to select a location nearer a road.';
  render();
}
function setTab(alerts) {$('delivery-panel').hidden=alerts;$('alerts-panel').hidden=!alerts;$('delivery-tab').setAttribute('aria-pressed',String(!alerts));$('alerts-tab').setAttribute('aria-pressed',String(alerts));}
function applyScenario() {
  if(offlineActive)return;
  for(const t of trucks){t.blocked=false;t.delaySeconds=0;t.quality='good';}
  if(scenario==='delay')trucks[2].delaySeconds=8*60;
  if(scenario==='crash')trucks[0].blocked=true;
  if(scenario==='quality'){trucks[1].quality='caution';trucks[1].blocked=true;}
  assignDelivery();
  alertTime=new Date(demoTime);renderAlerts();
  for(const t of trucks)if(map)markers.get(t.id).setIcon(truckIcon(t));
  render();
}
function renderAlerts() {
  const time=alertTime.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  const events=[];
  if(scenario==='delay')events.push(trucks[2].delaySeconds>0 ? ['delayed','Delivery delayed','WT-337 has an eight-minute service delay. Remaining wait is included in your estimate.'] : ['good','Delay cleared','WT-337 has resumed its delivery round. Your estimate has been updated.']);
  if(scenario==='crash')events.push(['danger','Collision · truck unavailable','WT-104 is stopped following a simulated collision. It is excluded from delivery estimates; another truck is selected when a route is available.']);
  if(scenario==='quality')events.push(['caution','Water sample needs a recheck','WT-218 is on hold. It will not be offered as your next delivery.']);
  const active=events.filter(e=>e[0]!=='good').length;
  $('alert-count').textContent=active;$('alert-count').hidden=!active;
  $('alert-list').innerHTML=events.length?events.map(([cls,title,body])=>`<article class="alert-item ${cls}"><span class="alert-time">DEMO · ${time}</span><h3>${title}</h3><p>${body}</p></article>`).join(''):'<p>No active demo alerts.</p>';
}
function fitMap() {if(map)map.fitBounds([[home.lat,home.lng],[PLANT.lat,PLANT.lng],[INTAKE.lat,INTAKE.lng],...trucks.map(t=>[t.lat,t.lng])],{padding:[55,55],maxZoom:15});}
function initialize() {
  trucks=createTrucks();
  for(const t of trucks)planRoute(router,t,home);
  initialDemoTime=demoTime;lastOnlineTime=demoTime;
  setLocationEditing(false);applyScenario();$('route-message').textContent='Home locked. Use Choose on map to select a different location.';fitMap();
}
$('delivery-tab').addEventListener('click',()=>setTab(false));$('alerts-tab').addEventListener('click',()=>setTab(true));
$('close-detail').addEventListener('click',()=>$('truck-detail').close());
$('next-details').addEventListener('click',()=>{const t=eligible()[0];if(t)showDetails(t.id)});
$('choose-location').addEventListener('click',()=>{
  if(locationEditing){setLocationEditing(false);$('route-message').textContent='Location change cancelled. Home remains locked.';return;}
  if(offlineActive){$('route-message').textContent='Reconnect before changing your delivery location.';return;}
  if(!router){$('route-message').textContent='Roads are still loading. Please try again.';return;}
  if(!map){$('route-message').textContent='Map unavailable. Connect to the internet and refresh to choose a location.';return;}
  document.body.classList.remove('text-view');$('toggle-map').setAttribute('aria-pressed','false');$('toggle-map').textContent='Use text-only view';
  setLocationEditing(true);
  map.invalidateSize();$('map').scrollIntoView({behavior:'smooth',block:'center'});$('route-message').textContent='Tap once on the map or drag the home pin. Your selection will lock automatically.';
});
$('toggle-simulation').addEventListener('click',()=>{running=!running;$('toggle-simulation').textContent=running?'Pause':'Resume';render()});
$('scenario').addEventListener('change',e=>{scenario=e.target.value;applyScenario()});
$('reset-demo').addEventListener('click',()=>{if(!router||offlineActive)return;initialize()});
$('reset-map').addEventListener('click',fitMap);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&locationEditing){setLocationEditing(false);$('route-message').textContent='Location change cancelled. Home remains locked.';}});
$('toggle-map').addEventListener('click',()=>{const on=document.body.classList.toggle('text-view');$('toggle-map').setAttribute('aria-pressed',String(on));$('toggle-map').textContent=on?'Show map':'Use text-only view';map?.invalidateSize()});
function setPreview(phone){document.body.classList.toggle('iphone-preview',phone);$('laptop-view').setAttribute('aria-pressed',String(!phone));$('iphone-view').setAttribute('aria-pressed',String(phone));$('preview-label').textContent=phone?'iPhone preview · 390px':'Laptop preview';requestAnimationFrame(()=>map?.invalidateSize({pan:false}));}
$('laptop-view').addEventListener('click',()=>setPreview(false));$('iphone-view').addEventListener('click',()=>setPreview(true));
function cloneFleet(fleet){return fleet.map(t=>{const {router:unused,...data}=t;return {...JSON.parse(JSON.stringify(data)),router};});}
function setOfflineMode(){
  if(!router)return;
  const offline=offlineDemo||!navigator.onLine;
  if(offline===offlineActive)return;
  offlineActive=offline;
  setLocationEditing(false);
  if(offline){lastOnlineTime=demoTime;offlineSnapshot=cloneFleet(trucks);onlineFleet=trucks;trucks=cloneFleet(offlineSnapshot);}
  else {if(onlineFleet)trucks=onlineFleet;onlineFleet=null;offlineSnapshot=null;for(const t of trucks)if(router)planRoute(router,t,home);lastOnlineTime=demoTime;assignDelivery();renderAlerts();}
  document.body.classList.toggle('offline-demo',offline);
  $('scenario').disabled=offline;$('reset-demo').disabled=offline;
  render();
}
function renderConnection(){
  $('offline-demo').setAttribute('aria-pressed',String(offlineActive));
  $('offline-demo').setAttribute('aria-label',offlineActive?'Switch to online demo':'Switch to offline demo');
  $('offline-demo').innerHTML=`<span class="status-dot ${offlineActive?'offline':''}" aria-hidden="true"></span>${offlineActive?'Offline':'Online'}`;
  $('data-mode').innerHTML=`<span class="status-dot ${offlineActive?'offline':''}" aria-hidden="true"></span>${offlineActive?'Offline · last update':'Simulated GPS · online'}`;
  $('map-key').textContent=offlineActive?'Dashed path = last-update estimate for your truck only.':'Highlighted path = your assigned truck only.';
  $('demo-clock').textContent=`${timeLabel(demoTime)} · ${speed}×`;
  $('prediction-status').textContent=offlineActive?`Last simulated GPS: ${timeLabel(lastOnlineTime)} (${elapsedDuration((demoTime-lastOnlineTime)/1000)} ago). Positions and timings are projected, not confirmed.`:'Simulated GPS updates · activities inferred from position and time stopped.';
  $('connection-status').textContent=offlineActive?'No new GPS received. Forecast follows the last known route and assumed stop durations.':'No live trackers connected. The six-truck fleet and GPS data are simulated.';
}
$('offline-demo').addEventListener('click',()=>{offlineDemo=!offlineDemo;setOfflineMode();renderConnection();});
$('bluetooth-sync').addEventListener('click',()=>{$('bluetooth-note').textContent='Demo only: this would request the most recent timestamped truck data from a nearby device. Bluetooth is not connected; no data was fetched.';});
$('simulation-speed').addEventListener('change',e=>{speed=Number(e.target.value);renderConnection();});
window.addEventListener('online',setOfflineMode);window.addEventListener('offline',setOfflineMode);
if(!map)document.body.classList.add('text-view');
let last=performance.now(),lastRender=0;
function animate(now){
  const elapsed=Math.min((now-last)/1000,5)*speed;last=now;
  if(running&&router){
    demoTime+=elapsed*1000;
    if(!offlineActive)lastOnlineTime=demoTime;
    for(const t of trucks){const wasDelayed=t.delaySeconds>0;advance(t,elapsed);if(wasDelayed&&!t.delaySeconds&&!offlineActive)renderAlerts();}
    if(offlineActive&&onlineFleet)for(const t of onlineFleet)advance(t,elapsed);
  }
  if(now-lastRender>500){render();lastRender=now;}
  requestAnimationFrame(animate);
}
render();requestAnimationFrame(animate);
fetch('roads.json').then(r=>{if(!r.ok)throw Error('Road data unavailable');return r.json()}).then(data=>{router=new RoadRouter(data);initialize();$('offline-demo').disabled=false;setOfflineMode();}).catch(()=>{$('route-message').textContent='Road data could not load. Start the local server and refresh; no delivery estimate is available.'});
