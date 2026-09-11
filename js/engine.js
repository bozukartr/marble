/* Pure, serializable game rules; the UI previews and commits through the same path. */
(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.ParselData;
const SIZE=6,TURNS=30,VERSION=1;
const clone=s=>JSON.parse(JSON.stringify(s));
const def=id=>D.byId[id];
function neighbors(i){const r=Math.floor(i/SIZE),c=i%SIZE;return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([r,c])=>r>=0&&r<SIZE&&c>=0&&c<SIZE).map(([r,c])=>r*SIZE+c);}
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function pick(s,list){return list[Math.floor(random(s)*list.length)];}
function waterSide(s,i){return neighbors(i).some(j=>s.terrain[j]==='water');}
function building(id){return {id,level:1,mods:[]};}
function links(s,i){return s.board.flatMap((b,j)=>b&&j!==i&&['tram','hub'].includes(b.id)&&(Math.floor(j/6)===Math.floor(i/6)||j%6===i%6)?[j]:[]);}
function evaluate(s,ignoreEvent=false){
 const e=ignoreEvent?null:s.activeEvent;let power=4,pop=0,income=6,happy=0;const details=Array(36).fill(null);
 for(let i=0;i<36;i++){const b=s.board[i];if(!b||b.id==='hall')continue;const d=def(b.id),n=neighbors(i).map(j=>s.board[j]).filter(Boolean),ids=n.map(b=>b.id);let p=d.power*b.level;
 if(b.id==='solar')p-=ids.filter(x=>['apartment','residence','office'].includes(x)).length;
 if(b.mods.includes('insulate'))p=Math.min(0,p+2);power+=p;
 }
 if(e==='outage')power-=3;
 for(let i=0;i<36;i++){
 const b=s.board[i];if(!b||b.id==='hall')continue;const d=def(b.id),ns=neighbors(i),n=ns.map(j=>s.board[j]).filter(Boolean),ids=n.map(b=>b.id),count=id=>ids.filter(x=>x===id).length,cat=c=>n.filter(x=>def(x.id)?.category===c).length;
 let bp=d.pop,bi=d.income,bh=d.happy;
 switch(b.id){
 case 'house':bp+=count('park')*2;break;
 case 'apartment':bh+=cat('service')*2;break;
 case 'garden':bp+=ns.filter(j=>!s.board[j]&&s.terrain[j]==='land').length;break;
 case 'dorm':bp+=count('school')*4+(count('tram')+count('hub'))*2;break;
 case 'residence':bp+=cat('trade')*2;bh+=cat('service')*2;break;
 case 'shop':bi+=cat('home')*2;break;
 case 'cafe':bi+=(count('park')+count('square'))*3;break;
 case 'market':bi+=new Set(n.map(b=>def(b.id)?.category).filter(Boolean)).size;break;
 case 'office':bi+=(count('school')+count('library'))*3+(power>=0?2:0);break;
 case 'hotel':bi+=(waterSide(s,i)?3:0)+(count('park')+count('museum')+count('promenade'))*2;break;
 case 'workshop':bi+=count('warehouse')*2;break;
 case 'factory':bi+=count('warehouse')*3;break;
 case 'warehouse':bi+=cat('trade')+cat('industry');break;
 case 'greenhouse':bi+=(waterSide(s,i)||count('water')?3:0)+(power>=0?1:0);break;
 case 'recycling':bi+=count('factory')*2;break;
 case 'water':bp+=cat('home');break;
 case 'tram':case 'hub':{const ls=links(s,i);bi+=ls.length*(b.mods.includes('transport')?4:2);if(b.id==='hub'&&ls.some(j=>j%6===i%6)&&ls.some(j=>Math.floor(j/6)===Math.floor(i/6)))bi+=4;break;}
 case 'school':bp+=cat('home');break;
 case 'clinic':bh+=cat('home')*2+(count('apartment')?2:0);break;
 case 'library':bh+=count('school')*4;break;
 case 'community':bh+=new Set(n.filter(b=>def(b.id)?.category==='home').map(b=>b.id)).size*3;break;
 case 'park':bh+=cat('home')*2;break;
 case 'forest':bh+=count('forest')*2;break;
 case 'square':bh+=(cat('trade')+cat('service'))*2;break;
 case 'museum':bi+=(count('hotel')+count('tram')+count('hub'))*3;if(b.mods.includes('restore'))bh+=n.length*2;break;
 case 'promenade':bh+=(cat('home')+cat('trade'))*2;break;
 }
 if(d.category==='home'){
 for(const j of ns){const other=s.board[j];if(other?.id==='factory'){const clean=other.mods.includes('filter')?2:neighbors(j).some(k=>s.board[k]?.id==='recycling')?1:0;bh-=Math.max(0,2-clean);}if(other?.id==='plant')bh-=2;}
 if(e==='migration')bp++;
 if(e==='heat'&&!waterSide(s,i)&&!count('water')&&!cat('green')&&!b.mods.includes('roof'))bh-=2;
 }
 if(b.mods.includes('roof'))bh+=2;
 if(e==='tourism'&&['hotel','museum','promenade'].includes(b.id))bi*=2;
 if(e==='fair'&&d.category==='trade'&&cat('trade'))bi+=3;
 if(e==='orders'&&d.category==='industry')bi+=2;
 if(e==='fire'&&d.category==='industry'&&!count('fire'))bi=Math.floor(bi/2);
 bp*=b.level;bi*=b.level;bh*=b.level;pop+=bp;income+=bi;happy+=bh;details[i]={pop:bp,income:bi,happy:bh};
 }
 if(power<0)income=Math.max(3,Math.floor(income*.65));
 return {pop,income,happy,power,details};
}
function goalProgress(s,g,stats=evaluate(s,true)){
 const ids=s.board.filter(Boolean).map(b=>b.id);
 switch(g){
 case 'neighborhood':return {value:Math.max(0,...s.board.map((b,i)=>b?.id==='park'?neighbors(i).filter(j=>def(s.board[j]?.id)?.category==='home').length:0)),target:4};
 case 'services':return {value:new Set(ids.filter(id=>def(id)?.category==='service')).size,target:3};
 case 'population':return {value:stats.pop,target:35};
 case 'transit':return {value:s.board.some((b,i)=>b&&['tram','hub'].includes(b.id)&&links(s,i).length)?2:0,target:2};
 case 'production':return {value:s.board.some((b,i)=>b?.id==='factory'&&neighbors(i).some(j=>s.board[j]?.id==='warehouse')&&neighbors(i).some(j=>s.board[j]?.id==='recycling'))?1:0,target:1};
 case 'savings':return {value:s.coins,target:35};
 default:return {value:0,target:1};
 }
}
function score(s){const st=evaluate(s,true),goals=s.goals.filter(g=>{const p=goalProgress(s,g,st);return p.value>=p.target;}).length;return {total:Math.max(0,st.pop*8+st.happy*4+st.income*3+s.coins+goals*30-Math.max(0,-st.power)*8),population:st.pop*8,wellbeing:st.happy*4,economy:st.income*3+s.coins,goals:goals*30,energy:-Math.max(0,-st.power)*8};}
function cost(s,id){const d=def(id);return Math.max(0,d.cost-(d.kind==='building'?s.discount:0));}
function isTarget(s,id,i){if(!Number.isInteger(i)||i<0||i>=36)return false;const b=s.board[i],d=def(id);if(d.kind==='building')return !b&&s.terrain[i]==='land'&&(id!=='promenade'||waterSide(s,i));if(!b||b.id==='hall')return false;
 switch(id){case 'upgrade':return b.level<3;case 'rezone':return def(b.id).category==='home';case 'insulate':return def(b.id).power<0&&!b.mods.includes(id);case 'roof':return !b.mods.includes(id);case 'filter':return b.id==='factory'&&!b.mods.includes(id);case 'transport':return ['tram','hub'].includes(b.id)&&!b.mods.includes(id);case 'restore':return b.id==='museum'&&!b.mods.includes(id);default:return true;}
}
function placements(s,id){if(id==='subsidy')return s.discount?[]:[[]];const out=[];for(let i=0;i<36;i++){if(!isTarget(s,id,i))continue;if(id==='move'){for(let j=0;j<36;j++)if(!s.board[j]&&s.terrain[j]==='land'&&(s.board[i].id!=='promenade'||waterSide(s,j)))out.push([i,j]);}else if(id==='swap'){for(let j=i+1;j<36;j++)if(isTarget(s,id,j)&&(s.board[i].id!=='promenade'||waterSide(s,j))&&(s.board[j].id!=='promenade'||waterSide(s,i)))out.push([i,j]);}else out.push([i]);}return out;}
function canUse(s,id){return !!def(id)&&cost(s,id)<=s.coins&&placements(s,id).length>0;}
function apply(s,id,targets){const d=def(id);if(!d)throw Error('Kart bulunamadı.');if(cost(s,id)>s.coins)throw Error('Bütçe yetersiz.');const valid=placements(s,id).some(p=>p.length===targets.length&&p.every((x,i)=>x===targets[i]))||id==='swap'&&placements(s,id).some(p=>p[0]===targets[1]&&p[1]===targets[0]);if(!valid)throw Error('Bu kart için uygun bir parsel seç.');s.coins-=cost(s,id);const i=targets[0],b=s.board[i];
 if(d.kind==='building'){s.board[i]=building(id);s.discount=0;return;}
 switch(id){case 'upgrade':b.level++;break;case 'move':s.board[targets[1]]=b;s.board[i]=null;break;case 'demolish':s.coins+=Math.floor(def(b.id).cost/2);s.board[i]=null;break;case 'rezone':b.id='shop';b.mods=b.mods.filter(x=>['roof','insulate'].includes(x));break;case 'festival':s.coins+=neighbors(i).filter(j=>s.board[j]).length*2;break;case 'swap':[s.board[i],s.board[targets[1]]]=[s.board[targets[1]],s.board[i]];break;case 'subsidy':s.discount=4;break;default:b.mods.push(id);}
}
function preview(s,id,targets){const next=clone(s);try{apply(next,id,targets);const before=evaluate(s),after=evaluate(next);return {ok:true,state:next,stats:after,delta:{coins:next.coins-s.coins,pop:after.pop-before.pop,income:after.income-before.income,happy:after.happy-before.happy,power:after.power-before.power}};}catch(e){return {ok:false,error:e.message};}}
function unlocked(s){return D.buildings.filter(d=>d.tier<=s.tier);}
function deal(s){const pool=[...unlocked(s),...D.projects].filter(d=>placements(s,d.id).length>0);const affordable=pool.filter(d=>cost(s,d.id)<=s.coins);s.offers=[];if(affordable.length)s.offers.push(pick(s,affordable).id);else{s.offers.push('subsidy');}
 // Early turns favor construction, later turns include more projects.
 const preference=pool.filter(d=>d.kind==='building');while(s.offers.length<3){const candidates=(random(s)<.72&&preference.length?preference:pool).filter(d=>!s.offers.includes(d.id));const fallback=pool.filter(d=>!s.offers.includes(d.id));if(!candidates.length&&!fallback.length)break;s.offers.push(pick(s,candidates.length?candidates:fallback).id);}
}
function newGame(options={}){const map=D.maps.find(m=>m.id===options.map)?.id||'plain',s={version:VERSION,id:String(options.seed??Date.now()),rng:(options.seed??Date.now())>>>0,map,tier:options.tier??2,turn:1,coins:28,discount:0,rerolls:2,board:Array(36).fill(null),terrain:Array(36).fill('land'),offers:[],reserve:null,goals:[],activeEvent:null,forecast:null,finished:false,pending:null,log:[]};
 if(map==='river')for(let r=0;r<6;r++)s.terrain[r*6+5]='water';
 if(map==='lake')for(const i of [14,15,20,21])s.terrain[i]='water';
 if(map==='valley')for(const i of [0,1,5,6,29,30,34,35])s.terrain[i]='rock';s.board[7]=building('hall');
 const gs=D.goals.filter(g=>s.tier>0||g.id!=='transit'&&g.id!=='production').map(g=>g.id);while(s.goals.length<3){const id=pick(s,gs);if(!s.goals.includes(id))s.goals.push(id);}s.forecast=pick(s,D.events).id;deal(s);return s;}
function play(s,id,targets,source='offer'){if(s.finished||s.pending)throw Error('Önce turu tamamla.');if(source==='reserve'?s.reserve!==id:!s.offers.includes(id))throw Error('Kart elinde değil.');const p=preview(s,id,targets);if(!p.ok)throw Error(p.error);const next=p.state;next.pending={before:clone(s),label:def(id).name};if(source==='reserve')next.reserve=null;return next;}
function pass(s){if(s.finished||s.pending)throw Error('Tur tamamlanamaz.');const next=clone(s);next.coins+=2;next.pending={before:clone(s),label:'Tasarruf · +2 para'};return next;}
function advance(s){if(!s.pending||s.finished)throw Error('Önce hamleni yap.');const n=clone(s);const label=n.pending.label;n.pending=null;n.log.unshift(`${n.turn}. tur · ${label}`);if(n.turn%5===0){n.activeEvent=n.forecast;if(n.activeEvent==='grant')n.coins+=n.board.filter(b=>def(b?.id)?.category==='green').length*3;const income=evaluate(n).income;n.coins+=income;n.log.unshift(`Dönem geliri +${income} · ${D.events.find(e=>e.id===n.activeEvent).name}`);n.forecast=pick(n,D.events.filter(e=>e.id!==n.activeEvent)).id;}
 if(n.turn===TURNS)n.finished=true;else{n.turn++;deal(n);}n.log=n.log.slice(0,12);return n;}
function undo(s){if(!s.pending)throw Error('Geri alınacak hamle yok.');return clone(s.pending.before);}
function reserve(s,id){if(s.pending||s.finished||s.reserve||!s.offers.includes(id))throw Error('Rezerv alanı dolu veya kart seçilmedi.');const n=clone(s);n.reserve=id;n.offers=n.offers.filter(x=>x!==id);return n;}
function reroll(s){if(s.pending||s.finished||s.rerolls<1)throw Error('Yenileme hakkın kalmadı.');const n=clone(s);n.rerolls--;deal(n);return n;}
function validSave(s,depth=0){if(!s||s.version!==VERSION||!D.maps.some(m=>m.id===s.map)||!Number.isInteger(s.rng)||!Number.isInteger(s.turn)||s.turn<1||s.turn>30||!Number.isFinite(s.coins)||s.coins<0||!Number.isInteger(s.tier)||s.tier<0||s.tier>2||!Array.isArray(s.board)||s.board.length!==36||!Array.isArray(s.terrain)||s.terrain.length!==36)return false;
 if(s.board.filter(b=>b?.id==='hall').length!==1||!s.board.every((b,i)=>s.terrain[i]==='land'||!b)||!s.terrain.every(t=>['land','water','rock'].includes(t)))return false;
 if(!s.board.every(b=>!b||((b.id==='hall'||def(b.id)?.kind==='building')&&Number.isInteger(b.level)&&b.level>=1&&b.level<=3&&Array.isArray(b.mods)&&b.mods.every(m=>['insulate','roof','filter','transport','restore'].includes(m)))))return false;
 return Array.isArray(s.offers)&&s.offers.length<=3&&s.offers.every(id=>def(id))&&(!s.reserve||!!def(s.reserve))&&Array.isArray(s.goals)&&s.goals.length===3&&s.goals.every(id=>D.goals.some(g=>g.id===id))&&D.events.some(e=>e.id===s.forecast)&&(!s.activeEvent||D.events.some(e=>e.id===s.activeEvent))&&Number.isInteger(s.rerolls)&&s.rerolls>=0&&s.rerolls<=2&&[0,4].includes(s.discount)&&typeof s.finished==='boolean'&&Array.isArray(s.log)&&(!s.pending||(depth===0&&typeof s.pending.label==='string'&&validSave(s.pending.before,1)));
}
const api={SIZE,TURNS,VERSION,clone,neighbors,waterSide,links,evaluate,score,goalProgress,cost,isTarget,placements,canUse,preview,newGame,play,pass,advance,undo,reserve,reroll,validSave};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParselEngine=api;
})(globalThis);
