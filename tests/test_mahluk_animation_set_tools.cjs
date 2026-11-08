'use strict';
/* Smoke test for Mahluk Animation's isolated Set Animation / Emosi / Front-Back lanes.
 * No browser/Drive credentials required. Uses mock canvas and PNG image loader. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const next=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const ids=[...read('site/mahluk-animation-studio.html').matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
 const elems=new Map();
 const create=tag=>({
  tag,style:{},value:'',textContent:'',children:[],options:[],onclick:null,
  replaceChildren(...items){this.children=[...items];this.options=this.children},
  append(...items){this.children.push(...items);this.options=this.children}
 });
 const doc={
  getElementById(id){if(!elems.has(id))elems.set(id,create('div'));return elems.get(id)},
  createElement(tag){
   const el=create(tag);
   if(tag==='canvas'){
    el.width=64;el.height=112;el.getContext=()=>({drawImage(){},imageSmoothingEnabled:false});
   }
   return el;
  }
 };
 ids.forEach(id=>doc.getElementById(id));
 const facePng='data:image/png;base64,AQID';
 const fullSheet='data:image/png;base64,U0hFRVQ=';
 class FakeImage {
  set src(str){
   this.naturalWidth=str===fullSheet?256:128;this.naturalHeight=448;
   Promise.resolve().then(()=>this.onload?.());
  }
 }
 const state={
  id:'current',name:'Current',gender:'male',template:'idle',
  frames:[0,1,2,3].map(i=>({key:'f'+i,ms:140})),tracks:{},
  dir:'se',frame:0,previewFrame:0,images:new Map()
 };
 const characters=[{id:'mh2_local1',name:'Artist',gender:'male',appearance:{}}];
 const root={
  VLEmosiSource:{emotions:[
   {id:'happy',name:'Happy',base:'universal',frames:2,png:facePng},
   {id:'sad',name:'Sad',base:'universal',frames:2,png:facePng}
  ]},
  V6PCharacterStore:{list:()=>characters,get:id=>characters.find(x=>x.id===id)},
  parent:null,confirm:()=>true,addEventListener:()=>{}
 };
 root.parent=root;
 const errors=[];
 const api={
  state,V:{
   norm:obj=>obj,sheet:async()=>({}),
   extractClip:()=>({canvas:{toDataURL:()=>fullSheet},frames:4})
  },
  Store:{list:()=>[{id:'other',name:'Other',manifest:{frames:state.frames}}]},
  db:()=>({other:{
   id:'other',name:'Other',gender:'female',template:'sit',
   frames:state.frames.map(f=>({...f})),tracks:{ne:[{head:{x:7}}]}
  }}),
  render(){},stop(){},say:(message,isError)=>{if(isError)errors.push(message)},
  loadSource:async()=>{}
 };
 new Function('window','document','Image',read('site/mahluk-animation-set-tools.js'))(root,doc,FakeImage);
 const lane=root.VLAnimationSetTools.init(api);
 return {root,doc,state,lane,errors,fullSheet,ids};
}
test('multi-expression placements, front only overlays and frame reindexing',async()=>{
 const {doc,lane,errors}=fixture(),ui=id=>doc.getElementById(id);
 ui('set-emotion-source').value='happy';
 ui('set-emotion-start').value='1';ui('set-emotion-length').value='2';
 ui('set-emotion-place').onclick();
 ui('set-emotion-source').value='sad';
 ui('set-emotion-start').value='3';ui('set-emotion-length').value='2';
 ui('set-emotion-place').onclick();
 await next();
 const saved=lane.saveMeta();
 assert.deepEqual(saved.emotionCues.map(x=>[x.id,x.start,x.length]),
  [['happy',0,2],['sad',2,2]]);
 assert.equal(Object.keys(saved.emotionAssets).length,2);
 const drawn=[];
 const ctx={
  save(){},translate(){},rotate(){},
  drawImage(...args){drawn.push(args)},restore(){}
 };
 const head={x:0,y:0,ax:32,ay:35,angle:0};
 lane.drawEmotion(ctx,'se',0,head);
 lane.drawEmotion(ctx,'sw',2,head);
 lane.drawEmotion(ctx,'ne',0,head);
 lane.drawEmotion(ctx,'nw',2,head);
 assert.equal(drawn.length,2,'Emosi must not appear on the back of the head');
 lane.onInsert(1,true);
 assert.equal(lane.saveMeta().emotionCues[0].length,3);
 lane.onRemove(1);
 assert.equal(lane.saveMeta().emotionCues[0].length,2);
 assert.deepEqual(errors,[]);
});
test('set front and back from another saved character without mutation',async()=>{
 const {root,doc,lane,fullSheet,errors}=fixture(),ui=id=>doc.getElementById(id);
 const character={id:'mh2_cloud1',name:'Cloud Artist',base:'male',
  clips:{idle:{sheet:fullSheet,frames:4}}};
 root.parent={VLMahlukWorkspace:{
  isOnline:()=>true,listOnline:async kind=>kind==='character'?[character]:[]
 }};
 await lane.refreshCharacters();
 ui('set-character-source').value=character.id;
 ui('set-front').onclick();
 await next();
 ui('set-back').onclick();
 await next();
 const src=lane.saveMeta().viewSources;
 assert.deepEqual(Object.keys(src).sort(),['back','front']);
 assert.equal(src.front.id,character.id);
 assert.equal(src.back.id,character.id);
 assert.ok(lane.sourceCell('se',0),'Front sprite missing');
 assert.ok(lane.sourceCell('nw',1),'Back sprite missing');
 assert.equal(character.clips.idle.sheet,fullSheet,'Source character was mutated');
 ui('clear-front').onclick();
 assert.deepEqual(Object.keys(lane.saveMeta().viewSources),['back']);
 assert.deepEqual(errors,[]);
});
test('set animation copies motion while keeping source unmodified',async()=>{
 const {doc,state,lane,errors}=fixture(),ui=id=>doc.getElementById(id);
 const original={...state.frames[0]};
 ui('set-animation-source').value='other';
 ui('set-animation-apply').onclick();
 await next();
 assert.equal(state.template,'sit');
 assert.equal(state.gender,'female');
 assert.equal(state.tracks.ne[0].head.x,7);
 assert.deepEqual(state.frames[0],original);
 assert.deepEqual(errors,[]);
});
test('integration surface and scripts parse',()=>{
 const {ids}=fixture(),html=read('site/mahluk-animation-studio.html');
 for(const id of [
  'set-animation-source','set-animation-apply','set-emotion-source',
  'set-emotion-place','set-emotion-cues','set-front','set-back',
  'clear-front','clear-back','set-character-source'
 ])assert.ok(ids.includes(id),id);
 assert.match(html,/mahluk-animation-set-tools\.js/);
 assert.doesNotThrow(()=>new Function(read('site/mahluk-animation-studio.js')));
});
