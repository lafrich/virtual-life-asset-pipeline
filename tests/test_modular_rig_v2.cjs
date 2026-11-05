"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const R=require("../site/modular-rig-v2.js");

test("new v2 reference is approved while archived V6B actors remain hidden",()=>{
 const source=fs.readFileSync("site/character-reference-reset.js","utf8");
 assert.match(source,/human_pixel_reference_v2/);
 assert.match(source,/active:true/);
 assert.equal(R.ID,"human_pixel_reference_v2");
 assert.deepEqual(R.DIR,["se","sw","ne","nw"]);
 assert.equal(R.W,64);assert.equal(R.H,112);
});
test("hierarchical pixel cutouts have separate head, emotion, brows, eyes and mouth",()=>{
 assert.equal(R.HIERARCHY.torso,"pelvis");
 assert.equal(R.HIERARCHY.head,"neck");
 assert.equal(R.HIERARCHY.emotion,"head");
 for(const id of ["brow_l","brow_r","eye_l","eye_r","mouth"])
  assert.equal(R.HIERARCHY[id],"emotion",id+" must follow emotion which follows head");
 for(const id of ["shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r",
   "hip_l","knee_l","ankle_l","hip_r","knee_r","ankle_r"])
  assert.ok(R.BMAP[id],"independent body module "+id);
 assert.equal(R.HIERARCHY.phone,"wrist_l","phone prop follows wrist");
});
test("head rotation and translation carry all facial modules but not the torso",()=>{
 const a=R.neutral(),before=R.world(a);
 a.parts.head.x=6;a.parts.head.y=-4;
 const after=R.world(a);
 assert.equal(after.head.x-before.head.x,6);
 assert.equal(after.mouth.x-before.mouth.x,6);
 assert.equal(after.eye_l.x-before.eye_l.x,6);
 assert.equal(after.brow_r.y-before.brow_r.y,-4);
 assert.equal(after.torso.x,before.torso.x);
 a.parts.head.angle=30;
 const turned=R.world(a);
 assert.notEqual(Math.round(turned.eye_l.x*10),Math.round(after.eye_l.x*10));
 a.parts.emotion.x=3;
 const shifted=R.world(a);
 assert.notEqual(shifted.mouth.x,turned.mouth.x);
 assert.equal(shifted.head.x,turned.head.x);
});
test("body root moves shoes/face without losing cutout independence",()=>{
 const original=R.world(R.referencePose());
 const model=R.referencePose();model.parts.pelvis.x+=4;model.parts.pelvis.y+=3;
 const moved=R.world(model);
 assert.equal(moved.head.x-original.head.x,4);
 assert.equal(moved.ankle_r.y-original.ankle_r.y,3);
 model.parts.eye_l.x+=2;
 const edited=R.world(model);
 assert.notEqual(edited.eye_l.x,moved.eye_l.x);
 assert.equal(edited.eye_r.x,moved.eye_r.x);
});
test("independent per-part diamond keys and emotion IDs survive interpolation",()=>{
 const tracks=R.makeTracks(),base=R.referencePose();
 const target={...base.parts.head,x:7,angle:15};
 R.key(tracks,"head",8,target);
 R.key(tracks,"emotion",8,{...base.parts.emotion,x:2},"blush");
 const sampled=R.sampleTrack(tracks,8,24,base);
 assert.equal(sampled.parts.head.x,7);
 assert.equal(sampled.parts.emotion.x,2);
 assert.equal(sampled.emotion,"blush");
 const exported=R.exportModel(base,tracks);
 assert.equal(exported.emotion_parent,"head");
 assert.deepEqual(exported.facial_children,["brow_l","brow_r","eye_l","eye_r",
  "nose","mouth","blush_l","blush_r","glasses"]);
 assert.deepEqual(exported.hair_children,["hair_back","hair_cap","fringe_l","fringe_mid","fringe_r"]);
 assert.equal(exported.tracks.head[0].frame,8);
 assert.equal(exported.model.character_id,R.ID);
});
test("art and studio contain new pixel rig controls without replacing other app editors",()=>{
 const html=fs.readFileSync("site/index.html","utf8");
 const studio=fs.readFileSync("site/rig-studio-v2.js","utf8");
 for(const id of ["switch-rig-v2","rig-v2-workspace","rig-v2-main","rig-v2-tree",
  "rig-v2-emotion","rig-v2-track-label","rig-v2-tracks","rig-v2-key",
  "rig-v2-unkey","rig-v2-export","rig-v2-png","rig-v2-playhead"]){
  if(id==="rig-v2-track-label")assert.ok(studio.includes(id));else assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const id of ["switch-poser","switch-chars","switch-animations","switch-actions","tab-custom-char"])
  assert.ok(html.includes('id="'+id+'"'),id+" original function must remain");
 assert.ok(html.includes("modular-rig-v2.js"));
 assert.ok(html.includes("rig-studio-v2.js"));
 assert.ok(html.includes("rig-studio-v2.css"));
 assert.ok(html.includes("anatomy-first-v5"));
 assert.ok(studio.includes("R.key(tracks"));
});


test("reference silhouette uses independent hair, glasses, blush and enlarged streetwear proportions",()=>{
 const nodes=R.BONES.map(x=>x.id);
 for(const id of ["hair_back","hair_cap","fringe_l","fringe_mid","fringe_r"])
  assert.equal(R.HIERARCHY[id],"head",id+" belongs to moving head");
 for(const id of ["glasses","nose","blush_l","blush_r"])
  assert.equal(R.HIERARCHY[id],"emotion",id+" belongs to emotion");
 assert.ok(nodes.length>=30);
 assert.deepEqual(R.PROPORTIONS.head,[19,31,38,25]);
 assert.deepEqual(R.PROPORTIONS.shoes,[18,96,30,7]);
 assert.ok(R.PALETTE.hairGlint);
 assert.ok(R.PALETTE.emblem);
 const model=R.referencePose(),initial=R.world(model);
 model.parts.head.angle=17;model.parts.head.x=3;
 const moved=R.world(model);
 assert.notEqual(moved.hair_cap.x,initial.hair_cap.x);
 assert.notEqual(moved.glasses.x,initial.glasses.x);
 model.parts.glasses.x=4;
 const changed=R.world(model);
 assert.notEqual(changed.glasses.x,moved.glasses.x);
 assert.equal(changed.head.x,moved.head.x);
});
test("all four directions and seven facial emotions render fully using pixel-aligned rectangles",()=>{
 const canvas={save(){},restore(){},translate(){},scale(){},rotate(){},
  fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));this.rects++;},
  clearRect(){this.clears++;},
  rects:0,clears:0};
 for(const direction of R.DIR){
  const pose=R.referencePose();
  for(const emotion of R.EMOTIONS){
   pose.emotion=emotion;
   R.draw(canvas,pose,direction);
  }
 }
 assert.ok(canvas.rects>1500,"detailed pixel-cluster renderer draws every view and expression");
 assert.equal(canvas.clears,28);
});
test("legacy saved rig state normalizes with new face and hair nodes without discarding older keyframes",()=>{
 const before={parts:{head:{x:3,y:4,angle:2,scale:1,visible:true}},
  emotion:"mischievous",phone:true};
 const after=R.normalize(before);
 assert.equal(after.parts.head.x,3);
 assert.ok(after.parts.glasses);
 assert.ok(after.parts.fringe_mid);
 assert.ok(after.parts.blush_l);
 assert.equal(after.emotion,"mischievous");
 const exp=R.exportModel(after,R.makeTracks());
 assert.equal(exp.art_revision,R.ART_REVISION);
 assert.match(exp.art_revision,/anatomy-first-universal-rig/);
 assert.equal(exp.nodes.length,R.BONES.length);
});
test("rig studio includes hair and face controls and character expressions get unique thumbnails",()=>{
 const studio=fs.readFileSync("site/rig-studio-v2.js","utf8");
 const app=fs.readFileSync("site/app.js","utf8");
 for(const part of ["hair_back","hair_cap","fringe_l","fringe_mid","fringe_r",
  "blush_l","blush_r","glasses","nose"])assert.ok(studio.includes(part),part);
 assert.match(app,/const faceSheet=makeAtlas\(id\)/);
 assert.match(app,/portrait:faceTile.toDataURL/);
});

test("updated art migration archives old browser poses instead of silently reusing them",()=>{
 const studio=fs.readFileSync("site/rig-studio-v2.js","utf8");
 const app=fs.readFileSync("site/app.js","utf8");
 assert.match(studio,/artRevision:R\.ART_REVISION/);
 assert.match(studio,/STORE\+"-previous-reference-backup"/);
 assert.match(app,/saved\.artRevision===rig\.ART_REVISION/);
});

test("universal male/female base is unclothed by default, and outfit is detachable",()=>{
 const original=R.neutral();
 assert.equal(original.gender,"male");
 assert.equal(original.outfit,false);
 const female=R.normalize({...original,gender:"female",outfit:true});
 assert.equal(female.gender,"female");
 assert.equal(female.outfit,true);
 const male=R.normalize({...female,gender:"male",outfit:false});
 assert.equal(male.gender,"male");
 assert.equal(male.outfit,false);
 assert.equal(R.exportModel(female,R.makeTracks()).gender,"female");
 assert.ok(R.sourceSlot({gender:"male",mode:"base"},male));
 assert.ok(!R.sourceSlot({gender:"female",mode:"base"},male));
 assert.ok(R.sourceSlot({gender:"female",mode:"outfit"},female));
 assert.ok(!R.sourceSlot({gender:"female",mode:"base"},female));
});
test("bone world origins stay true to native source pixel coordinates",()=>{
 const neutral=R.world(R.neutral());
 for(const bone of R.BONES){
  assert.equal(neutral[bone.id].x,bone.x,bone.id+" X");
  assert.equal(neutral[bone.id].y,bone.y,bone.id+" Y");
 }
 assert.equal(neutral.root.y,100,"root should no longer shift all pixels by -39");
});
test("anatomical left/right mapping is mirror-aware without stealing opposite leg",()=>{
 for(const dir of R.DIR){
  assert.equal(R.mirrorBone("hip_l",dir),dir==="sw"||dir==="nw"?"hip_r":"hip_l");
  assert.equal(R.mirrorBone("knee_r",dir),dir==="sw"||dir==="nw"?"knee_l":"knee_r");
 }
});
test("gizmo uses discreet pins and a selected rotation ring with snap-capable angle math",()=>{
 const G=require("../site/rig-gizmo-v2.js");
 const a={x:22,y:60,visible:true},b={x:42,y:60,visible:true};
 const world={shoulder_l:a,shoulder_r:b};
 assert.deepEqual(G.projected(a,"sw"),{x:42,y:60});
 assert.deepEqual(G.projected(a,"ne"),{x:22,y:60});
 assert.equal(G.hitTest(world,"shoulder_l",{x:22,y:60},"se").bone,"shoulder_l");
 assert.equal(G.hitTest(world,"shoulder_l",{x:30,y:60},"se").mode,"rotate");
 assert.equal(Math.round(G.deltaAngle(0,Math.PI/2)),90);
 assert.equal(Math.round(G.deltaAngle(0,-Math.PI/2)),-90);
 const studio=fs.readFileSync("site/rig-studio-v2.js","utf8");
 const html=fs.readFileSync("site/index.html","utf8");
 for(const el of ["rig-v2-gender","rig-v2-outfit","rig-v2-joints-visible"])
  assert.ok(html.includes('id="'+el+'"'));
 assert.ok(studio.includes("ctx.globalAlpha=.20"));
 assert.ok(studio.includes("G.hitTest("));
 assert.ok(studio.includes('drag.mode==="rotate"'));
});
test("source generator checks 16 gender/outfit direction variants for pixel-exact skin ownership",()=>{
 const py=fs.readFileSync("tools/build_original_rig_layers.py","utf8");
 const build=fs.readFileSync("tools/build_character_catalog.py","utf8");
 assert.ok(py.includes('def native_gender_models('));
 assert.ok(py.includes('def split_body_pixels('));
 assert.ok(py.includes('def publish_gender_bases('));
 assert.ok(py.includes('np.array_equal'));
 assert.ok(py.includes('Image.Transpose.FLIP_LEFT_RIGHT'));
 assert.ok(build.indexOf('build_original_rig_layers(media)')>
   build.indexOf('results.extend(build_human_templates(ROOT,media))'));
});

test("anatomy-first renderer always draws ONE naked base, with clothing as an optional overlay",()=>{
 const male=R.neutral(),female=R.normalize({...male,gender:"female"});
 for(const state of [male,female]){
  for(const clothed of [false,true]){
   state.outfit=clothed;
   assert.equal(R.sourceSlot({gender:state.gender,layer_type:"body"},state),true);
   assert.equal(R.sourceSlot({gender:state.gender,layer_type:"garment"},state),clothed);
   const opposite=state.gender==="male"?"female":"male";
   assert.equal(R.sourceSlot({gender:opposite,layer_type:"body"},state),false);
   assert.equal(R.sourceSlot({gender:opposite,layer_type:"garment"},state),false);
  }
 }
 // Original archived mode-specific PNG records continue loading safely.
 assert.equal(R.sourceSlot({gender:"male",mode:"base"},male),false);
 assert.equal(R.sourceSlot({gender:"male",mode:"outfit"},male),true);
 const py=fs.readFileSync("tools/build_original_rig_layers.py","utf8");
 const guide=fs.readFileSync("tools/build_human_templates.py","utf8");
 assert.ok(py.includes("variants, anatomy_sources, clothing_sources"));
 assert.ok(py.includes("for layer_type, by_view in"));
 assert.ok(py.includes('("body", body_parts), ("garment", garment_parts)'));
 assert.ok(guide.includes("rig_source_sink"));
 assert.ok(guide.includes('f"{name}-rig-source.npz"'));
});
