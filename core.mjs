export const nodes = {
 entry:{x:70,y:350,floor:'B1',name:'入口'},w1:{x:150,y:350,floor:'B1',name:'西侧路口'},m1:{x:330,y:350,floor:'B1',name:'中央路口'},r1:{x:540,y:350,floor:'B1',name:'B1坡道口'},
 a:{x:150,y:210,floor:'B1',name:'A区 / A12柱',area:'A'},b:{x:330,y:210,floor:'B1',name:'B区 / B08柱',area:'B'},c:{x:540,y:210,floor:'B1',name:'C区 / C06柱',area:'C'},el1:{x:330,y:82,floor:'B1',name:'B1蓝色电梯厅'},st1:{x:540,y:82,floor:'B1',name:'B1楼梯口'},
 w2:{x:150,y:350,floor:'B2',name:'西侧路口'},m2:{x:330,y:350,floor:'B2',name:'中央路口'},r2:{x:540,y:350,floor:'B2',name:'B2坡道口'},d:{x:150,y:210,floor:'B2',name:'D区 / D15柱',area:'D'},e:{x:330,y:210,floor:'B2',name:'E区 / E08柱',area:'E'},f:{x:540,y:210,floor:'B2',name:'F区 / F06柱',area:'F'},el2:{x:330,y:82,floor:'B2',name:'B2蓝色电梯厅'},st2:{x:540,y:82,floor:'B2',name:'B2楼梯口'}
};
const edgePairs=[['entry','w1'],['w1','m1'],['m1','r1'],['w1','a'],['m1','b'],['r1','c'],['a','b'],['b','c'],['r1','r2'],['w2','m2'],['m2','r2'],['w2','d'],['m2','e'],['r2','f'],['d','e'],['e','f']];
const pedestrianPairs=[['b','el1'],['c','st1'],['e','el2'],['f','st2'],['el1','el2'],['st1','st2']];
export function findPath(start,end,mode='vehicle'){
 if(!nodes[start]||!nodes[end])return [];
 const pairs=mode==='walk'?[...edgePairs,...pedestrianPairs]:edgePairs;
 const dist=new Map([[start,0]]),prev=new Map(),todo=new Set(Object.keys(nodes));
 while(todo.size){let u=null,best=Infinity;for(const id of todo){const d=dist.get(id)??Infinity;if(d<best){best=d;u=id;}}if(u===null)break;todo.delete(u);if(u===end)break;
  for(const [a,b]of pairs){const v=a===u?b:b===u?a:null;if(!v||!todo.has(v))continue;const cost=nodes[u].floor!==nodes[v].floor?200:Math.hypot(nodes[u].x-nodes[v].x,nodes[u].y-nodes[v].y);const next=best+cost;if(next<(dist.get(v)??Infinity)){dist.set(v,next);prev.set(v,u);}}
 }
 if(!dist.has(end))return [];const path=[end];while(path[0]!==start){const p=prev.get(path[0]);if(!p)return [];path.unshift(p);}return path;
}
export function pathDistance(path){return path.slice(1).reduce((sum,id,i)=>sum+(nodes[id].floor!==nodes[path[i]].floor?200:Math.hypot(nodes[id].x-nodes[path[i]].x,nodes[id].y-nodes[path[i]].y)),0);}
export function makeReports(scenario='fresh'){
 if(scenario==='none')return [];
 return [{id:'report-d',node:'d',age:scenario==='stale'?12:1,status:'unverified'},{id:'report-b',node:'b',age:scenario==='stale'?18:4,status:'unverified'}];
}
export function recommend(current,reports,visited=[]){
 const candidates=Object.keys(nodes).filter(id=>nodes[id].area&&!visited.includes(id)).map(id=>{
  const path=findPath(current,id);const report=reports.filter(r=>r.node===id&&r.status==='unverified'&&r.age<=5).sort((a,b)=>a.age-b.age)[0];return {node:id,path,report,score:(report?100-report.age*13:0)-pathDistance(path)*.025};
 }).filter(x=>x.path.length);
 candidates.sort((a,b)=>b.score-a.score);return candidates[0]||null;
}
export function validateRecord(record){
 const key=Object.keys(nodes).find(id=>nodes[id].area===record.area&&nodes[id].floor===record.floor);
 if(!key)return {ok:false,error:'楼层和分区不匹配，请确认停车标识。'};
 if(!record.slot||record.slot.trim().length>30)return {ok:false,error:'请填写车位编号（不超过30字）。'};
 return {ok:true,node:key};
}
export function describeStep(from,to){const a=nodes[from],b=nodes[to];if(!a||!b)return '';
 if(a.floor!==b.floor)return `经${from.startsWith('el')?'电梯':from.startsWith('st')?'楼梯':'坡道'}前往${b.floor}，到达${b.name}。`;
 return `前往${b.name}，到达后确认下一步。`;
}
