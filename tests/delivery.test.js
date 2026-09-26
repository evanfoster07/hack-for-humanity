const test=require('node:test'),assert=require('node:assert/strict');
const {RoadRouter,distanceKm}=require('../routing');
const D=require('../delivery');
const router=new RoadRouter(require('../roads.json'));
function fleet(){return D.createTrucks().map(t=>{assert.ok(D.planRoute(router,t,D.HOME));return t;});}
test('six trucks start at distinct road positions and shift starts are two hours apart',()=>{
 const trucks=fleet();assert.equal(trucks.length,6);
 assert.equal(new Set(trucks.map(t=>`${t.lat},${t.lng}`)).size,6);
 assert.deepEqual(trucks.map(t=>t.shiftOffsetHours),[0,2,4,6,8,10]);
 assert.ok(new Set(trucks.map(t=>D.activity(t).label)).size>=4);
 for(const t of trucks)assert.ok(router.snap(t).distanceM<.1);
 assert.ok(D.metrics(trucks[5]).etaMinutes>120);
});
test('loading dwell keeps a truck still and begins road movement only after completion',()=>{
 const t=fleet()[0],p=[t.lat,t.lng],seconds=D.activity(t).remainingSeconds;
 D.advance(t,seconds-1);assert.deepEqual([t.lat,t.lng],p);assert.equal(t.jobs[0].stage,'loading');
 D.advance(t,2);assert.equal(t.jobs[0].type,'travel');assert.ok(distanceKm(p,[t.lat,t.lng])>0);
});
test('ETA matches household arrival, then truck pauses eight minutes and returns to plant',()=>{
 for(const t of fleet()){
  const eta=D.metrics(t).etaMinutes;D.advance(t,eta*60+.001);
  assert.ok(t.jobs[0].isHome,`${t.id} must be at household`);assert.equal(D.metrics(t).etaMinutes,0);
  const p=[t.lat,t.lng];D.advance(t,470);assert.deepEqual([t.lat,t.lng],p);
  D.advance(t,11);assert.ok(t.jobs[0].returning);assert.ok(D.metrics(t).etaMinutes>20,'returning empty truck must refill before next delivery');
 }
});
test('repeated rounds and accelerated time follow roads without skipping dwell periods',()=>{
 for(const t of fleet()){
  for(let i=0;i<120;i++){D.advance(t,120);assert.ok(router.snap(t).distanceM<.1);}
  assert.ok(t.completedRounds>0);assert.ok(t.history.some(j=>j.stage==='loading'));assert.ok(t.history.some(j=>j.stage==='delivering'));
 }
});
test('delays and blocked trucks do not move; delay is included in ETA',()=>{
 const t=fleet()[2],eta=D.metrics(t).etaMinutes,p=[t.lat,t.lng];t.delaySeconds=480;
 assert.ok(Math.abs(D.metrics(t).etaMinutes-eta-8)<1e-8);D.advance(t,120);assert.deepEqual([t.lat,t.lng],p);
 t.blocked=true;D.advance(t,300);assert.deepEqual([t.lat,t.lng],p);assert.equal(D.metrics(t),null);
});
test('location change preserves current dwell and road position; invalid pins invent no route',()=>{
 const t=fleet()[1],p=[t.lat,t.lng],elapsed=t.jobs[0].elapsedSeconds;
 assert.ok(D.planRoute(router,t,{lat:58.462,lng:-78.101}));assert.deepEqual([t.lat,t.lng],p);assert.equal(t.jobs[0].elapsedSeconds,elapsed);
 assert.equal(D.planRoute(router,t,{lat:43.7,lng:-79.4}),false);assert.equal(D.metrics(t),null);
 assert.ok(D.planRoute(router,t,D.HOME));
});
test('repinning during delivery finishes old tank before travelling to new household',()=>{
 const t=fleet()[0];D.advance(t,D.metrics(t).etaMinutes*60+.01);assert.ok(t.jobs[0].isHome);
 const p=[t.lat,t.lng],elapsed=t.jobs[0].elapsedSeconds;
 D.planRoute(router,t,{lat:58.462,lng:-78.101});assert.deepEqual([t.lat,t.lng],p);assert.equal(t.jobs[0].elapsedSeconds,elapsed);assert.equal(t.jobs[0].isHome,false);
 assert.ok(D.metrics(t).etaMinutes>8);D.advance(t,60);assert.deepEqual([t.lat,t.lng],p);
});
