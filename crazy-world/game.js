/* Crazy World — a self-contained, browser-local ocean survival game. */
(()=>{
 'use strict';
 const G=window.OceanGame,$=id=>document.getElementById(id),KEY='crazy-world-save-v1';
 const icon=(name,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
 const escape=str=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let s=G.createState(),hasSave=false,saveIssue='',paused=true,modalKind='',tab='build',selectedMode='survival';
 try{const raw=localStorage.getItem(KEY);if(raw){s=G.restore(JSON.parse(raw));hasSave=s.started;}}catch(e){saveIssue='上次的存档无法读取，可以开始一次新的漂流。';}
 let W=800,H=440,dpr=1,sceneTime=0,last=0,uiTimer=0,saveTimer=0,hook=null,fishGame=null,ambientTime=0,previousWeather=G.weather(s),frameId,storageWarning=false;
 const canvas=$('ocean'),ctx=canvas.getContext('2d');
 let drift=[],particles=[],lastResources={},renderedWorkshop='',lastAnnouncedDay=G.day(s),audioCtx=null,lastFocused=null;
 const types=['wood','plastic','wood','metal','cloth','plastic','crate','wood','cloth','plastic','metal','wood','plastic','cloth','crate','metal','wood','cloth'];
 let visualSeed=881;
 function vr(){visualSeed=(Math.imul(visualSeed,1664525)+1013904223)>>>0;return visualSeed/4294967296;}
 function spawn(type,index=-1){
  let x=.07+vr()*.86,y=.16+vr()*.67;
  if(Math.abs(x-.5)<.19&&Math.abs(y-.51)<.20){x=x<.5?.13+vr()*.13:.74+vr()*.13;}
  return {id:++ambientTime,type,x,y,angle:vr()*Math.PI*2,bob:vr()*6.28,velocity:.002+vr()*.002,scale:.8+vr()*.35,index};
 }
 function resetDrift(){drift=types.map((t,i)=>spawn(t,i));}
 resetDrift();
 function resize(){const rect=canvas.getBoundingClientRect();W=rect.width;H=rect.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 new ResizeObserver(resize).observe(canvas);
 function clock(t=s.time){const h=(8+t/180*24)%24;return `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`;}
 function toast(message,warn=false){const el=document.createElement('div');el.className='toast'+(warn?' warn':'');el.innerHTML=icon(warn?'flag':'check')+`<span>${escape(message)}</span>`;$('toasts').append(el);while($('toasts').children.length>3)$('toasts').firstChild.remove();setTimeout(()=>el.remove(),3500);}
 function sound(freq=480,duration=.12){if(!s.sound)return;try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.7,audioCtx.currentTime+duration);gain.gain.setValueAtTime(.045,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain).connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);}catch(e){}}
 function save(announce=false){
  if(!s.started)return;
  try{localStorage.setItem(KEY,JSON.stringify(s));$('saveLabel').textContent='进度已保存 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(announce)toast('漂流进度已保存，下次可以接着玩。');}
  catch(e){$('saveLabel').textContent='当前无法存档';if(!storageWarning||announce){toast('浏览器未允许保存，当前进度只保留在本页。',true);storageWarning=true;}}
 }
 function isActive(){return s.started&&!paused&&!s.over&&!modalKind;}
 function closeModal(){const kind=modalKind;if(s.over){endGame(false);return;}modalKind='';$('modalBackdrop').hidden=true;document.querySelector('.app-shell').inert=false;paused=!s.started;lastFocused?.focus({preventScroll:true});renderUI();}
 function modal(kind,content){lastFocused=document.activeElement;modalKind=kind;paused=true;document.querySelector('.app-shell').inert=true;$('modal').innerHTML=content;const heading=$('modal').querySelector('h2');if(heading)heading.id='modalTitle';$('modalBackdrop').hidden=false;requestAnimationFrame(()=>{$('modal').querySelector('button')?.focus({preventScroll:true});});}
 function startNew(){s=G.createState(selectedMode);s.started=true;paused=false;hook=null;fishGame=null;particles=[];resetDrift();renderedWorkshop='';hasSave=false;previousWeather='clear';lastAnnouncedDay=1;modalKind='';$('modalBackdrop').hidden=true;document.querySelector('.app-shell').inert=false;save();renderUI();toast('先点击海面上的漂浮物，收集建造材料吧。');sound(620,.16);}
 function intro(){
  const resumed=hasSave&&!s.over;
  modal('intro',`<div class="intro-illustration">${icon('raft')}</div><p class="modal-kicker">WELCOME TO THE CRAZY WORLD</p><h2>${resumed?'欢迎回来，漂流者。':'陆地消失了。<br>生活还要继续。'}</h2><p class="intro-description">${resumed?`你的木筏正漂在第 ${G.day(s)} 天的海面上。<br>海风依旧，回家看看吧。`:'世界只剩一片汪洋，而你只有一个小木筏。<br>捞起海上的碎片，钓一条鱼，接纳新的伙伴。<br>慢慢把它，建成自己的家。'}</p>${saveIssue?`<p class="recovery-note">${escape(saveIssue)}</p>`:''}${resumed?'':`<div class="mode-selector"><button class="mode-option ${selectedMode==='survival'?'selected':''}" data-mode="survival">生存冒险<small>感受昼夜与资源的挑战</small></button><button class="mode-option ${selectedMode==='relaxed'?'selected':''}" data-mode="relaxed">悠闲漂流<small>消耗减半，慢慢建设家园</small></button></div>`}<button class="primary-button" id="startBtn">${resumed?'继续我的漂流':'从一块木筏开始'} ${icon('arrow')}</button>${resumed?'<button class="quiet-button" id="newGameIntro">开启新的漂流</button>':''}<p class="intro-footnote">点击打捞 · 自由建造 · 自动存档 · 手机 / 电脑均可玩</p>`);
  $('startBtn').onclick=()=>{if(resumed){closeModal();paused=false;toast('欢迎回到你的海上小家。');}else startNew();};
  $('modal').querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{selectedMode=el.dataset.mode;intro();});
  if(resumed)$('newGameIntro').onclick=confirmRestart;
 }
 function confirmRestart(){modal('restart',`<p class="modal-kicker">ANOTHER JOURNEY</p><h2 id="modalTitle">再出发一次？</h2><p class="intro-description danger-copy">新的漂流将覆盖本浏览器的当前进度。<br>从零开始，再把大海变成家。</p><div class="mode-selector"><button class="mode-option ${selectedMode==='survival'?'selected':''}" data-mode="survival">生存冒险<small>标准消耗</small></button><button class="mode-option ${selectedMode==='relaxed'?'selected':''}" data-mode="relaxed">悠闲漂流<small>消耗减半</small></button></div><button class="primary-button" id="confirmRestartBtn">开始新的漂流 ${icon('arrow')}</button><button class="secondary-button" id="cancelRestartBtn">保留现在的家</button>`);$('confirmRestartBtn').onclick=startNew;$('cancelRestartBtn').onclick=()=>hasSave&&!s.started?intro():closeModal();$('modal').querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{selectedMode=b.dataset.mode;confirmRestart();});}
 function help(){modal('help',`<button class="modal-close" data-close aria-label="关闭">${icon('close')}</button><p class="modal-kicker">A SMALL GUIDE TO A BIG OCEAN</p><h2 id="modalTitle">海很大，慢慢来。</h2><div class="guide-row">${icon('hook')}<div><strong>捞起第一份希望</strong><p>点击海上漂浮物，或点「抛钩打捞」自动选择附近物资。物资箱能带来多种材料，升级钩子可以增加收获。</p></div></div><div class="guide-row">${icon('water')}<div><strong>先解决吃喝，再造一个家</strong><p>推荐顺序：净水厂 → 钓竿 → 扩建木筏 → 庇护所 → 保暖衣。净水厂自动产水；钓鱼时在指针进入绿色区域后收竿，靠近正中心还有额外奖励。</p></div></div><div class="guide-row">${icon('crew')}<div><strong>和伙伴一起生活</strong><p>有床位后，用 3 份鱼和 3 份水接纳一位伙伴。先点减号释放岗位，再点加号分配其他工作。每 45 秒，每位伙伴消耗 1 份鱼和 1 份水；补给不足，效率减半。</p></div></div><div class="guide-row">${icon('warm')}<div><strong>别让海风带走温暖</strong><p>3 分钟是游戏中的一天。夜间与下雨会降温，衣服和庇护所能保暖。饥饿、缺水或失温会损耗生命；状态良好时，生命会慢慢恢复。</p></div></div><div class="guide-shortcuts">空格：抛钩打捞　 F：钓鱼　 Esc：暂停 / 返回<br>切到其他页面会自动暂停，关页前自动保存。<br><label><input id="autoSupplyToggle" type="checkbox" ${s.autoSupply?'checked':''}> 饱食或水分低于 60 时自动使用库存补给</label></div><button class="primary-button" data-close>明白了，回到海上 ${icon('arrow')}</button><button class="quiet-button" id="restartHelp">重新开始游戏</button>`);$('autoSupplyToggle').onchange=e=>{s.autoSupply=e.target.checked;save();};$('restartHelp').onclick=confirmRestart;bindClose();}
 function bindClose(){$('modal').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);}
 function showPause(){if(!s.started||s.over||modalKind)return;save();modal('pause',`<div class="intro-illustration">${icon('moon')}</div><p class="modal-kicker">TAKE A LITTLE BREATH</p><h2 id="modalTitle">海也需要歇一歇。</h2><p class="intro-description">漂流已暂停，时间和生存状态都会停在这里。<br>你的家，等你回来。</p><button class="primary-button" data-close>继续漂流 ${icon('play')}</button><button class="secondary-button" id="pauseGuide">查看生存指南</button>`);bindClose();$('pauseGuide').onclick=help;renderUI();}
 function endGame(victory){save();modal(victory?'victory':'over',`<div class="intro-illustration">${icon(victory?'home':'raft')}</div><p class="modal-kicker">${victory?'A HOME, IN THE MIDDLE OF NOWHERE':'THE OCEAN REMEMBERS YOU'}</p><h2 id="modalTitle">${victory?'原来，家可以漂在海上。':'这一程，就漂到这里。'}</h2><p class="intro-description">${victory?'淡水、食物、挡风的屋顶，还有可以一起生活的人。<br>你在没有陆地的世界里，建起了一个家。':'别灰心，海依旧很大。<br>下次先造净水厂，再准备钓竿和保暖衣。'}</p><div class="stat-grid"><div><strong>${G.day(s)}</strong><small>漂流天数</small></div><div><strong>${s.stats.collected}</strong><small>打捞次数</small></div><div><strong>${s.workers.length}</strong><small>结识伙伴</small></div></div>${victory?'<button class="primary-button" data-close>继续建设我的家</button><button class="quiet-button" id="endRestart">开始新的漂流</button>':'<button class="primary-button" id="endRestart">再出发一次</button>'}`);bindClose();$('endRestart').onclick=confirmRestart;}
 function renderResources(){
  if(!$('resources').children.length)$('resources').innerHTML=Object.entries(G.RESOURCES).map(([key,name])=>`<div class="resource ${key}" id="resource-${key}"><span class="resource-icon">${icon(key)}</span><span><strong id="count-${key}">0</strong><small>${name}</small></span></div>`).join('');
  for(const [key,n]of Object.entries(s.resources)){const el=$('count-'+key);if(el.textContent!==String(n))el.textContent=n;if(n>(lastResources[key]??n)){const parent=$('resource-'+key);parent.classList.remove('pulse');void parent.offsetWidth;parent.classList.add('pulse');}lastResources[key]=n;}
 }
 function renderVitals(){
  const names={health:['生命','heart'],hunger:['饱食','food'],thirst:['水分','water'],warmth:['保暖','warm']};
  if(!$('vitals').children.length)$('vitals').innerHTML=Object.entries(names).map(([key,[name,ico]])=>`<div class="vital ${key}" id="vital-${key}"><div class="vital-label">${icon(ico)}<span>${name}</span><strong id="vitalValue-${key}">100%</strong></div><div class="vital-track"><span id="vitalBar-${key}"></span></div></div>`).join('');
  for(const [key,n]of Object.entries(s.vitals)){$('vitalValue-'+key).textContent=Math.ceil(n)+'%';$('vitalBar-'+key).style.width=n+'%';$('vital-'+key).classList.toggle('low',n<25);}
 }
 function costHtml(cost){return Object.entries(cost).map(([key,n])=>`<span class="cost ${s.resources[key]<n?'missing':''}" title="${G.RESOURCES[key]} ${s.resources[key]}/${n}">${icon(key)}${n}</span>`).join('');}
 function recipeHtml(key){const rec=G.RECIPES[key],level=s.buildings[key],cost=G.getCost(s,key),max=!cost,req=G.requirement(s,key),affordable=G.canAfford(s,cost)&&!req;let name=rec.name;if(key==='purifier'&&level)name='升级净化厂';if(key==='shelter'&&level)name='升级庇护所';if(key==='rod'&&level)name='升级钓竿';if(key==='coat'&&level)name='升级保暖衣';
  return `<article class="recipe-card ${affordable?'affordable':''}"><div class="recipe-head"><span class="recipe-art ${rec.art}">${icon(rec.icon)}</span><div><strong>${name}</strong><p>${max?'已经是最好的模样，继续向海而生。':req||rec.desc[level]}</p></div>${level?`<span class="recipe-level">Lv.${level}</span>`:''}</div><div class="recipe-bottom"><div class="recipe-costs">${max?'<span class="cost">已达到最高等级</span>':costHtml(cost)}</div><button class="build-button ${max?'max':''}" data-build="${key}" ${max||!affordable||!isActive()?'disabled':''} title="${escape(req||(affordable?'消耗材料进行建造':'继续打捞，收集所需材料'))}">${max?icon('check')+' 完成':level?'升级':'建造'}</button></div></article>`;
 }
 function crewHtml(){const free=G.freeWorkers(s);return `<div class="crew-summary"><strong>${s.workers.length}</strong> 位伙伴 <span> / ${G.capacity(s)} 个床位</span><p>待分配 ${free} 人 · 每人每 45 秒消耗 1 鱼 + 1 水</p></div>${[['salvage','hook','打捞物资','每 9 秒收集材料'],['fishing','fish','捕鱼','每 16 秒带回鲜鱼'],['water','water','协助净水','每 10 秒额外净化 2 份水']].map(([key,ico,name,desc])=>`<div class="role-row">${icon(ico)}<div class="role-info"><strong>${name}</strong><small>${desc}${key==='fishing'&&!s.buildings.rod?' · 需要钓竿':key==='water'&&!s.buildings.purifier?' · 需要净水厂':''}</small></div><div class="stepper"><button data-role="${key}" data-delta="-1" aria-label="减少${name}工人" ${!s.roles[key]||!isActive()?'disabled':''}>−</button><span>${s.roles[key]}</span><button data-role="${key}" data-delta="1" aria-label="增加${name}工人" ${free<1||!isActive()||key==='fishing'&&!s.buildings.rod||key==='water'&&!s.buildings.purifier?'disabled':''}>+</button></div></div>`).join('')}<div class="recruit-card"><strong>${s.workers.length>=5?'海上大家庭，已经到齐':'大海上，也有同行的人'}</strong><p>${!G.capacity(s)?'先扩建木筏、搭好庇护所，再给漂流者一个家。':s.workers.length>=G.capacity(s)?'现在的床位已满，升级庇护所可以接纳更多伙伴。':'一艘小船经过附近，给漂流者一些食物和水，他愿意留下帮忙。'}</p><div class="recipe-bottom"><div class="recipe-costs">${costHtml({fish:3,water:3})}</div><button class="build-button" id="recruitBtn" ${s.workers.length>=G.capacity(s)||!G.canAfford(s,{fish:3,water:3})||!isActive()?'disabled':''}>接纳伙伴</button></div></div>${s.workers.length?`<div class="worker-list">${s.workers.map(n=>`<span class="worker-chip">${icon('crew')} ${escape(n)}</span>`).join('')}</div>`:''}`;}
 function renderWorkshop(){
  const html=tab==='crew'?crewHtml():(tab==='build'?['purifier','expansion','shelter']:['rod','hook','coat']).map(recipeHtml).join('')+`<p class="panel-note">${tab==='build'?'把漂来的碎片，拼成生活的模样。':'工具升级后，效果永久生效。'}</p>`;
  if(html!==renderedWorkshop){$('workshopContent').innerHTML=html;renderedWorkshop=html;}
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab));$('workshopContent').setAttribute('aria-labelledby','tab-'+tab);
  $('homeBadge').textContent='Lv. '+(s.buildings.shelter+1);$('crewTabCount').textContent=s.workers.length||'';
 }
 function renderUI(){
  renderResources();renderVitals();renderWorkshop();
  $('dayLabel').textContent='第 '+G.day(s)+' 天';$('clockLabel').textContent=clock();
  const night=G.isNight(s),weather=G.weather(s),weatherName=weather==='storm'?'风暴将至':weather==='rain'?'海上阵雨':night?'月色海面':'晴朗海面';
  $('weatherLabel').textContent=weatherName;$('sceneWeather').innerHTML=icon(weather==='clear'?(night?'moon':'sun'):'rain')+` ${weather==='storm'?13:weather==='rain'?18:night?16:26}°C · ${weather==='storm'?'强风':weather==='rain'?'小雨':night?'夜风':'微风'}`;
  $('raftLevel').textContent=['初始木筏','漂浮营地','海上小屋','漂浮社区'][s.buildings.expansion];
  $('sceneCount').textContent=(s.workers.length+1)+' 位漂流者 · '+Math.pow(2+s.buildings.expansion,2)+' 格木筏';
  $('fishHint').textContent=s.buildings.rod?'看准时机，点击收竿':'先制作一根钓竿';
  $('salvageBtn').disabled=!isActive()||!!hook;$('fishBtn').disabled=!isActive()||!s.buildings.rod||!!fishGame;
  $('eatBtn').disabled=!isActive()||s.resources.fish<1||s.vitals.hunger>90;$('drinkBtn').disabled=!isActive()||s.resources.water<1||s.vitals.thirst>90;
  $('pauseBtn').innerHTML=icon(paused?'play':'pause');$('pauseBtn').setAttribute('aria-label',paused?'继续':'暂停');$('pauseBtn').title=paused?'继续':'暂停';
  $('soundBtn').setAttribute('aria-pressed',String(s.sound));$('soundBtn').setAttribute('aria-label',s.sound?'关闭音效':'开启音效');$('soundBtn').title=s.sound?'关闭音效':'开启音效';$('soundBtn').querySelector('.sound-off').hidden=s.sound;
  const goal=G.goal(s);$('goalTitle').textContent=goal.title;$('goalFraction').textContent=goal.current+'/'+goal.total;$('goalProgress').style.width=Math.min(100,goal.current/goal.total*100)+'%';$('goalDesc').textContent=goal.desc;
  const logs=s.logs.slice(0,3).map(x=>`<div class="log-item"><time>DAY ${Math.floor(x.time/180)+1} · ${clock(x.time)}</time><span>${escape(x.text)}</span></div>`).join('');if($('logList').innerHTML!==logs)$('logList').innerHTML=logs;
  document.querySelector('.ocean-panel').classList.toggle('night',night);
  if(fishGame){$('fishingOverlay').hidden=false;$('fishingStatus').textContent=fishGame.stage==='wait'?'耐心一点，鱼儿正在靠近…':'咬钩了！准备收竿';$('reelBtn').disabled=fishGame.stage==='wait'||!isActive();$('reelBtn').textContent=fishGame.stage==='wait'?'等待咬钩':'现在收竿';$('fishingHint').textContent=fishGame.stage==='wait'?'海风轻轻吹，钓鱼要有一点耐心。':'指针进入绿色区域时，点击收竿。';}else $('fishingOverlay').hidden=true;
 }
 function gainFloat(gain,x,y){const text=Object.entries(gain).map(([k,n])=>`${icon(k)}+${n}`).join(' '),el=document.createElement('span');el.className='float-gain';el.style.left=Math.max(45,Math.min(W-50,x))+'px';el.style.top=Math.min(H-60,Math.max(70,y))+'px';el.innerHTML=text;$('floatText').append(el);setTimeout(()=>el.remove(),1550);}
 function salvage(item=null){
  if(!isActive()||hook||fishGame)return;
  if(!item)item=drift.reduce((best,x)=>Math.hypot(x.x-.5,x.y-.5)<Math.hypot(best.x-.5,best.y-.5)?x:best,drift[0]);
  if(!item)return;hook={item,time:0,duration:.55};sound(230,.07);renderUI();
 }
 function finishSalvage(){const item=hook.item,gain=G.collect(s,item.type);gainFloat(gain,item.x*W,item.y*H);for(let i=0;i<7;i++)particles.push({x:item.x*W,y:item.y*H,life:1,dx:(vr()-.5)*35,dy:(vr()-.5)*30});drift=drift.filter(x=>x!==item);const newItem=spawn(item.type);newItem.x=vr()>.5?.07:.93;drift.push(newItem);hook=null;sound(690,.1);if(s.stats.collected===1)G.emit(s,'第一份物资到手了。捡起碎片，也捡起一点希望。');if(s.stats.collected===8)toast('材料慢慢齐了，优先建净水厂，再制作钓竿。');renderUI();}
 function startFishing(){if(!isActive())return;if(!s.buildings.rod){toast('先在「工具」制作钓竿。',true);tab='tools';renderedWorkshop='';renderUI();return;}if(fishGame||hook)return;fishGame={stage:'wait',time:0,wait:1.4+vr()*1.5,position:0,zone:[.34,.66]};$('fishingZone').style.left='34%';$('fishingZone').style.width='32%';sound(340,.12);renderUI();}
 function reel(){if(!fishGame||fishGame.stage!=='bite'||!isActive())return;const pos=fishGame.position;if(pos>=.34&&pos<=.66){const perfect=Math.abs(pos-.5)<.065;const n=G.catchFish(s,perfect);toast((perfect?'完美收竿！':'钓到鱼了！')+' 鲜鱼 +'+n);gainFloat({fish:n},W*.5,H*.42);sound(880,.25);}else{toast('鱼儿溜走了。再试一次，瞄准绿色区域！',true);sound(190,.15);}fishGame=null;renderUI();}
 function actionResult(result){toast(result.message,!result.ok);if(result.ok){sound(620,.18);save();}renderUI();}
 $('workshopContent').onclick=e=>{const build=e.target.closest('[data-build]'),role=e.target.closest('[data-role]');if(!isActive())return;if(build){const result=G.build(s,build.dataset.build);actionResult(result);if(result.ok&&build.dataset.build==='rod')toast('钓竿做好了，点击下方「出海钓鱼」。');}else if(role){G.assign(s,role.dataset.role,Number(role.dataset.delta));renderUI();save();}else if(e.target.closest('#recruitBtn'))actionResult(G.recruit(s));};
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderedWorkshop='';renderWorkshop();});
 $('salvageBtn').onclick=()=>salvage();$('fishBtn').onclick=startFishing;$('eatBtn').onclick=()=>actionResult(G.eat(s));$('drinkBtn').onclick=()=>actionResult(G.drink(s));$('reelBtn').onclick=reel;$('cancelFishing').onclick=()=>{fishGame=null;renderUI();};
 $('saveBtn').onclick=()=>save(true);$('soundBtn').onclick=()=>{s.sound=!s.sound;sound(630,.15);renderUI();save();};$('pauseBtn').onclick=()=>{if(modalKind==='pause')closeModal();else if(!modalKind)showPause();};$('helpBtn').onclick=()=>{if(modalKind!=='intro')help();};
 canvas.addEventListener('pointerdown',e=>{if(!isActive())return;const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let nearest=null,dist=Infinity;for(const item of drift){const d=Math.hypot(item.x*W-x,item.y*H-y);if(d<dist){dist=d;nearest=item;}}if(nearest&&dist<Math.max(32,W*.045))salvage(nearest);});
 document.addEventListener('keydown',e=>{
  if(e.key==='Tab'&&modalKind){const items=[...$('modal').querySelectorAll('button:not(:disabled),input,a')],first=items[0],lastEl=items.at(-1);if(e.shiftKey&&document.activeElement===first){lastEl.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===lastEl){first.focus();e.preventDefault();}return;}
  if(e.key==='Escape'){if(modalKind&&modalKind!=='intro'&&modalKind!=='over')closeModal();else if(!modalKind)showPause();return;}
  if(!isActive()||e.repeat||['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
  if(e.code==='Space'){e.preventDefault();if(fishGame?.stage==='bite')reel();else salvage();}else if(e.key.toLowerCase()==='f'){e.preventDefault();if(fishGame?.stage==='bite')reel();else startFishing();}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(isActive())showPause();}});window.addEventListener('pagehide',()=>save());
 // All art is drawn locally: no external assets, requests, or rendering dependencies.
 function path(points,fill,stroke=null,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 function ellipse(x,y,rx,ry,color){if(rx<=0||ry<=0)return;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
 function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
 function roundedRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
 function water(){
  const night=G.isNight(s),wet=G.weather(s)!=='clear';const gradient=ctx.createLinearGradient(0,0,W,H);gradient.addColorStop(0,night?'#527d89':wet?'#82b5b4':'#8ac6c2');gradient.addColorStop(.5,night?'#416e80':wet?'#72a5af':'#79babe');gradient.addColorStop(1,night?'#305c72':wet?'#61949f':'#6daeb9');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.055;
  for(let j=0;j<5;j++){ctx.beginPath();const y=H*.2+j*H*.18;ctx.moveTo(-50,y);ctx.bezierCurveTo(W*.18,y-90,W*.5,y+140,W+50,y-30);ctx.lineTo(W+50,y+40);ctx.bezierCurveTo(W*.55,y+170,W*.15,y-40,-50,y+80);ctx.fillStyle=j%2?'#e1f1d7':'#226784';ctx.fill();}ctx.restore();
  for(let i=0;i<67;i++){
   const x=((i*153.7+sceneTime*4*(i%2?1:-1))%(W+100)+W+100)%(W+100)-50,y=(i*91.37+Math.sin(sceneTime*.4+i)*3)%H;
   ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+7,y+2.5,x+16+i%3*5,y);ctx.strokeStyle=i%4===0?'#d3e5d05a':'#3d8f9a36';ctx.lineWidth=i%4===0?1.1:1;ctx.stroke();
  }
  // Slow currents and tiny distant sea birds.
  for(let i=0;i<3;i++){let x=(sceneTime*7+i*W*.4)%(W+100)-50,y=H*.21+i*37+Math.sin(sceneTime*.3+i)*9;ctx.beginPath();ctx.moveTo(x-5,y);ctx.quadraticCurveTo(x-2,y-3,x,y);ctx.quadraticCurveTo(x+2,y-3,x+5,y);ctx.strokeStyle='#3c757356';ctx.lineWidth=1.1;ctx.stroke();}
 }
 function drawDrift(item){
  let x=item.x*W,y=item.y*H+Math.sin(sceneTime*1.2+item.bob)*2;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(sceneTime*.25+item.angle)*.2+item.angle*.15);ctx.scale(item.scale,item.scale);
  ellipse(2,5,item.type==='wood'?23:16,5,'#3e7a8623');
  ctx.strokeStyle='#cce3d366';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,6,27,8,0,0,Math.PI*.85);ctx.stroke();
  if(item.type==='wood'){
   roundedRect(-23,-5,42,10,3,'#a98454');roundedRect(-23,-7,42,8,3,'#d7b980');line(-17,-5,12,-5,'#e4c996',.8);line(-8,-1,17,-1,'#b69a69',.8);ellipse(-21,-2,2,4,'#e4c99b');
   roundedRect(-8,3,28,7,2,'#b89761');line(-5,4,13,4,'#dfc18a',1);
  }else if(item.type==='plastic'){
   ctx.rotate(.4);roundedRect(-5,-14,10,24,4,'#c7e3c8');roundedRect(-3,-18,6,5,1,'#6d9d85');path([[-4,-10],[4,-10],[5,-3],[-5,-3]],'#d9eadb');line(-2,-6,-2,5,'#eaf2df',1.3);line(-5,2,5,2,'#9dc5af',1);
  }else if(item.type==='cloth'){
   path([[-17,-7],[-3,-12],[7,-6],[16,-9],[13,10],[2,7],[-10,13],[-15,7]],'#d5b5a2','#c3a290',1);path([[-3,-12],[2,-2],[-10,13],[-8,-3]],'#dfc2ab');line(5,-3,12,1,'#b99a8b',.8);
  }else if(item.type==='metal'){
   path([[-13,-7],[3,-11],[14,-4],[10,11],[-7,13],[-15,5]],'#9faeb0','#84999c',1);path([[-13,-7],[0,-2],[14,-4],[3,-11]],'#c0c9c1');line(0,-2,-1,9,'#7e969a',1);line(-9,-1,-6,5,'#d1d5c8',1.3);ellipse(6,3,1.5,2,'#708c91');
  }else{
   path([[-17,-8],[0,-17],[18,-7],[0,3]],'#dfb980','#ab8755',1);path([[-17,-8],[0,3],[0,18],[-17,7]],'#b38d58','#a07a49',1);path([[0,3],[18,-7],[18,8],[0,18]],'#c79e67','#a07a49',1);path([[-8,-13],[-3,-16],[14,-6],[9,-3]],'#98a295');path([[-8,-2],[-3,1],[-3,16],[-8,13]],'#8a9589');line(-14,-5,-3,13,'#e0b880',1.5);line(4,3,14,10,'#b0854e',1.4);
  }
  ctx.restore();
 }
 function drawPerson(x,y,color='#e8dfbd',scale=1){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ellipse(0,4,11,5,'#584f3f22');line(-3,-1,-4,-10,'#4e6d65',4);line(3,-1,4,-10,'#3f605c',4);roundedRect(-7,-22,14,15,4,color);line(-8,-19,-10,-11,'#c79f7c',3.2);line(8,-19,10,-12,'#c79f7c',3.2);ellipse(0,-27,6,7,'#dcb78e');path([[-6,-30],[-5,-35],[4,-35],[7,-29]],'#554f3b');ellipse(0,-31,11,3,'#cfb077');ellipse(0,-33,6.5,3,'#e1c593');line(-5,-32,6,-32,'#90794f',1.5);ctx.restore();
 }
 function drawPurifier(x,y,scale){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ellipse(3,5,32,11,'#4a584328');path([[-26,0],[5,-17],[30,-1],[-2,16]],'#c6b88b','#a49368',1);path([[-26,0],[-2,16],[-2,20],[-26,5]],'#9b895e');
  roundedRect(-21,-20,15,21,3,'#6a9f92');ellipse(-13.5,-20,7.5,3.5,'#afd1ba');line(-19,-15,-8,-15,'#4f8179',1.5);line(-19,-5,-8,-5,'#4f8179',1.5);ellipse(-13.5,-20,4,1.5,'#76a896');
  roundedRect(8,-17,14,24,3,'#d1c5a0');ellipse(15,-17,7,3,'#e7d9b1');line(9,-8,20,-8,'#9f9b7f',1.2);
  line(-12,-25,2,-34,'#6c8a7a',3);line(2,-34,15,-26,'#6c8a7a',3);line(15,-26,15,-19,'#6c8a7a',3);
  path([[-7,-28],[5,-35],[14,-27],[2,-19]],'#b9d0af99','#e0e2c2',1.3);line(2,-19,2,-4,'#63796c',2);ellipse(2,-2,2,3,'#9ed6ce');ctx.restore();
 }
 function drawShelter(x,y,level){
  ctx.save();ctx.translate(x,y);const scale=W<500?.87:1;ctx.scale(scale,scale);
  if(level===1){
   ellipse(0,3,47,16,'#554e3d25');path([[-48,-4],[0,-68],[39,-3],[-3,24]],'#dbb477','#b3915d',1);path([[0,-68],[39,-3],[59,-15],[22,-78]],'#b79968','#a38455',1);path([[-48,-4],[0,-68],[-2,23]],'#e1c798');path([[0,-51],[24,9],[-2,23]],'#6b7963');path([[0,-51],[-3,23],[-25,9]],'#b7a77a');line(0,-72,0,-84,'#816d46',2);line(-48,-4,-60,14,'#a09165',1);line(59,-15,66,0,'#a09165',1);line(-63,11,-63,18,'#7a7555',2);
  }else{
   path([[-45,-6],[1,20],[43,-3],[0,-27]],'#776f4c');path([[-43,-6],[0,18],[0,-40],[-43,-63]],'#cba66d','#9c8056',1);path([[0,18],[43,-5],[43,-63],[0,-40]],'#ad8d5d','#93774f',1);
   for(let i=0;i<5;i++){line(-42,-9-i*10,-1,14-i*10,'#b18d59',1);line(2,14-i*10,42,-8-i*10,'#997b53',1);}
   path([[-55,-57],[-12,-94],[53,-65],[9,-28]],level===3?'#718b79':'#9b8c61','#86774f',1);path([[-55,-57],[9,-28],[9,-22],[-55,-51]],'#c5ae79');path([[9,-28],[53,-65],[53,-60],[9,-22]],'#67775c');
   path([[-31,-21],[-13,-11],[-13,-40],[-31,-50]],'#65705a','#8d7a51',1);path([[11,-17],[29,-27],[29,-45],[11,-35]],G.isNight(s)?'#edcd85':'#bfd1ad','#7c7856',2);line(20,-39,20,-22,'#7c7856',1);line(12,-27,29,-36,'#7c7856',1);
   if(level===3){line(25,-81,25,-104,'#6d7052',4);ellipse(26,-107,6,3,'#e3e4c483');ellipse(29,-116,9,4,'#e3e4c44d');}
  }
  ctx.restore();
 }
 function drawRaft(){
  const n=2+s.buildings.expansion,tw=Math.min(W*.17,73),th=tw*.51,bob=Math.sin(sceneTime*1.3)*1.7,originX=W*.5,originY=H*.50-(n-1)*th*.5+bob;
  const project=(x,y,z=0)=>[originX+(x-y)*tw*.5,originY+(x+y)*th*.5-z];
  const center=project((n-1)*.5,(n-1)*.5);ellipse(center[0]+8,center[1]+25,n*tw*.53,n*th*.51,'#356f7b30');
  for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(center[0],center[1]+12,n*tw*.6+k*19,n*th*.58+k*9,0,.1+sceneTime*.15,Math.PI*1.35+sceneTime*.15);ctx.strokeStyle='#d1e6d042';ctx.lineWidth=1;ctx.stroke();}
  // Float barrels below the wooden deck.
  for(let i=0;i<n;i++){const p=project(i,n-1);roundedRect(p[0]-19,p[1]+10,38,19,8,'#6b9180');line(p[0]-11,p[1]+12,p[0]-11,p[1]+26,'#4c7c70',2);line(p[0]+11,p[1]+12,p[0]+11,p[1]+26,'#4c7c70',2);}
  for(let sum=0;sum<n*2;sum++)for(let i=0;i<n;i++){const j=sum-i;if(j<0||j>=n)continue;const p=project(i,j),a=[p[0],p[1]-th/2],b=[p[0]+tw/2,p[1]],c=[p[0],p[1]+th/2],d=[p[0]-tw/2,p[1]];
   path([d,c,[c[0],c[1]+9],[d[0],d[1]+9]],'#9b794a','#876c43',.6);path([c,b,[b[0],b[1]+9],[c[0],c[1]+9]],'#ab8552','#876c43',.6);path([a,b,c,d],(i+j)%2?'#d5b47a':'#dcbd83','#a48958',1);
   for(let p1=1;p1<4;p1++){const f=p1/4;line(a[0]+(d[0]-a[0])*f,a[1]+(d[1]-a[1])*f,b[0]+(c[0]-b[0])*f,b[1]+(c[1]-b[1])*f,'#b89a65',.8);}
   line(p[0]-12,p[1]-3,p[0]+2,p[1]+5,'#e8ca90',.8);ellipse(p[0]+12,p[1]+3,2.5,.8,'#b09561');
  }
  if(s.buildings.shelter){const p=project(.5,.25);drawShelter(p[0],p[1],s.buildings.shelter);}
  if(s.buildings.purifier){const p=project(.1,n-1);drawPurifier(p[0],p[1],Math.min(1,W/500+.25));}
  if(s.buildings.rod){const p=project(n-1,.1);line(p[0]-4,p[1]-4,p[0]+19,p[1]-54,'#7e7950',2);ctx.beginPath();ctx.moveTo(p[0]+19,p[1]-54);ctx.quadraticCurveTo(p[0]+30,p[1]-28,p[0]+40,p[1]+8);ctx.strokeStyle='#e5debb';ctx.lineWidth=.7;ctx.stroke();}
  if(s.buildings.coat){const p=project(n-1,n-1);roundedRect(p[0]-12,p[1]-14,24,14,3,'#997b54');path([[p[0]-7,p[1]-14],[p[0]+2,p[1]-20],[p[0]+13,p[1]-14],[p[0]+4,p[1]-9]],'#c9aaa0');}
  const player=project(n===2?.75:n-1,n===2?.65:n-1.15);drawPerson(player[0],player[1],s.buildings.coat?'#c6a897':'#ece2c0',Math.min(1,W/500+.3));
  for(let i=0;i<s.workers.length;i++){const p=project(Math.min(n-1,.7+i%2),Math.min(n-1,1.4+Math.floor(i/2)*.65));drawPerson(p[0],p[1],['#87a596','#cfa881','#afaf83','#91a4ac','#c3a89b'][i],.78);}
  if(s.won){const p=project(n-1,0);line(p[0],p[1],p[0],p[1]-70,'#8d8057',2);path([[p[0],p[1]-70],[p[0]+25,p[1]-64],[p[0],p[1]-54]],'#e4c77f');}
  return player;
 }
 function drawHook(origin){if(!hook)return;const t=hook.time/hook.duration,tx=hook.item.x*W,ty=hook.item.y*H,p=t<.5?t*2:2-t*2;const x=origin[0]+(tx-origin[0])*p,y=origin[1]-16+(ty-origin[1]+16)*p-Math.sin(p*Math.PI)*45;ctx.beginPath();ctx.moveTo(origin[0]+5,origin[1]-19);ctx.quadraticCurveTo((origin[0]+x)/2,(origin[1]+y)/2+18,x,y);ctx.strokeStyle='#eae1bd';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*1.4);ctx.strokeStyle='#4d6662';ctx.lineWidth=2;ctx.stroke();}
 function drawWeather(){
  if(G.weather(s)!=='clear'){
   ctx.save();ctx.globalAlpha=G.weather(s)==='storm'?.32:.2;ctx.strokeStyle='#e6ebd9';ctx.lineWidth=.8;for(let i=0;i<50;i++){const x=(i*137.3+sceneTime*57)%(W+40)-20,y=(i*61.4+sceneTime*155)%(H+50)-25;line(x,y,x-4,y+13,'#e4ebdf',.8);}ctx.restore();
  }
  if(G.isNight(s)&&s.buildings.shelter){const grd=ctx.createRadialGradient(W*.5,H*.43,0,W*.5,H*.43,80);grd.addColorStop(0,'#f7d18420');grd.addColorStop(1,'#f7d18400');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);}
 }
 function frame(now){
  const dt=last?Math.min((now-last)/1000,.06):0;last=now;
  if(isActive()){
   sceneTime+=dt;
   const events=G.tick(s,dt);for(const event of events){if(event==='gameover')endGame(false);else if(event==='victory')endGame(true);else toast(event,true);}
   for(const item of drift){if(hook?.item===item)continue;item.y+=dt*item.velocity;if(item.y>.91){item.y=.17;item.x=.07+vr()*.86;if(Math.abs(item.x-.5)<.21)item.x=item.x<.5?.17:.83;}}
   if(hook){hook.time+=dt;if(hook.time>=hook.duration)finishSalvage();}
   if(fishGame){fishGame.time+=dt;if(fishGame.stage==='wait'&&fishGame.time>=fishGame.wait){fishGame.stage='bite';fishGame.time=0;sound(740,.15);renderUI();}if(fishGame.stage==='bite'){fishGame.position=(Math.sin(fishGame.time*3.7-Math.PI/2)+1)*.5;$('fishingNeedle').style.left=(fishGame.position*98)+'%';if(fishGame.time>10){fishGame=null;toast('鱼儿游走了。再试一次吧。',true);renderUI();}}}
   saveTimer+=dt;if(saveTimer>5){saveTimer=0;save();}
   if(G.day(s)!==lastAnnouncedDay){lastAnnouncedDay=G.day(s);G.emit(s,'第 '+lastAnnouncedDay+' 天，木筏仍在漂流。新的一天，也有新的可能。');toast('第 '+lastAnnouncedDay+' 天，早安，漂流者。');}
   if(previousWeather!==G.weather(s)){previousWeather=G.weather(s);if(previousWeather!=='clear'){G.emit(s,previousWeather==='storm'?'风暴正在掠过海面，检查一下衣服和庇护所。':'下雨了，海风有些凉。');toast(previousWeather==='storm'?'海面起风了，注意保暖。':'一阵海雨，正从远处飘来。');}}
  }else if(!s.started){sceneTime+=dt*.35;}
  water();drift.forEach(drawDrift);const origin=drawRaft();drawHook(origin);
  particles=particles.filter(p=>p.life>0);for(const p of particles){if(isActive()){p.life=Math.max(0,p.life-dt*1.5);p.x+=p.dx*dt;p.y+=p.dy*dt;}ellipse(p.x,p.y,2*p.life,1*p.life,'#f2f0d8'+Math.floor(p.life*190).toString(16).padStart(2,'0'));}
  drawWeather();uiTimer+=dt;if(uiTimer>.45){uiTimer=0;renderUI();}frameId=requestAnimationFrame(frame);
 }
 resize();renderUI();intro();frameId=requestAnimationFrame(frame);
})();
