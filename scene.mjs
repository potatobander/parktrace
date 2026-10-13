import {sampleJourney,samplePath,carRoute,walkRoute,clamp} from './journey.mjs';
const rand=n=>{const k=Math.sin(n*127.1+31.7)*43758.5453123;return k-Math.floor(k);};
function hex(c,f){return '#'+c.replace('#','').match(/../g).map(v=>Math.round(clamp(parseInt(v,16)*f,0,255)).toString(16).padStart(2,'0')).join('');}
export function drawScene(ctx,width,height,time,{yaw=.785,pointer=0}={}){
 const state=sampleJourney(time),scale=Math.min(width/32,height/23),ox=width*.5,oy=height*.55;
 const sn=Math.sin(yaw),cs=Math.cos(yaw);
 const project=(x,y,z)=>{x-=12;z-=9;return {x:ox+(x*cs-z*sn)*scale,y:oy+(x*sn+z*cs)*scale*.49-y*scale*.94};};
 const poly=(points,color,alpha=1)=>{ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>{if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fill();ctx.globalAlpha=1;};
 const flat=(x,z,w,d,color,y=0,alpha=1)=>poly([project(x,y,z),project(x+w,y,z),project(x+w,y,z+d),project(x,y,z+d)],color,alpha);
 ctx.clearRect(0,0,width,height);
 const glow=ctx.createRadialGradient(ox,oy,0,ox,oy,width*.5);glow.addColorStop(0,'#21443650');glow.addColorStop(1,'#071c2200');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
 for(let i=0;i<75;i++){
  const x=rand(i*3)*34-5,z=rand(i*3+1)*27-4,y=rand(i*3+2)*7+Math.sin(time*.4+i)*.5,p=project(x,y,z),size=(i%3===0?2:1)*Math.max(scale/18,.6);
  ctx.globalAlpha=(.18+rand(i)*.35)*state.build;ctx.fillStyle=i%5===0?'#e7bc77':'#699d83';ctx.fillRect(Math.round(p.x),Math.round(p.y),size,size);
 }ctx.globalAlpha=1;
 flat(-.6,-.6,25.2,19.2,'#193934',-.65,state.build);
 flat(-.6,18.6,25.2,.55,'#102d2b',-.4,state.build);
 for(let x=0;x<24;x++)for(let z=0;z<18;z++){
  const lane=(z>=6&&z<=11)||(x>=19&&x<=21);const col=lane?(x+z)%2?'#23463f':'#21443d':(x+z)%2?'#294d41':'#2b5043';
  flat(x+.025,z+.025,.95,.95,col,0,state.build);
 }
 for(const x of [1,5.4,9.8,14.2,18.6,23]){flat(x,1.35,.08,4.5,'#719879',.02,.7*state.build);flat(x,13.3,.08,4.2,'#719879',.02,.7*state.build);}
 flat(1,5.8,22,.08,'#739d7b',.02,.7*state.build);flat(1,13.1,22,.08,'#739d7b',.02,.7*state.build);
 const gx=6.1,gz=1.35,gw=4.0,gd=4.5;
 flat(gx,gz,gw,gd,'#517552',.025,.8*state.build);
 for(const r of [[gx,gz,gw,.09],[gx,gz+gd,gw,.09],[gx,gz,.09,gd],[gx+gw,gz,.09,gd]])flat(...r,state.parked?'#e8c17a':'#a8e9a9',.04,state.build);
 flat(0,9.7,2,2.1,'#548465',.035,state.build);flat(20.8,.4,3.0,3.2,'#3b6376',.025,state.build);
 const route=state.phase===0?carRoute:walkRoute;
 const routeProgress=state.phase===0?clamp((state.t-1.8)/5.2):state.phase===1?clamp((state.t-9)/3.4):clamp((state.t-12.4)/4.8);
 for(let i=0;i<55;i++){
  const f=i/54,p=samplePath(route,f),wave=(f+time*.16)%1,visible=state.phase===0?f<=routeProgress+.12:true;
  if(!visible)continue;ctx.shadowColor='#9af2bb';ctx.shadowBlur=wave>.86?9:0;flat(p.x-.09,p.z-.09,.18,.18,wave>.86?'#c9f7bb':'#77b590',.09,Math.min(state.build,.8));
 }ctx.shadowBlur=0;
 const cubes=[];
 function cube(x,y,z,w,h,d,c,seed=0){const lift=(1-state.build)*(2+rand(seed)*9);cubes.push({x,y:y+lift,z,w,h,d,c,depth:(x+w/2-12)*sn+(z+d/2-9)*cs,alpha:state.build});}
 function car(x,z,color,alongX=false,active=false){
  const base=alongX?{w:3.6,d:1.85}:{w:1.85,d:3.6},w=base.w,d=base.d;const left=x-w/2,top=z-d/2;
  cube(left,.35,top,w,.52,d,color,5);cube(left+.1,.82,top+.1,w-.2,.22,d-.2,hex(color,1.2),8);
  if(alongX){cube(left+.7,1.01,top+.14,1.6,.55,d-.28,hex(color,.85));cube(left+.78,1.05,top+.16,1.42,.5,.05,'#9abbb7');cube(left+.78,1.05,top+d-.20,1.42,.5,.05,'#8aa9a5');}
  else{cube(left+.13,1.01,top+.8,w-.26,.55,1.6,hex(color,.85));cube(left+.16,1.1,top+.81,w-.32,.39,.06,'#aac6bb');cube(left+.16,1.1,top+2.33,w-.32,.39,.05,'#829f9a');}
  cube(left+.15,1.57,top+(alongX?.22:.97),alongX?1.8:w-.30,.08,alongX?d-.44:1.2,hex(color,1.12));
  const wheel=alongX?[[left+.62,top-.11],[left+2.72,top-.11],[left+.62,top+d-.16],[left+2.72,top+d-.16]]:[[left-.12,top+.63],[left+w-.15,top+.63],[left-.12,top+2.72],[left+w-.15,top+2.72]];
  for(const [a,b]of wheel)cube(a,.10,b,.30,.36,.34,'#102725');
  if(active){cube(left+(alongX?w-.05:.15),.67,top+(alongX?.21:d-.04),alongX?.08:.4,.13,alongX?.45:.08,'#f9e2a1');cube(left+(alongX?w-.05:w-.55),.67,top+(alongX?d-.67:d-.04),alongX?.08:.4,.13,alongX?.45:.08,'#f9e2a1');}
 }
 for(const [x,z,c]of [[3,3.9,'#557a86'],[12.9,3.9,'#9a8670'],[17.3,3.9,'#637d6a'],[3,15.2,'#776b6b'],[7.4,15.2,'#557883'],[12,15.2,'#778873'],[16.6,15.2,'#577869'],[22,15.2,'#8f8068']])car(x,z,c);
 car(state.car.x,state.car.z,'#c1dbc0',Math.abs(Math.cos(state.car.angle))>.8,true);
 for(const [x,z]of [[.3,6.0],[23.1,6.0],[.3,17]]){cube(x,0,z,.65,3.1,.65,'#54746b');cube(x,2.7,z,.65,.45,.65,'#9fa990');}
 cube(22,.01,.3,2.1,2.7,1.1,'#386783');cube(22.35,.01,1.4,1.35,2.1,.07,'#779fa6');cube(22.89,.01,1.41,.08,2.1,.09,'#295572');
 cube(10.6,0,1.6,.65,2.85,.65,'#326d87');cube(10.60,1.63,2.25,.65,.52,.05,'#d5e5cd');
 if(state.personVisible){
  const p=state.person,bob=state.arrived?0:Math.sin(time*8)*.07,x=p.x,z=p.z;const leg=state.arrived?0:Math.sin(time*8)*.11;
  cube(x-.30,.17,z-.17+leg,.27,.77,.34,'#295763');cube(x+.05,.17,z-.17-leg,.27,.77,.34,'#295763');
  cube(x-.34,.04,z-.23+leg,.34,.19,.44,'#162f32');cube(x+.03,.04,z-.23-leg,.34,.19,.44,'#162f32');
  cube(x-.42,.98+bob,z-.25,.84,.91,.5,'#ecc479');cube(x-.64,1.08+bob,z-.19,.22,.64,.37,'#d9a964');cube(x+.42,1.08+bob,z-.19,.22,.64,.37,'#d9a964');
  cube(x-.61,.93+bob,z-.17,.18,.20,.3,'#dfbca0');cube(x+.45,.93+bob,z-.17,.18,.20,.3,'#dfbca0');
  cube(x-.35,1.99+bob,z-.31,.7,.68,.62,'#dbb995');cube(x-.39,2.66+bob,z-.34,.78,.17,.68,'#344a3c');cube(x-.39,2.36+bob,z-.34,.12,.31,.68,'#344a3c');
  cube(x-.10,1.14+bob,z+.255,.34,.44,.12,'#667d62');
 }
 cubes.sort((a,b)=>a.depth-b.depth||a.y-b.y);
 for(const q of cubes){const {x,y,z,w,h,d,c}=q;const top=[project(x,y+h,z),project(x+w,y+h,z),project(x+w,y+h,z+d),project(x,y+h,z+d)];const sideX=[project(x+w,y,z),project(x+w,y,z+d),project(x+w,y+h,z+d),project(x+w,y+h,z)];const sideZ=[project(x,y,z+d),project(x+w,y,z+d),project(x+w,y+h,z+d),project(x,y+h,z+d)];poly(sideX,hex(c,.72),q.alpha);poly(sideZ,hex(c,.88),q.alpha);poly(top,hex(c,1.12),q.alpha);}
 if(state.build>.95){
  function label(x,y,z,text,col='#a5c9a5',bg='#14362fea'){const p=project(x,y,z);ctx.font=`${Math.max(8,Math.min(11,scale*.57))}px "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const w=ctx.measureText(text).width+14;ctx.fillStyle=bg;ctx.fillRect(Math.round(p.x-w/2),Math.round(p.y-8),w,17);ctx.fillStyle=col;ctx.fillText(text,p.x,p.y+1);}
  label(11,3.5,2,'D15','#b8dab3');label(23,3.55,1,'电梯厅','#92bfd2');label(1,.10,12.8,'入口','#87bda0');
  if(state.phase===0)label(8.1,.12,1,'空位线索','#b7e9b2');else label(8.3,2.3,3.8,'D-058','#edc17d');
  if(state.arrived){const center=project(state.person.x,3.5,state.person.z);ctx.font=`${Math.max(9,Math.min(12,scale*.6))}px "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif`;ctx.textAlign='center';const text='✓ 找到停车位置',w=ctx.measureText(text).width+16;ctx.fillStyle='#14362fee';ctx.fillRect(center.x-w/2,center.y-43,w,21);ctx.fillStyle='#d9eabd';ctx.fillText(text,center.x,center.y-32);}
 }
 if(state.memory){for(let i=0;i<16;i++){const cycle=(time*.5+i*.1)%1,p=project(8.3+(rand(i)-.5)*3,.5+cycle*4,3.9+(rand(i+30)-.5)*2);ctx.globalAlpha=(1-cycle)*.45;ctx.fillStyle=i%3===0?'#edc17d':'#acddb1';ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1.2,scale*.09),Math.max(1.2,scale*.09));}ctx.globalAlpha=1;}
 return state;
}
