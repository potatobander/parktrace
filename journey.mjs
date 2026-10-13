export const DURATION=20;
export const carRoute=[[1,10.8],[18,10.8],[18,7.2],[8.3,7.2],[8.3,3.9]];
export const walkRoute=[[9.9,4.0],[9.9,7.2],[20.3,7.2],[20.3,2.0],[22.0,2.0]];
export function clamp(v,min=0,max=1){return Math.min(max,Math.max(min,v));}
export function samplePath(path,progress){
 const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));const total=lengths.reduce((a,b)=>a+b,0);let travel=clamp(progress)*total;
 for(let i=0;i<lengths.length;i++){if(travel<=lengths[i]||i===lengths.length-1){const f=clamp(travel/lengths[i]);return {x:path[i][0]+(path[i+1][0]-path[i][0])*f,z:path[i][1]+(path[i+1][1]-path[i][1])*f,angle:Math.atan2(path[i+1][1]-path[i][1],path[i+1][0]-path[i][0]),segment:i};}travel-=lengths[i];}
 return {x:path[0][0],z:path[0][1],angle:0,segment:0};
}
export function sampleJourney(time){
 const t=((time%DURATION)+DURATION)%DURATION;
 const parked=t>=7,leaving=t>=9&&t<12.4,returning=t>=12.4;
 const car=samplePath(carRoute,(t-1.8)/5.2);
 const person=samplePath(walkRoute,leaving?(t-9)/3.4:returning?1-(t-12.4)/4.8:0);
 return {t,phase:t<7?0:t<12.4?1:2,build:clamp(t/1.25),car,person,parked,personVisible:t>=8.8,leaving,returning,arrived:t>=17.2,memory:t>=7.6};
}
