// Reproduce assets/indonesia_interiors/manifest.json from pipeline source.
// Run: node assets/indonesia_interiors/generate-manifest.cjs [--check]
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
const script=fs.readFileSync(path.join(root,'site/indonesia-interior-templates.js'),'utf8');
const window={};vm.runInNewContext(script,{window});
const pack=window.VLIndonesiaInteriorPack;
if(pack.count!==66||Object.keys(pack.types).length!==43)throw Error('Unexpected recipe/type count');
const manifest={
 _meta:{
  id:'indonesia-interiors-v1',version:1,
  source:'site/indonesia-interior-templates.js',
  type:'procedural-room-recipes',projection:'isometric 2:1',
  tile_pixels:[64,32],base_palette:'virtual-life',category_count:5,
  template_count:pack.count,additional_furniture_types:Object.keys(pack.types).length,
  asset_approval:'pending',integration:'Bangun Ruang / Semesta preview',
  limitations:'Editor action metadata; gameplay hooks and unrigged animations are not implemented in multiplayer.'
 },
 actions:pack.actions,types:pack.types,templates:pack.templates
};
const output=path.join(__dirname,'manifest.json');
const json=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){
 if(fs.readFileSync(output,'utf8')!==json)throw Error('Manifest stale; run generator');
 console.log('Indonesia interior manifest up to date: '+pack.count+' templates, '+Object.keys(pack.types).length+' furniture types');
}else{
 fs.writeFileSync(output,json);
 console.log('Wrote '+output);
}
