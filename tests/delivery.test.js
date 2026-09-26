const test=require('node:test'), assert=require('node:assert/strict');
const {RoadRouter,distanceKm}=require('../routing');
const D=require('../delivery');
const router=new RoadRouter(require('../roads.json'));
function fleet(){return D.createTrucks().map(t=>{assert.ok(D.planRoute(router,t,D.HOME));D.advance(t,t.seedSeconds);return t;});}
test('separate rounds originate at the mapped plant and stay on roads',()=>{
 const trucks=fleet();
 for(const t of trucks){assert.ok(router.snap(t).distanceM<.1);assert.ok(D.metrics(t).etaMinutes>5);}
 for(let i=0;i<trucks.length;i++)for(let j=i+1;j<trucks.length;j++)assert.ok(distanceKm([trucks[i].lat,trucks[i].lng],[trucks[j].lat,trucks[j].lng])>.4);
 for(const t of trucks)for(let i=0;i<100;i++){D.advance(t,5);assert.ok(router.snap(t).distanceM<.1);}
});
test('ETA includes loading delays and stop dwell time and matches arrival',()=>{
 for(const t of fleet()){
  const before=D.metrics(t).etaMinutes;t.delaySeconds=480;
  assert.ok(Math.abs(D.metrics(t).etaMinutes-before-8)<1e-8);
  const position=[t.lat,t.lng];D.advance(t,120);assert.deepEqual([t.lat,t.lng],position);
  D.advance(t,D.metrics(t).etaMinutes*60+1);
  assert.equal(D.metrics(t).etaMinutes,0);assert.deepEqual([t.lat,t.lng],t.route.snappedEnd);
 }
});
test('blocked trucks do not move or offer an ETA',()=>{const t=fleet()[0];t.blocked=true;const p=[t.lat,t.lng];D.advance(t,300);assert.deepEqual([t.lat,t.lng],p);assert.equal(D.metrics(t),null);});
test('new destinations reroute from the current road position',()=>{
 const t=fleet()[0],p=[t.lat,t.lng];assert.ok(D.planRoute(router,t,{lat:58.462,lng:-78.101}));assert.ok(distanceKm(p,[t.lat,t.lng])<.00001);
 assert.equal(D.planRoute(router,t,{lat:43.7,lng:-79.4}),false);assert.equal(D.metrics(t),null);
 assert.ok(D.planRoute(router,t,D.HOME));assert.ok(D.metrics(t));
});
