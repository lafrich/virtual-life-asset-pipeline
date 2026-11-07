const assert=require("assert");
const path=require("path");
const C=require(path.join(__dirname,"../site/v6p-compositor.js"));

function pix(pixels,w=pixels.length/4,h=1){
  return {data:new Uint8ClampedArray(pixels),width:w,height:h};
}
function hx(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];}
function rgbOf(img,i=0){return [img.data[i],img.data[i+1],img.data[i+2],img.data[i+3]];}

const nude=C.norm({
  body:"male",gender:"male",hair:"mid_curtain",hairColor:"navy",skin:"light",
  top:"nude",topColor:"charcoal",pants:"nude",pantsColor:"slate",
  shoes:"nude",shoesColor:"walnut",glasses:"none",facial:"none",face:"blank"
});
const deep=C.norm({...nude,skin:"deep"});

const Ki=hx(C.K.Ki), K7=hx(C.K.K7);
assert.deepStrictEqual(Ki,[255,44,232]);
assert.deepStrictEqual(K7,[255,68,220]);

const lightI=hx(C.P.skin.light.i), light7=hx(C.P.skin.light["7"]);
const deepI=hx(C.P.skin.deep.i);

const src=pix([Ki[0],Ki[1],Ki[2],255, K7[0],K7[1],K7[2],255],2,1);
const shown=C.keysToDisplay(src,nude);
assert.deepStrictEqual(rgbOf(shown,0),[lightI[0],lightI[1],lightI[2],255],"Ki displays as light skin");
assert.deepStrictEqual(rgbOf(shown,4),[light7[0],light7[1],light7[2],255],"K7 displays as light shade");
assert.notDeepStrictEqual(rgbOf(shown,0),[255,44,232,255],"editor must not show magenta");

const back=C.displayToKeys(shown,nude,src);
assert.deepStrictEqual(rgbOf(back,0),[Ki[0],Ki[1],Ki[2],255],"unchanged Ki round-trips");
assert.deepStrictEqual(rgbOf(back,4),[K7[0],K7[1],K7[2],255],"unchanged K7 round-trips");

const painted=pix([0x00,0xCC,0x66,255, shown.data[4],shown.data[5],shown.data[6],255],2,1);
const stored=C.displayToKeys(painted,nude,src);
assert.deepStrictEqual(rgbOf(stored,0),[0x00,0xCC,0x66,255],"free color stays as-is");
assert.deepStrictEqual(rgbOf(stored,4),[K7[0],K7[1],K7[2],255],"untouched neighbor stays a key");

const shownDeep=C.keysToDisplay(src,deep);
assert.deepStrictEqual(rgbOf(shownDeep,0),[deepI[0],deepI[1],deepI[2],255],"same key previews as deep skin");
assert.notDeepStrictEqual(rgbOf(shownDeep,0),rgbOf(shown,0),"skin tones differ");
assert.deepStrictEqual(rgbOf(C.displayToKeys(shownDeep,deep,src),0),[Ki[0],Ki[1],Ki[2],255],"deep preview still saves as Ki");

const paintedSkin=pix([lightI[0],lightI[1],lightI[2],255],1,1);
const asKey=C.displayToKeys(paintedSkin,nude,null);
assert.deepStrictEqual(rgbOf(asKey,0),[Ki[0],Ki[1],Ki[2],255],"painting the displayed skin color writes the skin key");

const js=require("fs").readFileSync(path.join(__dirname,"../site/pixel-editor.js"),"utf8");
assert.match(js,/fileToDisplay/);
assert.match(js,/displayToFile/);
assert.match(js,/displayToFile\(state\.current\)/);
assert.doesNotMatch(js,/SHOW REAL COLORS|show-real-colors/);
assert.match(require("fs").readFileSync(path.join(__dirname,"../site/v6p-compositor.js"),"utf8"),/function keysToDisplay/);
console.log("test_v6p_key_display: ok");
