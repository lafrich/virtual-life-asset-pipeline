import base64
b=lambda p:base64.b64encode(open(p,'rb').read()).decode()
h=open('template.html').read().replace('__BG844__',b('bg_844.png')).replace('__BG667__',b('bg_667.png')).replace('__PHONEJS__',open('phone.js').read())
open('../prototype.html','w').write(h); print(len(h))
