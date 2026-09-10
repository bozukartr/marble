// Run with Node 22+: node tests/regression.cjs
// Uses the shipped HTML and actual Three/Cannon mathematics. WebGL is stubbed;
// this validates physics, projection and UI flow, not GPU rendering or device FPS.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,3);assert(!/<(?:script|img|link)\b[^>]*(?:src|href)=/i.test(html),'Offline file has no external assets');
vm.runInThisContext(scripts[0]);vm.runInThisContext(scripts[1]);
const split=scripts[2].indexOf("(()=>{'use strict';");assert(split>0);
vm.runInThisContext(scripts[2].slice(0,split)+'\nglobalThis.RP=RacePhysics');
// Regress the old bug: crossing z=finish outside the track must never win.
const t=RP.build(),m=RP.createRace(t,8,12345);const outside=m[0];outside.body.position.set(RP.center(355)+30,RP.height(355),355);RP.update(m,RP.STEP);assert.equal(outside.finished,null);assert(outside.dnf);
// Every sloping curb follows its actual segment grade, closing underside gaps.
for(let i=0;i<t.samples.length-1;i++){const a=t.samples[i].l,b=t.samples[i+1].l,w=t.walls[i*2],axis=w.q.vmult(new CANNON.Vec3(0,0,1));const d=new CANNON.Vec3(b.x-a.x,b.y-a.y,b.z-a.z);d.normalize();assert(axis.dot(d)>.99999);}
assert.equal(t.dynamic.length,5);const positions=t.dynamic.map(d=>d.body.position.clone()),quats=t.dynamic.map(d=>d.body.quaternion.clone());RP.drive(t,0);t.world.step(RP.STEP);assert(t.dynamic.some((d,i)=>d.body.position.distanceTo(positions[i])>0));assert(t.dynamic.some((d,i)=>Math.abs(d.body.quaternion.w-quats[i].w)>1e-6));
const ctx2d={fillRect(){},fillText(){}};
class El{constructor(){this.style={setProperty(){}};this.children=[];this.value='';this.classList={toggle(){},add(){},remove(){}};}set innerHTML(v){this.html=v;if(v.includes('class="rank"'))this.children=[new El(),new El(),new El(),new El()]}get innerHTML(){return this.html}appendChild(e){this.children.push(e)}setAttribute(){}addEventListener(){}focus(){}getContext(){return ctx2d}}
const elements={};global.document={hidden:false,getElementById(id){return elements[id]??(elements[id]=new El())},createElement(){return new El()},addEventListener(){}};
global.window=global;global.devicePixelRatio=2;global.innerWidth=390;global.innerHeight=844;global.addEventListener=()=>{};
Object.defineProperty(global,'crypto',{value:{getRandomValues(a){a[0]=849302;return a}},configurable:true});
let callback,projectionFrames=0;global.requestAnimationFrame=fn=>{callback=fn};
THREE.WebGLRenderer=class{constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setPixelRatio(){}setSize(){}render(scene,camera){const d=global.marbleDiagnostics;if(d?.state==='race'&&d.simTime>1){camera.updateMatrixWorld();const focus=new THREE.Vector3(...d.camera.focus);assert(camera.position.y-focus.y>12,'Camera stays above the leader');focus.project(camera);assert(Math.abs(focus.x)<.9&&Math.abs(focus.y)<.9,'Leader stays in frame: '+JSON.stringify({time:d.simTime,projection:focus.toArray(),camera:d.camera}));projectionFrames++;}}};
document.getElementById('count').value='8';document.getElementById('quality').value='auto';
vm.runInThisContext(scripts[2].slice(split));let now=0;function advance(n){for(let i=0;i<n;i++){now+=1000/60;callback(now)}}
assert.equal(marbleDiagnostics.state,'menu');document.getElementById('start').onclick();advance(260);assert.equal(marbleDiagnostics.state,'race');document.getElementById('pause').onclick();const time=marbleDiagnostics.simTime;advance(60);assert.equal(marbleDiagnostics.simTime,time);document.getElementById('pause').onclick();
for(let i=0;i<9000&&marbleDiagnostics.state!=='results';i++)advance(1);assert.equal(marbleDiagnostics.state,'results');const result=marbleDiagnostics;assert(result.results.some(m=>m.finished!==null));assert(result.results[0].finished<50,'Faster race than original 55s baseline');assert(projectionFrames>1000);console.log(JSON.stringify({winner:result.results[0].name,time:result.results[0].finished,finished:result.results.filter(m=>m.finished!==null).length,projectionFrames,dynamicObstacles:result.dynamicObstacles}));
const bodies=result.bodies;document.getElementById('again').onclick();assert.equal(marbleDiagnostics.state,'countdown');assert.equal(marbleDiagnostics.bodies,bodies);advance(240);document.getElementById('exit').onclick();assert.equal(marbleDiagnostics.state,'menu');assert.equal(marbleDiagnostics.bodies,bodies);
console.log('PASS: inline syntax/runtime, finish boundary, graded curbs, motor motion, full race, mobile camera framing, pause/resume, results, replay and stable body count. GPU/browser not tested.');
