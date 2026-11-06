/* EMOSI.EXE compatibility: native 64x112 manual face atlas validator and renderer only. No standalone UI or GitHub credential flow. */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.MH2UniversalEmotions=api;})(typeof window!=="undefined"?window:null,function(){"use strict";
const FORMAT="mahluk-2-universal-emotions-v1";
const DIR=["se","sw","ne","nw"];
const TEMPLATES=["neutral","happy","angry","sad","surprised","shy","cheeky","bleh","wink","sleepy","cry","grimace"];
function validEntry(a){return !!a&&/^[-a-z0-9_]{1,64}$/.test(a.id)&&typeof a.name==="string"&&a.name.length<=90&&["universal","male","female","original"].includes(a.base)&&Number.isInteger(a.frames)&&a.frames>=1&&a.frames<=48&&(TEMPLATES.includes(a.template)||typeof a.png==="string"&&/^data:image\/png;base64,[a-z\d+/=]+$/i.test(a.png)&&a.png.length<3000000);}
function validateCatalog(d){if(!d||d.format!==FORMAT||!Array.isArray(d.entries)||d.entries.length>250||!d.entries.every(validEntry)||new Set(d.entries.map(a=>a.id)).size!==d.entries.length)throw Error("Universal emotion catalog invalid");return d;}
function rgba(ctx,color,x,y,w=1,h=1){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function drawFace(ctx,type,frame,direction,xOffset){
 if(direction>1)return; // Back of head is intentionally transparent.
 const x=xOffset+(direction===1?0:0),off=frame%3===1?1:0;
 const ink="#2b2024",rose="#ed8ca1",blue="#6c9ad6";
 const eye=(xx,y,closed=false)=>{if(closed)rgba(ctx,ink,x+xx,y,5,1);else{rgba(ctx,ink,x+xx,y,3,3);rgba(ctx,"#faf0e7",x+xx+1,y,1,1)}};
 const line=(points,color=ink)=>{for(const [xx,yy,w=2,h=1] of points)rgba(ctx,color,x+xx,yy,w,h)};
 if(type==="angry"){line([[21,35,7,2],[36,37,7,2],[26,37,3,2],[36,35,5,2]]);eye(23,40);eye(38,40);line([[28,51,10,2],[26,53,3,1],[38,53,3,1]])}
 else if(type==="sad"){line([[22,37,6,1],[37,36,6,1]]);eye(23,40);eye(38,40);line([[27,54,3,2],[30,52,7,1],[37,54,3,2]])}
 else if(type==="surprised"){eye(23,36);eye(39,36);line([[31,49,5,7],[30,51,1,3],[36,51,1,3]])}
 else if(type==="happy"){eye(23,36,off===1);eye(39,36,off===1);line([[26,48,2,3],[28,51,3,2],[31,52,5,2],[36,51,3,2],[39,48,2,3]])}
 else if(type==="shy"){eye(23,37,true);eye(39,37,true);rgba(ctx,rose,x+18,45,8,3);rgba(ctx,rose,x+42,45,8,3);line([[28,51,3,1],[31,52,6,1],[37,51,3,1]])}
 else if(type==="cheeky"){eye(23,36,off!==0);eye(39,36);line([[27,49,4,2],[31,51,8,2],[39,49,3,1]]);rgba(ctx,rose,x+45,44,5,2)}
 else if(type==="bleh"){eye(23,36,true);eye(39,36,true);line([[28,49,13,2],[30,51,9,2]]);rgba(ctx,rose,x+33,53,6,4+off);rgba(ctx,ink,x+34,54,1,2)}
 else if(type==="wink"){eye(23,36,frame%3===0?false:true);eye(39,36);line([[28,50,3,1],[31,51,6,2],[37,50,3,1]])}
 else if(type==="sleepy"){eye(23,39,true);eye(39,39,true);line([[31,52,6,1]])}
 else if(type==="cry"){eye(23,36);eye(39,36);rgba(ctx,blue,x+25,41,2,5+off*2);rgba(ctx,blue,x+41,41,2,5+off*2);line([[28,52,3,1],[31,50,6,1],[37,52,3,1]])}
 else if(type==="grimace"){eye(23,36);eye(39,36);rgba(ctx,ink,x+28,49,13,6);rgba(ctx,"#faf1e7",x+29,50,11,2);line([[33,50,1,4],[37,50,1,4]])}
 else{eye(23,37);eye(39,37);line([[31,51,6,1]])}
}
function renderTemplate(entry){const c=document.createElement("canvas");c.width=64*entry.frames;c.height=448;const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
 for(let d=0;d<2;d++)for(let f=0;f<entry.frames;f++){ctx.save();ctx.translate(f*64,d*112);drawFace(ctx,entry.template,f,d,0);ctx.restore()}return c}
async function renderAtlas(entry){if(!validEntry(entry))throw Error("Invalid emotion entry");if(entry.template&&!entry.png)return renderTemplate(entry);
 const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Unable to decode emotion image"));im.src=entry.png});
 if(img.naturalWidth!==64*entry.frames||img.naturalHeight!==448)throw Error("PNG must be "+(64*entry.frames)+"×448");
 const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=448;c.getContext("2d").drawImage(img,0,0);return c;
}
return Object.freeze({FORMAT,DIR,TEMPLATES,validEntry,validateCatalog,renderTemplate,renderAtlas});
});