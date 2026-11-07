"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const core=require("../site/pixel-edit-core.js");
const base=path.join(__dirname,"../site");
const page=fs.readFileSync(path.join(base,"pixel-editor.html"),"utf8");
const controller=fs.readFileSync(path.join(base,"pixel-editor.js"),"utf8");
assert.equal(core.key("walk","se",0),"walk|se|0");
assert.throws(()=>core.key("walk","se",6),/Invalid/);
assert.throws(()=>core.key("walk","side",0),/Invalid/);
assert.equal(core.isEditable(8,18),true);
assert.equal(core.isEditable(55,71),true);
for(const point of [[7,18],[56,20],[32,72],[32,0],[0,100]])
 assert.equal(core.isEditable(...point),false);
const standard={format:"virtual-life-pixel-patch-v1",version:1,actor:"legacy_otis",frame_size:[64,112],region:[8,18,56,72],
 frames:[{action:"walk",direction:"sw",frame:2,png:"data:image/png;base64,QUJDRA=="}]};
assert.equal(core.validatePatch(standard),true);
assert.throws(()=>core.validatePatch({...standard,actor:"legacy_theodore"}));
assert.throws(()=>core.validatePatch({...standard,region:[0,0,64,112]}));
assert.throws(()=>core.validatePatch({...standard,frames:standard.frames.concat(standard.frames)}));
assert.throws(()=>core.validatePatch({...standard,frames:[{...standard.frames[0],png:"https://evil.test/edit.png"}]}));
assert.deepEqual(core.bresenham(1,1,3,2),[[1,1],[2,1],[3,2]]);
const data=new Uint8ClampedArray(64*112*4);
const image={data};let i=(18*64+8)*4;
data.set([3,4,5,255],i);
assert.equal(core.flood(image,8,18,[30,40,50,255]),true);
assert.deepEqual([...data.slice(i,i+4)],[30,40,50,255]);
assert.deepEqual([...data.slice(0,4)],[0,0,0,0],"outside head remains locked");
for(const id of ["pixel-canvas","action","direction","frame","undo","redo",
 "export-patch","import-patch","color","grid","zoom","small-preview"])
 assert.ok(page.includes('id="'+id+'"'),"Missing required editor control "+id);
assert.ok(controller.includes("localStorage.setItem(LOCAL"),"draft must save in browser");
assert.ok(controller.includes("core.validatePatch(p"),"import must validate patch");
assert.ok(controller.includes("toPNG(data)"),"must export exact PNG frames");

const region=[8,18,56,72];
const rect=core.selectionRect(22,32,20,30,region);
assert.deepEqual(rect,[20,30,23,33]);
const bitmap=()=>({data:new Uint8ClampedArray(64*112*4)});
const original=bitmap();
const put=(target,x,y,r)=>target.data.set([r,0,0,255],(y*64+x)*4);
const get=(target,x,y)=>Array.from(target.data.slice((y*64+x)*4,(y*64+x)*4+4));
put(original,20,30,101);put(original,22,31,202);put(original,0,0,99);
const flippedH=core.flipPixels(original,rect,"horizontal",region);
assert.deepEqual(get(flippedH,22,30),[101,0,0,255]);
assert.deepEqual(get(flippedH,20,31),[202,0,0,255]);
const flippedV=core.flipPixels(original,rect,"vertical",region);
assert.deepEqual(get(flippedV,20,32),[101,0,0,255]);
const translated=core.movePixels(original,rect,3,2,region);
assert.deepEqual(translated.box,[23,32,26,35]);
assert.deepEqual(get(translated,23,32),[101,0,0,255]);
assert.deepEqual(get(translated,20,30),[0,0,0,0]);
assert.deepEqual(get(translated,0,0),[99,0,0,255],"unchanged pixels outside body part");
assert.deepEqual(core.movePixels(original,rect,999,-999,region).box,[53,18,56,21]);
assert.throws(()=>core.flipPixels(original,[0,0,10,10],"horizontal",region));
assert.throws(()=>core.movePixels(original,rect,1.5,0,region));
for(const id of ["pan-toggle","cursor-toggle","cursor-tap","cursor-left","cursor-right",
 "cursor-up","cursor-down","flip-horizontal","flip-vertical","deselect",
 "nudge-left","nudge-right","nudge-up","nudge-down","selection-info"])
 assert.ok(page.includes('id="'+id+'"'),"Missing touchpad/selection control "+id);
for(const tool of ["select","move","pencil","erase","pick","fill"])
 assert.ok(page.includes('data-tool="'+tool+'"'),"Missing tool "+tool);
assert.ok(controller.includes("function cursorTap()"),"touch cursor needs an apply handler");
assert.ok(controller.includes("function editMove(e)"),"cursor must track pointer movement");
assert.ok(controller.includes("core.flipMasked("),"flip must alter selected pixel shape");
assert.ok(controller.includes("core.moveMasked("),"move must alter selected pixel shape");
assert.ok(controller.includes("commit(d.before,d.box,d.mask)"),"shape move must support undo");
assert.ok(controller.includes("cursorMode:MOBILE_TOUCH"),"mobile must use non-paint touchpad by default");


const xpStyle=fs.readFileSync(path.join(base,"pixel-editor.css"),"utf8");
assert.ok(xpStyle.includes("--xp-face:#c9c8c4"),"editor must match original XP chrome");
assert.ok(xpStyle.includes("html{width:100%;max-width:100%;min-width:0;overflow-x:hidden}"),"no horizontal page overflow on phones");
assert.ok(xpStyle.includes("overflow:auto;padding:0"),"higher zooms scroll inside editor viewport");
assert.ok(xpStyle.includes("padding:16px"),"canvas needs a non-paintable gutter on mobile");
assert.ok(page.includes('<option value="2">2×</option>')&&page.includes('<option value="3">3×</option>'),"mobile needs smaller exact-pixel zoom values");
assert.ok(controller.includes("function fitMobileZoom()")&&controller.includes("userSetZoom=true"),"mobile fit should yield to manual zoom");


/* Pixel-accurate Magic Wand, connected vs global color, additive/subtractive
   Photoshop-style masks, and irregular move/flip protection. */
const editRegion=[8,18,56,72],painted=bitmap();
const stamp=(x,y,c)=>put(painted,x,y,c);
stamp(12,20,61);stamp(13,20,61);stamp(16,20,61);
stamp(14,20,85);stamp(12,21,99);
const connected=core.wandMask(painted,12,20,editRegion,0,true);
const allMatching=core.wandMask(painted,12,20,editRegion,0,false);
assert.equal(core.maskCount(connected),2,"connected only two neighboring pixels");
assert.equal(core.maskCount(allMatching),3,"non-contiguous selects distant same-color island");
assert.equal(connected[20*64+16],0,"distant island excluded by connected mode");
assert.equal(allMatching[20*64+16],1,"distant island included by global color mode");
const added=core.combineMasks(connected,core.maskRect([14,20,15,21],editRegion),"add");
assert.equal(core.maskCount(added),3,"ADD selects other colors without losing original");
const subtracted=core.combineMasks(added,core.maskRect([13,20,15,21],editRegion),"subtract");
assert.equal(core.maskCount(subtracted),1,"SUBTRACT only removes targeted pixels");
assert.equal(subtracted[20*64+12],1,"SUBTRACT preserves separate selected pixels");
assert.equal(core.maskCount(core.combineMasks(added,connected,"replace")),2);
assert.throws(()=>core.combineMasks(connected,added,"invert"));
assert.throws(()=>core.wandMask(painted,12,20,editRegion,-1));
assert.throws(()=>core.wandMask(painted,0,0,editRegion,0,true));
stamp(30,29,61);stamp(31,29,64);
assert.equal(core.maskCount(core.wandMask(painted,30,29,editRegion,0,true)),1);
assert.equal(core.maskCount(core.wandMask(painted,30,29,editRegion,3,true)),2,"tolerance includes near-matching colors");
const piece=core.combineMasks(connected,core.maskRect([16,20,17,21],editRegion),"add");
const movedIrregular=core.moveMasked(painted,piece,0,2,editRegion);
assert.deepEqual(get({data:movedIrregular.data},12,22),[61,0,0,255]);
assert.deepEqual(get({data:movedIrregular.data},16,22),[61,0,0,255]);
assert.deepEqual(get({data:movedIrregular.data},14,20),[85,0,0,255],"move preserves unselected pixel inside bounds");
assert.equal(movedIrregular.mask[22*64+16],1,"moved selection follows selected pixels");
const flippedIrregular=core.flipMasked(painted,piece,"horizontal",editRegion);
assert.deepEqual(get({data:flippedIrregular.data},16,20),[61,0,0,255]);
assert.deepEqual(get({data:flippedIrregular.data},14,20),[85,0,0,255],"flip must preserve unselected interior");
assert.equal(flippedIrregular.mask[20*64+15],1,"flipped irregular selection tracks changed pixels");
assert.equal(flippedIrregular.mask[20*64+13],0,"unselected interior must stay unselected after flip");
const farMask=core.maskRect([55,30,56,31],editRegion);
assert.equal(core.moveMasked(painted,farMask,900,0,editRegion).box[2],56,"moves cannot cross locked part boundaries");
assert.deepEqual(get({data:movedIrregular.data},0,0),[0,0,0,0],"locked exterior never modified");
for(const control of ["wand-contiguous","wand-tolerance","wand-tolerance-value"])
 assert.ok(page.includes('id="'+control+'"'),"Missing Magic Wand control "+control);
for(const mode of ["replace","add","subtract"])
 assert.ok(page.includes('data-select-mode="'+mode+'"'),"Missing selection mode "+mode);
assert.ok(page.includes('data-tool="wand"'),"Magic Wand should be available in pixel toolbar");
assert.ok(controller.includes("function colorSelection(")&&controller.includes("core.wandMask("));
assert.ok(controller.includes("state.selectionMask"),"shape masks must be used instead of boxes");
assert.ok(controller.includes('if(state.tool==="wand")'),"wand must work in direct and cursor modes");

console.log("PASS: real 64x112 pixel editor, region lock, brush/fill, validated import/export and Otis-only launch");

for(const id of ["copy-selection","cut-selection","paste-selection","paste-flip","select-all","clipboard-info","paste-replace","clip-play","clip-pause","clip-add","clip-dup","clip-del","clip-strip","clip-prev-m","clip-prev-f","clip-ms","clip-onion"])
 assert.ok(page.includes('id="'+id+'"'),"Missing Emosi clipboard control "+id);
assert.ok(page.includes("emotion-studio/shared-pixel-selection.js"),"must reuse Emosi MH2PixelSelection");
assert.ok(controller.includes("function copySelection(")&&controller.includes("function pasteSelection("));
assert.ok(controller.includes("floatingPaste")&&controller.includes("MH2PixelSelection"));
assert.ok(controller.includes('if(mod&&k==="c")')&&controller.includes('if(mod&&k==="v")'));
assert.ok(controller.includes("mh2-rgba-clipboard-v1"),"clipboard key must match Emosi");
assert.doesNotMatch(controller,/if\(e\.ctrlKey\)return;/,"Ctrl+C/V must not be swallowed after undo");
const S=require("../site/emotion-studio/shared-pixel-selection.js");
const src=new Uint8ClampedArray(64*112*4);
src.set([200,10,20,255],(20*64+10)*4);
src.set([10,200,20,255],(21*64+11)*4);
const clipStamp=S.copy(src,64,112,{x:10,y:20,w:4,h:4});
assert.equal(clipStamp.format,S.CLIP_FORMAT);
assert.deepEqual([...clipStamp.pixels.slice(0,4)],[200,10,20,255]);
const dest=new Uint8ClampedArray(64*112*4);
dest.set([9,9,9,255],(40*64+30)*4);
const out=S.paste(dest,64,112,clipStamp,{x:30,y:40});
assert.deepEqual([...out.slice((40*64+30)*4,(40*64+30)*4+4)],[200,10,20,255],"paste writes copied pixels onto another cell");
assert.deepEqual([...src.slice((20*64+10)*4,(20*64+10)*4+4)],[200,10,20,255],"copy source stays intact");
const emptyBase=new Uint8ClampedArray(64*112*4);
emptyBase.set([1,2,3,255],(40*64+31)*4);
const floated=S.paste(emptyBase,64,112,clipStamp,{x:32,y:42});
assert.deepEqual([...floated.slice((42*64+32)*4,(42*64+32)*4+4)],[200,10,20,255]);
assert.deepEqual([...floated.slice((40*64+31)*4,(40*64+31)*4+4)],[1,2,3,255],"floating paste does not erase destination outside stamp");

console.log("PASS: Emosi-style copy/paste via MH2PixelSelection, clipboard UI, and cross-frame paste");
