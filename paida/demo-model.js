/* Pure geometry for the illustrative demo. No camera, inference or uploads. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PaidaDemo = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const scenes = Object.freeze({
    campus: { name: '校园墙边', label: 'CAMPUS', poses: ['wall_space', 'wall_half', 'wall_lean'], reason: '墙面背景 · 推荐留白构图' },
    park: { name: '公园漫步', label: 'PARK', poses: ['open_front', 'open_turn', 'open_weight'], reason: '开阔背景 · 推荐自然站姿' },
    cafe: { name: '窗边咖啡', label: 'CAFE', poses: ['table_arm', 'table_half', 'table_look'], reason: '桌椅场景 · 推荐轻松坐姿' }
  });
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function getGeometry(distance = 50) {
    const value = Number.isFinite(Number(distance)) ? clamp(Number(distance), 0, 100) : 50;
    const height = .48 + .0065 * value;
    return { x: (1 - height) / 2, y: .52 - height / 2, width: height, height };
  }
  function evaluateShot({ present, distance, framing = 'full', bounds = [.29, .03, .71, .97] }) {
    if (!present) return { kind: 'empty', title: '还没有清晰的人物入镜。', text: '请同伴进入画面后再试试，拍搭不会勉强给出人像构图建议。', crop: null };
    const box = getGeometry(distance);
    const person = { x1: box.x + bounds[0] * box.width, y1: box.y + bounds[1] * box.height, x2: box.x + bounds[2] * box.width, y2: box.y + bounds[3] * box.height };
    if (person.y1 < .055 || person.y2 > .95 || person.x1 < .055 || person.x2 > .945) return { kind: 'tight', title: '稍微后退，给画面留一点空间。', text: '人物或动作已经贴近边缘。扩大取景，先保留完整的头部与动作，再按下快门。', crop: null };
    if (person.y2 - person.y1 < .60 && framing === 'full') {
      const size = Math.min(.92, Math.max((person.y2 - person.y1) / .83, (person.x2 - person.x1) / .78));
      const x = clamp((person.x1 + person.x2) / 2 - size / 2, 0, 1 - size);
      const y = clamp((person.y1 + person.y2) / 2 - size / 2, 0, 1 - size);
      return { kind: 'crop', title: '可以裁掉一些周围留白。', text: '人物较小，保留完整动作的同时收紧画面，主角会更突出。参考框不会修改原片。', crop: { x, y, width: size, height: size } };
    }
    if (person.y2 - person.y1 < .50) return { kind: 'closer', title: '走近一点，让表情更清楚。', text: '半身或桌边取景时，可以适当靠近，让人物成为画面的重点。', crop: null };
    return { kind: 'balanced', title: '这个取景，留白刚刚好。', text: '示例人物大小适中，边缘也有呼吸感。接下来，试试换一个动作或视线方向。', crop: null };
  }
  function distanceLabel(distance) { return distance < 27 ? '留白偏多' : distance > 80 ? '画面偏满' : '取景合适'; }
  return Object.freeze({ scenes, getGeometry, evaluateShot, distanceLabel, clamp });
});
