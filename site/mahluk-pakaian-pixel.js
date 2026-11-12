/* PAKAIAN.EXE pixel editor — reuses the exact Genesis/Emosi native editor.
 * Converts 4-view horizontal strips (256x112) and engine atlases (64x448).
 * Changes only the selected wardrobe sprite; never Genesis or motion masters.
 */
(function(root){"use strict";
const BASE=()=>root.MahlukPakaian,ED=()=>root.MH2PlanePixelEditor;
const DIRS=["se","sw","ne","nw"];
let modal=null,engine=null,openPath=null,opening=false;
function atlasFromStrip(strip){
 const a=document.createElement("canvas");a.width=64;a.height=448;
 const g=a.getContext("2d");g.imageSmoothingEnabled=false;
 for(let n=0;n<4;n++)g.drawImage(strip,n*64,0,64,112,0,n*112,64,112);
 return a;
}
async function baseReferences(gender,tone){
 const refs={};
 try{
  const master=await root.LGRActor.master(gender,tone);
  for(const d of DIRS){
   const prep=await root.LafrichPuppetRenderer.prepare(master,null,d);
   refs[d]=root.LafrichPuppetRenderer.render(prep,root.LafrichPuppetCore.blankPose());
  }
 }catch(e){console.warn("Pakaian base guide unavailable",e)}
 return refs;
}
function init(){
 if(engine)return;
 if(!ED())throw Error("Genesis shared-pixel-editor.js belum termuat");
 const node=document.createElement("div");node.innerHTML="<div id=\"pixelOverlay\" class=\"pixel-overlay action-frame-pixel wardrobe-source-pixel\" hidden>\n <section class=\"pixel-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"pixelTitle\">\n  <header class=\"pixel-dialog-header\"><strong id=\"pixelTitle\">PAKAIAN.EXE · PIXEL EDITOR</strong><button id=\"pixelClose\" title=\"Close editor\">×</button></header>\n  <div class=\"pixel-toolbar\">\n   <label>DIRECTION <select id=\"pixelDirection\"><option value=\"se\">SE / FRONT RIGHT</option><option value=\"sw\">SW / FRONT LEFT</option><option value=\"ne\">NE / BACK RIGHT</option><option value=\"nw\">NW / BACK LEFT</option></select></label>\n   <button data-pixel-tool=\"pencil\" class=\"active\">✎ PENCIL</button>\n   <button data-pixel-tool=\"eraser\">⌫ ERASER</button><button data-pixel-tool=\"select\" title=\"Draw a rectangle around pixels to select them / S\">▣ SELECT</button>\n   <button id=\"pixelToolbarCopy\" class=\"pixel-quick-copy\" type=\"button\" title=\"Copy selection from current view / Ctrl+C\">⧉ COPY</button>\n   <button id=\"pixelToolbarPaste\" class=\"pixel-quick-paste\" type=\"button\" title=\"Paste pixels into current view / Ctrl+V\">▣ PASTE</button>\n   <button id=\"pixelToolbarPasteFlip\" class=\"pixel-quick-paste\" type=\"button\" title=\"Mirror and paste into current view / Ctrl+Shift+V\">⇆ PASTE FLIP</button>\n   <button data-pixel-tool=\"move-pixels\" title=\"Move selected pixels / M\">✣ MOVE PIXELS</button>\n   <button data-pixel-tool=\"fill\">▤ FILL</button>\n   <button data-pixel-tool=\"picker\">◎ PICK</button><button data-pixel-tool=\"hand\" title=\"Pan canvas by dragging / H\">✥ HAND</button>\n   <label>COLOR <input id=\"pixelColor\" type=\"color\" value=\"#211d22\"></label>\n   <label>SIZE <select id=\"pixelSize\"><option value=\"1\">1 PX</option><option value=\"2\">2 PX</option><option value=\"3\">3 PX</option><option value=\"5\">5 PX</option></select></label>\n  </div>\n  <div class=\"pixel-workarea\">\n   <div class=\"pixel-canvas-wrap\" id=\"pixelCanvasWrap\"><canvas id=\"pixelCanvas\" tabindex=\"0\" width=\"384\" height=\"672\" aria-label=\"Edit a 64 by 112 source pixel plane, one isometric direction at a time. Scroll to zoom, pinch to zoom on touch.\"></canvas></div>\n   <aside class=\"pixel-side\">\n    <div class=\"sectionhead\">PALETTE / SWATCHES</div>\n    <div class=\"pixel-swatches\">\n     <button data-pixel-swatch=\"#1b1519\" style=\"--swatch:#1b1519\" title=\"Dark ink\"></button>\n     <button data-pixel-swatch=\"#443330\" style=\"--swatch:#443330\" title=\"Shadow\"></button>\n     <button data-pixel-swatch=\"#b97656\" style=\"--swatch:#b97656\" title=\"Skin shade\"></button>\n     <button data-pixel-swatch=\"#e9a77c\" style=\"--swatch:#e9a77c\" title=\"Skin\"></button>\n     <button data-pixel-swatch=\"#ffc99b\" style=\"--swatch:#ffc99b\" title=\"Highlight\"></button>\n     <button data-pixel-swatch=\"#f4ece5\" style=\"--swatch:#f4ece5\" title=\"White\"></button>\n     <button data-pixel-swatch=\"#5b718d\" style=\"--swatch:#5b718d\" title=\"Blue\"></button>\n     <button data-pixel-swatch=\"#b28ec3\" style=\"--swatch:#b28ec3\" title=\"Lilac\"></button>\n    </div>\n\n    <p class=\"hint\">Edit 4 arah pakaian di Pixel Editor yang sama dengan Genesis. Layer tubuh dan animasi tetap aman.</p>\n    <div class=\"pixel-selection-controls\">\n     <div class=\"sectionhead\">SELECTION / TRANSFORM</div>\n     <div class=\"plane-buttons pixel-clipboard-actions\">\n      <button id=\"pixelCopySelection\" type=\"button\" title=\"Copy selected RGBA pixels from active view / Ctrl+C\">⧉ COPY</button>\n      <button id=\"pixelPasteSelection\" type=\"button\" title=\"Paste to active view without changing other views / Ctrl+V\">▣ PASTE</button>\n      <button id=\"pixelPasteMirrored\" type=\"button\" title=\"Paste flipped horizontally, at mirrored X position / Ctrl+Shift+V\">⇆ PASTE FLIP</button>\n     </div>\n     <label class=\"check\"><input id=\"pixelPasteReplace\" type=\"checkbox\"> REPLACE TRANSPARENT PIXELS (erase under transparent source)</label>\n     <p class=\"hint\" id=\"pixelClipboardInfo\" aria-live=\"polite\">CLIPBOARD EMPTY · SELECT + COPY (CTRL+C)</p>\n     <div class=\"plane-buttons\"><button id=\"pixelSelectAll\" type=\"button\">▣ SELECT ALL</button><button id=\"pixelDeselect\" type=\"button\">◇ DESELECT</button></div>\n     <div class=\"plane-buttons\"><button id=\"pixelFlipH\" type=\"button\">⇆ FLIP H</button><button id=\"pixelFlipV\" type=\"button\">⇅ FLIP V</button></div>\n     <div class=\"plane-buttons\"><button id=\"pixelDeleteSelection\" type=\"button\">⌫ DELETE PIXELS</button></div>\n     <p class=\"hint\" id=\"pixelSelectionInfo\">No selection. Select rectangle, then Move Pixels or Flip.</p>\n    </div>\n    <label class=\"check\"><input type=\"checkbox\" id=\"pixelOnion\" checked> SELECTED CHARACTER REFERENCE · CURRENT VIEW</label>\n    <label class=\"male-guide-range\">REFERENCE OPACITY <input id=\"pixelMaleOpacity\" type=\"range\" min=\"5\" max=\"100\" step=\"5\" value=\"35\"><span id=\"pixelMaleOpacityLabel\">35%</span></label>\n        <div class=\"pixel-grid-controls\">\n     <label class=\"check\"><input type=\"checkbox\" id=\"pixelGrid\" checked> GRID MODE</label>\n     <label>GRID SIZE <select id=\"pixelGridType\"><option value=\"1\">1 × 1 PX</option><option value=\"8\">8 × 8 PX</option><option value=\"16\">16 × 16 PX</option></select></label>\n    </div>\n    <div class=\"pixel-zoom-controls\">\n     <span>ZOOM</span>\n     <button id=\"pixelZoomOut\" title=\"Zoom out (mouse wheel or pinch)\">−</button>\n     <input id=\"pixelZoom\" type=\"range\" min=\"2\" max=\"16\" step=\"1\" value=\"5\" aria-label=\"Pixel canvas zoom\">\n     <button id=\"pixelZoomIn\" title=\"Zoom in (mouse wheel or pinch)\">＋</button>\n     <button id=\"pixelZoomFit\" title=\"Fit artwork to editor\">FIT</button>\n     <span id=\"pixelZoomLabel\">500%</span>\n    </div>\n    <div class=\"plane-buttons\"><button id=\"pixelUndo\">↶ UNDO</button><button id=\"pixelRedo\">↷ REDO</button></div>\n    <p class=\"hint\">Edit pakaian saja. APPLY ke draft, lalu SAVE MASTER pada tab Pakaian untuk Database/Pakaian (v2).</p>\n    <div class=\"plane-buttons\">\n     <button id=\"pixelEraseCanvas\" type=\"button\" title=\"Erase this direction/frame only; Undo restores it\">⌫ ERASE CANVAS</button>\n     <button id=\"pixelRestore\">↶ RESET VIEW TO OPENED</button>\n    </div>\n   </aside>\n  </div>\n  <footer class=\"pixel-dialog-foot\">\n   <span id=\"pixelStatus\">PAKAIAN · 64×112 RGBA · KEY PALETTE</span>\n   \n   <button id=\"pixelApply\">APPLY TO PAKAIAN</button>\n   <button id=\"pixelSaveDefault\" class=\"primary\">✓ APPLY + SAVE DRAFT</button>\n  </footer>\n </section>\n</div>\n";
 modal=node.firstElementChild;
 if(!modal)throw Error("Pakaian pixel editor markup invalid");
 document.body.appendChild(modal);
 const canvas=modal.querySelector("#pixelCanvas");
 const keys=Object.entries(root.LGRWear.K),swatch=modal.querySelector(".pixel-swatches");
 swatch.replaceChildren(...keys.map(([name,hex])=>{
  const b=document.createElement("button");b.type="button";
  b.dataset.pixelSwatch=hex;b.style.setProperty("--swatch",hex);
  b.title=name+" · "+hex;b.setAttribute("aria-label",b.title);return b;
 }));
 const onApply=(id,png)=>{
  if(id!==openPath)return false;
  const ok=BASE().pixelCommit(id,engine.getAtlas(),false);
  if(ok)root.dispatchEvent(new CustomEvent("pakaian-pixels-applied",{detail:{path:id}}));
  return ok;
 };
 const onSave=(id,png)=>{
  if(id!==openPath)return false;
  const ok=BASE().pixelCommit(id,engine.getAtlas(),true);
  if(ok)root.dispatchEvent(new CustomEvent("pakaian-pixels-applied",{detail:{path:id,saved:true}}));
  return ok;
 };
 engine=ED().create({overlay:modal,canvas,
  onApply,onSaveDefault:onSave,onRestore:()=>{},onDirectionChange:(dir)=>BASE().pixelSelectDirection(dir)});
}
async function open(){
 if(opening)return;
 opening=true;
 try{
  init();
  const data=await BASE().pixelContext();
  if(!data?.canvas)throw Error("Pilih item pakaian yang punya sprite dahulu");
  openPath=data.path.replaceAll("/","_");
  const initial=atlasFromStrip(data.canvas),refs=await baseReferences(data.gender,data.tone);
  engine.open({id:openPath,initialAtlas:initial,originalAtlas:initial,
   referenceImages:refs,direction:data.dir});
  const pk=modal.querySelector("#pixelStatus");
  if(pk)pk.textContent="EDIT PAKAIAN "+data.path+" · "+data.dir.toUpperCase()+" · GRID / MOVE / PASTE FLIP SIAP";
 }catch(e){console.error(e);const m=document.querySelector("#pk-status");if(m)m.textContent="Editor: "+e.message}
 finally{opening=false}
}
root.PakaianPixelEditor=Object.freeze({open,init,atlasFromStrip});
})(window);