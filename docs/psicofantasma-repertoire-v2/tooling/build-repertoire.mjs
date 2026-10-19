#!/usr/bin/env node

/** Build the Brain / PsicoFantasma V2 shortlist from local OpenClipart SVGs. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.resolve(ROOT, "openclipart-source/svg");
const OUTPUT_DIR = path.resolve(ROOT, "brain-repertoire-v2");
const OUTPUT_SVG_DIR = path.join(OUTPUT_DIR, "svg");
const SHORTLIST_PER_SLOT = 36;
const ALTERNATIVE_COUNT = 5;
const MORPH_MIN_DISTANCE = 0.12;
const TARGET_PER_FAMILY = 24;
const TARGET_TOTAL = 120;
const T = (phrase, weight = 60) => [phrase, weight];

const SLOTS = [
  { family: "human", archetype: "running-group", terms: [T("group of people running",170),T("running family",155),T("jogging couple",145),T("people running",140),T("running group",140)], prefer: ["silhouette","people","couple","family"], exclude: ["girl clipart","word cloud","bird"] },
  { family: "human", archetype: "pregnant", terms: [T("pregnant woman",170),T("pregnancy silhouet",155),T("pregnant",140),T("pregnancy",100)], prefer: ["silhouette","silhouet"], exclude: ["test"] },
  { family: "human", archetype: "standing-female", terms: [T("standing woman",165),T("female silhouette",145),T("woman silhouette",145),T("silhouette female",140),T("woman",55),T("female",55)], prefer: ["standing","silhouette"], exclude: ["pregnan","bikini","sitting","running","head","face","yoga","word cloud"] },
  { family: "human", archetype: "standing-male", terms: [T("standing man",165),T("male silhouette",145),T("man silhouette",145),T("silhouette male",140),T("man",55),T("male",55)], prefer: ["standing","silhouette"], exclude: ["running","sitting","head","face","construction","word cloud","woman"] },
  { family: "human", archetype: "hand", terms: [T("hand silhouette",160),T("open hand",130),T("hand print",120),T("hand",70)], prefer: ["silhouette","open"], exclude: ["clock","shake","holding","handbag","handball","handset","handcuff","handphone","signal","cross hand"] },
  { family: "human", archetype: "head-profile", terms: [T("head profile",170),T("face profile",160),T("profile silhouette",150),T("human profile",145),T("profile",70)], prefer: ["head","face","silhouette"], exclude: ["facebook","word cloud","penguin","santa"] },
  { family: "human", archetype: "seated-crouched", terms: [T("seated person",165),T("sitting silhouette",155),T("woman sitting",145),T("seated man",140),T("crouching",140),T("crouched",140),T("sitting",90),T("seated",90)], prefer: ["silhouette","person","woman","man"], exclude: ["cat","fairy","buddha","bird","nature","comic"] },
  { family: "human", archetype: "body-pose", terms: [T("yoga pose silhouette",165),T("human pose",155),T("body silhouette",145),T("person silhouette",140),T("dancer silhouette",130),T("yoga pose",115),T("body pose",110)], prefer: ["silhouette","pose","yoga","dancer"], exclude: ["pregnan","running","head","face","group"] },
  { family: "animal", archetype: "bird", terms: [T("bird silhouette",160),T("crow silhouette",150),T("bird",75),T("crow",70)], prefer: ["silhouette"], exclude: ["tree","branch","cage","flower","run birdie","bluebird on"] },
  { family: "animal", archetype: "spider", terms: [T("spider silhouette",165),T("black widow spider",145),T("spider",100)], prefer: ["silhouette","black widow"], exclude: ["web","flower","sword","icon"] },
  { family: "animal", archetype: "horse", terms: [T("horse silhouette",165),T("horse",90)], prefer: ["silhouette"], exclude: ["horseback","horseshoe","trojan","frame","flag","knight","lady on","sea horse"] },
  { family: "animal", archetype: "whale", terms: [T("whale silhouette",165),T("whale",100)], prefer: ["silhouette"], exclude: ["logo","tail"] },
  { family: "animal", archetype: "deer", terms: [T("deer silhouette",165),T("deer",100)], prefer: ["silhouette"], exclude: ["frame","reindeer","typography"] },
  { family: "animal", archetype: "fox", terms: [T("fox silhouette",165),T("fox",100)], prefer: ["silhouette"], exclude: ["foxtrot","frame","foxhole","firefox"] },
  { family: "animal", archetype: "snake", terms: [T("snake silhouette",165),T("snake",100)], prefer: ["silhouette"], exclude: ["flag","grass","border","wing"] },
  { family: "animal", archetype: "insect", terms: [T("insect silhouette",165),T("beetle silhouette",160),T("moth silhouette",155),T("butterfly silhouette",150),T("beetle",105),T("moth",100),T("insect",95)], prefer: ["silhouette"], exclude: ["flower","frame","woman","abstract","insecticide"] },
  { family: "organic", archetype: "roots-branches", terms: [T("tree with long roots",175),T("tree roots",165),T("roots",135),T("tree branches",120),T("branches",105)], prefer: ["silhouette","root"], exclude: ["bird","flower","border"] },
  { family: "organic", archetype: "flower", terms: [T("flower silhouette",165),T("flower",90)], prefer: ["silhouette"], exclude: ["bird","pot","glass","butterfly","spider","frame","sun flower","cartoon"] },
  { family: "organic", archetype: "leaf", terms: [T("leaf silhouette",165),T("leaf",100)], prefer: ["silhouette"], exclude: ["tree","rake","frame","pattern","flower"] },
  { family: "organic", archetype: "mushroom", terms: [T("mushroom silhouette",165),T("mushroom",105)], prefer: ["silhouette"], exclude: ["cloud","mario"] },
  { family: "organic", archetype: "tree", terms: [T("tree silhouette",165),T("treesilhouette",160),T("tree",75)], prefer: ["silhouette"], exclude: ["branch","root","bird","house","background","christmas","apple","palm","comic","landscape"] },
  { family: "organic", archetype: "fern", terms: [T("fern silhouette",165),T("fern",110)], prefer: ["silhouette"], exclude: ["fernandez","pattern"] },
  { family: "organic", archetype: "seed-fruit", terms: [T("acorn silhouette",165),T("seed silhouette",160),T("fruit silhouette",155),T("acorn",120),T("seed",105),T("fruit",85)], prefer: ["silhouette"], exclude: ["tree","bowl","basket","frame","pattern","prune","fruit and"] },
  { family: "organic", archetype: "vine", terms: [T("vine silhouette",165),T("climbing plant",145),T("creeper plant",140),T("vine",110)], prefer: ["silhouette","plant"], exclude: ["divine","wine","border","frame","flourish","pattern"] },
  { family: "everyday", archetype: "glass", terms: [T("drinking glass",170),T("glass silhouette",160),T("tumbler glass",150),T("glass",80)], prefer: ["silhouette","drinking","tumbler"], exclude: ["magnifying","stained","sun glass","sunglass","hourglass","button","flower","window","wine","eye glass"] },
  { family: "everyday", archetype: "knife", terms: [T("knife silhouette",165),T("kitchen knife",145),T("knife",105)], prefer: ["silhouette","kitchen"], exclude: ["fork","spoon","army","set","sword"] },
  { family: "everyday", archetype: "clock", terms: [T("clock silhouette",165),T("alarm clock",145),T("clock",95)], prefer: ["silhouette"], exclude: ["clockwork","theme","face only"] },
  { family: "everyday", archetype: "scissors", terms: [T("scissors silhouette",165),T("scissors",110)], prefer: ["silhouette"], exclude: ["logo","pattern"] },
  { family: "everyday", archetype: "umbrella", terms: [T("umbrella silhouette",165),T("umbrella",110)], prefer: ["silhouette"], exclude: ["man with","cocktail","beach scene"] },
  { family: "everyday", archetype: "bottle", terms: [T("bottle silhouette",165),T("bottle",100)], prefer: ["silhouette"], exclude: ["moonshine","message","set","crate","baby"] },
  { family: "everyday", archetype: "chair", terms: [T("chair silhouette",165),T("armchair",125),T("chair",100)], prefer: ["silhouette"], exclude: ["table","room","set"] },
  { family: "everyday", archetype: "key", terms: [T("key silhouette",165),T("door key",145),T("key",75)], prefer: ["silhouette","door"], exclude: ["keyboard","monkey","donkey","turkey","hockey","keyring","piano","lock","hotkey","whiskey"] },
  { family: "artifact", archetype: "engine", terms: [T("engine silhouette",165),T("engine",105)], prefer: ["silhouette"], exclude: ["fire engine","train","engineer","jet engine annotated"] },
  { family: "artifact", archetype: "mask", terms: [T("mask silhouette",165),T("mask",100)], prefer: ["silhouette"], exclude: ["medical","face mask","border","doctor","soccer","penguin","gas mask"] },
  { family: "artifact", archetype: "gear", terms: [T("gear silhouette",165),T("gearwheel",150),T("gear wheel",145),T("gear",95)], prefer: ["silhouette"], exclude: ["gears","tools","art","biohack"] },
  { family: "artifact", archetype: "tool", terms: [T("wrench silhouette",165),T("hammer silhouette",160),T("wrench",125),T("hammer",115),T("tool silhouette",110)], prefer: ["silhouette","wrench"], exclude: ["tools","set","keyboard","blacksmith","construction worker"] },
  { family: "artifact", archetype: "statue", terms: [T("statue silhouette",170),T("moai statue",160),T("statue",110),T("sculpture silhouette",145)], prefer: ["silhouette","moai"], exclude: ["group","statues"] },
  { family: "artifact", archetype: "helmet", terms: [T("helmet silhouette",165),T("racing helmet",150),T("helmet",105)], prefer: ["silhouette"], exclude: ["football","superbowl","logo"] },
  { family: "artifact", archetype: "camera-radio", terms: [T("camera silhouette",165),T("radio silhouette",160),T("dslr camera",145),T("antique radio",140),T("camera",90),T("radio",85)], prefer: ["silhouette","dslr","antique"], exclude: ["icon","guy","boy","mount","surveillance","no camera","streetart","radioactive","video camera"] },
  { family: "artifact", archetype: "instrument-mechanism", terms: [T("mechanism silhouette",170),T("mechanical mechanism",160),T("machine part",150),T("mechanism",125),T("mechanical",105),T("instrument silhouette",135),T("instrument",70)], prefer: ["silhouette","mechanism","mechanical"], exclude: ["gear","engine","musical","violin","guitar","piano"] },
];

const GLOBAL_EXCLUDE = ["logo","word cloud","typography","alphabet","emoji","badge","button","pattern","wallpaper","frame","border","flag of","coat of arms","map","cartoon","comic","christmas","valentine","background","gradient"];
function normalize(v) { return v.replace(/([a-z])([A-Z])/g,"$1 $2").toLowerCase().replace(/\.svg$/i,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim(); }
function sha256(v) { return createHash("sha256").update(v).digest("hex"); }
function count(s,r) { return (s.match(r) ?? []).length; }
function hasPhrase(text, phrase) { return (` ${text} `).includes(` ${normalize(phrase)} `); }
function hasAny(text, phrases=[]) { return phrases.some((p) => hasPhrase(text,p)); }

async function walk(dir) {
  const out=[]; const entries=await readdir(dir,{withFileTypes:true});
  for (const e of entries) { const p=path.join(dir,e.name); if(e.isDirectory()) out.push(...await walk(p)); else if(e.isFile()&&e.name.toLowerCase().endsWith(".svg")) out.push(p); }
  return out;
}
function lexicalScore(name, slot) {
  if(hasAny(name,GLOBAL_EXCLUDE)||hasAny(name,slot.exclude)) return null;
  let best=0; for(const [term,w] of slot.terms) if(hasPhrase(name,term)) best=Math.max(best,w);
  if(!best) return null; for(const p of slot.prefer??[]) if(hasPhrase(name,p)) best+=12; return best;
}
function svgMetrics(svg,bytes) {
  const lower=svg.toLowerCase(); const tags=["path","polygon","polyline","circle","ellipse","rect","line"];
  const counts=Object.fromEntries(tags.map((t)=>[`${t}Count`,count(lower,new RegExp(`<${t}\\b`,"g"))]));
  const elementCount=Object.values(counts).reduce((a,b)=>a+b,0);
  const pathDataLength=[...svg.matchAll(/\bd\s*=\s*["']([^"']+)["']/gi)].reduce((n,m)=>n+m[1].length,0);
  const pathCommandCount=[...svg.matchAll(/\bd\s*=\s*["']([^"']+)["']/gi)].reduce((n,m)=>n+count(m[1],/[a-z]/gi),0);
  const colors=[...lower.matchAll(/(?:fill|stroke)\s*=\s*["']([^"']+)["']/g)].map((m)=>m[1]).filter((v)=>v!=="none"&&v!=="currentcolor");
  const vb=lower.match(/viewbox\s*=\s*["']\s*[-+\d.e]+[ ,]+[-+\d.e]+[ ,]+([-+\d.e]+)[ ,]+([-+\d.e]+)/i);
  return {...counts,elementCount,pathDataLength,pathCommandCount,bytes,groupCount:count(lower,/<g\b/g),textCount:count(lower,/<text\b/g),imageCount:count(lower,/<image\b/g),useCount:count(lower,/<use\b/g),gradientCount:count(lower,/<(?:linear|radial)gradient\b/g),filterCount:count(lower,/<filter\b/g),clipPathCount:count(lower,/<clippath\b/g),uniqueColorCount:new Set(colors).size,aspectRatio:vb&&Number(vb[2])?Math.abs(Number(vb[1])/Number(vb[2])):null};
}
function geometryScore(m) {
  let s=0; if(m.elementCount>=1)s+=18; if(m.elementCount<=12)s+=20; else if(m.elementCount<=30)s+=8; else s-=25;
  if(m.pathDataLength>=120)s+=8; if(m.pathDataLength>=500)s+=8; if(m.pathCommandCount>=12)s+=7;
  if(m.pathCommandCount>2500||m.pathDataLength>100000)s-=30; if(m.bytes>=350&&m.bytes<=180000)s+=9; if(m.bytes>500000)s-=40;
  if(m.textCount||m.imageCount)s-=100; if(m.gradientCount)s-=18; if(m.filterCount)s-=12;
  if(m.uniqueColorCount<=3)s+=8; else if(m.uniqueColorCount>10)s-=20; if(m.aspectRatio&&m.aspectRatio>=.25&&m.aspectRatio<=4)s+=5; return s;
}
function structuralFingerprint(svg) { return sha256(svg.toLowerCase().replace(/<!--[^]*?-->/g,"").replace(/\s+/g," ").replace(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi,(n)=>String(Math.round(Number(n)*10)/10))); }
function connectedComponents(bits,w=32,h=32) {
  const seen=new Uint8Array(bits.length); let components=0,largest=0;
  for(let start=0;start<bits.length;start++){if(!bits[start]||seen[start])continue;components++;let size=0;const q=[start];seen[start]=1;
    for(let k=0;k<q.length;k++){const i=q[k];size++;const x=i%w,y=Math.floor(i/w);for(const j of[x?i-1:-1,x+1<w?i+1:-1,y?i-w:-1,y+1<h?i+w:-1])if(j>=0&&bits[j]&&!seen[j]){seen[j]=1;q.push(j);}}
    largest=Math.max(largest,size);}
  return{components,largest};
}
function visualFingerprint(filePath,tempDir) {
  const png=path.join(tempDir,`${sha256(filePath).slice(0,16)}.png`);
  execFileSync("rsvg-convert",["-w","256","-h","256","-f","png","-o",png,filePath],{stdio:"ignore",timeout:12000});
  const alpha=execFileSync("magick",[png,"-alpha","extract","-filter","box","-resize","32x32!","-depth","8","gray:-"],{maxBuffer:4096,timeout:12000});
  const bits=Uint8Array.from(alpha,(v)=>v>=40?1:0); const fg=bits.reduce((n,v)=>n+v,0); let boundary=0;
  for(let i=0;i<bits.length;i++)if(bits[i]){const x=i%32,y=Math.floor(i/32);if(!x||x===31||!y||y===31||!bits[i-1]||!bits[i+1]||!bits[i-32]||!bits[i+32])boundary++;}
  const cc=connectedComponents(bits); return{bits,fingerprint:Buffer.from(bits).toString("base64"),foregroundRatio:fg/1024,boundaryRatio:fg?boundary/fg:0,connectedComponents:cc.components,largestComponentRatio:fg?cc.largest/fg:0};
}
function visualScore(v) { if(!v)return 0;let s=0;if(v.foregroundRatio>=.06&&v.foregroundRatio<=.72)s+=18;else s-=25;if(v.boundaryRatio>=.08&&v.boundaryRatio<=.62)s+=12;else s-=8;if(v.connectedComponents===1)s+=18;else if(v.connectedComponents<=3)s+=7;else if(v.connectedComponents>8)s-=22;if(v.largestComponentRatio>=.78)s+=10;else if(v.largestComponentRatio<.45)s-=18;return s; }
function morphDistance(a,b){if(!a?.visual?.bits||!b?.visual?.bits)return a?.structural===b?.structural?0:1;let intersection=0,union=0;for(let i=0;i<a.visual.bits.length;i++){if(a.visual.bits[i]||b.visual.bits[i])union++;if(a.visual.bits[i]&&b.visual.bits[i])intersection++;}return union?1-intersection/union:0;}
async function analyseCandidate(entry,tempDir,rendererAvailable){try{const buffer=await readFile(entry.filePath);const svg=buffer.toString("utf8"),lower=svg.toLowerCase();if(!/<svg\b/.test(lower)||!/<\/svg\s*>/.test(lower))throw new Error("missing SVG root");const metrics=svgMetrics(svg,buffer.length);if(!metrics.elementCount||metrics.textCount||metrics.imageCount)throw new Error("unsuitable SVG content");const visual=rendererAvailable?visualFingerprint(entry.filePath,tempDir):null;return{...entry,hash:sha256(buffer),structural:structuralFingerprint(svg),metrics,visual,baseScore:entry.lexical+geometryScore(metrics)+visualScore(visual)};}catch(error){return{error:`${entry.relative}: ${error.message}`};}}
function candidateForManifest(c){return{label:c.label,sourceFile:c.relative,score:Math.round(c.finalScore??c.baseScore),hash:c.hash,morphologicalFingerprint:c.visual?.fingerprint??c.structural,metrics:{...c.metrics,visual:c.visual?{foregroundRatio:Number(c.visual.foregroundRatio.toFixed(4)),boundaryRatio:Number(c.visual.boundaryRatio.toFixed(4)),connectedComponents:c.visual.connectedComponents,largestComponentRatio:Number(c.visual.largestComponentRatio.toFixed(4))}:null}};}
function rendererExists(command,args){try{execFileSync(command,args,{stdio:"ignore",timeout:3000});return true;}catch{return false;}}

async function main(){
  console.log("Scanning local OpenClipart corpus..."); const files=await walk(SOURCE_DIR); console.log(`SVG found: ${files.length}`); if(!files.length)throw new Error(`No SVG files found in ${SOURCE_DIR}`);
  const pools=new Map(SLOTS.map((s)=>[`${s.family}/${s.archetype}`,[]]));
  for(const filePath of files){const relative=path.relative(ROOT,filePath),searchName=normalize(`${path.basename(path.dirname(filePath))} ${path.basename(filePath)}`);let bytes=0;try{bytes=(await stat(filePath)).size;}catch{continue;}if(bytes>1000000||bytes<100)continue;for(const slot of SLOTS){const lexical=lexicalScore(searchName,slot);if(lexical==null)continue;pools.get(`${slot.family}/${slot.archetype}`).push({filePath,relative,label:path.basename(filePath,path.extname(filePath)),lexical});}}
  const rendererAvailable=rendererExists("rsvg-convert",["--version"])&&rendererExists("magick",["-version"]);console.log(`Morphology renderer: ${rendererAvailable?"available":"unavailable (structural fallback)"}`);
  const union=new Map();for(const pool of pools.values()){pool.sort((a,b)=>b.lexical-a.lexical||a.relative.localeCompare(b.relative));for(const e of pool.slice(0,SHORTLIST_PER_SLOT)){const old=union.get(e.filePath);if(!old||e.lexical>old.lexical)union.set(e.filePath,e);}}console.log(`Shortlisted unique SVG: ${union.size}`);
  const tempDir=await mkdtemp(path.join(tmpdir(),"brain-repertoire-")),analysed=new Map(),errors=[];
  try{let done=0;for(const entry of union.values()){const r=await analyseCandidate(entry,tempDir,rendererAvailable);if(r.error)errors.push(r.error);else analysed.set(entry.filePath,r);done++;if(done%100===0)console.log(`Analysed ${done}/${union.size}`);}}finally{await rm(tempDir,{recursive:true,force:true});}
  console.log(`Usable shortlisted SVG: ${analysed.size}; skipped: ${errors.length}`);
  const selected=[],unresolved=[],usedFiles=new Set(),usedHashes=new Set();
  for(const slot of SLOTS){const key=`${slot.family}/${slot.archetype}`;const candidates=pools.get(key).map((e)=>analysed.get(e.filePath)).filter(Boolean).map((a)=>({...a,lexical:lexicalScore(normalize(`${path.basename(path.dirname(a.filePath))} ${a.label}`),slot)??0})).filter((a)=>a.lexical>0&&!usedFiles.has(a.filePath)&&!usedHashes.has(a.hash));const family=selected.filter((i)=>i.family===slot.family).map((i)=>i._candidate);
    for(const c of candidates){const min=family.length?Math.min(...family.map((o)=>morphDistance(c,o))):1;c.morphologicalDistance=min;c.finalScore=c.lexical+geometryScore(c.metrics)+visualScore(c.visual)+Math.round(min*30);if(min<MORPH_MIN_DISTANCE)c.finalScore-=90;}candidates.sort((a,b)=>b.finalScore-a.finalScore||a.relative.localeCompare(b.relative));const best=candidates[0];if(!best){unresolved.push({family:slot.family,archetype:slot.archetype});console.log(`MISS ${key}`);continue;}usedFiles.add(best.filePath);usedHashes.add(best.hash);
    const alternatives=[];for(const c of candidates.slice(1)){if(c.hash===best.hash||morphDistance(c,best)<.06||alternatives.some((a)=>a.hash===c.hash||morphDistance(c,a)<.06))continue;alternatives.push(c);if(alternatives.length===ALTERNATIVE_COUNT)break;}
    const id=`${slot.family}-${slot.archetype}`;selected.push({id,family:slot.family,archetype:slot.archetype,label:best.label,sourceFile:best.relative,license:"CC0-1.0",approvedBy:"PENDING_VISUAL_APPROVAL",score:Math.round(best.finalScore),metrics:candidateForManifest(best).metrics,hash:best.hash,morphologicalFingerprint:best.visual?.fingerprint??best.structural,morphologicalDistanceWithinFamily:Number(best.morphologicalDistance.toFixed(4)),alternatives:alternatives.map(candidateForManifest),_candidate:best});console.log(`OK ${key} -> ${best.label}${alternatives.length<ALTERNATIVE_COUNT?` (only ${alternatives.length} alternatives)`:""}`);
  }

  // The 40 named slots establish coverage. Fill every family to 24 with the
  // strongest genuinely distinct candidates, while keeping archetype series
  // bounded so that one prolific filename family cannot dominate the result.
  for(const familyName of ["human","animal","organic","everyday","artifact"]){
    const familySlots=SLOTS.filter((slot)=>slot.family===familyName);
    const familyPool=[];
    for(const asset of analysed.values()){
      if(usedFiles.has(asset.filePath)||usedHashes.has(asset.hash))continue;
      let bestMatch=null;
      const searchName=normalize(`${path.basename(path.dirname(asset.filePath))} ${asset.label}`);
      for(const slot of familySlots){
        const lexical=lexicalScore(searchName,slot);
        if(lexical!=null&&(!bestMatch||lexical>bestMatch.lexical))bestMatch={slot,lexical};
      }
      if(bestMatch)familyPool.push({...asset,matchedSlot:bestMatch.slot,lexical:bestMatch.lexical});
    }
    const archetypeCounts=()=>Object.fromEntries(familySlots.map((slot)=>[slot.archetype,selected.filter((item)=>item.family===familyName&&item.archetype===slot.archetype).length]));
    for(const threshold of [0.16,0.12,0.08,0.06]){
      while(selected.filter((item)=>item.family===familyName).length<TARGET_PER_FAMILY){
        const chosen=selected.filter((item)=>item.family===familyName).map((item)=>item._candidate);
        const counts=archetypeCounts();
        const ranked=familyPool.filter((candidate)=>!usedFiles.has(candidate.filePath)&&!usedHashes.has(candidate.hash)&&counts[candidate.matchedSlot.archetype]<5).map((candidate)=>{
          const minDistance=chosen.length?Math.min(...chosen.map((other)=>morphDistance(candidate,other))):1;
          const score=candidate.lexical+geometryScore(candidate.metrics)+visualScore(candidate.visual)+Math.round(minDistance*45)-counts[candidate.matchedSlot.archetype]*14;
          return{candidate,minDistance,score};
        }).filter((row)=>row.minDistance>=threshold).sort((a,b)=>b.score-a.score||a.candidate.relative.localeCompare(b.candidate.relative));
        if(!ranked.length)break;
        const {candidate,minDistance,score}=ranked[0];
        const archetype=candidate.matchedSlot.archetype;
        const sequence=counts[archetype]+1;
        const id=`${familyName}-${archetype}-${String(sequence).padStart(2,"0")}`;
        candidate.finalScore=score;candidate.morphologicalDistance=minDistance;
        selected.push({id,family:familyName,archetype,label:candidate.label,sourceFile:candidate.relative,license:"CC0-1.0",approvedBy:"PENDING_VISUAL_APPROVAL",score:Math.round(score),metrics:candidateForManifest(candidate).metrics,hash:candidate.hash,morphologicalFingerprint:candidate.visual?.fingerprint??candidate.structural,morphologicalDistanceWithinFamily:Number(minDistance.toFixed(4)),alternatives:[],_candidate:candidate});
        usedFiles.add(candidate.filePath);usedHashes.add(candidate.hash);
        console.log(`ADD ${familyName}/${archetype} -> ${candidate.label} (distance ${minDistance.toFixed(3)})`);
      }
      if(selected.filter((item)=>item.family===familyName).length>=TARGET_PER_FAMILY)break;
    }
  }

  // Record near-neighbours rejected by the morphology filter and objective
  // anomalies for the human review, without making an approval decision.
  for(const item of selected){
    const related=[];
    const slot=SLOTS.find((candidate)=>candidate.family===item.family&&candidate.archetype===item.archetype);
    for(const candidate of analysed.values()){
      if(candidate.filePath===item._candidate.filePath||usedHashes.has(candidate.hash))continue;
      const searchName=normalize(`${path.basename(path.dirname(candidate.filePath))} ${candidate.label}`);
      if(!slot||lexicalScore(searchName,slot)==null)continue;
      const distance=morphDistance(item._candidate,candidate);
      if(distance<0.12)related.push({label:candidate.label,sourceFile:candidate.relative,morphologicalDistance:Number(distance.toFixed(4))});
    }
    related.sort((a,b)=>a.morphologicalDistance-b.morphologicalDistance||a.sourceFile.localeCompare(b.sourceFile));
    item.similarCandidatesDiscarded=related.slice(0,5);
    const anomalies=[];const visual=item._candidate.visual;const metrics=item._candidate.metrics;
    if(visual?.connectedComponents>3)anomalies.push(`multiple components: ${visual.connectedComponents}`);
    if(visual?.foregroundRatio<0.06||visual?.foregroundRatio>0.72)anomalies.push(`unusual foreground ratio: ${visual.foregroundRatio.toFixed(3)}`);
    if(metrics.elementCount>30)anomalies.push(`high element count: ${metrics.elementCount}`);
    if(metrics.uniqueColorCount>10)anomalies.push(`many explicit colors: ${metrics.uniqueColorCount}`);
    if(item.morphologicalDistanceWithinFamily<MORPH_MIN_DISTANCE)anomalies.push(`reduced within-family distance: ${item.morphologicalDistanceWithinFamily}`);
    item.anomalies=anomalies;
  }
  await rm(OUTPUT_DIR,{recursive:true,force:true});await mkdir(OUTPUT_SVG_DIR,{recursive:true});for(const item of selected)await copyFile(item._candidate.filePath,path.join(OUTPUT_SVG_DIR,`${item.id}.svg`));const assets=selected.map(({_candidate,...a})=>a);
  const manifest={name:"Brain PsicoFantasma Repertoire V2",source:"Local OpenClipart SVG corpus",license:"CC0-1.0",status:"PENDING_VISUAL_APPROVAL",generatedAt:new Date().toISOString(),generator:"build-repertoire.mjs",corpusSvgCount:files.length,total:assets.length,target:TARGET_TOTAL,guideArchetypes:SLOTS.length,unresolved,scanErrors:errors.length,assets};
  await writeFile(path.join(OUTPUT_DIR,"repertoire.json"),`${JSON.stringify(manifest,null,2)}\n`);
  const review=assets.map((i)=>[
    `FAMILY: ${i.family}`,`ARCHETYPE: ${i.archetype}`,`SELECTED: ${i.label}`,`SOURCE: ${i.sourceFile}`,`SCORE: ${i.score}`,
    "SIMILAR CANDIDATES DISCARDED:",...(i.similarCandidatesDiscarded.length?i.similarCandidatesDiscarded.map((a,n)=>`${n+1}. ${a.label} — distance ${a.morphologicalDistance} — ${a.sourceFile}`):["none"]),
    "ANOMALIES:",...(i.anomalies.length?i.anomalies.map((a)=>`- ${a}`):["none"]),"",
  ].join("\n")).join("\n");await writeFile(path.join(OUTPUT_DIR,"review.txt"),`${review}\n`);
  const ids=new Set(assets.map((a)=>a.id)),hashes=new Set(assets.map((a)=>a.hash));const familyCounts=Object.fromEntries(["human","animal","organic","everyday","artifact"].map((f)=>[f,assets.filter((a)=>a.family===f).length]));let unreadable=0;if(rendererAvailable)for(const i of assets){try{execFileSync("rsvg-convert",["-w","16","-h","16","-f","png",path.join(OUTPUT_SVG_DIR,`${i.id}.svg`)],{stdio:"ignore",timeout:8000});}catch{unreadable++;}}
  const validation={selected:assets.length,target:TARGET_TOTAL,guideArchetypesResolved:`${SLOTS.length-unresolved.length}/${SLOTS.length}`,unresolved:unresolved.length,uniqueIds:ids.size===assets.length,uniqueSourceFiles:new Set(assets.map((a)=>a.sourceFile)).size===assets.length,uniqueHashes:hashes.size===assets.length,familyCounts,outputSvgCount:(await readdir(OUTPUT_SVG_DIR)).filter((f)=>f.endsWith(".svg")).length,unreadableSvg:unreadable,jsonValid:true,networkAccess:false};await writeFile(path.join(OUTPUT_DIR,"validation.json"),`${JSON.stringify(validation,null,2)}\n`);
  console.log(`Selected: ${assets.length}/${TARGET_TOTAL}`);console.log(`Guide archetypes unresolved: ${unresolved.length}`);console.log(`Family counts: ${JSON.stringify(familyCounts)}`);console.log(`Unique files: ${validation.uniqueSourceFiles}; unique hashes: ${validation.uniqueHashes}; unreadable: ${unreadable}`);console.log(`Output: ${OUTPUT_DIR}`);if(assets.length<TARGET_TOTAL||Object.values(familyCounts).some((count)=>count<TARGET_PER_FAMILY)||!validation.uniqueSourceFiles||!validation.uniqueHashes||unreadable)process.exitCode=2;
}
main().catch((error)=>{console.error(`FATAL: ${error.stack??error.message}`);process.exitCode=1;});
