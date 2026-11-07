'use strict';
const $=id=>document.getElementById(id), DIRS=['se','sw','ne','nw'];
const state={catalog:[],job:null,recipe:null,token:null,clientId:'',folderId:'',driveFiles:[],pendingPalette:null,driveSavedIds:new Set()};
const MATERIALS=['oak','oakd','fab','fabl','tile','tileb','tileg','wood','woodd','steel','chrome','ceram','red','green','mint','maroon','linen','seatc','dark','yellow','glass','boxy','galon','trim','pot','veg','tomato','pink','gold2','orange2','appw'];
const engineWorker=new Worker('./browser-worker.js');
let rpcCount=0;
const pending=new Map();
engineWorker.onmessage=({data})=>{
  if(data.type==='status'){$('footerMsg').textContent=data.message;return}
  const entry=pending.get(data.id);if(!entry)return;
  pending.delete(data.id);
  if(data.ok)entry.resolve(data.value);
  else entry.reject(Error(data.error||'Worker engine failed'));
};
function engine(type,args={}){
  const id=++rpcCount;
  return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});engineWorker.postMessage({id,type,args});});
}
const STORE='v6b-asset-browser-recipes-v1';
function localRecipes(){try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[]}catch{return []}}
function saveNewRecipe(rec){const rows=localRecipes();rows.unshift(rec);localStorage.setItem(STORE,JSON.stringify(rows));return rec}
async function api(path,method='GET',body=null){
  if(path==='/api/catalog')return engine('catalog');
  if(path.startsWith('/api/materials'))return engine('materials',{template_id:new URL(path,location.href).searchParams.get('id')});
  if(path==='/api/render'&&method==='POST')return engine('render',body);
  if(path==='/api/recipes'&&method==='GET')return {recipes:localRecipes().map(x=>({id:x.id,title:x.title}))};
  if(path==='/api/recipes'&&method==='POST'){
    if(!state.job||body.job_id!==state.job.job_id)throw Error('Rendered asset not found');
    const j=state.job,rec={schema:'v6b-asset-recipe-v1',id:crypto.randomUUID().replaceAll('-',''),
      title:String(body.title||j.template_id).slice(0,90),template_id:j.template_id,
      category:j.category,source_batch:j.batch,parameters:{palette_replacements:j.palette_replacements},
      directions:Object.fromEntries(DIRS.map(d=>[d,Object.fromEntries(Object.entries(j.views[d]).filter(([k])=>!['referencePixelMatch','diffPixels'].includes(k)))])),
      image_sha256:Object.fromEntries(DIRS.map(d=>[d,j.views[d].sha256])),
      source_reference:'proposal/archived-review',semesta_import_status:'not-imported',
      drive_save_status:'not-saved',original_asset_overwritten:false,
      parent_recipe_id:body.parent_recipe_id||null,generated_at:new Date().toISOString()};
    return saveNewRecipe(rec);
  }
  if(path.startsWith('/api/recipes/')&&method==='GET'){
    const recipe=localRecipes().find(x=>x.id===path.split('/').pop());
    if(!recipe)throw Error('Recipe not found');return recipe;
  }
  throw Error('Unsupported local API operation: '+path);
}
function setMessage(id,text){$(id).textContent=text}
function updateButtons(){const ready=!!state.job;for(let id of ['saveLocal','downloadRecipe','zip'])$(id).disabled=!ready; $('saveDrive').disabled=!state.token||!state.recipe;$('readDrive').disabled=!state.token;}
function selected(){return state.catalog.find(x=>x.id===$('template').value)}
function showTemplate(){let item=selected();if(!item)return;
 const currentId=item.id;
 $('material').replaceChildren(new Option('Tidak ada (asli)',''));
 $('replacement').replaceChildren(new Option('Tidak diubah',''));
 if(item.status==='runnable')api('/api/materials?id='+encodeURIComponent(item.id)).then(res=>{
   if(selected()?.id!==currentId)return;
   $('material').replaceChildren(new Option('Tidak ada (asli)',''),...res.material_keys.map(x=>new Option(x,x)));
   $('replacement').replaceChildren(new Option('Tidak diubah',''),...res.ramp_keys.map(x=>new Option(x,x)));
   if(state.pendingPalette){let [old,newKey]=state.pendingPalette; $('material').value=old;$('replacement').value=newKey;state.pendingPalette=null;}
 }).catch(e=>setMessage('renderMsg','Palet asli tidak tersedia: '+e.message));
state.job=null;state.recipe=null;updateButtons();$('localStatus').textContent='BELUM DISIMPAN';$('driveStatus').textContent='BELUM DISIMPAN';$('semestaStatus').textContent='BELUM DIIMPOR';$('selectedTitle').textContent=item.label.toUpperCase();$('originLabel').textContent=item.batch+' · '+item.status.toUpperCase();$('sourceStatus').textContent=item.status==='runnable'?`Renderer asli tersedia · ${item.count} arah · arsip usulan, belum live.`:(item.reason||'Belum tersedia');$('render').disabled=item.status!=='runnable';$('render').textContent=item.status==='runnable'?'▶ RENDER ASLI 4 ARAH':'RENDER BELUM TERSEDIA';$('recipeTitle').value=item.label+' · V6B';DIRS.forEach(d=>{let el=$(d);el.removeAttribute('src');el.alt=`Referensi ${d} (${item.status==='runnable'?'arsip review':'belum bisa render'})`; $('download-'+d).hidden=true});engine('reference',{template_id:item.id}).then(pngs=>{if(selected()?.id!==currentId)return;DIRS.forEach(d=>{if(pngs[d])$(d).src='data:image/png;base64,'+pngs[d]})}).catch(e=>setMessage('renderMsg','Gagal memuat referensi: '+e.message));$('comparison').textContent=item.status==='runnable'?'Menampilkan gambar arsip review, belum hasil regenerasi. Klik Render untuk menjalankan Python renderer asli dan membandingkan per piksel.':'Menampilkan PNG arsip review saja. Aset ini belum dapat diregenerasi tanpa dependensi asli yang teruji. Jangan ekspor sebagai render baru.';setMessage('renderMsg','')}
function filterTemplates(){const q=$('search').value.trim().toLowerCase(),c=$('category').value;let items=state.catalog.filter(x=>x.category===c && (x.id+' '+x.label).toLowerCase().includes(q));$('template').replaceChildren(...items.map(x=>new Option((x.status==='runnable'?'✓ ':'⌛ ')+x.label,x.id)));if(items.length)showTemplate();else{$('render').disabled=true;$('sourceStatus').textContent='Tidak ditemukan';DIRS.forEach(d=>$(d).removeAttribute('src'))}}
function currentPalette(){let a=$('material').value,b=$('replacement').value;return a&&b&&a!==b?{[a]:b}:{};}
async function render(){let item=selected();if(!item)return;const expected=state.recipe?.image_sha256;state.job=null;updateButtons();$('render').disabled=true;setMessage('renderMsg','Menjalankan renderer NumPy/Pillow asli...');try{let j=await api('/api/render','POST',{template_id:item.id,palette_replacements:currentPalette()});state.job=j;state.recipe=null;updateButtons();$('localStatus').textContent='BELUM DISIMPAN';$('driveStatus').textContent='BELUM DISIMPAN';$('semestaStatus').textContent='BELUM DIIMPOR';DIRS.forEach(d=>{const uri='data:image/png;base64,'+j.pngs[d];$(d).src=uri;let a=$('download-'+d);a.hidden=false;a.href=uri;a.download=`${j.template_id}_${d}.png`});let matches=DIRS.filter(d=>j.views[d].referencePixelMatch).length;let diff=DIRS.map(d=>`${d.toUpperCase()}: ${j.views[d].diffPixels} piksel berbeda | size ${j.views[d].size.join('×')} | pivot ${j.views[d].pivot.join(',')} | footprint ${j.views[d].footprint.join('×')}`).join('\n');$('comparison').textContent=`Perbandingan dengan arsip PROPOSED: ${matches}/4 identik per piksel.\n${diff}\nGambar referensi bukan bukti sudah terpasang atau disetujui di Semesta.`;let matched=expected?DIRS.filter(d=>expected[d]===j.views[d].sha256).length:null;
 setMessage('renderMsg','Render selesai. PNG 4 arah siap diunduh.'+(matched!==null?' Pemeriksaan resep: '+matched+'/4 hash identik.':''));}catch(e){setMessage('renderMsg','GAGAL: '+e.message)}finally{$('render').disabled=item.status!=='runnable'}}
async function listLocal(){try{let r=await api('/api/recipes');$('recipeList').replaceChildren(new Option('-- Pilih resep tersimpan --',''),...r.recipes.map(x=>new Option(x.title+' · '+x.id.slice(0,7),x.id)))}catch(e){setMessage('renderMsg','Gagal memuat resep: '+e.message)}}
async function saveLocal(){if(!state.job)return;try{let body={job_id:state.job.job_id,title:$('recipeTitle').value,parent_recipe_id:state.recipe?.id||null};let r=await api('/api/recipes','POST',body);state.recipe=r;$('localStatus').textContent='TERSIMPAN • '+r.id.slice(0,8);$('driveStatus').textContent='BELUM DISIMPAN';updateButtons();await listLocal();setMessage('renderMsg','Resep tersimpan lokal tanpa menimpa revisi sebelumnya.');if(state.token)await saveDrive()}catch(e){setMessage('renderMsg','Gagal menyimpan: '+e.message)}}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000)}
function exportedRecipe(){if(state.recipe)return state.recipe;if(!state.job)throw Error('Render terlebih dahulu');let j=state.job;return {schema:'v6b-asset-recipe-v1',title:$('recipeTitle').value,template_id:j.template_id,category:j.category,source_batch:j.batch,parameters:{palette_replacements:j.palette_replacements},directions:j.views,image_sha256:Object.fromEntries(DIRS.map(d=>[d,j.views[d].sha256])),original_asset_overwritten:false,drive_save_status:'not-saved',semesta_import_status:'not-imported'}}
function importRecipe(r){if(!r||r.schema!=='v6b-asset-recipe-v1'||!state.catalog.find(x=>x.id===r.template_id))throw Error('Unsupported recipe/template');$('category').value=state.catalog.find(x=>x.id===r.template_id).category;$('search').value='';filterTemplates();$('template').value=r.template_id;showTemplate();$('recipeTitle').value=r.title||r.template_id;let p=r.parameters?.palette_replacements||{};let pair=Object.entries(p)[0];state.pendingPalette=pair||null;state.recipe=r;$('localStatus').textContent=r.id?'DIBUKA '+r.id.slice(0,8):'DIIMPOR, BELUM DISIMPAN';$('driveStatus').textContent='BELUM DISIMPAN';setMessage('renderMsg','Resep dibuka. Klik Render untuk regenerasi dan pemeriksaan hash.');updateButtons()}
async function loadLocal(){try{let id=$('recipeList').value;if(!id)throw Error('Pilih resep');let r=await api('/api/recipes/'+id);importRecipe(r)}catch(e){setMessage('renderMsg','Gagal membuka: '+e.message)}}
const FOLDER='1iCns4hAiGteyHgS5C9GlpOsaLKDBF3MH';
function googError(r){if(r?.error)throw Error(typeof r.error==='string'?r.error+': '+(r.error_description||''):JSON.stringify(r.error));}
async function driveRequest(path,opts={}){if(!state.token)throw Error('Login Google diperlukan');let r=await fetch('https://www.googleapis.com'+path,{...opts,headers:{...opts.headers,'Authorization':'Bearer '+state.token}});let t=await r.text(),val;try{val=JSON.parse(t)}catch{val=t};if(!r.ok)throw Error(`${r.status}: ${val?.error?.message||t.slice(0,350)}`);return val}
function doLogin(){if(!state.clientId){setMessage('driveMsg','OAuth Client ID belum dikonfigurasi. Set V6B_GOOGLE_CLIENT_ID dari Google Cloud yang sudah ada dan daftarkan origin localhost:8768; tidak perlu proyek Google baru.');return;}if(!window.google?.accounts?.oauth2){setMessage('driveMsg','Google Identity Services belum dimuat (koneksi/CDN mungkin terblokir).');return;}const client=google.accounts.oauth2.initTokenClient({client_id:state.clientId,scope:'https://www.googleapis.com/auth/drive.file',callback:r=>{if(r.error){setMessage('driveMsg','OAuth error nyata: '+r.error+' '+(r.error_description||''));return;}state.token=r.access_token;setMessage('driveMsg','Login Google berhasil (browser), token hanya di memori. Simpan satu resep dan verifikasi baca ulang.');updateButtons();},error_callback:e=>setMessage('driveMsg','OAuth browser error: '+JSON.stringify(e))});client.requestAccessToken({prompt:'consent'});}
async function saveDrive(){try{if(!state.recipe)throw Error('Simpan resep lokal dahulu');let rec=exportedRecipe();if(state.driveSavedIds.has(rec.id)) {setMessage('driveMsg','Resep ini sudah tersimpan di Drive pada sesi ini. Tidak diunggah ulang.');return;}let filename='v6b-recipe-'+rec.id+'.json',mime='application/json',boundary='v6b_'+crypto.randomUUID().replaceAll('-','');let metadata={name:filename,mimeType:mime,parents:[FOLDER],description:'V6B standalone recipe. Not imported to Semesta.'};let content=JSON.stringify(rec,null,2);let payload=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n${content}\r\n--${boundary}--`;setMessage('driveMsg','Mengunggah resep baru, bukan menimpa...');const file=await driveRequest('/upload/drive/v3/files?uploadType=multipart&fields=id,name,md5Checksum,webViewLink',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:payload});let back=await driveRequest('/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media');if(JSON.stringify(back)!==JSON.stringify(rec))throw Error('Drive readback differs from uploaded recipe');state.driveSavedIds.add(rec.id);$('driveStatus').textContent='TERSIMPAN + TERBACA ULANG';setMessage('driveMsg',`TERVERIFIKASI: Google Drive menyimpan ${file.name} (file id ${file.id}) dan isi JSON terbaca ulang identik. Belum diimpor Semesta.`);}catch(e){$('driveStatus').textContent='BELUM TERVERIFIKASI';setMessage('driveMsg','Error Google Drive nyata: '+e.message)}}
async function readDrive(){try{
  const list=$('driveRecipeList');
  if(list.hidden || !state.driveFiles.length){
    const q=encodeURIComponent(`'${FOLDER}' in parents and trashed = false and name contains 'v6b-recipe-'`);
    const res=await driveRequest('/drive/v3/files?q='+q+'&fields=nextPageToken,files(id,name,mimeType,modifiedTime)&pageSize=100');
    state.driveFiles=res.files||[];
    list.hidden=false;
    list.replaceChildren(...state.driveFiles.map(x=>new Option(x.name,x.id)));
    setMessage('driveMsg',state.driveFiles.length?'Pilih resep pada daftar yang tampil, lalu klik BUKA RESEP DARI DRIVE sekali lagi.':'Tidak ada resep aplikasi ini yang dapat dibaca memakai izin login sekarang.');
    return;
  }
  const chosen=list.value;
  if(!chosen || !state.driveFiles.some(x=>x.id===chosen))throw Error('Pilih resep');
  const rec=await driveRequest('/drive/v3/files/'+encodeURIComponent(chosen)+'?alt=media');
  importRecipe(rec);
  $('driveStatus').textContent='DIBUKA DARI DRIVE';
  setMessage('driveMsg','Resep Drive berhasil dibaca. Klik Render untuk cek hash setiap arah.');
 }catch(e){setMessage('driveMsg','Gagal baca Drive: '+e.message)}}

async function init(){for(let id of ['material','replacement'])$(id).replaceChildren(new Option('Tidak diubah',''),...MATERIALS.map(x=>new Option(x,x)));try{let c=await api('/api/catalog');state.catalog=c.items;state.clientId=c.googleClientId;state.folderId=c.driveFolder;$('category').addEventListener('change',filterTemplates);$('search').addEventListener('input',filterTemplates);$('template').addEventListener('change',showTemplate);filterTemplates();await listLocal()}catch(e){setMessage('renderMsg','Server tidak siap: '+e.message)}$('render').onclick=render;$('saveLocal').onclick=saveLocal;$('loadRecipe').onclick=loadLocal;$('zip').onclick=async()=>{if(!state.job)return;try{setMessage('renderMsg','Menyiapkan ZIP asli dan file staging…');const r=await engine('zip',{job_id:state.job.job_id,recipe:exportedRecipe()});const bytes=Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0));downloadBlob(new Blob([bytes],{type:'application/zip'}),state.job.template_id+'-V6B-REVIEW.zip');setMessage('renderMsg','ZIP PNG 4 arah, resep dan staging Semesta telah diunduh. Belum diimpor.')}catch(e){setMessage('renderMsg','ZIP gagal: '+e.message)}};$('downloadRecipe').onclick=()=>downloadBlob(new Blob([JSON.stringify(exportedRecipe(),null,2)],{type:'application/json'}),'v6b-recipe.json');$('importRecipeFile').onchange=async e=>{try{const f=e.target.files[0];if(f&&f.size<32768)importRecipe(JSON.parse(await f.text()));else throw Error('File terlalu besar')}catch(x){setMessage('renderMsg','Gagal impor JSON: '+x.message)}};$('loginGoogle').onclick=doLogin;$('saveDrive').onclick=saveDrive;$('readDrive').onclick=readDrive;if(state.clientId){let sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';sc.async=true;document.head.append(sc)}else setMessage('driveMsg','OAuth Google belum dikonfigurasi untuk origin aplikasi ini; fitur Drive tidak diklaim sudah diuji.');updateButtons()}
document.addEventListener('DOMContentLoaded',init);
