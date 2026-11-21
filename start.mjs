import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { createServer } from './server/server.mjs';

export async function createHostedService(env = process.env) {
  const manifest = JSON.parse(await readFile(new URL('./artifact.json', import.meta.url), 'utf8'));
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.apk$/.test(manifest.name) ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256)) {
    throw new Error('请检查 artifact.json 中的安装包文件名和 SHA-256。');
  }
  const file = new URL('./public/' + manifest.name, import.meta.url);
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  if (digest.digest('hex') !== manifest.sha256) throw new Error('安装包 SHA-256 校验失败。');
  const { size } = await stat(file);
  const downloadPath = '/downloads/' + manifest.name;

  function handlePublicRequest(req, res) {
    const path = req.url.split('?')[0];
    if (path !== '/' && path !== '/healthz' && path !== downloadPath) return false;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    } else if (path === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('ok\n');
    } else if (path === '/') {
      res.writeHead(302, { Location: downloadPath, 'Cache-Control': 'no-store' }).end();
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': size,
        'Content-Disposition': 'attachment; filename="' + manifest.name + '"',
        'X-Content-Type-Options': 'nosniff',
        ETag: '"' + manifest.sha256 + '"',
      });
      if (req.method === 'HEAD') res.end();
      else pipeline(createReadStream(file), res).catch(() => res.destroy());
    }
    return true;
  }

  const tokens = (env.PAIDA_TOKENS || '').trim();
  const hashes = (env.PAIDA_TOKEN_HASHES || '').trim();
  if (!tokens && !hashes) {
    return http.createServer((req, res) => {
      if (!handlePublicRequest(req, res)) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ error: '云端指导尚未开放。' }));
      }
    });
  }
  const accessTokens = tokens ? tokens.split(',').map(token => token.trim()) : [];
  const accessTokenHashes = hashes ? hashes.split(',').map(hash => hash.trim()) : [];
  if (accessTokens.some(token => !/^[a-f0-9]{64}$/.test(token))) throw new Error('请为每位用户设置独立的 64 位十六进制口令。');
  const dailyCallLimit = Number(env.PAIDA_DAILY_LIMIT || 100);
  if (!Number.isSafeInteger(dailyCallLimit) || dailyCallLimit < 1) throw new Error('PAIDA_DAILY_LIMIT 必须为正整数。');
  return createServer({
    accessTokens, accessTokenHashes, dailyCallLimit, timeoutMs: 15000,
    providers: { deepseek: { apiKey: env.DEEPSEEK_API_KEY || '', model: 'deepseek-flash' } },
  }, { handlePublicRequest });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 10000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 无效。');
  const service = await createHostedService();
  service.listen(port, '0.0.0.0', () => console.log('拍档托管服务已启动。'));
}
