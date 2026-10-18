'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { evaluateShot, getGeometry, scenes } = require('../demo-model.js');
const scope = { window: {} };
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/pose-data.js'), 'utf8'), scope);
const poses = scope.window.PAIDA_POSES;
const outlines = scope.window.PAIDA_OUTLINES;
function boundsFor(pose) {
  const points = outlines[pose.id].flat();
  return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
}
test('empty scenes do not receive a crop or invented portrait feedback', () => {
  for (const distance of [0, 50, 100]) {
    const result = evaluateShot({ present: false, distance });
    assert.equal(result.kind, 'empty'); assert.equal(result.crop, null);
  }
});
test('all three environments have valid available recommendation assets', () => {
  for (const scene of Object.values(scenes)) for (const id of scene.poses) {
    assert.ok(poses.some(p => p.id === id)); assert.ok(outlines[id].length);
    assert.ok(fs.existsSync(path.join(__dirname, '../assets/poses', id + '.webp')));
  }
});
test('changing distance changes the advice for a full-body portrait', () => {
  const pose = poses.find(p => p.id === 'open_front');
  const data = { present: true, framing: pose.framing, bounds: boundsFor(pose) };
  assert.equal(evaluateShot({ ...data, distance: 5 }).kind, 'crop');
  assert.equal(evaluateShot({ ...data, distance: 50 }).kind, 'balanced');
  assert.equal(evaluateShot({ ...data, distance: 95 }).kind, 'tight');
});
test('half-body references recommend moving closer rather than a full-body crop', () => {
  for (const pose of poses.filter(p => p.framing === 'half')) {
    const result = evaluateShot({ present: true, distance: 0, framing: pose.framing, bounds: boundsFor(pose) });
    assert.equal(result.kind, 'closer'); assert.equal(result.crop, null);
  }
});
test('every suggested crop preserves the original aspect ratio and all reference bounds', () => {
  let count = 0;
  for (const pose of poses) for (let distance = 0; distance <= 100; distance++) {
    const bounds = boundsFor(pose);
    const result = evaluateShot({ present: true, distance, framing: pose.framing, bounds });
    if (!result.crop) continue;
    count++;
    const c = result.crop, g = getGeometry(distance);
    assert.equal(c.width, c.height);
    assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.width <= 1.000001 && c.y + c.height <= 1.000001);
    assert.ok(c.x <= g.x + bounds[0] * g.width && c.x + c.width >= g.x + bounds[2] * g.width);
    assert.ok(c.y <= g.y + bounds[1] * g.height && c.y + c.height >= g.y + bounds[3] * g.height);
  }
  assert.ok(count > 0);
});
test('tight framing never yields a crop that would remove more of the person', () => {
  for (const pose of poses) {
    const result = evaluateShot({ present: true, distance: 100, framing: pose.framing, bounds: boundsFor(pose) });
    assert.equal(result.kind, 'tight'); assert.equal(result.crop, null);
  }
});
test('invalid and out-of-range distance inputs remain bounded', () => {
  assert.deepEqual(getGeometry(-40), getGeometry(0));
  assert.deepEqual(getGeometry(140), getGeometry(100));
  assert.deepEqual(getGeometry(NaN), getGeometry(50));
});
