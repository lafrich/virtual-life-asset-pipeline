import json,re
src=open('game/index_extract.txt').read()
PXF=json.loads(re.search(r'const PXF=(\{.*?\});',src).group(1))
def text_mask(t):
    """returns set of (col,row) for 3x5 pixel text (rows 0..4 top->bottom), and width"""
    t=t.upper(); pts=set(); x=0
    for ch in t:
        g=PXF.get(ch,PXF.get('?'))
        for j in range(5):
            for i in range(len(g[0])):
                if g[j][i]=='#': pts.add((x+i,j))
        x+=len(g[0])+1
    return pts,max(0,x-1)
