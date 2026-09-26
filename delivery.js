/* Delivery simulation uses Hamza's road router; all schedules are illustrative. */
(function(root) {
  const PLANT = { lat:58.4578876, lng:-78.1040299, name:'Inukjuak Water Treatment Plant', osmWay:493122694 };
  const HOME = { lat:58.4479229, lng:-78.1071254 };
  const point = (lat,lng) => ({lat,lng});
  function createTrucks() {
    return [
      {id:'WT-104',round:'South village round',stops:[point(58.4542,-78.1019)],seedSeconds:45,quality:'good',readings:['7.2','0.4 NTU','0.7 mg/L','7.5 °C']},
      {id:'WT-218',round:'Airport road round',stops:[point(58.47214,-78.09372)],seedSeconds:210,quality:'good',readings:['7.0','0.6 NTU','0.5 mg/L','8.1 °C']},
      {id:'WT-337',round:'West village round',stops:[point(58.45943,-78.12272)],seedSeconds:155,quality:'good',readings:['7.4','0.7 NTU','0.6 mg/L','6.9 °C']}
    ].map(t=>({...t,lat:PLANT.lat,lng:PLANT.lng,stopIndex:0,legIndex:0,legProgressKm:0,waitSeconds:0,delaySeconds:0,blocked:false,route:null}));
  }
  function planRoute(router,truck,home) {
    const destinations=[...truck.stops.slice(truck.stopIndex),home];
    let start=point(truck.lat,truck.lng), legs=[], first, last;
    for(let i=0;i<destinations.length;i++) {
      const route=router.route(start,destinations[i]);
      if(!route) {truck.route=null;truck.legIndex=0;truck.legProgressKm=0;return false;}
      first ||= route;last=route;
      const part=route.legs.map(leg=>({...leg}));
      if(i<destinations.length-1 && part.length) {
        part[part.length-1].stopIndex=truck.stopIndex+i+1;
        part[part.length-1].waitSeconds=180;
      }
      legs.push(...part);start=point(...route.snappedEnd);
    }
    truck.route={legs,snappedStart:first.snappedStart,snappedEnd:last.snappedEnd,endSnapMetres:last.endSnapMetres};
    truck.legIndex=0;truck.legProgressKm=0;
    [truck.lat,truck.lng]=first.snappedStart;
    return true;
  }
  function metrics(truck) {
    if(!truck.route || truck.blocked)return null;
    let distanceKm=0, seconds=truck.waitSeconds+truck.delaySeconds;
    for(let i=truck.legIndex;i<truck.route.legs.length;i++) {
      const leg=truck.route.legs[i];
      const km=Math.max(0,leg.distanceKm-(i===truck.legIndex?truck.legProgressKm:0));
      distanceKm+=km;seconds+=km/leg.speedKmh*3600+(leg.waitSeconds||0);
    }
    return {distanceKm,etaMinutes:seconds/60};
  }
  function advance(truck,seconds) {
    if(!truck.route || truck.blocked)return;
    let remaining=seconds;
    for(const key of ['delaySeconds','waitSeconds']) {
      const spent=Math.min(remaining,truck[key]);truck[key]-=spent;remaining-=spent;
    }
    while(remaining>0 && truck.legIndex<truck.route.legs.length) {
      const leg=truck.route.legs[truck.legIndex];
      const needed=Math.max(0,leg.distanceKm-truck.legProgressKm)/leg.speedKmh*3600;
      if(remaining<needed) {truck.legProgressKm+=remaining*leg.speedKmh/3600;remaining=0;}
      else {
        remaining-=needed;truck.legIndex++;truck.legProgressKm=0;
        if(leg.stopIndex!==undefined)truck.stopIndex=leg.stopIndex;
        if(leg.waitSeconds) {const spent=Math.min(remaining,leg.waitSeconds);truck.waitSeconds=leg.waitSeconds-spent;remaining-=spent;}
      }
    }
    const leg=truck.route.legs[truck.legIndex];
    if(leg) {const f=leg.distanceKm?truck.legProgressKm/leg.distanceKm:0;truck.lat=leg.from[0]+(leg.to[0]-leg.from[0])*f;truck.lng=leg.from[1]+(leg.to[1]-leg.from[1])*f;}
    else [truck.lat,truck.lng]=truck.route.snappedEnd;
  }
  const api={PLANT,HOME,createTrucks,planRoute,metrics,advance};
  root.Delivery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
