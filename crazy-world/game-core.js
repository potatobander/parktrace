(function(root){
 'use strict';
 const RESOURCES={wood:'木材',plastic:'塑料',metal:'废金属',cloth:'布料',fish:'鲜鱼',water:'淡水'};
 const RECIPES={
  purifier:{name:'海水净化厂',icon:'water',art:'water',max:3,costs:[{wood:6,plastic:5,metal:2},{wood:16,plastic:12,metal:8},{wood:28,plastic:20,metal:16}],desc:['把咸的海，变成可以喝的水。','提高净化效率，储备更多淡水。','高效淡化，支撑整个海上社区。']},
  expansion:{name:'扩建木筏',icon:'raft',art:'raft',max:3,costs:[{wood:8,plastic:4},{wood:18,plastic:10,metal:4},{wood:30,plastic:18,metal:10}],desc:['从 4 格扩建至 9 格，给生活留位置。','扩建至 16 格，可以建更大的家。','扩建至 25 格，一座漂浮的小社区。']},
  shelter:{name:'建造庇护所',icon:'home',art:'shelter',max:3,costs:[{wood:12,plastic:6,cloth:4},{wood:24,metal:8,cloth:8},{wood:38,metal:16,cloth:14}],desc:['挡风避雨，也能容纳 1 位新伙伴。','升级木屋，最多容纳 3 位伙伴。','温暖的海上小屋，容纳 5 位伙伴。']},
  rod:{name:'制作钓竿',icon:'fish',art:'rod',max:3,costs:[{wood:5,plastic:2,cloth:1},{wood:12,metal:5,cloth:3},{wood:20,metal:12,cloth:6}],desc:['钓一点鱼，把日子过得有滋有味。','加固钓竿，每次收获更多鲜鱼。','专业钓具，鱼群也难逃你的手心。']},
  hook:{name:'升级打捞钩',icon:'hook',art:'hook',max:3,costs:[{wood:6,metal:4,plastic:3},{wood:15,metal:10,plastic:8},{wood:25,metal:18,plastic:12}],desc:['更结实的钩子，每次多打捞 1 份。','大号打捞钩，再多收获 1 份。','磁力打捞钩，大海也有好东西。']},
  coat:{name:'缝制保暖衣',icon:'cloth',art:'coat',max:3,costs:[{cloth:6,plastic:2},{cloth:12,plastic:5},{cloth:20,plastic:8,metal:3}],desc:['用漂来的布料，缝一身温暖。','防风外套，挡住夜晚的海风。','防水保暖服，让风暴也不那么冷。']}
 };
 const NAMES=['阿屿','小满','木木','阿澜','小禾'];
 function createState(mode='survival'){
  return {version:1,started:false,mode:mode==='relaxed'?'relaxed':'survival',time:0,seed:72631,
   resources:{wood:0,plastic:0,metal:0,cloth:0,fish:0,water:0},
   buildings:{purifier:0,expansion:0,shelter:0,rod:0,hook:0,coat:0},
   vitals:{health:100,hunger:90,thirst:86,warmth:92},
   workers:[],roles:{salvage:0,fishing:0,water:0},timers:{purifier:0,salvage:0,fishing:0,water:0,supply:0,crew:0},
   stats:{collected:0,catches:0,built:0,water:0},logs:[{time:0,text:'醒来时，世界只剩下海。还好，你有一块木筏。'}],
   autoSupply:true,over:false,won:false,announced:[],sound:false};
 }
 function random(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
 function day(s){return Math.floor(s.time/180)+1;}
 function hour(s){return (8+s.time/180*24)%24;}
 function isNight(s){return hour(s)>=19||hour(s)<6;}
 function weather(s){const n=Math.floor(s.time/72)%8;return n===3||n===4?'rain':n===7?'storm':'clear';}
 function capacity(s){return [0,1,3,5][s.buildings.shelter];}
 function freeWorkers(s){return s.workers.length-Object.values(s.roles).reduce((a,b)=>a+b,0);}
 function emit(s,text){s.logs.unshift({time:s.time,text});s.logs=s.logs.slice(0,16);}
 function getCost(s,key){const r=RECIPES[key];return r&&r.costs[s.buildings[key]]||null;}
 function canAfford(s,cost){return !!cost&&Object.entries(cost).every(([k,n])=>s.resources[k]>=n);}
 function requirement(s,key){if(key==='shelter'&&s.buildings.expansion<s.buildings.shelter+1)return '先扩建木筏至 '+([9,16,25][s.buildings.shelter])+' 格';return '';}
 function build(s,key){
  if(s.over)return {ok:false,message:'这次漂流已经结束。'};
  const recipe=RECIPES[key],cost=getCost(s,key);
  if(!recipe||!cost)return {ok:false,message:'已经升级到最高等级。'};
  const req=requirement(s,key);if(req)return {ok:false,message:req};
  if(!canAfford(s,cost))return {ok:false,message:'物资还不够，再打捞一些吧。'};
  Object.entries(cost).forEach(([k,n])=>s.resources[k]-=n);s.buildings[key]++;s.stats.built++;
  const level=s.buildings[key];
  const names={purifier:'海水净化厂',shelter:'庇护所',expansion:'木筏',rod:'钓竿',hook:'打捞钩',coat:'保暖衣'};
  const message=names[key]+(level===1?'已建成':'升级至 Lv.'+level)+(key==='purifier'?'，淡水正在慢慢积攒。':key==='coat'?'，夜晚多了一点温暖。':'。');
  emit(s,message);return {ok:true,message};
 }
 function collect(s,type){
  if(s.over)return {};
  const gain={};
  if(type==='crate'){
   for(const k of ['wood','plastic','metal','cloth'])gain[k]=2+s.buildings.hook+Math.floor(random(s)*2);
   if(random(s)>.65)gain.fish=1;
  }else if(RESOURCES[type]&&type!=='fish'&&type!=='water')gain[type]=2+s.buildings.hook+(random(s)>.65?1:0);
  for(const [k,n]of Object.entries(gain))s.resources[k]=Math.min(9999,s.resources[k]+n);
  s.stats.collected++;return gain;
 }
 function eat(s){if(s.resources.fish<1)return {ok:false,message:'暂时没有鱼，制作钓竿去钓一点吧。'};if(s.vitals.hunger>90)return {ok:false,message:'现在还不饿，留一点食物给以后吧。'};s.resources.fish--;s.vitals.hunger=Math.min(100,s.vitals.hunger+30);return {ok:true,message:'吃了一份鲜鱼，饱食 +30。'};}
 function drink(s){if(s.resources.water<1)return {ok:false,message:'还没有淡水，先建造海水净化厂。'};if(s.vitals.thirst>90)return {ok:false,message:'现在还不渴，留一点淡水给以后吧。'};s.resources.water--;s.vitals.thirst=Math.min(100,s.vitals.thirst+35);return {ok:true,message:'喝了一份淡水，水分 +35。'};}
 function catchFish(s,perfect=false){if(!s.buildings.rod||s.over)return 0;const n=1+s.buildings.rod+(perfect?1:0);s.resources.fish=Math.min(9999,s.resources.fish+n);s.stats.catches++;emit(s,'钓到了 '+n+' 份鲜鱼'+(perfect?'，漂亮的收竿！':'。'));return n;}
 function recruit(s){
  if(s.over)return {ok:false,message:'这次漂流已经结束。'};
  if(s.workers.length>=capacity(s))return {ok:false,message:capacity(s)?'床位满了，升级庇护所可以接纳更多伙伴。':'先扩建木筏、建造庇护所，给伙伴一个床位。'};
  if(!canAfford(s,{fish:3,water:3}))return {ok:false,message:'准备 3 份鱼和 3 份淡水，就能接纳一位伙伴。'};
  s.resources.fish-=3;s.resources.water-=3;const name=NAMES[s.workers.length];s.workers.push(name);s.roles.salvage++;
  const message=name+'加入了木筏，开始帮你打捞。记得为伙伴储备食物和水。';emit(s,message);return {ok:true,message};
 }
 function assign(s,role,delta){
  if(!Object.hasOwn(s.roles,role)||![-1,1].includes(delta))return false;
  if(delta<0){if(s.roles[role]<1)return false;s.roles[role]--;return true;}
  if(freeWorkers(s)<1)return false;
  if(role==='fishing'&&!s.buildings.rod||role==='water'&&!s.buildings.purifier)return false;
  s.roles[role]++;return true;
 }
 function winReady(s){return s.buildings.purifier>0&&s.buildings.shelter>=2&&s.buildings.coat>0&&s.buildings.rod>0&&s.workers.length>=2;}
 function tick(s,dt){
  if(s.over||!s.started)return [];
  dt=Math.max(0,Math.min(1,dt));s.time+=dt;const b=s.buildings,r=s.resources,v=s.vitals,events=[];
  const rate=s.mode==='relaxed'?.5:1;
  v.hunger=Math.max(0,v.hunger-dt*.105*rate);v.thirst=Math.max(0,v.thirst-dt*.135*rate);
  const wet=weather(s)==='storm'?22:weather(s)==='rain'?13:0;
  const target=Math.min(100,(isNight(s)?30:92)+b.shelter*16+b.coat*18-wet);
  v.warmth=Math.max(0,Math.min(100,v.warmth+(target-v.warmth)*dt*.02));
  const danger=(v.hunger<8?1:0)+(v.thirst<8?1.35:0)+(v.warmth<18?.6:0);
  if(danger)v.health=Math.max(0,v.health-dt*danger*.6*rate);
  else if(v.hunger>45&&v.thirst>45&&v.warmth>45)v.health=Math.min(100,v.health+dt*.16);
  if(b.purifier){s.timers.purifier+=dt;const sec=[0,12,8,5][b.purifier];while(s.timers.purifier>=sec){s.timers.purifier-=sec;r.water=Math.min(9999,r.water+1);s.stats.water++;}}
  s.timers.supply+=dt;
  if(s.timers.supply>=3){s.timers.supply=0;if(s.autoSupply){if(v.hunger<60&&r.fish>0)eat(s);if(v.thirst<60&&r.water>0)drink(s);}}
  if(s.workers.length){
   s.timers.crew+=dt;
   if(s.timers.crew>=45){s.timers.crew=0;const need=s.workers.length;const enough=r.fish>=need&&r.water>=need;r.fish=Math.max(0,r.fish-need);r.water=Math.max(0,r.water-need);if(!enough){events.push('伙伴们需要补给，工作效率暂时减半。');emit(s,'伙伴们的补给不足：每 45 秒每人需要 1 份鱼和 1 份水。');}}
   const efficiency=r.fish>0&&r.water>0?1:.5;
   for(const role of ['salvage','fishing','water']){
    if(!s.roles[role])continue;
    if(role==='fishing'&&!b.rod||role==='water'&&!b.purifier)continue;
    s.timers[role]+=dt*efficiency;
    const interval={salvage:9,fishing:16,water:10}[role];
    if(s.timers[role]>=interval){s.timers[role]-=interval;const n=s.roles[role];if(role==='salvage'){const keys=['wood','plastic','metal','cloth'];for(let i=0;i<n;i++){const key=keys[Math.floor(random(s)*4)];r[key]=Math.min(9999,r[key]+2+b.hook);}s.stats.collected+=n;}else if(role==='fishing'){r.fish=Math.min(9999,r.fish+n*(1+b.rod));s.stats.catches+=n;}else{r.water=Math.min(9999,r.water+2*n);s.stats.water+=2*n;}}
   }
  }
  for(const [key,message]of [['thirst','快口渴了：建净水厂，或喝一份淡水。'],['hunger','肚子在咕咕叫：钓鱼能获取食物。'],['warmth','海风变冷了，保暖衣和庇护所可以御寒。']]){
   if(v[key]<25&&!s.announced.includes(key)){s.announced.push(key);events.push(message);emit(s,message);}
   if(v[key]>50)s.announced=s.announced.filter(x=>x!==key);
  }
  if(v.health<=0){s.over=true;emit(s,'这段漂流结束了。海很大，下次会更有准备。');events.push('gameover');}
  if(!s.won&&winReady(s)){s.won=true;emit(s,'漂浮家园建成了！你让一片汪洋有了家的模样。');events.push('victory');}
  return events;
 }
 function goal(s){
  const b=s.buildings;
  if(s.stats.collected<8)return {title:'收集第一批漂流物',current:s.stats.collected,total:8,desc:'点击海面上的物资，或按空格自动抛钩。'};
  if(!b.purifier)return {title:'让海水变成淡水',current:0,total:1,desc:'建造净水厂。每 12 秒产出 1 份淡水。'};
  if(!b.rod)return {title:'晚饭，自己来钓',current:0,total:1,desc:'在「工具」制作钓竿，然后点击出海钓鱼。'};
  if(s.stats.catches<1)return {title:'钓起你的第一条鱼',current:0,total:1,desc:'鱼咬钩后，让指针落在绿色区域再收竿。'};
  if(!b.expansion)return {title:'把木筏变大一点',current:0,total:1,desc:'扩建至 9 格，为庇护所准备足够空间。'};
  if(!b.shelter)return {title:'为自己挡一挡海风',current:0,total:1,desc:'建造庇护所，获得夜间保暖和 1 个床位。'};
  if(!b.coat)return {title:'缝一件温暖的衣服',current:0,total:1,desc:'用布料制作保暖衣，夜间和雨天不再挨冻。'};
  if(!s.workers.length)return {title:'一个人，不如一起',current:0,total:1,desc:'储备 3 份鱼、3 份水，在「船员」接纳伙伴。'};
  if(b.shelter<2)return {title:'给更多伙伴一个家',current:b.shelter,total:2,desc:'再扩建一次木筏，并将庇护所升级至 Lv.2。'};
  if(s.workers.length<2)return {title:'建立漂浮家园',current:s.workers.length,total:2,desc:'招募第 2 位伙伴。家，不必建在陆地上。'};
  return {title:'漂浮家园，已达成',current:1,total:1,desc:'继续升级工坊，接纳最多 5 位伙伴，写下新的漂流故事。'};
 }
 function restore(raw){
  if(!raw||raw.version!==1||!raw.resources||!raw.vitals||!raw.buildings||!Number.isFinite(raw.time))throw Error('存档格式无法识别');
  const s=createState(raw.mode);s.started=!!raw.started;s.time=Math.max(0,raw.time);s.seed=Number.isFinite(raw.seed)?raw.seed>>>0:72631;
  for(const k of Object.keys(s.resources)){if(!Number.isFinite(raw.resources[k]))throw Error('物资存档已损坏');s.resources[k]=Math.max(0,Math.min(9999,Math.floor(raw.resources[k])));}
  for(const k of Object.keys(s.buildings)){const n=raw.buildings[k];if(!Number.isInteger(n)||n<0||n>3)throw Error('建筑存档已损坏');s.buildings[k]=n;}
  for(const k of Object.keys(s.vitals)){const n=raw.vitals[k];if(!Number.isFinite(n))throw Error('状态存档已损坏');s.vitals[k]=Math.max(0,Math.min(100,n));}
  s.workers=Array.isArray(raw.workers)?raw.workers.slice(0,5).map((_,i)=>NAMES[i]):[];
  for(const k of Object.keys(s.roles))s.roles[k]=Math.max(0,Math.min(s.workers.length,Math.floor(Number(raw.roles?.[k])||0)));
  if(Object.values(s.roles).reduce((a,b)=>a+b,0)>s.workers.length)s.roles={salvage:s.workers.length,fishing:0,water:0};
  for(const k of Object.keys(s.timers))s.timers[k]=Math.max(0,Math.min(44,Number(raw.timers?.[k])||0));
  for(const k of Object.keys(s.stats))s.stats[k]=Math.max(0,Math.floor(Number(raw.stats?.[k])||0));
  s.logs=Array.isArray(raw.logs)?raw.logs.slice(0,16).filter(x=>x&&typeof x.text==='string'&&Number.isFinite(x.time)):s.logs;
  s.autoSupply=raw.autoSupply!==false;s.over=!!raw.over||s.vitals.health<=0;s.won=!!raw.won;s.sound=!!raw.sound;
  s.announced=Array.isArray(raw.announced)?raw.announced.filter(x=>['hunger','thirst','warmth'].includes(x)):[];
  return s;
 }
 const API={RESOURCES,RECIPES,createState,random,day,hour,isNight,weather,capacity,freeWorkers,getCost,canAfford,requirement,build,collect,eat,drink,catchFish,recruit,assign,tick,goal,restore,emit,winReady};
 if(typeof module==='object'&&module.exports)module.exports=API;else root.OceanGame=API;
})(typeof window!=='undefined'?window:globalThis);
