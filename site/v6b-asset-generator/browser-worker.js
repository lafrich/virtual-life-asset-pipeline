/* V6B Asset Generator / browser worker.
 * Executes archived, unmodified Python NumPy/Pillow renderer using Pyodide.
 * Assets are NOT imported into Semesta; original game and Mahluk Hidup untouched.
 */
'use strict';
const PYODIDE_CDN='https://cdn.jsdelivr.net/pyodide/v0.28.2/full/';
const PART_COUNT=17;
let ready=null,pyodide=null;
const DIRECTIONS=['se','sw','ne','nw'];
function status(message){postMessage({type:'status',message});}
async function initialize(){
  status('Mengunduh interpreter Python WebAssembly…');
  importScripts(PYODIDE_CDN+'pyodide.js');
  pyodide=await loadPyodide({indexURL:PYODIDE_CDN});
  status('Memuat NumPy dan Pillow resmi Pyodide…');
  await pyodide.loadPackage(['numpy','pillow']);
  status('Mengunduh source asli dan 244 PNG referensi…');
  const chunks=await Promise.all(Array.from({length:PART_COUNT},async(_,index)=>{
    const path='./data/part-'+String(index).padStart(2,'0')+'.bin';
    const r=await fetch(path,{cache:'force-cache'});
    if(!r.ok)throw Error('Source archive part '+index+' HTTP '+r.status);
    return new Uint8Array(await r.arrayBuffer());
  }));
  const length=chunks.reduce((s,a)=>s+a.byteLength,0);
  if(length!==3271190)throw Error('Arsip sumber tidak lengkap: '+length+' dari 3271190 byte');
  const bytes=new Uint8Array(length);let pos=0;for(const a of chunks){bytes.set(a,pos);pos+=a.length;}
  await pyodide.unpackArchive(bytes.buffer,'zip');
  await pyodide.runPythonAsync(String.raw`
import os,sys,json,base64,uuid,copy,io,zipfile
from pathlib import Path
BASE=Path('/home/pyodide/V6B_Asset_Generator')
assert BASE.is_dir(), 'Source archive layout invalid'
os.chdir(BASE)
sys.path.insert(0,str(BASE/'app'))
import worker
FURN=('I1','I2','I3','I4','I5','I6')
DIRS=('se','sw','ne','nw')
JOBS={}

def v6b_catalog():
    result={}
    for batch in FURN:
        manifest=json.loads((BASE/'source'/batch/(batch.lower()+'-manifest.json')).read_text())
        grouped={}
        for r in manifest['files']:
            grouped.setdefault(r['id'],{})[r['dir']]=r
        for name,entries in grouped.items():
            result[name]={'id':name,'label':name.removeprefix('furniture-').replace('_',' ').title(),
                          'category':'furniture','batch':batch,'status':'runnable','count':len(entries),
                          'metadataMatchesActual':all(r.get('metadataMatchesActual',True) for r in entries.values())}
    groups={}
    for r in json.loads((BASE/'source/B4/b4/b4-manifest.json').read_text()):
        groups.setdefault(r['id'],[]).append(r)
    for name,rows in groups.items():
        active=name=='id200_transport_bajaj_oranye'
        result[name]={'id':name,'label':name.removeprefix('id200_transport_').replace('_',' ').title(),
                      'category':'vehicle','batch':'B4','count':len(rows),'status':'runnable' if active else 'unavailable',
                      'reason':None if active else 'Modul rider/NPC untuk kendaraan ini belum diuji; hanya gambar referensi.'}
    result['npc-v6b']={'id':'npc-v6b','label':'NPC V6B','category':'npc','batch':'GitHub','count':0,
                      'status':'unavailable','reason':'NPC dan animasi belum diverifikasi dalam generator mandiri.'}
    return {'items':list(result.values()),'googleClientId':'369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com',
            'driveFolder':'1iCns4hAiGteyHgS5C9GlpOsaLKDBF3MH'}

def v6b_reference(template_id):
    paths={}
    if template_id.startswith('furniture-'):
        try:
            category,batch,entries=worker.find_entries(template_id)
            for d in DIRS:paths[d]=BASE/'source'/batch/entries[d]['file']
        except ValueError:pass
    elif template_id.startswith('id200_transport_'):
        for d in DIRS:paths[d]=BASE/'source/B4/files'/(template_id+'_'+d+'.png')
    return {d:base64.b64encode(p.read_bytes()).decode('ascii') for d,p in paths.items() if p.is_file()}

def v6b_render(params):
    tid=params['template_id'];repl=params.get('palette_replacements') or {}
    if not isinstance(repl,dict) or len(repl)>8:raise ValueError('Invalid material replacements')
    _,batch,_=worker.find_entries(tid)
    mod=worker.boot(batch)
    # Original standalone server executes one fresh Python subprocess per render.
    # Restore palette ramps after each in-browser run for identical repeated recipes.
    palette=copy.deepcopy(mod.RAMPS)
    jobid=uuid.uuid4().hex
    folder=BASE/'runtime'/jobid
    try:
        report=worker.generate(tid,repl,folder)
        report['job_id']=jobid
        JOBS[jobid]={'report':report,'folder':folder}
        report['pngs']={d:base64.b64encode((folder/(d+'.png')).read_bytes()).decode('ascii') for d in DIRS}
        return report
    finally:
        mod.RAMPS.clear();mod.RAMPS.update(palette)

def v6b_zip(args):
    job=JOBS[args['job_id']]
    r=job['report'];folder=job['folder']
    recipe=args.get('recipe') or {}
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
        for d in DIRS:z.write(folder/(d+'.png'),f"png/{r['template_id']}_{d}.png")
        z.writestr('recipe.v6b.json',json.dumps(recipe,indent=2,ensure_ascii=False))
        z.writestr('semesta-proposed-manifest.json',json.dumps({
            'schema':'semesta-review-export-v1','status':'NOT_IMPORTED',
            'id':r['template_id'],'source':'archived native V6B renderer',
            'views':r['views'],'directions':list(DIRS),
            'import':'Use Semesta Connect manually; this ZIP is NOT an installed asset'
        },ensure_ascii=False,indent=2))
        if r['category']=='furniture':
            new_id='obj-v6b-'+args['job_id'][:16]
            record={'id':new_id,'name':('V6B '+r['template_id'].removeprefix('furniture-').replace('_',' '))[:80],
                    'category':'furniture','footprint':r['views']['sw']['footprint'],'collision':True,
                    'description':'Review-only native V6B renderer; import and placement unverified',
                    'views':{d:{'size':r['views'][d]['size'],'pivot':r['views'][d]['pivot'],
                                'url':'data:image/png;base64,'+base64.b64encode((folder/(d+'.png')).read_bytes()).decode('ascii')}
                             for d in DIRS},'originalTemplateId':r['template_id'],'source':'v6b-staging',
                    'importStatus':'NOT_IMPORTED'}
            cloud={'format':'membangun-cloud-1','app':'semesta','kind':'assetObject','id':new_id,
                   'record':record}
            z.writestr('semesta-assetObject-STAGING.json',json.dumps(cloud,ensure_ascii=False,indent=2))
        z.writestr('READ_ME_FIRST.txt','REVIEW ONLY. Not registered or imported in Semesta. Use Connect manually.\n')
    return {'base64':base64.b64encode(out.getvalue()).decode('ascii')}

def v6b_handle(request):
    mode=request['type'];args=request.get('args') or {}
    if mode=='catalog':return v6b_catalog()
    if mode=='materials':return worker.materials(args['template_id'])
    if mode=='reference':return v6b_reference(args['template_id'])
    if mode=='render':return v6b_render(args)
    if mode=='zip':return v6b_zip(args)
    raise ValueError('Unknown browser engine operation')
`);
  status('Renderer asli siap di browser. Tidak diperlukan server Python.');
}
onmessage=async({data})=>{
 const {id,type,args}=data;
 try{
   if(!ready)ready=initialize();
   await ready;
   pyodide.globals.set('v6b_payload',JSON.stringify({type,args}));
   const result=await pyodide.runPythonAsync('json.dumps(v6b_handle(json.loads(v6b_payload)))');
   postMessage({id,ok:true,value:JSON.parse(result)});
 }catch(ex){postMessage({id,ok:false,error:String(ex && ex.message || ex)});}
};
