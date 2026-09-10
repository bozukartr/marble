// Node 22+. Actual shipped physics, renderer and UI; browser/codec APIs are stubbed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,3);assert(!/<(?:script|img|link)\b[^>]*(?:src|href)=/i.test(html),'Offline assets');
vm.runInThisContext(scripts[0]+'\nglobalThis.P=MatchPhysics;');
vm.runInThisContext(scripts[1]+'\nglobalThis.V=MatchVideo;');
const {R,BALL,STEP}=P;assert.equal(P.DURATION,60);assert(P.SPEED>=240);
const closed=P.create(1);Object.assign(closed.balls[0],{x:-R-2,y:0,vx:-P.SPEED,vy:0});P.tick(closed);assert.equal(closed.score[0],0);assert(Math.hypot(closed.balls[0].x,closed.balls[0].y)<=R-BALL+.01);assert(closed.balls[0].vx>0);
const shot=P.create(7);shot.angle=0;Object.assign(shot.balls[0],{x:R-15,y:0,vx:P.SPEED,vy:0});for(let i=0;i<30;i++)P.tick(shot);assert.equal(shot.score[0],1);assert.equal(shot.events.length,1);for(let i=0;i<85;i++)P.tick(shot);assert.equal(shot.score[0],1);assert(shot.balls[0].cooldown<=0);
const post=P.create(8);post.angle=0;const a=P.HALF-.025;Object.assign(post.balls[0],{x:(R-BALL-1)*Math.cos(a),y:(R-BALL-1)*Math.sin(a),vx:P.SPEED*Math.cos(a),vy:P.SPEED*Math.sin(a)});for(let i=0;i<20;i++)P.tick(post);assert.equal(post.score[0],0);
const hit=P.create(12);Object.assign(hit.balls[0],{x:-12,y:0,vx:P.SPEED,vy:0});Object.assign(hit.balls[1],{x:12,y:0,vx:-P.SPEED,vy:0});P.tick(hit);assert(hit.balls[0].vx<0&&hit.balls[1].vx>0);
function run(seed){const m=P.create(seed);for(let i=0;i<7200;i++){P.tick(m);for(const b of m.balls){assert(Number.isFinite(b.x+b.y+b.vx+b.vy));assert(Math.hypot(b.x,b.y)<R+BALL+4);}}assert(m.finished);assert.equal(m.time,60);assert.equal(m.score[0]+m.score[1],m.events.length);for(const e of m.events)assert.equal(e.minute,Math.min(90,Math.max(1,Math.ceil(e.time/60*90))));const events=JSON.stringify(m.events);P.tick(m);assert.equal(JSON.stringify(m.events),events);return m;}
const scores=[];for(let seed=1;seed<=80;seed++)scores.push(run(seed).score);assert.deepEqual(run(77).events,run(77).events);assert(new Set(scores.map(s=>s.join(':'))).size>6);console.log('80 matches:',JSON.stringify({averageGoals:scores.reduce((n,s)=>n+s[0]+s[1],0)/scores.length}));
// Canvas calls are counted so caching/per-frame behavior is observable without visual QA.
let cachedGradients=0,draws=0;const context={fillRect(){},strokeRect(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},roundRect(){},translate(){},scale(){},rotate(){},fillText(){},drawImage(){draws++},measureText(s){return {width:s.length*12}},createRadialGradient(){cachedGradients++;return {addColorStop(){}}}};
class El{
 constructor(id=''){this.id=id;this.attrs={};this.value='';this.style={setProperty(){}};this.dataset={};this.handlers={};this.children=[];this.hidden=false;this.disabled=false;this.checked=false;this.tagName='DIV';this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:x=>{if(this.classes.has(x)){this.classes.delete(x);return false;}this.classes.add(x);return true;}};}
 setAttribute(k,v){this.attrs[k]=String(v)}removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,f){this.handlers[k]=f}fire(k){if(!this.disabled)this.handlers[k]?.({preventDefault(){}})}focus(){document.activeElement=this}setCustomValidity(v){this.invalid=v}
 reportValidity(){return !Object.values(els).some(e=>e.invalid)}getContext(){return context}load(){}showModal(){this.open=true}close(){this.open=false}
}
const els={};for(const m of html.matchAll(/id="([^"]+)"/g))els[m[1]]=new El(m[1]);
const themes=['super','champions','europa'].map(t=>{const e=new El();e.dataset.theme=t;return e;});const handlers={};
global.document={body:new El(),documentElement:new El(),hidden:false,activeElement:null,getElementById(id){assert(els[id],'Missing '+id);return els[id]},createElement:()=>new El(),querySelectorAll:()=>themes,addEventListener:(k,f)=>handlers[k]=f};global.window=global;global.addEventListener=(k,f)=>handlers[k]=f;global.matchMedia=()=>({matches:false});global.localStorage={getItem(){return null},setItem(){}};Object.defineProperty(global,'navigator',{value:{},configurable:true});
let callback;global.requestAnimationFrame=f=>callback=f;let nextSeed=800;Object.defineProperty(global,'crypto',{value:{getRandomValues(a){a[0]=nextSeed++;return a}},configurable:true});
let tracks=[],latestRecorder;
function stream(){const track={stopped:false,stop(){this.stopped=true}};tracks.push(track);const list=[track];return {getTracks:()=>list,addTrack:t=>list.push(t)};}
class Recorder{
 static isTypeSupported(t){return t.startsWith('video/webm')||t.startsWith('video/mp4')}
 constructor(stream,options){this.stream=stream;this.mimeType=options.mimeType;this.state='inactive';latestRecorder=this;}
 start(){this.state='recording'}pause(){this.state='paused'}resume(){this.state='recording'}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['video-bytes'],{type:this.mimeType})});this.onstop?.();}
}
global.MediaRecorder=Recorder;els.stage.captureStream=fps=>{assert.equal(fps,30);return stream()};
let timers=new Map(),timerId=0;global.setTimeout=f=>{timers.set(++timerId,f);return timerId};global.clearTimeout=id=>timers.delete(id);function flushTimers(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}}
let revoked=[];URL.createObjectURL=()=>`blob:test-${Math.random()}`;URL.revokeObjectURL=u=>revoked.push(u);
els.home.value='Galatasaray';els.away.value='Fenerbahçe';els['home-color'].value='#e65d69';els['away-color'].value='#f0e9d8';els['predict-home'].value='1';els['predict-away'].value='1';
vm.runInThisContext(scripts[2]);let now=0;function advance(n,hz=60){for(let i=0;i<n;i++){now+=1000/hz;callback(now)}}
assert.equal(marbleDiagnostics.state,'menu');themes[1].fire('click');assert.equal(document.body.dataset.theme,'champions');themes[2].fire('click');assert.equal(document.body.dataset.theme,'europa');
els.home.value='   ';els.setup.fire('submit');assert.equal(marbleDiagnostics.state,'menu');els.home.value='Galatasaray';els.home.fire('input');els.setup.fire('submit');assert.equal(marbleDiagnostics.state,'playing');advance(180);assert.equal(cachedGradients,1,'Background is cached, not regenerated per frame');assert(draws>100);
els.pause.fire('click');const paused=marbleDiagnostics.time;advance(80);assert.equal(marbleDiagnostics.time,paused);els.resume.fire('click');advance(80);assert(marbleDiagnostics.time>paused);document.hidden=true;handlers.visibilitychange();assert.equal(marbleDiagnostics.state,'paused');document.hidden=false;els.resume.fire('click');
function finishUI(hz=60){for(let i=0;i<hz*61&&marbleDiagnostics.state==='playing';i++)advance(1,hz);assert.equal(marbleDiagnostics.state,'finished');assert.equal(marbleDiagnostics.time,60);}
finishUI();const originalEvents=marbleDiagnostics.events,originalSeed=marbleDiagnostics.seed;assert.equal(els.result.hidden,false);
// Export uses the original seed and 60s timeline, not a new random outcome.
els['export-replay'].fire('click');assert.equal(marbleDiagnostics.seed,originalSeed);assert(marbleDiagnostics.recording);advance(120);els.pause.fire('click');assert.equal(latestRecorder.state,'paused');advance(30);els.resume.fire('click');assert.equal(latestRecorder.state,'recording');finishUI();assert.deepEqual(marbleDiagnostics.events,originalEvents);assert(els.again.disabled);flushTimers();assert(!els.again.disabled);assert(!marbleDiagnostics.recording);assert(els.download.download.endsWith('.mp4'));assert.equal(els['video-actions'].hidden,false);assert(tracks.every(t=>t.stopped));
// New matches revoke the previous video URL and don't accumulate recorder tracks.
els.again.fire('click');assert(revoked.length===1);assert.notEqual(marbleDiagnostics.seed,originalSeed);assert.deepEqual(marbleDiagnostics.score,[0,0]);advance(60);els.exit.fire('click');assert(els['exit-dialog'].open);assert.equal(marbleDiagnostics.state,'paused');els.stay.fire('click');assert.equal(marbleDiagnostics.state,'playing');els.exit.fire('click');els.leave.fire('click');assert.equal(marbleDiagnostics.state,'menu');assert.equal(els.home.value,'Galatasaray');
// Same result across 15, 30, and 144 Hz, including catch-up under low rendering FPS.
function atRate(hz){nextSeed=901;els.setup.fire('submit');finishUI(hz);return marbleDiagnostics.events;}
assert.deepEqual(atRate(15),atRate(144));assert.deepEqual(atRate(30),atRate(144));
// Recorder selection, construction failure, runtime failure, cancellation and audio track cleanup.
assert.equal(V.extension('video/webm;codecs=vp8'),'webm');assert.equal(V.extension('video/mp4'),'mp4');
Recorder.isTypeSupported=t=>t.startsWith('video/webm');let exported,failed;const fake={captureStream:()=>stream()};let capture=V.create(fake,{complete:b=>exported=b,error:e=>failed=e});capture.stop();assert(exported.type.startsWith('video/webm'));assert(tracks.at(-1).stopped);
capture=V.create(fake,{complete(){throw Error('Cancelled output must not be delivered')},error(){}});capture.cancel();assert(tracks.at(-1).stopped);
capture=V.create(fake,{complete(){throw Error('Failed output must not be delivered')},error:e=>failed=e});latestRecorder.onerror();assert(failed);assert(tracks.at(-1).stopped);
const audio={cloned:null,clone(){return this.cloned={stop(){this.stopped=true}}}};capture=V.create(fake,{complete(){},error(){}},audio);capture.stop();assert(audio.cloned.stopped);assert(!audio.stopped,'Source audio is retained; recorder owns its clone');
global.MediaRecorder=class extends Recorder{constructor(){throw Error('Unsupported encoder')}};assert.throws(()=>V.create(fake,{}),/başlatılamadı/);assert(tracks.at(-1).stopped);global.MediaRecorder=undefined;assert.throws(()=>V.create(fake,{}),/desteklemiyor/);
console.log('PASS: 60s/90min, faster physics, boundary/posts/goals, 80 matches, cached Canvas drawing, themes, validation, pause/background, deterministic video replay, 15/30/144Hz agreement, MP4/WebM negotiation, recording cleanup/failure, audio ownership and URL cleanup. Browser encoding/visual/device performance not tested.');
