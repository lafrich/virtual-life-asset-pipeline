// Node twin used by tests/test_lgr1_parity.py: renders raw RGBA with
// site/lgr1-raster.js so the Python runtime can compare pixel-for-pixel.
"use strict";
const R=require("../site/lgr1-raster.js");
const input=JSON.parse(require("fs").readFileSync(0,"utf8"));
const raw=b=>b?Uint8ClampedArray.from(Buffer.from(b,"base64")):null;
const bytes=b=>b?Uint8Array.from(Buffer.from(b,"base64")):null;
const layers={},wear={};
for(const [k,v] of Object.entries(input.layers||{}))layers[k]=raw(v);
for(const [k,v] of Object.entries(input.wear||{}))wear[k]=raw(v);
const prep=R.prepare({layers,wear,mask:bytes(input.mask),tweak:bytes(input.tweak),
 pivots:input.pivots,placements:input.placements,order:input.order,caps:input.caps,face:raw(input.face),
 jointMode:input.jointMode,w4:!!input.w4,under:(input.under||[]).map(u=>({img:raw(u[0]),own:raw(u[1])}))});
const out=input.frames.map(f=>{
 const opts={order:f.order};
 if(f.canvas||input.canvas)opts.canvas=f.canvas||input.canvas;
 const rawLower=f.lower||input.lower;
 if(rawLower){const img=raw(rawLower);opts.lower={img,bbox:R.bboxOf(img),scaled:null}}
 if(input.stage==="parts"){opts.order=R.w4RaiseOrder(prep,f.pose,f.order);return Buffer.from(R.renderParts(prep,f.pose,opts)).toString("base64")}
 return Buffer.from(R.render(prep,f.pose,opts)).toString("base64");
});
process.stdout.write(JSON.stringify(out));
