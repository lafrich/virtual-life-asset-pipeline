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
// Two synthetic frames differ ONLY in one facial mark. Native expression
// must update that mark at the posed head while leaving its neck unchanged.
function coloredHead(left,top){
 const img=mockHead(left,top);
 for(let y=top;y<top+16;y++)for(let x=left;x<left+13;x++){
  const i=(y*64+x)*4;
  img.data[i]=194;img.data[i+1]=152;img.data[i+2]=126;
 }
 return img;
}
const nativeBase=coloredHead(20,31),nativeEmotion=coloredHead(20,31);
const mark=(40*64+25)*4;
nativeEmotion.data[mark]=39;nativeEmotion.data[mark+1]=29;nativeEmotion.data[mark+2]=25;
global.document={createElement(){return {
 width:64,height:112,
 getContext(){
  let draws=0;
  return {drawImage(){draws++;},clearRect(){},
   getImageData(){return draws<=1?nativeEmotion:nativeBase;}};
 }
};}};
const posed=coloredHead(27,45);
let applied=null;
const poseCtx={
 ...ctx,getImageData(){return posed;},
 putImageData(img){applied=img;},
 drawImage(){throw Error("Native expressions must not paste a body/neck rectangle");}
};
const humanBleh={naturalWidth:256,naturalHeight:448};
const normal={naturalWidth:256,naturalHeight:448};
humanBleh.src="media/human-male-base-expression-bleh.png";
normal.src="media/human-male-base-expression-neutral.png";
assert.equal(A.drawExpression(poseCtx,{id:"bleh",sheet:"media/human-male-base-expression-bleh.png"},
 "se",0,p=>({ready:true,im:p.endsWith("-neutral.png")?normal:humanBleh})),true);
assert.ok(applied,"Face delta was not applied");
const faceMark=(54*64+32)*4;
assert.equal(applied.data[faceMark],39,"Expression mark must follow posed head");
const neckMark=(72*64+33)*4;
assert.deepEqual([...applied.data.slice(neckMark,neckMark+4)],
 [...posed.data.slice(neckMark,neckMark+4)],"Neck and body must remain untouched");
if(priorDoc===undefined)delete global.document;else global.document=priorDoc;

console.log("PASS native expression cropping, four-view face gating, four rotation baselines, metadata controls and paint preservation");
