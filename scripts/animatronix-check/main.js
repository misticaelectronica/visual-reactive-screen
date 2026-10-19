const {app,BrowserWindow}=require('electron');const fs=require('fs');
app.whenReady().then(async()=>{
 const w=new BrowserWindow({show:false,width:960,height:540,webPreferences:{offscreen:false}});
 await w.loadURL('data:text/html,<body style="margin:0"></body>');
 await w.webContents.executeJavaScript(fs.readFileSync(__dirname+'/harness.js','utf8'));
 const cfgs=[['traversal','hypnotic-zoom','perspective-melt','depth-fracture'],['occlusion-passage','kinetic-match','focus-inversion','residual-space'],['vertigo-lock','time-crush','parallax-collapse','traversal'],['depth-fracture','residual-space','hypnotic-zoom','kinetic-match']];
 for(const c of cfgs){await w.webContents.executeJavaScript('window.GR='+JSON.stringify(c));const r=await w.webContents.executeJavaScript('window.run()');
  console.log('first frames ms',r.first.join(','));console.log(c.join(','),'median',r.medianDiff.toFixed(2),'p99',r.p99Diff.toFixed(2),'boundary',r.boundary.map(x=>x.toFixed(2)).join('/'),'TOP',r.top.map(t=>t.cur.seg+'@'+t.cur.u.toFixed(2)+' d='+t.cur.d.toFixed(1)+' (prev '+t.prev.d.toFixed(1)+' next '+t.next.d.toFixed(1)+')').join(' | '));}app.quit();});
