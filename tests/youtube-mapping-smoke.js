'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

global.self={};
require(path.join(root,'exercise-library.js'));
const Library=global.self.MyBodyExerciseLibrary;
if(!Library?.exercises?.length)throw new Error('Exercise library did not load');

const recovery=fs.readFileSync(path.join(root,'youtube-legacy-recovery.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'core-storage.js'),'utf8');
const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function objectBlock(label,nextLabel){
  const start=recovery.indexOf(`const ${label}=Object.freeze({`);
  if(start<0)throw new Error(`${label} mapping not found`);
  const end=nextLabel?recovery.indexOf(`const ${nextLabel}=Object.freeze({`,start):recovery.indexOf('\n});',start)+4;
  if(end<=start)throw new Error(`${label} mapping could not be parsed`);
  return recovery.slice(start,end);
}
function keys(block){return new Set([...block.matchAll(/'([^']+)'\s*:\s*\[/g)].map(m=>m[1]))}

const byIdBlock=objectBlock('BY_ID','BY_NAME');
const byNameBlock=objectBlock('BY_NAME');
const byId=keys(byIdBlock),byName=keys(byNameBlock);
const missingLibrary=Library.exercises.filter(x=>!byId.has(x.id)).map(x=>`${x.id} (${x.name})`);
if(missingLibrary.length)throw new Error(`YouTube mapping missing library exercises: ${missingLibrary.join(', ')}`);

for(const line of byIdBlock.split('\n')){
  const m=line.match(/'([^']+)'\s*:\s*\[([^\]]*)\]/);if(!m)continue;
  const ids=[...m[2].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  if(!ids.length)throw new Error(`No YouTube candidates for ${m[1]}`);
  const invalid=ids.filter(id=>!/^[A-Za-z0-9_-]{11}$/.test(id));
  if(invalid.length)throw new Error(`Invalid YouTube IDs for ${m[1]}: ${invalid.join(', ')}`);
}

/* Exercise names embedded in both the default and admin workout plans. A plan entry is
   covered either by an exact verified name override or by the canonical library ID. */
const planNames=[...storage.matchAll(/\['([^']+)'\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\[|\s*\])/g)].map(m=>m[1]);
const uniquePlan=[...new Set(planNames)];
const missingPlan=uniquePlan.filter(name=>{
  if(byName.has(clean(name)))return false;
  const exercise=Library.find(name);
  return !exercise?.id||!byId.has(exercise.id);
});
if(missingPlan.length)throw new Error(`YouTube mapping missing workout-plan exercises: ${missingPlan.join(', ')}`);

if(!recovery.includes('new YT.Player'))throw new Error('YouTube IFrame Player API fallback is not enabled');
if(!recovery.includes('100,101,150'))throw new Error('YouTube embed-error fallback codes are not handled');
console.log(`YouTube mapping OK: ${Library.exercises.length}/${Library.exercises.length} library exercises and ${uniquePlan.length}/${uniquePlan.length} workout-plan names covered.`);
