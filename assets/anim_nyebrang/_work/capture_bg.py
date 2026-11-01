import asyncio, json, sys
from playwright.async_api import async_playwright
# anim_nyebrang copy: ZEBRA_FIX always on (in memory) + all .extcar traffic removed (in memory) -> clean road background.
# Renders the EXISTING game OUTSIDE scene with the game's own renderer (headless Chrome), without changing index.html on disk:
# the page HTML is served from memory with one extra line that exposes goOutside/EXT/room (window.__dbg) to this script.
# Needs a local static server for the other files:  python3 -m http.server 8765 --bind 127.0.0.1 --directory /workspace/virtual-office
# Far-side trees (g._r >= 37.7, they would stand inside the new lots) are removed in the page DOM only. HUD / html avatars hidden.
SRC=open('game/index_extract.txt').read().split('\n')
i=next(k for k,l in enumerate(SRC) if l.startswith('function goOutside(){'))
SRC.insert(i,"window.__dbg={get go(){return goOutside}, get EXT(){return EXT}, get cam(){return cam}, get room(){return room}, get OUT(){return OUT_ON}, get VEG(){return VEG}};")
import os
ZOLD="  for(let c=21.2;c<23.9;c+=0.6) el('polygon',{points:quad(c,32.98,c+0.32,36.07),fill:'#F7F4EE',stroke:'#C7CFDC','stroke-width':0.4},g);"
ZNEW="  for(let r=33.1;r<35.7;r+=0.5) el('polygon',{points:quad(21.2,r,23.9,r+0.28),fill:'#F7F4EE',stroke:'#C7CFDC','stroke-width':0.4},g);"
if True:          # PREVIEW ONLY (in memory): zebra stripes parallel to traffic (long along c), stacked across the road
    k=SRC.index(ZOLD); SRC[k]=ZNEW
HTML='\n'.join(SRC)
X0W,Y0W,WW,HW=[int(v) for v in (sys.argv[2:6] if len(sys.argv)>5 else (-690,-200,1550,1020))]
OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':WW*2,'height':HW*2+44})
        async def h(route): await route.fulfill(status=200, content_type='text/html', body=HTML)
        await pg.route('**/index.html', h)
        await pg.goto('http://127.0.0.1:8765/index.html'); await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>window.__dbg.go()"); await pg.wait_for_timeout(5000)
        o=await pg.evaluate("""([X0,Y0])=>{ const room=window.__dbg.room, RF=window.__dbg.EXT.RF;
          document.querySelectorAll('.extcar').forEach(e=>e.remove());
          let n=0; document.querySelectorAll('g').forEach(g=>{ if(g._r!==undefined && g._r>=37.7){ g.remove(); n++; } });
          document.querySelectorAll("body > *").forEach(e=>{ if(!e.contains(room)) e.style.display="none"; });
          const fl=room.parentElement; [...fl.children].forEach(c=>{ if(!['svg','canvas'].includes(c.tagName.toLowerCase())) c.style.visibility='hidden'; });
          const R=room.getBoundingClientRect(); const vb=`${X0} ${Y0} ${R.width/2} ${R.height/2}`;
          [room,RF].forEach(s=>{ s.setAttribute('viewBox',vb); const sa=s.setAttribute.bind(s); s.setAttribute=(k,v)=>{ if(k==='viewBox') return; sa(k,v); }; });
          return {n, rect:[R.x,R.y,R.width,R.height], vb}; }""", [X0W,Y0W])
        print(o); await pg.wait_for_timeout(2500)
        r=o['rect']; await pg.screenshot(path=OUT, clip={'x':r[0],'y':r[1],'width':r[2],'height':r[3]}); await b.close()
asyncio.run(main())
