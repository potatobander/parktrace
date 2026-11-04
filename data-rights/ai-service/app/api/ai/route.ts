import {env} from 'cloudflare:workers';
import {records,sectionNames} from '../../../lib/records';
const ALLOWED_ORIGIN='https://potatobander.github.io';
type Bindings={DEEPSEEK_API_KEY?:string,DEEPSEEK_MODEL?:string,DB?:D1Database};
function headers(req:Request){const h:Record<string,string>={'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};if(req.headers.get('Origin')===ALLOWED_ORIGIN){h['Access-Control-Allow-Origin']=ALLOWED_ORIGIN;h['Access-Control-Allow-Methods']='GET, POST, OPTIONS';h['Access-Control-Allow-Headers']='Content-Type'}return h}
function reply(req:Request,data:unknown,status=200){return Response.json(data,{status,headers:headers(req)})}
function config(){const e=env as unknown as Bindings;return {key:e.DEEPSEEK_API_KEY||process.env.DEEPSEEK_API_KEY,model:e.DEEPSEEK_MODEL||process.env.DEEPSEEK_MODEL||'deepseek-flash',db:e.DB}}
export async function OPTIONS(req:Request){return req.headers.get('Origin')===ALLOWED_ORIGIN?new Response(null,{status:204,headers:headers(req)}):new Response(null,{status:403,headers:headers(req)})}
export async function GET(req:Request){if(req.headers.get('Origin')&&req.headers.get('Origin')!==ALLOWED_ORIGIN)return reply(req,{error:'不支持的来源。'},403);const c=config();return reply(req,{configured:Boolean(c.key&&c.db)})}
async function consume(db:D1Database,bucket:string,limit:number,expires:number){const row=await db.prepare('INSERT INTO api_quota (bucket,count,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count').bind(bucket,expires,limit).first();return Boolean(row)}
export async function POST(req:Request){
 if(req.headers.get('Origin')!==ALLOWED_ORIGIN)return reply(req,{error:'不支持的请求来源。'},403);
 const {key,model,db}=config();if(!key||!db)return reply(req,{error:'DeepSeek 接口尚未配置，服务接入后即可使用。'},503);
 if(!(req.headers.get('Content-Type')||'').includes('application/json'))return reply(req,{error:'请求格式有误。'},400);
 if(Number(req.headers.get('Content-Length')||'0')>16000)return reply(req,{error:'请求内容过长。'},413);
 let raw='';try{raw=await req.text()}catch{return reply(req,{error:'请求格式有误。'},400)}
 if(raw.length>12000)return reply(req,{error:'请求内容过长。'},413);
 let body:any;try{body=JSON.parse(raw)}catch{return reply(req,{error:'请求格式有误。'},400)}
 if(typeof body?.question!=='string'||!body.question.trim()||body.question.length>2000)return reply(req,{error:'请输入不超过 2000 字的问题。'},400);
 const now=Date.now(),day=Math.floor(now/86400000),minute=Math.floor(now/60000);
 try{
   if(Math.random()<0.03)await db.prepare('DELETE FROM api_quota WHERE expires_at < ?').bind(now).run();
   if(!await consume(db,`day:${day}`,100,(day+2)*86400000))return reply(req,{error:'今日 AI 提问额度已用完，请明天再试。'},429);
   const client=req.headers.get('CF-Connecting-IP')||'unknown';
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${key}:${client}`));
   const clientId=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   if(!await consume(db,`minute:${minute}:${clientId}`,3,(minute+2)*60000))return reply(req,{error:'提问过于频繁，请稍后重试。'},429);
 }catch{return reply(req,{error:'安全额度检查暂不可用，请稍后再试。'},503)}
 const context=records.map(r=>`[${r.id}] ${r.title}；类型：${sectionNames[r.section]} / ${r.kind}；地区：${r.region}；摘要：${r.summary}；来源：${r.url}；${r.note||''}`).join('\n');
 const history=Array.isArray(body.history)?body.history.slice(-4).filter((m:any)=>['user','assistant'].includes(m?.role)&&typeof m?.content==='string').map((m:any)=>({role:m.role,content:m.content.slice(0,2000)})):[];
 try{
  const upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,messages:[{role:'system',content:`你是数据产权与数据交易资料库的研究助手。优先依据以下资料回答；引用时用 [条目编号] 标出依据。区分法律法规、交易所规则信息和案例，绝不将官方答复冒充规则原文。资料不足时直接说明，不虚构法条或案例。请提醒核对文件最新效力。资料：\n${context}`},...history,{role:'user',content:body.question.trim()}],stream:false,thinking:{type:'disabled'},max_tokens:900})});
  if(!upstream.ok)return reply(req,{error:'DeepSeek 暂时不可用，请检查账户状态或稍后重试。'},502);
  const data:any=await upstream.json();const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())return reply(req,{error:'未收到有效回答，请稍后重试。'},502);
  const sources=records.filter(r=>answer.includes(`[${r.id}]`)).map(r=>({id:r.id,title:r.title,url:r.url}));return reply(req,{answer,sources});
 }catch{return reply(req,{error:'连接 DeepSeek 失败，请稍后重试。'},502)}
}
