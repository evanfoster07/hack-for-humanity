/* Six-truck GPS-style simulation. Durations are assumptions, not operator records. */
(function(root) {
  const PLANT = {lat:58.4578876,lng:-78.1040299,name:'Inukjuak Water Treatment Plant',osmWay:493122694};
  const INTAKE = {lat:58+28/60+1.36/3600,lng:-(78+4/60+3.94/3600),name:'Innuksuac River intake'};
  const HOME = {lat:58.4479229,lng:-78.1071254};
  const point=(lat,lng)=>({lat,lng});
  const travel=(to,label,extra={})=>({type:'travel',to:{...to},label,...extra});
  const dwell=(at,stage,minutes,label,extra={})=>({type:'dwell',to:{...at},stage,durationSeconds:minutes*60,elapsedSeconds:0,label,...extra});
  function createTrucks() {
    return [
      {id:'WT-104',round:'South village',stop:point(58.4542,-78.1019),start:'loading',loadMinutes:30,fillMinutes:6,seedSeconds:12*60},
      {id:'WT-218',round:'Airport road',stop:point(58.47214,-78.09372),start:'delivering',loadMinutes:25,fillMinutes:7,seedSeconds:2*60},
      {id:'WT-337',round:'West village',stop:point(58.45943,-78.12272),start:'outbound',loadMinutes:35,fillMinutes:8,seedSeconds:155},
      {id:'WT-406',round:'Central village',stop:point(58.462,-78.101),start:'returning',loadMinutes:30,fillMinutes:6,seedSeconds:35},
      {id:'WT-512',round:'Southwest village',stop:point(58.451,-78.113),start:'delivering',loadMinutes:28,fillMinutes:10,seedSeconds:4*60},
      {id:'WT-629',round:'North village',stop:point(58.468,-78.100),start:'waiting',loadMinutes:32,fillMinutes:9,seedSeconds:0}
    ].map((t,i)=>({...t,shiftOffsetHours:i*2,lat:PLANT.lat,lng:PLANT.lng,quality:'good',readings:['7.2','0.4 NTU','0.7 mg/L','7.5 °C'],jobs:[],home:{...HOME},router:null,delaySeconds:0,blocked:false,stationarySeconds:0,simulationSeconds:0,history:[],completedRounds:0,initialized:false}));
  }
  function deliveryJobs(t,home) {
    return [travel(t.stop,`${t.round} household`),dwell(t.stop,'delivering',t.fillMinutes,`${t.round} household`),travel(home,'Your household',{homeTarget:true}),dwell(home,'delivering',8,'Your household',{isHome:true}),travel(PLANT,PLANT.name,{returning:true})];
  }
  function cycleJobs(t,home) {
    return [dwell(PLANT,'waiting',10,'Plant dispatch queue'),dwell(PLANT,'loading',t.loadMinutes,PLANT.name),...deliveryJobs(t,home)];
  }
  // Compile each planned road leg from its preceding stop; never substitute a straight line.
  function compile(t,jobs) {
    let from=point(t.lat,t.lng);
    for(const job of jobs) {
      if(job.type==='travel') {
        job.route=t.router.route(from,job.to);job.legIndex=0;job.legProgressKm=0;
        if(job.route)from=point(...job.route.snappedEnd);else from={...job.to};
      } else {
        const snap=t.router.snap(job.to);job.position=snap?.position||null;
        from=job.position?point(...job.position):{...job.to};
      }
    }
    return jobs;
  }
  function planRoute(router,t,home) {
    t.router=router;t.home={...home};
    if(!t.initialized) {
      let jobs;
      if(t.start==='loading')jobs=[dwell(PLANT,'loading',t.loadMinutes,PLANT.name),...deliveryJobs(t,home)];
      else if(t.start==='outbound')jobs=deliveryJobs(t,home);
      else if(t.start==='returning') {t.lat=t.stop.lat;t.lng=t.stop.lng;jobs=[travel(PLANT,PLANT.name,{returning:true}),...cycleJobs(t,home)];}
      else if(t.start==='waiting') {t.lat=t.stop.lat;t.lng=t.stop.lng;jobs=[dwell(t.stop,'waiting',120,'North village staging stop'),travel(PLANT,PLANT.name,{returning:true}),...cycleJobs(t,home)];}
      else {t.lat=t.stop.lat;t.lng=t.stop.lng;jobs=[dwell(t.stop,'delivering',t.fillMinutes,`${t.round} household`),travel(home,'Your household',{homeTarget:true}),dwell(home,'delivering',8,'Your household',{isHome:true}),travel(PLANT,PLANT.name,{returning:true})];}
      const snap=router.snap(t);if(snap)[t.lat,t.lng]=snap.position;
      t.jobs=compile(t,jobs);t.initialized=true;
      advance(t,t.seedSeconds);
    } else {
      // Preserve an ongoing dwell at the previous household before visiting the new pin.
      const jobs=t.jobs.map(j=>({...j,to:{...j.to}}));
      const current=jobs[0];
      if(current?.isHome) {
        const changed=Math.abs(current.to.lat-home.lat)+Math.abs(current.to.lng-home.lng)>1e-8;
        if(changed){current.isHome=false;current.label='Previous household';jobs.splice(1,0,travel(home,'Your household',{homeTarget:true}),dwell(home,'delivering',8,'Your household',{isHome:true}));}
      }
      for(let i=0;i<jobs.length;i++) {
        const j=jobs[i];if(j.homeTarget || (j.isHome && i>0))j.to={...home};
      }
      t.jobs=compile(t,jobs);
    }
    return metrics(t)!==null;
  }
  function remainingTravel(job) {
    if(!job.route)return null;
    let distanceKm=0,seconds=0;
    for(let i=job.legIndex;i<job.route.legs.length;i++) {
      const leg=job.route.legs[i],km=Math.max(0,leg.distanceKm-(i===job.legIndex?job.legProgressKm:0));
      distanceKm+=km;seconds+=km/leg.speedKmh*3600;
    }
    return {distanceKm,seconds};
  }
  function metrics(t) {
    if(!t.initialized || t.blocked)return null;
    let jobs=t.jobs;
    // A returning truck is eligible on its next load, not as an empty truck.
    if(!jobs.some(j=>j.isHome)) {
      const last=jobs.at(-1),end=last?.route?.snappedEnd||last?.position||[t.lat,t.lng];
      jobs=[...jobs,...compile({...t,lat:end[0],lng:end[1]},cycleJobs(t,t.home))];
    }
    let distanceKm=0,seconds=t.delaySeconds;
    for(const job of jobs) {
      if(job.isHome) {
        if(!job.position)return null;
        return {distanceKm,etaMinutes:seconds/60,delivering:job===t.jobs[0],endSnapMetres:t.router.snap(t.home)?.distanceM||0};
      }
      if(job.type==='travel') {const m=remainingTravel(job);if(!m)return null;distanceKm+=m.distanceKm;seconds+=m.seconds;}
      else {if(!job.position)return null;seconds+=Math.max(0,job.durationSeconds-job.elapsedSeconds);}
    }
    return null;
  }
  function move(t,job,seconds) {
    let remaining=seconds;
    while(remaining>0 && job.legIndex<job.route.legs.length) {
      const leg=job.route.legs[job.legIndex],needed=Math.max(0,leg.distanceKm-job.legProgressKm)/leg.speedKmh*3600;
      if(remaining<needed){job.legProgressKm+=remaining*leg.speedKmh/3600;remaining=0;}
      else {remaining-=needed;job.legIndex++;job.legProgressKm=0;}
    }
    const leg=job.route.legs[job.legIndex];
    if(leg){const f=leg.distanceKm?job.legProgressKm/leg.distanceKm:0;t.lat=leg.from[0]+(leg.to[0]-leg.from[0])*f;t.lng=leg.from[1]+(leg.to[1]-leg.from[1])*f;}
    else [t.lat,t.lng]=job.route.snappedEnd;
    return remaining;
  }
  function advance(t,seconds) {
    if(!t.initialized || seconds<=0)return;
    t.simulationSeconds+=seconds;
    if(t.blocked){t.stationarySeconds+=seconds;return;}
    let remaining=seconds;
    const delay=Math.min(remaining,t.delaySeconds);t.delaySeconds-=delay;remaining-=delay;t.stationarySeconds+=delay;
    while(remaining>0) {
      if(!t.jobs.length){t.completedRounds++;t.jobs=compile(t,cycleJobs(t,t.home));}
      const job=t.jobs[0];
      if(job.type==='travel') {
        if(!job.route){t.stationarySeconds+=remaining;break;}
        const before=remaining;remaining=move(t,job,remaining);
        if(before>remaining)t.stationarySeconds=0;
        if(job.legIndex<job.route.legs.length)break;
      } else {
        if(!job.position){t.stationarySeconds+=remaining;break;}
        const spent=Math.min(remaining,Math.max(0,job.durationSeconds-job.elapsedSeconds));
        job.elapsedSeconds+=spent;t.stationarySeconds+=spent;remaining-=spent;
        if(job.elapsedSeconds<job.durationSeconds)break;
      }
      t.history.push({label:job.label,stage:job.stage||'travel',durationSeconds:job.durationSeconds||null});
      t.history=t.history.slice(-8);t.jobs.shift();
    }
  }
  function activity(t) {
    const job=t.jobs[0];
    if(!job)return {label:'Loading route',place:'Inukjuak',remainingSeconds:null,elapsedSeconds:0};
    if(t.blocked)return {label:t.quality==='caution'?'Quality hold':'Out of service',place:job.label,remainingSeconds:null,elapsedSeconds:t.stationarySeconds};
    if(t.delaySeconds)return {label:'Delayed · stopped',place:job.label,remainingSeconds:t.delaySeconds,elapsedSeconds:t.stationarySeconds};
    if(job.type==='travel')return {label:!job.route?'No road route':job.returning?'Returning to plant':'Going to household tank',place:job.label,remainingSeconds:remainingTravel(job)?.seconds??null,elapsedSeconds:0};
    return {label:job.stage==='loading'?'Loading treated water · inferred':job.stage==='delivering'?'Filling household tank · inferred':'Waiting for dispatch · planned',place:job.label,remainingSeconds:job.durationSeconds-job.elapsedSeconds,elapsedSeconds:job.elapsedSeconds};
  }
  function remainingCoordinates(t) {
    const job=t.jobs[0];return job?.type==='travel'&&job.route?[[t.lat,t.lng],...job.route.legs.slice(job.legIndex).map(l=>l.to)]:[];
  }
  const api={PLANT,INTAKE,HOME,createTrucks,planRoute,metrics,advance,activity,remainingCoordinates};
  root.Delivery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
