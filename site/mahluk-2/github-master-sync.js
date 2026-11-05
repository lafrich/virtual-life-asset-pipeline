/* Authenticated GitHub master publishing for a static Pages app. Tokens live in memory only. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.MH2MasterGithub=api;})(typeof window==="undefined"?null:window,function(){
"use strict";
const url="https://api.github.com/repos/lafrich/virtual-life-asset-pipeline/contents/site/mahluk-2/master-rig.json";
const key="mahluk-2-github-master-sync-v1";
let token="";
const valid=x=>!!(x&&x.format==="mahluk-2-general-rig-v1"&&x.version===1&&Number.isInteger(x.revision)&&x.revision>0&&x.rules&&x.defaultParts);
function authorize(t){t=String(t||"").trim();if(t.length<12||t.length>512||/\s/.test(t))throw Error("Invalid token");token=t;}
function unauthorize(){token="";}
function connected(){return !!token;}
function last(store){try{const o=JSON.parse(store.getItem(key)||"null");return o?.sha&&o?.savedAt?o:null;}catch{return null;}}
function mark(store,remote){if(remote.doc&&remote.sha)store.setItem(key,JSON.stringify({sha:remote.sha,savedAt:remote.doc.savedAt}));}
function encode(s){let u=new TextEncoder().encode(s),v="";for(let i=0;i<u.length;i+=8192)v+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(v);}
function decode(s){return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));}
async function remote(auth=false){
 const headers={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 if(auth&&token)headers.Authorization="Bearer "+token;
 const r=await fetch(url+"?fresh="+Date.now(),{headers,cache:"no-store"});
 if(r.status===404)return {doc:null,sha:null};
 if(!r.ok)throw Error("GitHub read HTTP "+r.status);
 const body=await r.json();
 if(body.type!=="file"||!body.sha||!body.content)throw Error("Invalid GitHub file response");
 const obj=JSON.parse(decode(body.content));
 if(obj.format!=="mahluk-2-general-rig-v1"||(obj.revision!==0&&!valid(obj)))throw Error("Invalid GitHub master rig");
 return {doc:valid(obj)?obj:null,sha:body.sha};
}
function adopt(local,published,seen){
 if(!published)return false;
 if(!local)return true;
 if(local.savedAt===published.savedAt||seen?.savedAt===local.savedAt)return true;
 return !seen&&Date.parse(published.savedAt)>Date.parse(local.savedAt);
}
async function publish(doc,store){
 if(!token)throw Error("Connect GitHub first");
 if(!valid(doc))throw Error("Save a general default rig first");
 const latest=await remote(true),seen=last(store);
 if(latest.doc&&latest.sha!==seen?.sha&&
    (seen||Date.parse(latest.doc.savedAt)>=Date.parse(doc.savedAt)))
  throw Error("Remote master changed. Export your local project then load GitHub master before retrying.");
 const updated={...doc,revision:Math.max(doc.revision,latest.doc?.revision||0)+1,savedAt:new Date().toISOString()};
 const body={message:"Publish universal Mahluk Hidup 2 base rig",branch:"main",content:encode(JSON.stringify(updated,null,2))};
 if(latest.sha)body.sha=latest.sha;
 const r=await fetch(url,{method:"PUT",headers:{Accept:"application/vnd.github+json",
  "X-GitHub-Api-Version":"2022-11-28",Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify(body)});
 if(!r.ok)throw Error("GitHub write HTTP "+r.status+(r.status===409?" (conflict)":""));
 const result=await r.json();if(!result?.content?.sha)throw Error("No GitHub commit confirmation");
 return {doc:updated,sha:result.content.sha};
}
return Object.freeze({url,key,valid,authorize,unauthorize,connected,last,mark,remote,adopt,publish});
});
