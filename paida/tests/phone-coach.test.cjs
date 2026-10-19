const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../phone-coach.js'),K=require('../phone-knowledge.js');
test('knowledge provenance and variety',()=>{assert.equal(K.sources.length,15);assert.equal(K.rules.length,20);assert.ok(K.seeds.length>12);for(const r of K.rules)for(const id of r.source_ids)assert.ok(K.sources.some(s=>s.id===id));});
test('no unconfirmed props and no duplicate action family',()=>{const r=C.recommend();assert.equal(r.length,3);assert.equal(new Set(r.map(x=>x.family)).size,3);assert.ok(r.every(x=>x.requirements.length===0));});
test('recent history causes real action changes',()=>{const first=C.recommend();const second=C.recommend({},first.map(x=>x.id),1);assert.ok(second.every(x=>!first.some(y=>y.id===x.id)));});
test('low light forbids motion even when requested',()=>{for(let n=0;n<10;n++)assert.ok(C.recommend({light:'low',motion:true,props:['clear_path']},[],n).every(x=>!x.motion));});
test('environment intent preserves space',()=>{assert.ok(C.recommend({intent:'环境叙事'}).every(x=>x.framing==='environment'&&x.composition.includes('不必')));});
test('confirmed cafe props enable contextual seated suggestions',()=>{const r=C.recommend({scene:'cafe',props:['seat','table']});assert.ok(r.some(x=>x.requirements.includes('seat')));});
