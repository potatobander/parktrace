(function(root,factory){const k=typeof module==='object'?require('./phone-knowledge.js'):root.PaidaKnowledge;const api=factory(k);if(typeof module==='object')module.exports=api;else root.PaidaPhoneCoach=api;})(globalThis,function(K){
 'use strict';
 const scenes={campus:'校园',street:'街道',park:'公园',cafe:'咖啡馆',gallery:'展馆'};
 const props={seat:'座椅',table:'桌面',wall:'墙面',book:'书',bag:'包带',cup:'杯子',window:'窗边柔光',clear_path:'可慢走的路线'};
 function recommend(context={},history=[],round=0){
  const c={scene:'campus',light:'soft',intent:'自然记录',framing:'auto',motion:false,props:[],...context};
  const available=new Set(c.props),recent=new Set(history);
  const all=K.seeds.filter(s=>s.requires.every(p=>available.has(p))&&(!s.motion||(c.motion&&c.light!=='low')));
  const score=s=>(recent.has(s.id)?-100:0)+(s.scene===c.scene?7:0)+(s.intent===c.intent?5:0)+(s.requires.length?2:0);
  const ranked=all.map((s,i)=>({s,score:score(s),tie:(i-round*3+all.length*100)%all.length})).sort((a,b)=>b.score-a.score||a.tie-b.tie);
  const chosen=[],families=new Set();for(const {s} of ranked){if(families.has(s.family))continue;chosen.push(s);families.add(s.family);if(chosen.length===3)break;}
  const low=c.light==='low';
  return chosen.map((s,i)=>{
   const framing=c.framing!=='auto'?c.framing:c.intent==='环境叙事'?'environment':s.family==='portrait'?'half':'full';
   const position=['画面中部','左侧三分之一附近','右侧三分之一附近'][(round+i)%3];
   const composition=framing==='environment'?`保留能说明地点的背景，人物放在${position}；不必把人物填满画面`:framing==='half'?`取上半身，给头顶与肩膀留空间，人物放在${position}`:`先保留完整头脚，手机保持平稳，人物放在${position}`;
   const light=low?'手机和人物先稳住，等拍摄完成再动':c.light==='hard'?'先检查脸上的强烈明暗；可试着转向均匀光':c.light==='back'?'观察人物与背景的明暗关系，让轮廓容易分辨':'观察脸部受光，让眼睛和表情看得清楚';
   const gaze=c.intent==='安静氛围'?'视线轻放在镜头旁':c.intent==='环境叙事'?'自然看向环境中的一处细节':(round+i)%2?'自然看向同伴':'自然看向镜头';
   return {id:s.id,title:s.title,family:s.family,framing,requirements:s.requires,motion:s.motion,steps:[s.action,gaze,low?'保持静止，等拍摄完成':s.motion?'摄影者站稳，捕捉自然瞬间':'停一下，等同伴按快门'],composition,light,reason:`${scenes[c.scene]||'当前环境'} · ${c.intent}；${s.requires.length?'利用已确认可用的'+s.requires.map(p=>props[p]).join('、'):'不依赖额外道具'}`,alternative:'不想做这个动作，就自然站定或保持现有舒适坐姿，放松肩膀。',knowledge_ids:[...new Set([...s.knowledge_ids,framing==='environment'?'K18':'K09',low?'K12':'K02','K20'])]};
  });
 }
 return {recommend,props,scenes};
});
