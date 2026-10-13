import {nodes,findPath,makeReports,recommend,validateRecord,describeStep} from './core.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='parktrace-demo-memory-v1';
let memory=null;try{const candidate=JSON.parse(localStorage.getItem(STORAGE));if(candidate&&validateRecord(candidate).ok)memory=candidate;}catch{}
const state={variant:'C',phase:'find',floor:'B1',current:'entry',scenario:'fresh',reports:makeReports(),visited:[],route:[],routeIndex:0,recommendation:null,memory,start:'el2',draft:{floor:'B2',area:'D',slot:'D-058',landmark:'D15柱，蓝色电梯厅'},photo:null,photoName:'示例停车照片',sample:true};
let toastTimer;
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function selected(value,expected){return value===expected?' selected':'';}
function samplePhoto(){return `<svg viewBox="0 0 500 190" role="img" aria-label="示例停车照片：D15柱与D-058车位"><defs><linearGradient id="photo-bg" x2="0" y2="1"><stop stop-color="#d6ded6"/><stop offset="1" stop-color="#a5b3a5"/></linearGradient></defs><rect width="500" height="190" fill="url(#photo-bg)"/><path d="M0 0L190 84H500M0 188L180 116H500" stroke="#9eaea3" fill="none"/><rect y="116" width="500" height="74" fill="#bdc7b9"/><path d="M100 190L170 117M310 190L260 117M480 190L360 117" fill="none" stroke="#f4eed4" stroke-width="3"/><rect x="175" width="58" height="163" fill="#4786a1"/><rect x="223" width="12" height="163" fill="#306b87"/><rect x="175" y="28" width="48" height="66" fill="#eaf0dc"/><text x="200" y="52" text-anchor="middle" fill="#275f76" font-size="17" font-weight="700">B2</text><text x="200" y="80" text-anchor="middle" fill="#275f76" font-size="22" font-weight="700">D15</text><path d="M280 143l12-30q12-8 55 0l15 30v18h-82z" fill="#364d45"/><rect x="298" y="116" width="45" height="17" rx="4" fill="#9eb3b3"/><text x="397" y="169" text-anchor="middle" fill="#435c48" font-size="17">D-058</text></svg>`;}
function explanation(text){return state.variant==='C'?`<div class="explanation"><strong>为什么这样建议？</strong>${text}</div>`:'';}
function getPanel(){
 if(state.phase==='find'){
  const cards=state.reports.map(r=>{const n=nodes[r.node],stale=r.age>5||r.status==='occupied';return `<div class="hint-card"><div class="hint-top"><strong>${n.floor} · ${n.area}区</strong><span class="hint-tag${stale?' stale':''}">${r.status==='occupied'?'已反馈占用':stale?'已过期':'空位线索'}</span></div>${state.variant==='C'?`<small>匿名上报 · ${r.age}分钟前<br>${r.status==='occupied'?'你已反馈：此处被占用':stale?'信息已失效，不优先推荐':'尚未核实，抵达后需确认'}</small>`:`<small>演示空位信息 · 到达后需核实</small>`}</div>`;}).join('');
  const rec=state.recommendation;let reasons='综合线索时效、可通行路线与已搜索区域推荐；没有可靠线索时，优先搜索尚未经过的区域。';
  if(rec)reasons=rec.report?`${nodes[rec.node].floor} ${nodes[rec.node].area}区有${rec.report.age}分钟前的匿名上报，且你尚未搜索此处。它是搜索线索，不保证仍有空位。`:`没有可靠的近期线索，推荐从当前节点搜索尚未经过的${nodes[rec.node].area}区。这里的空位状态未知。`;
  return `<span class="mini-label">01 / SEARCH</span><h3 class="panel-heading">下一段，去哪儿找？</h3><p class="panel-intro">用线索与已搜索区域辅助决策。先生成路线，再确认经过的节点。</p><label class="field-label" for="scenario">选择演示情境</label><select id="scenario"><option value="fresh"${selected(state.scenario,'fresh')}>有近期空位线索</option><option value="none"${selected(state.scenario,'none')}>暂无用户上报</option><option value="stale"${selected(state.scenario,'stale')}>上报全部过期</option></select><label class="field-label">区域线索</label><div class="hint-list">${cards||'<div class="empty-state">暂无共享线索。你仍可以按未搜索区域规划下一段路线。</div>'}</div>${explanation(reasons)}<div class="panel-actions"><button class="button primary" id="recommend">${rec?'更新搜索建议':'推荐搜索路线'} →</button></div><p class="tiny">已搜索：${state.visited.length?state.visited.map(id=>nodes[id].floor+' '+nodes[id].area+'区').join('、'):'尚未开始'}<br>演示阈值：上报超过5分钟不优先推荐，实际阈值待验证。</p>`;
 }
 if(state.phase==='park'){
  const d=state.draft;const areas=d.floor==='B1'?['A','B','C']:['D','E','F'];
  return `<span class="mini-label">02 / REMEMBER</span><h3 class="panel-heading">留下停车记忆。</h3><p class="panel-intro">拍下标识，确认位置，再保存。你始终可以修改候选结果。</p><div class="photo-preview">${state.photo?`<img src="${state.photo}" alt="用户选择的停车标识照片">`:samplePhoto()}<span class="photo-tag">${esc(state.photoName)}</span></div><div class="photo-buttons"><label class="small-button file-button">选择照片<input id="photo-input" type="file" accept="image/*"></label><button class="small-button" id="use-sample" type="button">使用示例</button></div><div class="panel-actions"><button class="button secondary" id="sample-result"${!state.sample?' disabled':''}>填入示例识别候选</button></div><p class="tiny">${state.sample?'示例候选用于演示确认流程，此页未运行OCR。':'这张照片不会自动识别，请手动填写标识。照片不上传。'}</p><div class="inline-fields"><div><label class="field-label" for="record-floor">楼层</label><select id="record-floor"><option${selected(d.floor,'B1')}>B1</option><option${selected(d.floor,'B2')}>B2</option></select></div><div><label class="field-label" for="record-area">分区</label><select id="record-area">${areas.map(a=>`<option value="${a}"${selected(d.area,a)}>${a}区</option>`).join('')}</select></div></div><label class="field-label" for="record-slot">车位编号</label><input id="record-slot" class="input" maxlength="30" value="${esc(d.slot)}" placeholder="例如 D-058"><label class="field-label" for="record-landmark">附近地标（可选）</label><input id="record-landmark" class="input" maxlength="60" value="${esc(d.landmark)}" placeholder="例如 D15柱、蓝色电梯厅">${explanation('标识文字需要与你实际看到的环境核对。确认楼层和分区后，系统将位置匹配到演示简图中的区域节点。')}<div class="panel-actions"><button class="button primary" id="save-memory">保存记忆卡，演示返程 →</button></div>`;
 }
 const mem=state.memory;
 if(!mem)return `<span class="mini-label">03 / RETURN</span><h3 class="panel-heading">从地标找到归途。</h3><p class="panel-intro">先记录停车位置，返回时再从当前的电梯或楼梯口出发。</p><div class="empty-state">你还没有停车记忆卡。可以使用示例快速体验，也可以先自己填写。</div><div class="panel-actions"><button class="button primary" id="quick-memory">用 D-058 示例体验 →</button><button class="button secondary" id="go-park">先记录停车位置</button></div>${explanation('停车点与返程起点是两个位置。即使从另一部电梯回来，也需要先确认当前所在的地标。')}`;
 return `<span class="mini-label">03 / RETURN</span><h3 class="panel-heading">记得怎么回去。</h3><div class="memory-card"><span class="pill">停车记忆卡 · 本机演示</span><div class="memory-slot">${esc(mem.slot)}</div><div class="memory-meta">${esc(mem.floor)} · ${esc(mem.area)}区<br>${esc(mem.landmark||'未补充附近地标')}<br>${esc(mem.savedAt||'本次演示记录')}</div></div><label class="field-label" for="return-start">你现在在哪里？</label><select id="return-start"><option value="el2"${selected(state.start,'el2')}>B2 蓝色电梯厅</option><option value="el1"${selected(state.start,'el1')}>B1 蓝色电梯厅</option><option value="st2"${selected(state.start,'st2')}>B2 楼梯口</option><option value="st1"${selected(state.start,'st1')}>B1 楼梯口</option></select>${explanation('从你确认的当前地标出发，沿步行通道返回停车分区；跨楼层时使用电梯或楼梯。最终车位请用记忆卡编号和照片核对。')}<div class="panel-actions"><button class="button primary" id="return-route">生成返程路线 →</button><button class="button secondary" id="edit-memory">修改停车记录</button></div>`;
}
function renderMap(){
 const floor=state.floor,areas=floor==='B1'?['a','b','c']:['d','e','f'];
 const activeRoute=state.route.slice(state.routeIndex);const parts=[];let part=[];
 for(const id of activeRoute){if(nodes[id].floor===floor)part.push(id);else{if(part.length)parts.push(part);part=[];}}if(part.length)parts.push(part);
 const line=parts.filter(p=>p.length>1).map(p=>`<path class="route-line" d="${p.map((id,i)=>`${i?'L':'M'}${nodes[id].x},${nodes[id].y}`).join(' ')}" fill="none" stroke="#0c806d" stroke-width="5" stroke-linejoin="round"/>`).join('');
 const bays=areas.map((id,i)=>{const n=nodes[id],x=n.x-61;return `<g><rect x="${x-12}" y="112" width="146" height="70" rx="5" fill="#e9eee2"/><rect x="${x-12}" y="246" width="146" height="55" rx="5" fill="#e9eee2"/>${[0,1,2,3].map(k=>`<rect x="${x+k*31}" y="120" width="23" height="49" rx="2" fill="${[0,1,2].includes((k+i)%4)?'#cddbcc':'#f8f9f1'}" stroke="#b7c9b6"/><rect x="${x+k*31}" y="254" width="23" height="39" rx="2" fill="#dce6d5" stroke="#b7c9b6"/>`).join('')}<text x="${n.x}" y="103" text-anchor="middle" class="area-label">${n.area}区</text></g>`;}).join('');
 const hints=state.reports.filter(r=>nodes[r.node].floor===floor&&r.age<=5&&r.status==='unverified').map(r=>{const n=nodes[r.node];return `<circle cx="${n.x+55}" cy="155" r="10" fill="#f3f7e8" stroke="#71a27c" stroke-width="2"/><text x="${n.x+55}" y="159" text-anchor="middle" fill="#517857" font-size="11">?</text>`;}).join('');
 const target=state.phase==='return'&&state.memory?validateRecord(state.memory).node:state.recommendation?.node;
 const targetPoint=target&&nodes[target].floor===floor?`<g><circle cx="${nodes[target].x}" cy="${nodes[target].y}" r="17" fill="#edb654" stroke="#173c3a" stroke-width="2"/><text x="${nodes[target].x}" y="${nodes[target].y+5}" text-anchor="middle" font-size="15" font-weight="700" fill="#173c3a">P</text></g>`:'';
 const current=nodes[state.current],point=current.floor===floor?`<circle cx="${current.x}" cy="${current.y}" r="13" fill="#0c806d" stroke="#f8f9f4" stroke-width="4"/><circle cx="${current.x}" cy="${current.y}" r="3" fill="#fff"/>`:'';
 const labels=state.variant==='A'?'':areas.map(id=>`<text x="${nodes[id].x}" y="232" text-anchor="middle" class="node-label">${nodes[id].name.split(' / ')[1]}</text>`).join('');
 const numbered=parts.flatMap(p=>p.map(id=>{const index=state.route.indexOf(id);if(index<=state.routeIndex||id===target)return '';return `<g><circle cx="${nodes[id].x}" cy="${nodes[id].y}" r="9" fill="#fdfef8" stroke="#0c806d" stroke-width="1.5"/><text x="${nodes[id].x}" y="${nodes[id].y+3.5}" text-anchor="middle" font-size="9" fill="#0c806d">${index}</text></g>`;})).join('');
 return `<svg class="map-svg" viewBox="0 0 660 430" role="img" aria-label="${floor}演示停车场区域简图"><title>${floor}演示停车场，当前位置${esc(current.name)}，路线通过地标节点确认</title><defs><pattern id="map-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#dde6da" stroke-width=".6"/></pattern></defs><rect x="5" y="12" width="650" height="404" rx="8" fill="#f1f5ea" stroke="#d8e2d0"/><rect x="6" y="13" width="648" height="402" rx="8" fill="url(#map-grid)"/><text x="29" y="40" font-size="11" fill="#758d75">${floor} · 区域节点示意图</text><text x="627" y="40" text-anchor="end" font-size="10" fill="#758d75">非实地地图</text>${bays}<g fill="none" stroke="#d6e1d0" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"><path d="M150 210V350H540V82M150 210H540M330 350V82"/>${floor==='B1'?'<path d="M70 350H150"/>':''}</g><rect x="287" y="58" width="86" height="47" rx="6" fill="#2c6987"/><text x="330" y="85" text-anchor="middle" fill="white" font-size="11">蓝色电梯厅</text><rect x="503" y="62" width="74" height="35" rx="5" fill="#b9cdb5"/><text x="540" y="83" text-anchor="middle" fill="#355c41" font-size="10">楼梯口</text><rect x="506" y="371" width="68" height="24" rx="4" fill="#e2ddc7"/><text x="540" y="386" text-anchor="middle" fill="#7e795d" font-size="10">跨层坡道</text>${floor==='B1'?'<text x="70" y="379" text-anchor="middle" font-size="10" fill="#647e61">入口</text>':''}${line}${hints}${labels}${numbered}${targetPoint}${point}<text x="29" y="405" font-size="9" fill="#758d75">${current.floor===floor?'● 当前节点在此层':'当前节点在'+current.floor+'，可切换楼层查看'}</text></svg>`;
}
function routePanel(){
 if(!state.route.length){const parked=state.phase==='park';return `<div class="route-heading"><span class="turn-icon" aria-hidden="true">${parked?'P':'↗'}</span><div><strong>${parked?'先确认标识，再保存位置。':state.phase==='return'?'选择当前地标，开始返程。':'路线还没开始，先看看下一步。'}</strong><p>${parked?'示例照片展示记录流程；自己的照片请手动输入标识。':'生成路线后，点击“确认到达”模拟位置变化。'}</p></div></div>`;}
 const arrived=state.routeIndex>=state.route.length-1,current=nodes[state.current],next=nodes[state.route[state.routeIndex+1]],total=state.route.length-1;
 let title=arrived?(state.phase==='return'?'已到达停车分区':'已到达推荐搜索区域'):state.variant==='A'?`前往地图中的第 ${state.routeIndex+1} 个节点`:`${next.floor} · ${next.name}`;
 let description=arrived?(state.phase==='return'?`请核对车位 ${esc(state.memory.slot)}，区域节点不代表精确车位定位。`:'现场确认空位；也可以反馈占用，更换搜索区域。'):state.variant==='A'?'沿地图虚线行进，确认到达后推进下一节点。':describeStep(state.current,state.route[state.routeIndex+1]);
 const buttons=arrived?state.phase==='return'?`<button class="button primary" id="found-car">已核对，找到停车位置 ✓</button><button class="button secondary" id="return-route">重新规划</button>`:`<button class="button primary" id="park-here">在这里停车 →</button><button class="button secondary" id="occupied">这里已被占用，换个区域</button>`:`<button class="button primary" id="next-node">确认到达下一节点 →</button>`;
 const landmark=state.variant!=='A'&&!arrived?`<div class="landmark-tip"><span class="pillar-mini">${next.area?next.name.split(' / ')[1].replace('柱',''):next.floor}</span><span>${next.area?'核对柱号和分区标识':next.name.includes('坡道')?'核对楼层与坡道标识':'核对电梯厅或路口标识'}<br><strong>${esc(next.name)}</strong></span></div>`:'';
 return `<div class="route-heading"><span class="turn-icon" aria-hidden="true">${arrived?'✓':current.floor!==next.floor?'⇅':'→'}</span><div><strong>${title}</strong><p>${description}</p></div><span class="route-count">${state.routeIndex} / ${total}节点</span></div>${landmark}<div class="route-controls">${buttons}</div><div class="breadcrumbs">已确认位置：${current.floor} · ${esc(current.name)}${state.phase==='return'?' · 步行路线':' · 车辆路线'}</div>`;
}
function updateDevice(){
 const next=state.route[state.routeIndex+1],arrived=state.route.length&&state.routeIndex===state.route.length-1;
 $('#device-mode').textContent=state.phase==='return'?'返程指引':state.phase==='park'?'停车记录':'搜索指引';
 $('#device-arrow').textContent=arrived?'✓':state.phase==='park'?'P':next&&nodes[next].floor!==nodes[state.current].floor?'⇅':'→';
 $('#device-label').textContent=arrived?'到达目标区域':next?nodes[next].floor+' '+(nodes[next].area?nodes[next].area+'区':nodes[next].name):state.phase==='park'?state.draft.floor+' '+state.draft.slot:'等待路线';
}
function render(){
 document.querySelectorAll('[data-variant]').forEach(el=>{const on=el.dataset.variant===state.variant;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',on);});
 document.querySelectorAll('[data-phase]').forEach(el=>{const on=el.dataset.phase===state.phase;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',on);});
 document.querySelectorAll('[data-floor]').forEach(el=>{const on=el.dataset.floor===state.floor;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',on);});
 $('#panel-content').innerHTML=getPanel();$('#map-container').innerHTML=renderMap();$('#route-content').innerHTML=routePanel();updateDevice();
}
function clearRoute(){state.route=[];state.routeIndex=0;state.recommendation=null;}
function setPhase(phase){state.phase=phase;clearRoute();if(phase==='find'){state.current='entry';state.floor='B1';}if(phase==='park')state.floor=state.draft.floor;if(phase==='return'){state.current=state.start;state.floor=nodes[state.start].floor;}render();}
function selectRecommendation(){const rec=recommend(state.current,state.reports,state.visited);if(!rec){clearRoute();render();toast('已搜索全部演示区域，暂无可确认的空位；可重置情境再体验。');return;}state.recommendation=rec;state.route=rec.path;state.routeIndex=0;state.floor=nodes[state.current].floor;if(state.route.length===1&&!state.visited.includes(rec.node))state.visited.push(rec.node);render();toast(`推荐搜索 ${nodes[rec.node].floor} ${nodes[rec.node].area}区`);}
function returnRoute(){if(!state.memory)return;const check=validateRecord(state.memory);if(!check.ok){toast(check.error);return;}state.current=state.start;state.floor=nodes[state.start].floor;state.route=findPath(state.current,check.node,'walk');state.routeIndex=0;state.recommendation=null;render();toast('返程路线已生成，请逐个确认地标。');}
function saveMemory(){const check=validateRecord(state.draft);if(!check.ok){toast(check.error);return;}state.memory={...state.draft,savedAt:new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};let persisted=true;try{localStorage.setItem(STORAGE,JSON.stringify(state.memory));}catch{persisted=false;}state.start=state.draft.floor==='B1'?'el1':'el2';state.phase='return';returnRoute();toast(persisted?'停车记忆卡已保存，可从不同地标体验返程。':'记忆卡已创建；当前浏览器无法持久保存。');}
document.addEventListener('click',event=>{
 const el=event.target.closest('button,a');if(!el)return;
 if(el.dataset.variant){state.variant=el.dataset.variant;render();return;}
 if(el.dataset.tryVariant){state.variant=el.dataset.tryVariant;render();$('#demo').scrollIntoView({behavior:'smooth'});return;}
 if(el.dataset.floor){state.floor=el.dataset.floor;render();return;}
 if(el.dataset.phase){setPhase(el.dataset.phase);return;}
 if(el.dataset.phaseLink){setPhase(el.dataset.phaseLink);return;}
 switch(el.id){
 case 'recommend':selectRecommendation();break;
 case 'next-node':if(state.routeIndex<state.route.length-1){state.routeIndex++;state.current=state.route[state.routeIndex];state.floor=nodes[state.current].floor;if(state.phase==='find'&&state.routeIndex===state.route.length-1&&!state.visited.includes(state.current))state.visited.push(state.current);render();}break;
 case 'occupied':state.reports.forEach(r=>{if(r.node===state.current)r.status='occupied';});if(!state.visited.includes(state.current))state.visited.push(state.current);selectRecommendation();toast('已反馈占用，重新搜索其他区域。');break;
 case 'park-here':{const n=nodes[state.current];state.draft={floor:n.floor,area:n.area,slot:n.area+'-058',landmark:n.name.split(' / ')[1]+(n.area==='D'?'，蓝色电梯厅':'')};setPhase('park');break;}
 case 'use-sample':state.photo=null;state.photoName='示例停车照片';state.sample=true;render();break;
 case 'sample-result':state.draft={floor:'B2',area:'D',slot:'D-058',landmark:'D15柱，蓝色电梯厅'};state.floor='B2';render();toast('示例候选已填入，请核对或修改。');break;
 case 'save-memory':saveMemory();break;
 case 'quick-memory':state.draft={floor:'B2',area:'D',slot:'D-058',landmark:'D15柱，蓝色电梯厅'};saveMemory();break;
 case 'go-park':setPhase('park');break;
 case 'edit-memory':state.draft={...state.memory};setPhase('park');break;
 case 'return-route':returnRoute();break;
 case 'found-car':toast('返程演示完成！请在实际场景中核对车位编号与照片。');break;
 case 'reset-demo':try{localStorage.removeItem(STORAGE);}catch{}Object.assign(state,{phase:'find',floor:'B1',current:'entry',scenario:'fresh',reports:makeReports(),visited:[],route:[],routeIndex:0,recommendation:null,memory:null,start:'el2',draft:{floor:'B2',area:'D',slot:'D-058',landmark:'D15柱，蓝色电梯厅'},photo:null,photoName:'示例停车照片',sample:true});render();toast('演示和本机记忆卡已重置。');break;
 }
});
document.addEventListener('input',event=>{if(event.target.id==='record-slot')state.draft.slot=event.target.value;if(event.target.id==='record-landmark')state.draft.landmark=event.target.value;});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='scenario'){state.scenario=el.value;state.reports=makeReports(el.value);state.visited=[];state.current='entry';state.floor='B1';clearRoute();render();}
 if(el.id==='record-floor'){state.draft.floor=el.value;state.draft.area=el.value==='B1'?'A':'D';state.draft.slot=state.draft.area+'-058';state.draft.landmark='';state.floor=el.value;render();}
 if(el.id==='record-area'){state.draft.area=el.value;state.draft.slot=el.value+'-058';render();}
 if(el.id==='return-start'){state.start=el.value;state.current=el.value;state.floor=nodes[el.value].floor;clearRoute();render();}
 if(el.id==='photo-input'){
  const file=el.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('请选择图片文件。');return;}if(file.size>8*1024*1024){toast('请使用8MB以内的照片。');return;}
  const reader=new FileReader();reader.onload=()=>{state.photo=reader.result;state.photoName=file.name;state.sample=false;render();toast('照片已在本页预览，请手动填写停车标识。');};reader.onerror=()=>toast('照片读取失败，请重新选择。');reader.readAsDataURL(file);
 }
});
$('#reset-demo').title='清空本机演示记忆卡并重置场景';
render();
