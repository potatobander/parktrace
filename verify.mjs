import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {findPath,makeReports,recommend,validateRecord} from './core.mjs';
import {sampleJourney} from './journey.mjs';
const root=dirname(fileURLToPath(import.meta.url));
for(const file of ['index.html','details.html']){
 const html=readFileSync(resolve(root,file),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const ref=match[1];if(/^(https?:|#|data:|mailto:)/.test(ref))continue;
  const path=ref.split('#')[0].split('?')[0];assert.ok(existsSync(resolve(root,path)),`${file}: missing ${ref}`);
  const url=new URL(ref,`https://example.github.io/parktrace/${file}`);assert.ok(url.pathname.startsWith('/parktrace/'),`Reference escapes project subpath: ${ref}`);
 }
}
for(const file of ['home.mjs','scene.mjs','app.mjs','details.mjs','core.mjs','journey.mjs']){
 const js=readFileSync(resolve(root,file),'utf8');for(const m of js.matchAll(/from\s+['"](\.[^'"]+)['"]/g))assert.ok(existsSync(resolve(root,m[1])),`${file}: missing import ${m[1]}`);
}
assert.equal(recommend('entry',makeReports()).node,'d');assert.equal(recommend('entry',makeReports('stale')).report,undefined);
assert.equal(validateRecord({floor:'B2',area:'D',slot:'D-058'}).node,'d');assert.equal(findPath('entry','el2','vehicle').length,0);assert.ok(findPath('el1','d','walk').length>1);
assert.equal(sampleJourney(18).arrived,true);assert.equal(sampleJourney(20).phase,0);
assert.ok(existsSync(resolve(root,'.nojekyll')));
assert.ok(!readFileSync(resolve(root,'index.html'),'utf8').includes('https://parktrace-parking-demo.avoriser431.chatgpt.site'));
console.log('Passed: all static assets, project-subpath URLs, ES module imports, route/report logic and animation loop.');
