const {app,BrowserWindow}=require('electron');
const fs=require('fs');
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false}});
 win.webContents.on('console-message',(_e,_l,m)=>{if(m.startsWith('CHECK:'))console.log(m)});
 let exitCode=0;
 try {
 await win.loadURL(process.argv[2] || 'http://127.0.0.1:5175/psychedel-model-prototype.html');
 const result=await win.webContents.executeJavaScript(fs.readFileSync(__dirname+'/browser-check.js','utf8'));
 fs.mkdirSync(__dirname,{recursive:true});
 for(const item of result.images){fs.writeFileSync(__dirname+'/'+item.name+'.png',Buffer.from(item.image,'base64'));delete item.image;}
 fs.writeFileSync(__dirname+'/measurement-final.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e);exitCode=1;}finally{app.exit(exitCode);}
});
setTimeout(()=>{console.error('check timeout');app.exit(1)},600000);
