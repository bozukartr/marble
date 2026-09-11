// Actual rules + DOM-stub application flow. Run: node tests/regression.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const D=require('../js/data.js'),E=require('../js/engine.js');
assert.equal(D.buildings.length,30);assert.equal(D.projects.length,12);assert.equal(D.events.length,8);assert.equal(D.buildings.filter(d=>d.tier===0).length,12);assert.equal(new Set(D.all.map(d=>d.id)).size,42);
const b=id=>({id,level:1,mods:[]});
function base(map='plain'){return E.newGame({map,seed:231,tier:2});}
function fixture(...placements){const s=base('river');s.coins=100;for(const [i,id]of placements)s.board[i]=b(id);return s;}
function apply(s,id,targets){s.offers=[id];return E.play(s,id,targets);}
// Preview is pure and has identical economics to the commit; undo restores RNG and offers too.
let s=base();const original=JSON.stringify(s);const p=E.preview(s,'house',[8]);assert(p.ok);assert.equal(JSON.stringify(s),original);s.offers=['house'];const before=E.clone(s),played=E.play(s,'house',[8]);assert.deepEqual(E.evaluate(played),p.stats);assert.equal(played.coins,25);assert.deepEqual(E.undo(played),before);assert.throws(()=>E.advance(before));assert.throws(()=>E.play(played,'house',[9]));
// Costs, immutable city hall, terrain and waterfront restrictions.
assert(!E.preview(s,'house',[7]).ok);s.coins=0;assert(!E.preview(s,'house',[8]).ok);assert(!E.preview(base(),'promenade',[8]).ok);assert(E.preview(base('river'),'promenade',[4]).ok);assert(!E.preview(base('river'),'house',[5]).ok);assert(!E.preview(base(),'demolish',[7]).ok);
assert.deepEqual(E.neighbors(0),[6,1]);assert.equal(E.neighbors(8).length,4);
// Every building has an executable evaluator and valid placement somewhere.
for(const d of D.buildings){const s=fixture(),i=d.id==='promenade'?4:8;s.board[i]=b(d.id);const st=E.evaluate(s);assert(Number.isFinite(st.income+st.pop+st.happy+st.power));assert(E.preview(fixture(),d.id,[i]).ok,d.id);}
const alone=E.evaluate(fixture([8,'house'])),park=E.evaluate(fixture([8,'house'],[9,'park']));assert.equal(park.pop-alone.pop,2);assert(park.happy>alone.happy);
const dirty=fixture([8,'house'],[9,'factory']);const clean=E.preview(dirty,'filter',[9]);assert(clean.ok);assert.equal(clean.delta.happy,2);
const transit=fixture([8,'tram'],[20,'tram']);assert.equal(E.links(transit,8).length,1);assert(E.evaluate(transit).income>=10);
const tall=fixture([8,'solar'],[9,'apartment']);assert.equal(E.evaluate(tall).power,5); // hall4 + solar4 - apartment3
// All twelve projects, including two-cell actions, consume a turn and are undoable.
const projectFixtures={upgrade:[fixture([8,'house']),[8]],move:[fixture([8,'house']),[8,9]],demolish:[fixture([8,'house']),[8]],rezone:[fixture([8,'house']),[8]],insulate:[fixture([8,'apartment']),[8]],roof:[fixture([8,'house']),[8]],filter:[fixture([8,'factory']),[8]],festival:[fixture([8,'house'],[9,'park']),[8]],transport:[fixture([8,'tram'],[20,'tram']),[8]],restore:[fixture([8,'museum']),[8]],swap:[fixture([8,'house'],[9,'park']),[8,9]],subsidy:[fixture(),[]]};
for(const d of D.projects){const [s,targets]=projectFixtures[d.id];s.offers=[d.id];const p=E.preview(s,d.id,targets);assert(p.ok,d.id);const next=E.play(s,d.id,targets);assert.deepEqual(E.undo(next),s);assert.equal(E.advance(next).turn,2);}
let upgraded=fixture([8,'house']);upgraded.board[8].level=3;assert(!E.preview(upgraded,'upgrade',[8]).ok);
let subsidized=E.preview(fixture(),'subsidy',[]).state;assert.equal(E.cost(subsidized,'house'),0);assert(!E.preview(subsidized,'subsidy',[]).ok);assert.equal(E.preview(subsidized,'house',[8]).state.discount,0);
let roofed=E.preview(fixture([8,'house']),'roof',[8]).state;assert(!E.preview(roofed,'roof',[8]).ok);
const coast=fixture([4,'promenade']);assert(!E.preview(coast,'move',[4,8]).ok);
// Deterministic draw, progression and reserve behavior.
assert.deepEqual(base(),base());s=base();const card=s.offers[0];s=E.reserve(s,card);assert.equal(s.reserve,card);assert(!s.offers.includes(card));assert.equal(s.turn,1);assert.throws(()=>E.reserve(s,s.offers[0]));s=E.reroll(s);s=E.reroll(s);assert.throws(()=>E.reroll(s));if(E.canUse(s,card)){const next=E.play(s,card,E.placements(s,card)[0],'reserve');assert.equal(next.reserve,null);}
for(let seed=0;seed<12;seed++){const novice=E.newGame({seed,tier:0});assert(novice.offers.every(id=>D.byId[id].tier===0));}
// Event mechanics are real and temporary, with a five-turn settlement cadence.
for(const event of D.events){const s=fixture([8,'factory'],[9,'house'],[10,'hotel'],[14,'park']);s.activeEvent=event.id;assert(Number.isFinite(E.evaluate(s).income));assert.deepEqual(E.evaluate(s,true),E.evaluate({...s,activeEvent:null}));}
const production=fixture([8,'factory']);assert(E.evaluate({...production,activeEvent:'orders'}).income>E.evaluate(production).income);assert(E.evaluate({...production,activeEvent:'fire'}).income<E.evaluate(production).income);
let turn=base();const initialForecast=turn.forecast;for(let i=0;i<4;i++)turn=E.advance(E.pass(turn));assert.equal(turn.activeEvent,null);const money=turn.coins;turn=E.advance(E.pass(turn));assert.equal(turn.activeEvent,initialForecast);assert(turn.coins>=money+5);assert.notEqual(turn.forecast,initialForecast);
// A complete game on each map: every dealt hand has a legal affordable action.
const totals=[];for(const map of D.maps)for(let seed=1;seed<=15;seed++){
 let s=E.newGame({map:map.id,seed,tier:seed%3});for(let t=1;t<=30;t++){assert.equal(s.turn,t);assert(E.validSave(s));assert.equal(new Set(s.offers).size,s.offers.length);const playable=s.offers.filter(id=>E.canUse(s,id));assert(playable.length,`Softlock ${map.id} ${seed} ${t}`);
 const id=playable.find(id=>D.byId[id].kind==='building')||playable[0],positions=E.placements(s,id),targets=positions[Math.floor(seed%positions.length)];s=E.play(s,id,targets);assert(E.validSave(s),'pending save');s=E.advance(s);}
 assert(s.finished);assert.equal(s.turn,30);assert.throws(()=>E.pass(s));assert(Number.isFinite(E.score(s).total));totals.push(E.score(s).total);
}
assert(!E.validSave({...base(),board:[]}));assert(!E.validSave({...base(),coins:-1}));assert(!E.validSave({...base(),offers:['invented']}));
console.log('PASS: 30 buildings, 12 projects, 8 events, preview/commit/undo, legality, all maps, 60 full games, economy, goals, reserve, saves and deterministic draws. Scores:',Math.min(...totals),'-',Math.max(...totals));
// Exercise the actual separate UI script with a small semantic DOM stub.
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(!/<script>/.test(html));for(const asset of ['styles.css','js/data.js','js/engine.js','js/app.js'])assert(fs.existsSync(path.join(__dirname,'..',asset)));
class El{constructor(){this.children=[];this.style={setProperty(){}};this.dataset={};this.value='';this.hidden=false;this.disabled=false;this.classes=new Set();this.classList={add:x=>this.classes.add(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x),remove:x=>this.classes.delete(x)};}append(...els){this.children.push(...els)}replaceChildren(...els){this.children=[...els]}setAttribute(){}focus(){}scrollIntoView(){}showModal(){this.open=true}close(){this.open=false}}
const els={};for(const m of html.matchAll(/id="([^"]+)"/g))els[m[1]]=new El();els.mode.value='full';const q={'.hand-tools':new El(),'.hand-heading':new El()};global.document={body:new El(),getElementById:id=>{assert(els[id],id);return els[id]},createElement:()=>new El(),querySelector:s=>q[s]};global.window=global;global.addEventListener=()=>{};const storage={};global.localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v};global.ParselData=D;global.ParselEngine=E;
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8'));els['new-game'].onclick();assert.equal(els.game.hidden,false);assert.equal(els.board.children.length,36);assert(els.cards.children.length>0);
const uiState=JSON.parse(storage['son-parsel-game-v1']),slot=uiState.offers.findIndex(id=>D.byId[id].kind==='building'&&E.canUse(uiState,id));assert(slot>=0);const chosen=uiState.offers[slot],cell=E.placements(uiState,chosen)[0][0];els.cards.children[slot].onclick();els.board.children[cell].onclick();assert.equal(els.confirm.disabled,false);els.confirm.onclick();assert.equal(JSON.parse(storage['son-parsel-game-v1']).board[cell].id,chosen);els.undo.onclick();assert.equal(JSON.parse(storage['son-parsel-game-v1']).board[cell],null);

els.pass.onclick();assert.equal(els.pending.hidden,false);els.undo.onclick();assert.equal(els.pending.hidden,true);els.pass.onclick();els['next-turn'].onclick();assert.equal(els.turn.textContent,2);els['game-menu'].onclick();assert.equal(els.menu.hidden,false);assert(!els.continue.hidden);els.continue.onclick();assert.equal(els.turn.textContent,2);
for(let t=2;t<=30;t++){els.pass.onclick();els['next-turn'].onclick();}assert.equal(els.results.hidden,false);assert(Number.isFinite(Number(els['final-score'].textContent)));assert.equal(JSON.parse(storage['son-parsel-profile-v1']).games,1);els['goals-button'].onclick();assert(els.sheet.open);els['close-sheet'].onclick();els['catalog-game'].onclick();assert(els['sheet-content'].children.length);els.replay.onclick();assert.equal(els.turn.textContent,1);assert.equal(els.results.hidden,true);
console.log('PASS: separate assets, menu/start, 36 tiles, pending/undo/advance, save/resume, 30-turn results, progression, dialogs and replay. Real browser/device layout not tested.');
