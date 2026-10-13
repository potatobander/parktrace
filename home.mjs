import {drawScene} from './scene.mjs';
import {DURATION,sampleJourney} from './journey.mjs';
const canvas=document.querySelector('#voxel-scene'),ctx=canvas.getContext('2d',{alpha:true});
const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
let paused=motionQuery.matches,elapsed=paused?17.8:0,last=performance.now(),lastFrame=-1000,width=0,height=0,dpr=1,currentPhase=-1,yaw=.785,targetYaw=.785;
const chapters=[['沿线索，寻找下一段方向。','像素车驶入停车场，循着路线搜索车位。'],['把位置，留在停车记忆里。','确认停车位置，像素小人从车位走向电梯厅。'],['从地标，找到自己的车。','返程时跟随指引，从电梯厅走回 D-058。']];
function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(ctx){ctx.setTransform(dpr,0,0,dpr,0,0);draw();}}
function syncPause(){const button=document.querySelector('#pause-scene');button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'播放动画':'暂停动画');button.innerHTML=`<span aria-hidden="true">${paused?'▶':'Ⅱ'}</span>`;}
function draw(){
 if(!ctx||!width||!height)return;
 const state=drawScene(ctx,width,height,elapsed,{yaw});
 if(currentPhase!==state.phase){currentPhase=state.phase;document.querySelector('#story-number').textContent='0'+(state.phase+1);document.querySelector('#story-title').textContent=chapters[state.phase][0];document.querySelector('#story-description').textContent=chapters[state.phase][1];document.querySelectorAll('[data-chapter]').forEach(button=>{const on=Number(button.dataset.chapter)===state.phase;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});}
 document.querySelector('#scene-memory').classList.toggle('visible',state.memory);
 document.querySelector('#timeline-progress').style.transform=`scaleX(${state.t/DURATION})`;
}
function tick(now){const delta=Math.min((now-last)/1000,.12);last=now;if(!paused&&!document.hidden)elapsed+=delta;yaw+=(targetYaw-yaw)*.04;
 if(now-lastFrame>1000/18&&(!paused||Math.abs(yaw-targetYaw)>.001)){draw();lastFrame=now;}requestAnimationFrame(tick);
}
if(ctx){resize();new ResizeObserver(resize).observe(canvas);setTimeout(()=>{last=performance.now();requestAnimationFrame(tick);},380);}else{canvas.hidden=true;document.querySelector('.scene-fallback').hidden=false;document.querySelector('#pause-scene').disabled=true;}
canvas.addEventListener('pointermove',event=>{if(motionQuery.matches)return;const rect=canvas.getBoundingClientRect();targetYaw=.785+((event.clientX-rect.left)/rect.width-.5)*.16;});canvas.addEventListener('pointerleave',()=>{targetYaw=.785;});
document.querySelector('#pause-scene').addEventListener('click',()=>{paused=!paused;syncPause();last=performance.now();draw();});
document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>{elapsed=[2.2,7.8,13.2][Number(button.dataset.chapter)];last=performance.now();draw();}));
motionQuery.addEventListener('change',event=>{if(event.matches){paused=true;elapsed=17.8;syncPause();draw();}});
document.addEventListener('visibilitychange',()=>{last=performance.now();});syncPause();
let toastTimer;function toast(text){const el=document.querySelector('#cover-toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
document.querySelector('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(new URL('index.html',location.href).href);toast('链接已复制。分享前请确认网页访问权限。');}catch{toast('复制未成功，可以复制浏览器地址栏中的链接。');}});
