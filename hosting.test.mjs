import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createHostedService } from './start.mjs';

async function runLocally(t, env) {
  const service = await createHostedService(env);
  service.listen(0, '127.0.0.1');
  await once(service, 'listening');
  t.after(() => new Promise(resolve => service.close(resolve)));
  return 'http://127.0.0.1:' + service.address().port;
}

test('download route follows the signed APK manifest; model routes need credentials', async t => {
  const url = await runLocally(t, {});
  const manifest = JSON.parse(await readFile(new URL('./artifact.json', import.meta.url), 'utf8'));
  assert.equal((await fetch(url + '/healthz')).status, 200);
  const root = await fetch(url + '/', { redirect: 'manual' });
  assert.equal(root.status, 302);
  const path = root.headers.get('Location');
  assert.equal(path, '/downloads/' + manifest.name);
  const head = await fetch(url + path, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'application/vnd.android.package-archive');
  const file = await fetch(url + path);
  const digest = createHash('sha256');
  for await (const chunk of file.body) digest.update(chunk);
  assert.equal(digest.digest('hex'), manifest.sha256);
  assert.equal((await fetch(url + '/v1/models')).status, 401);
  assert.equal((await fetch(url + '/v1/analyze', { method: 'POST' })).status, 401);
  assert.equal((await fetch(url + '/healthz', { method: 'POST' })).status, 405);
});

test('issued access token required for model use and consent checked before a provider call', async t => {
  const token = randomBytes(32).toString('hex');
  const url = await runLocally(t, { PAIDA_TOKENS: token });
  const headers = { Authorization: 'Bearer ' + token };
  assert.equal((await fetch(url + '/v1/models', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  const response = await fetch(url + '/v1/models', { headers });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.models.find(model => model.id === 'deepseek').enabled, false);
  assert.equal((await fetch(url + '/v1/analyze', { method: 'POST' })).status, 401);
  assert.equal((await fetch(url + '/v1/analyze', { method: 'POST', headers, body: '{"consent":false}' })).status, 400);
  assert.equal((await fetch(url + '/.env', { headers })).status, 404);
});

test('users activate with their original code, never with a digest copied from server configuration', async t => {
  const codes = Array.from({ length: 2 }, () => randomBytes(32).toString('hex'));
  const hashes = codes.map(code => createHash('sha256').update(code, 'utf8').digest('hex'));
  const url = await runLocally(t, { PAIDA_TOKEN_HASHES: hashes.join(', ') });
  async function status(code) {
    const headers = code ? { Authorization: 'Bearer ' + code } : {};
    return (await fetch(url + '/v1/models', { headers })).status;
  }
  for (const code of codes) assert.equal(await status(code), 200);
  for (const invalid of [undefined, ...hashes, codes[0].slice(0, 63), randomBytes(32).toString('hex')]) {
    assert.equal(await status(invalid), 401);
  }
  assert.equal((await fetch(url + '/v1/analyze', {
    method: 'POST', headers: { Authorization: 'Bearer ' + hashes[0] },
  })).status, 401);

  const mixed = await runLocally(t, { PAIDA_TOKEN_HASHES: hashes[0], PAIDA_TOKENS: codes[1] });
  for (const code of codes) {
    assert.equal((await fetch(mixed + '/v1/models', { headers: { Authorization: 'Bearer ' + code } })).status, 200);
  }
  await assert.rejects(createHostedService({ PAIDA_TOKEN_HASHES: hashes[0], PAIDA_TOKENS: hashes[0] }));
  await assert.rejects(createHostedService({ PAIDA_TOKEN_HASHES: hashes[0] + ',' }));
});
