const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../delivery'),{RoadRouter}=require('../routing');
async function app(){
 const elements=new Map();
 function element(){const classes=new Set();return {textContent:'',innerHTML:'',handlers:{},disabled:false,children:[],attributes:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){if(on===undefined)on=!classes.has(c);on?classes.add(c):classes.delete(c);return on;}},set id(v){this._id=v;elements.set(v,this)},get id(){return this._id},appendChild(c){if(!this.children.includes(c))this.children.push(c)},addEventListener(n,f){this.handlers[n]=f},setAttribute(k,v){this.attributes[k]=v},showModal(){this.open=true},close(){this.open=false},scrollIntoView(){}};}
 for(const m of fs.readFileSync('index.html','utf8').matchAll(/id="([^"]+)"/g))elements.set(m[1],element());
 const ctx={Delivery:D,RoadRouter,document:{getElementById:id=>elements.get(id),createElement:element,body:element()},navigator:{onLine:true},window:{addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('roads.json','utf8'))})};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);await new Promise(setImmediate);
 return {elements,run:code=>vm.runInContext(code,ctx)};
}
test('offline demo projects from an immutable last-online snapshot, then reconnects',async()=>{
 const {elements:e,run}=await app();assert.equal(e.get('truck-list').children.length,6);
 e.get('offline-demo').handlers.click();assert.equal(run('offlineActive'),true);assert.equal(e.get('scenario').disabled,true);
 const snapshot=run('JSON.stringify(offlineSnapshot.map(t=>[t.lat,t.lng,t.stationarySeconds]))');
 const original=run('trucks[0].stationarySeconds');run('animate(1000)');
 assert.equal(run('trucks[0].stationarySeconds'),original+1);
 assert.equal(run('JSON.stringify(offlineSnapshot.map(t=>[t.lat,t.lng,t.stationarySeconds]))'),snapshot);
 assert.match(e.get('prediction-status').textContent,/projected, not confirmed/);
 assert.equal(run('demoTime-lastOnlineTime'),1000);
 e.get('offline-demo').handlers.click();assert.equal(run('offlineActive'),false);assert.equal(run('offlineSnapshot'),null);assert.equal(e.get('scenario').disabled,false);
});
test('Bluetooth placeholder makes no transfer and does not refresh the GPS timestamp',async()=>{
 const {elements:e,run}=await app();e.get('offline-demo').handlers.click();const before=run('lastOnlineTime');
 e.get('bluetooth-sync').handlers.click();assert.match(e.get('bluetooth-note').textContent,/no data was fetched/);assert.equal(run('lastOnlineTime'),before);assert.equal(run('offlineActive'),true);
});
test('offline mode keeps the saved destination and accelerated clock respects pause',async()=>{
 const {elements:e,run}=await app();const home=run('JSON.stringify(home)');
 e.get('offline-demo').handlers.click();run('setHome(58.462,-78.101)');assert.equal(run('JSON.stringify(home)'),home);
 assert.match(e.get('route-message').textContent,/Reconnect/);
 e.get('simulation-speed').handlers.change({target:{value:'60'}});
 const before=run('demoTime');run('animate(1000)');assert.equal(run('demoTime'),before+60000);
 e.get('toggle-simulation').handlers.click();run('animate(2000)');assert.equal(run('demoTime'),before+60000);
});
