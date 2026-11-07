const assert=require("assert");
const path=require("path");
const fs=require("fs");
const A=require(path.join(__dirname,"../site/v6p-activity-contract.js"));
const C=require(path.join(__dirname,"../site/v6p-compositor.js"));

assert.strictEqual(A.CONTRACT,"v6p-act ACTIVITY SHEET CONTRACT v2");
assert.strictEqual(A.W,384);assert.strictEqual(A.H,2688);
assert.deepStrictEqual(A.PIVOT,[32,100]);
assert.deepStrictEqual(A.DIRS,["se","sw","ne","nw"]);
assert.strictEqual(A.BANDS.squat.status,"draft_inactive");
assert.strictEqual(A.BANDS.pushup.status,"authored");
assert.strictEqual(A.BANDS.pushup.start,4);
assert.strictEqual(A.BANDS.pushup.frames,4);
assert.strictEqual(A.BANDS.pushup.ms,160);
assert.strictEqual(A.BANDS.pushup.emosi,false);
assert.deepStrictEqual(A.BANDS.pushup.keys,["plank_high","descending","bottom","ascending"]);
assert.strictEqual(A.BANDS.yoga_sphinx_idle.start,8);
assert.strictEqual(A.BANDS.yoga_sphinx_idle.ms,500);
assert.strictEqual(A.BANDS.yoga_sphinx_idle.emosi,true);
assert.strictEqual(A.BANDS.yoga_puppy_idle.start,12);
assert.strictEqual(A.BANDS.hip_shake.start,16);
assert.strictEqual(A.BANDS.hip_shake.frames,6);
assert.strictEqual(A.BANDS.yoga_happy_baby_idle.start,20);
assert.ok(!A.BANDS.jumping_jack);
assert.ok(A.INACTIVE.includes("squat"));
assert.ok(A.isPlayable("pushup"));
assert.ok(!A.isPlayable("squat"));
const o=A.cellOrigin(4,"se",0);
assert.deepStrictEqual(o,{x:0,y:448,w:64,h:112});
const man=A.pushupManifest();
assert.strictEqual(man.id,"clip_pushup");
assert.strictEqual(man.bandStart,4);
assert.strictEqual(man.frames.length,4);
assert.strictEqual(man.frames[0].ms,160);

function fakeFiles(ch){
  const top=ch.top==="nude"?"top/nude":"top/"+ch.top;
  const pants=ch.pants==="nude"?"pants/nude":"pants/"+ch.pants;
  const shoes=ch.shoes==="nude"?"shoes/nude":"shoes/"+ch.shoes;
  return ["hair/mid_curtain_back","base/body",top,pants,shoes,"hair/mid_curtain_front","face/m_blank"];
}
const has=part=>A.PILOT_PARTS.includes(part);
const ok=A.availability({top:"nude"},man,has,()=>fakeFiles({top:"nude",pants:"nude",shoes:"nude"}));
assert.ok(ok.ok, ok.note);
const no=A.availability({top:"tee"},man,has,()=>fakeFiles({top:"tee",pants:"trousers",shoes:"shoes"}));
assert.ok(!no.ok);
assert.ok(no.unsupported.includes("top/tee"));
assert.match(no.note,/no auto-strip/);

assert.deepStrictEqual(C.ROWS,{walk:0,idle:4,talk:8,sit:12,sit_type:16,sleep:20,tired:24,swim:28,float:32,lie:36,perch:40});
assert.strictEqual(Object.keys(C.ROWS).length*4,44);
assert.ok(A.SEMESTA_ACT_CLIPS.includes("pushup"));
assert.ok(!A.SEMESTA_ACT_CLIPS.includes("squat"));

const html=fs.readFileSync(path.join(__dirname,"../site/pixel-editor.html"),"utf8");
assert.match(html,/v6p-activity-contract\.js/);
assert.match(html,/v6p-clip-store\.js/);
assert.match(html,/id="clip-play"/);
assert.match(html,/id="clip-strip"/);
const pub=fs.readFileSync(path.join(__dirname,"../site/vlhub-characters-publish.js"),"utf8");
assert.match(pub,/pushup\|yoga_sphinx_idle/);
assert.doesNotMatch(pub,/jumping_jack/);
console.log("test_v6p_activity_contract: ok");
