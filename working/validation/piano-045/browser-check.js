(async()=>{
 const {Sd15OnnxWebGpuRuntime}=await import('/src/renderer/output/brain/sd15OnnxWebGpu.ts');
 const {PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE:manifest}=await import('/src/shared/brain/imageModelManifest.ts');
 const {buildPsychedelImagePrompt}=await import('/src/renderer/output/brain/psichedel.ts');
 const moments=[
 'Mara stands beside a leafless tree on a deserted shore, holding a cracked clay bowl containing a single silver root.',
 'The silver root grows from the cracked clay bowl and winds around Mara\'s wrists, joining her hands to the leafless tree.',
 'Mara and the leafless tree share a dense tangle of silver roots while the cracked clay bowl opens into a hollow trunk.',
 'On the deserted shore Mara holds the cracked clay bowl again, now bearing the small imprint of the tree and one silver root.'
 ];
 const story={id:'validation-045',title:'The silver root',synopsis:moments.join(' '),englishSynopsis:moments.join(' '),sourcePhrases:[],palette:['#101010','#202020','#303030','#404040','#505050'],bridge:null,continuityPhrase:null,frames:moments.map((description,i)=>({id:'frame-'+i,title:'Moment '+(i+1),description,imagePrompt:description,visualIntent:description,energy:0.5,durationMs:30000}))};
 const prompts=story.frames.map(f=>buildPsychedelImagePrompt(story,f));
 const runtime=new Sd15OnnxWebGpuRuntime(manifest,'/prototype-models/realistic-vision-v6-onnx','/ort-wasm/');
 const images=[];
 const work=prompts.map((prompt,i)=>({name:'final-frame-'+(i+1),prompt,seed:450+i}));
 for(const item of work){
 console.log('CHECK: start '+item.name);
 const progress=[];const start=performance.now();
 const blob=await runtime.generate({prompt:item.prompt,seed:item.seed,width:640,height:360,inferenceWidth:448,inferenceHeight:256,steps:12,guidanceMode:'single-conditional',onProgress:p=>{progress.push(p);if(p.message.includes('Contesto'))console.log('CHECK: '+p.message)}});
 const elapsed=performance.now()-start;
 const image=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});
 images.push({...item,elapsedMs:elapsed,progress,image});console.log('CHECK: done '+item.name+' '+Math.round(elapsed)+' ms');
 }
 await runtime.release();return {parameters:{steps:12,guidanceMode:'single-conditional',inferenceWidth:448,inferenceHeight:256,width:640,height:360},story,images};
})()
