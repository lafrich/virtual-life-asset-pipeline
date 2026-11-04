"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const A=require("../site/action-appearance-bridge.js");
for(const [v,want] of [[0,0],[90,90],[180,180],[270,270],[360,0],[-90,270],[450,90],[45,90],[null,0]])
 assert.equal(A.rotation(v),want,"rotate "+v);
const calls=[];
const ctx={
 save(){calls.push(["save"]);},restore(){calls.push(["restore"]);},
 beginPath(){calls.push(["path"]);},rect(...a){calls.push(["rect",...a]);},
 clip(){calls.push(["clip"]);},translate(...a){calls.push(["translate",...a]);},
 rotate(...a){calls.push(["rotate",...a]);},
 drawImage(...a){calls.push(["image",...a]);}
};
const pixels={naturalWidth:384,naturalHeight:4928};
assert.equal(A.drawExpression(ctx,{id:"sleepy",overlay:"media/ichsan-face-layer-sleepy.png"},"se",2,
 ()=>({ready:true,im:pixels})),true);
assert.ok(calls.some(x=>x[0]==="image"&&x[2]===2*64+16&&x[3]===4*112+28),
 "V6B facial expression must read native IDLE row, not unrelated pose");
calls.length=0;
assert.equal(A.drawExpression(ctx,{id:"sleepy",overlay:"media/ichsan-face-layer-sleepy.png"},"sw",1,
 ()=>({ready:true,im:pixels})),true);
assert.ok(calls.some(x=>x[0]==="image"&&x[3]===5*112+28));
calls.length=0;
assert.equal(A.drawExpression(ctx,{id:"sleepy",overlay:"media/ichsan-face-layer-sleepy.png"},"nw",1,
 ()=>({ready:true,im:pixels})),false,"Rear views must never draw eyes");
assert.equal(calls.length,0);
const legacy={naturalWidth:768,naturalHeight:448};
assert.equal(A.drawExpression(ctx,{id:"sleepy",sheet:"media/legacy_theodore-face-sleepy-4dir.png"},"se",3,
 ()=>({ready:true,im:legacy})),true);
assert.ok(calls.some(x=>x[0]==="image"&&x[2]===3*64+17&&x[3]===30),
 "Legacy character face must be cropped from its OWN authored full-body atlas");
calls.length=0;
assert.equal(A.drawExpression(ctx,{id:"neutral",sheet:"media/legacy_theodore-face-neutral-4dir.png"},"se",0,
 ()=>({ready:true,im:legacy})),false,"Neutral must preserve painted action pixels");
assert.equal(calls.length,0);
for(const [angle,lift] of [[0,0],[90,20],[180,88],[270,20]]){
 calls.length=0;
 A.drawRotated(ctx,"frame",77,134,angle);
 assert.deepEqual(calls.find(x=>x[0]==="translate"),["translate",77,134-lift]);
 assert.deepEqual(calls.find(x=>x[0]==="image"),["image","frame",-32,-100,64,112]);
 assert.equal(calls.some(x=>x[0]==="rotate"),angle!==0);
}

// A translated pose must carry its mouth overlay with its actual head,
// not with the upright face coordinates saved in the expression atlas.
function mockHead(left,top){
 const rgba={width:64,height:112,data:new Uint8ClampedArray(64*112*4)};
 for(let y=top;y<top+16;y++)for(let x=left;x<left+13;x++)
  rgba.data[(y*64+x)*4+3]=255;
 return rgba;
}
const baseHead=A.headAnchor(mockHead(20,31));
const posedHead=A.headAnchor(mockHead(27,45));
assert.ok(baseHead&&posedHead);
assert.equal(posedHead.x-baseHead.x,7);
assert.equal(posedHead.y-baseHead.y,14);
assert.equal(A.headAnchor(mockHead(20,31)).y,31);
assert.equal(A.headAnchor({width:64,height:112,data:new Uint8ClampedArray(64*112*4)}),null);
// A body pose moved +7 right/+14 down must move the actual Bleh face
// on the scene canvas, while keeping the source crop at its native atlas row.
const priorDoc=global.document;
global.document={createElement(){return {
 width:64,height:112,
 getContext(){return {drawImage(){},getImageData(){return mockHead(20,31);}}}
};}};
const poseCalls=[];
const poseCtx={
 ...ctx,getImageData(){return mockHead(27,45);},
 drawImage(...a){poseCalls.push(a);}
};
const humanBleh={naturalWidth:256,naturalHeight:448};
assert.equal(A.drawExpression(poseCtx,{id:"bleh",sheet:"media/human-male-base-expression-bleh.png"},
 "se",0,()=>({ready:true,im:humanBleh})),true);
assert.deepEqual(poseCalls[0].slice(1,5),[17,30,31,32]);
assert.deepEqual(poseCalls[0].slice(5,7),[24,44]);
if(priorDoc===undefined)delete global.document;else global.document=priorDoc;

const html=fs.readFileSync("site/action-editor.html","utf8");
const editor=fs.readFileSync("site/action-editor.js","utf8");
for(const id of ["template-rotation","template-expression","template-loop"]){
 assert.ok(html.includes('id="'+id+'"'),"Missing XP inspector control: "+id);
 assert.ok(editor.includes('$("'+id+'")'),"No editor handler for "+id);
}
assert.ok(html.includes("action-appearance-bridge.js"));
assert.ok(editor.includes("P.drawExpression(sourceCtx,face,dir,frame"));
assert.ok(editor.includes("P.drawRotated(sc,scratch,"));
assert.ok(editor.includes("updateExpressionOptions(previousTemplate?.expression"));
console.log("PASS native expression cropping, four-view face gating, four rotation baselines, metadata controls and paint preservation");
