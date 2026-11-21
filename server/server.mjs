import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { providerInfo,validateImage,invokeProvider,InputError,promptVersion,normalizeContext } from './model.mjs';

function reply(res,status,data) {
  if(res.destroyed)return;
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
function authorized(req,token) {
  const given=Buffer.from(req.headers.authorization||'');const expected=Buffer.from(`Bearer ${token}`);
  return given.length===expected.length&&timingSafeEqual(given,expected);
}
function authorizedByDigest(req, expectedDigests) {
  if (!expectedDigests.length) return false;
  const match = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || '');
  if (!match) return false;
  const presentedAsHex = Buffer.from(match[1], 'hex');
  if (expectedDigests.some(expected => timingSafeEqual(presentedAsHex, expected))) return false;
  const supplied = createHash('sha256').update(match[1], 'utf8').digest();
  return expectedDigests.some(expected => timingSafeEqual(supplied, expected));
}
async function bodyOf(req) {
  let length=0;const chunks=[];
  for await(const chunk of req){length+=chunk.length;if(length>1550000)throw new InputError('上传内容过大。');chunks.push(chunk)}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new InputError('请求必须为 JSON。')}
}
export function createServer(config,{fetchImpl=fetch,handlePublicRequest}={}) {
  const tokens = config.accessTokens ?? (config.accessToken === undefined ? [] : [config.accessToken]);
  const hashes = config.accessTokenHashes ?? [];
  if (!Array.isArray(hashes) || hashes.some(hash => typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash))) {
    throw new Error('激活码摘要无效。');
  }
  if (!Array.isArray(tokens) || (!tokens.length && !hashes.length) || tokens.some(token =>
    typeof token !== 'string' || token.length < 24 || token.includes('RUN_NODE')
  )) throw new Error('请先生成有效的连接口令。');
  if (tokens.some(token => hashes.includes(token))) throw new Error('请将激活码摘要仅填入摘要配置。');
  const expectedDigests = hashes.map(hash => Buffer.from(hash, 'hex'));
  const providers=config.providers??{};
  let cursor=0,inflight=0,day='',calls=0;
  let starts=[];
  const server=http.createServer(async(req,res)=>{
    if (handlePublicRequest?.(req, res)) return;
    if (!tokens.some(token => authorized(req, token)) && !authorizedByDigest(req, expectedDigests)) {
      return reply(res,401,{error:'激活码无效，请检查后重试。'});
    }
    if(req.url==='/v1/models'&&req.method==='GET') return reply(res,200,{version:'0.6.0',min_android_version:'0.4.0',prompt_version:promptVersion,timeout_ms:config.timeoutMs||12000,models:Object.entries(providerInfo).map(([id,p])=>({id,label:p.label,model:providers[id]?.model||'',enabled:!!(providers[id]?.apiKey&&providers[id]?.model)}))});
    if(req.url!=='/v1/analyze'||req.method!=='POST')return reply(res,404,{error:'接口不存在。'});
    const now=Date.now();starts=starts.filter(t=>now-t<300000);
    if(starts.length>=30||inflight>=2)return reply(res,429,{error:'测试请求太频繁，请稍后再试。'});
    const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort()});
    let admitted=false;
    try {
      // Reserve the slot before waiting for the upload so simultaneous requests share the limit.
      inflight++;
      admitted=true;
      const body=await bodyOf(req);
      if(body?.consent!==true)throw new InputError('需要确认向所选模型发送这一张图片。');
      if(typeof body.request_id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(body.request_id)) throw new InputError('请求编号无效。');
      const ids=body.providers;
      if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>!Object.hasOwn(providerInfo,id))) throw new InputError('模型列表无效。');
      const hash=validateImage(body.image_base64);
      const context=normalizeContext(body.context);
      const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;calls=0;}
      const required=ids.filter(id=>providers[id]?.apiKey&&providers[id]?.model).length;
      if(calls+required>(config.dailyCallLimit||200))return reply(res,429,{error:'已达到今日测试调用上限。'});
      starts=starts.filter(t=>Date.now()-t<300000);
      if(starts.length>=30)return reply(res,429,{error:'测试请求太频繁，请稍后再试。'});
      starts.push(Date.now());calls+=required;
      // One JPEG, identical prompt, sequential requests; rotate call order between comparisons.
      const offset=cursor++%ids.length;const order=ids.slice(offset).concat(ids.slice(0,offset));
      const results=[];
      for(const [index,id] of order.entries()) {
        if(abort.signal.aborted) break;
        const result=await invokeProvider(id,providers[id],body.image_base64,{fetchImpl,context,signal:abort.signal,timeoutMs:Math.min(Math.max(config.timeoutMs||12000,1000),15000)});
        results.push({...result,order:index+1,image_sha256:hash,request_id:body.request_id,recorded_at:new Date().toISOString()});
      }
      reply(res,200,{request_id:body.request_id,image_sha256:hash,prompt_version:promptVersion,results});
    } catch(e) {reply(res,e instanceof InputError?400:500,{error:e instanceof InputError?e.message:'服务内部错误，未自动重试。'})}
    finally{if(admitted)inflight--}
  });
  server.requestTimeout=60000;server.headersTimeout=10000;
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const config=JSON.parse(await readFile(new URL('./config.local.json',import.meta.url),'utf8'));
    createServer(config).listen(config.port||8787,config.host||'127.0.0.1',()=>console.log(`拍档代理已启动，端口 ${config.port||8787}。照片只在请求期间处理，不写入磁盘。`));
  }catch(e){console.error(e.code==='ENOENT'?'请先运行配置工具生成 config.local.json。':'配置读取或服务启动失败，请检查配置格式和连接口令。为避免泄露密钥，不输出原始错误。');process.exitCode=1;}
}
