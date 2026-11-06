'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const FB=require('../site/mahluk-2/faceless-bases.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('Male/female templates stay nude faceless and use existing V6B root schema',()=>{
 const male=FB.preset('male'),female=FB.preset('female');
 assert.deepEqual(FB.GENDERS,['male','female']);
 for(const p of [male,female]){
  assert.equal(p.animationStorageFormat,'mahluk-2-character-v1');
  assert.equal(p.template_base,'human_'+p.base+'_base');
  assert.equal(p.bodyPlane,p.base);
  assert.equal(p.outfit,'base');
  assert.equal(p.rigSystem,'v6b');
  assert.equal(p.emotionPlane.asset,'native:none');
  assert.deepEqual(p.atlas.directions,['se','sw','ne','nw']);
  assert.equal(p.atlas.width,64);
  assert.equal(p.atlas.height,448);
 }
 assert.throws(()=>FB.preset('other'));
});
test('16 anatomical rig planes stay editable; face/fringe/held prop stay separate',()=>{
 assert.equal(FB.BONE_IDS.length,16);
 for(const bone of ['head','neck','torso','pelvis',
  'shoulder_l','elbow_l','wrist_l','shoulder_r','elbow_r','wrist_r',
  'hip_l','knee_l','ankle_l','hip_r','knee_r','ankle_r'])
  assert.equal(FB.editable(bone),true);
 for(const part of [...FB.FACE_BONES,...FB.UNWANTED])
  assert.equal(FB.editable(part),false,part);
 assert.equal(FB.headSlotAllowed({bone:'head'},'male'),true);
 assert.equal(FB.headSlotAllowed({bone:'hair_back'},'female'),false);
 assert.equal(FB.headSlotAllowed({bone:'hair_back'},null),true);
});
test('Canonical root meta understood by Semesta/Bangun/Jiwa and Emosi database',()=>{
 for(const gender of FB.GENDERS){
  const r=FB.baseRecordFields(gender);
  assert.equal(r.template_base,'human_'+gender+'_base');
  assert.equal(r.facelessBase,gender);
  assert.equal(r.presetRevision,FB.PRESET_REV);
  assert.equal(FB.safeEmotion('native:none'),true);
  assert.equal(FB.safeEmotion('db:emotion-happy'),true);
  assert.equal(FB.safeEmotion('emotion-blink'),true);
  assert.equal(FB.safeEmotion('<script>'),false);
 }
});
test('Installer HTML, save/load, editable Pixel Editor and Emosi hooks are wired',()=>{
 const js=read('site/mahluk-2/studio.js');
 const html=read('site/mahluk-2/index.html');
 for(const id of ['newMaleFaceless','newFemaleFaceless','installFacelessBoth','basePresetStatus'])
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 assert.match(html,/faceless-bases\.js\?v=/);
 assert.match(js,/function newFacelessBase\(gender,\{install=false\}=\{\}\)/);
 assert.match(js,/function installFacelessPair\(\)/);
 assert.match(js,/newFacelessBase\(gender,\{install:true\}\)/);
 assert.match(js,/facelessBase=FB\.normalize\(r\.facelessBase\)/);
 assert.match(js,/facelessBase,emotionAssetId,emotionKeys,emotionPlacement/);
 assert.match(js,/rigSystem:'v6b'/);
 assert.match(js,/emotionAssetId='native:none'/);
 assert.match(js,/FB\.headSlotAllowed\(s,facelessBase\)/);
 assert.match(js,/if\(name==='none'\)return \{id,frames:1,native:'none'\}/);
 assert.match(js,/asset\.native==='none'\?null/);
 assert.match(js,/FB\.editable\(id\)/);
 assert.match(js,/onApply:\(bone,png,liveAtlas\)=>setPlanePixel\(bone,png,liveAtlas\)/);
 assert.match(js,/window\.dispatchEvent\(new CustomEvent\("mahluk2:root-saved-for-cloud"/);
 assert.doesNotThrow(()=>new Function(js));
});
