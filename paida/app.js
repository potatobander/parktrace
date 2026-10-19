(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const model = window.PaidaDemo;
  const poses = new Map(window.PAIDA_POSES.map(p => [p.id, p]));
  const outlines = window.PAIDA_OUTLINES;
  const canvas = $('camera-canvas');
  const ctx = canvas.getContext('2d');
  const state = { scene: 'campus', poseIndex: 0, phase: 'empty', present: false, distance: 50, outline: true, grid: false, shot: null, crop: true };
  const assets = new Map();
  const pending = new Map();
  let matchTimer = 0;
  let matchGeneration = 0;
  let imageError = false;
  let dialogTrigger = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const activePose = () => poses.get(model.scenes[state.scene].poses[state.poseIndex]);
  const assetUrl = src => (window.PAIDA_ASSETS || {})[src] || src;
  const announce = message => { $('live-status').textContent = message; };

  function loadImage(src) {
    if (assets.has(src)) return Promise.resolve(assets.get(src));
    if (pending.has(src)) return pending.get(src);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { assets.set(src, img); resolve(img); };
      img.onerror = () => { pending.delete(src); reject(new Error('Image unavailable')); };
      img.src = assetUrl(src);
    });
    pending.set(src, promise);
    return promise;
  }
  function sourceBounds(pose) {
    const points = (outlines[pose.id] || []).flat();
    if (!points.length) return [.25, .03, .75, .97];
    return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
  }
  function paintScene(target, withGuides = true) {
    const W = 720, H = 960;
    target.clearRect(0, 0, W, H);
    target.fillStyle = '#d5ddc7'; target.fillRect(0, 0, W, H);
    const bg = assets.get('assets/scenes/' + state.scene + '.svg');
    if (bg) target.drawImage(bg, 0, 0, W, H);
    const pose = activePose();
    const actor = assets.get('assets/poses/' + pose.id + '.webp');
    if (state.present && actor) {
      const g = model.getGeometry(state.distance);
      const x = g.x * W, y = g.y * H, w = g.width * W, h = g.height * H;
      target.save();
      target.fillStyle = '#253f3026';
      target.beginPath(); target.ellipse(W / 2, Math.min(H * .98, y + h * .96), w * .20, h * .015, 0, 0, Math.PI * 2); target.fill();
      target.drawImage(actor, x, y, w, h);
      if (withGuides && state.phase === 'ready' && state.outline) {
        const shape = new Path2D();
        for (const polygon of outlines[pose.id] || []) {
          polygon.forEach(([px, py], i) => i ? shape.lineTo(x + px * w, y + py * h) : shape.moveTo(x + px * w, y + py * h));
          shape.closePath();
        }
        target.lineJoin = 'round'; target.lineCap = 'round';
        target.strokeStyle = '#213b2b99'; target.lineWidth = 4; target.stroke(shape);
        target.shadowColor = '#baf5b8'; target.shadowBlur = 8;
        target.lineWidth = 1.6; target.strokeStyle = '#e4ffda'; target.stroke(shape);
      }
      target.restore();
    }
    if (withGuides && state.grid) {
      target.save(); target.strokeStyle = '#ffffff65'; target.lineWidth = 1;
      target.beginPath();
      for (const part of [1 / 3, 2 / 3]) { target.moveTo(W * part, 0); target.lineTo(W * part, H); target.moveTo(0, H * part); target.lineTo(W, H * part); }
      target.stroke(); target.restore();
    }
  }
  function renderCanvas() {
    if (!ctx) return;
    if (state.phase === 'review' && state.shot) ctx.drawImage(state.shot.canvas, 0, 0);
    else paintScene(ctx);
  }
  function updateUI() {
    const reviewing = state.phase === 'review';
    const ready = state.phase === 'ready';
    const matching = state.phase === 'matching';
    const pose = activePose();
    const scene = model.scenes[state.scene];
    document.querySelectorAll('[data-scene]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.scene === state.scene)); });
    $('camera-controls').hidden = reviewing;
    $('photo-review').hidden = !reviewing;
    $('demo-controls').hidden = reviewing;
    $('empty-state').hidden = state.present || reviewing;
    $('matching-state').hidden = !matching;
    $('viewfinder-hint').hidden = !ready;
    $('toggle-grid').hidden = reviewing;
    $('toggle-grid').setAttribute('aria-pressed', String(state.grid));
    $('toggle-grid').setAttribute('aria-label', state.grid ? '隐藏九宫格' : '显示九宫格');
    $('toggle-person').setAttribute('aria-pressed', String(state.present));
    $('toggle-person').querySelector('span').textContent = state.present ? '让人物离开' : '人物入镜';
    $('distance').disabled = !ready;
    $('distance').value = state.distance;
    $('distance-label').textContent = model.distanceLabel(state.distance);
    $('distance').setAttribute('aria-valuetext', model.distanceLabel(state.distance));
    $('next-pose').disabled = !ready;
    $('toggle-outline').disabled = !ready;
    $('toggle-outline').setAttribute('aria-pressed', String(state.outline));
    $('pose-preview').disabled = !ready;
    $('pose-title').textContent = ready ? pose.name : '等待推荐';
    $('pose-thumbnail').src = assetUrl('assets/poses/' + pose.id + '.webp');
    $('shutter').disabled = matching || imageError || !ctx || !assets.has('assets/scenes/' + state.scene + '.svg');
    $('camera-status').innerHTML = '<span></span>';
    $('camera-status').append(document.createTextNode(imageError ? '场景载入失败，请刷新' : reviewing ? '这一张 · 原片视图' : matching ? '正在匹配' : ready ? scene.reason : '等待人物入镜'));
    const tips = { wall_space: '和背景留一点距离，自然站定', wall_half: '侧身一点，肩膀放松', wall_lean: '确认墙面安全后，轻靠一侧肩膀', open_front: '轻松站定，手臂自然垂下', open_turn: '身体侧一点，轻轻看向镜头', open_weight: '重心放一侧，另一只脚放松', table_arm: '前臂轻放，肩膀自然放松', table_half: '坐稳后，一只手自然放在桌边', table_look: '转向侧方光线，不直视强光' };
    $('viewfinder-hint').textContent = tips[pose.id] || pose.action;
    $('frame-label').textContent = 'PAIDA / ' + scene.label + (reviewing ? ' / SHOT' : '');
    canvas.setAttribute('aria-label', reviewing ? '刚拍摄的动画示例照片。' + state.shot.assessment.title : '示例场景：' + scene.name + (state.present ? '。动画人物：' + pose.name + '；' + model.distanceLabel(state.distance) + (ready && state.outline ? '，显示细发光轮廓。' : '。') : '，尚未有人入镜，无人物轮廓。'));
    if (reviewing) {
      const result = state.shot.assessment;
      $('review-title').textContent = result.title;
      $('review-text').textContent = result.text;
      $('toggle-crop').hidden = !result.crop;
      $('toggle-crop').setAttribute('aria-pressed', String(state.crop));
      $('toggle-crop').textContent = state.crop ? '隐藏裁剪框' : '显示裁剪框';
      const crop = result.crop;
      $('crop-guide').hidden = !crop || !state.crop;
      if (crop) Object.assign($('crop-guide').style, { left: crop.x * 100 + '%', top: crop.y * 100 + '%', width: crop.width * 100 + '%', height: crop.height * 100 + '%' });
    } else $('crop-guide').hidden = true;
    renderCanvas();
  }
  function cancelMatching() { clearTimeout(matchTimer); matchTimer = 0; matchGeneration++; }
  async function beginMatching() {
    cancelMatching();
    const generation = matchGeneration;
    state.phase = 'matching'; imageError = false;
    updateUI();
    try {
      await Promise.all([loadImage('assets/scenes/' + state.scene + '.svg'), loadImage('assets/poses/' + activePose().id + '.webp')]);
      if (generation !== matchGeneration || !state.present) return;
      renderCanvas();
      matchTimer = setTimeout(() => {
        if (generation !== matchGeneration || !state.present) return;
        state.phase = 'ready'; updateUI();
        announce(model.scenes[state.scene].reason + '，' + activePose().name + '。可以调整取景距离，再按快门。');
      }, reducedMotion ? 0 : 720);
    } catch (_) {
      if (generation !== matchGeneration) return;
      imageError = true; state.present = false; state.phase = 'empty'; updateUI();
      announce('素材没有载入成功，请刷新页面后重试。');
    }
  }
  function togglePerson() {
    cancelMatching(); state.shot = null;
    state.present = !state.present;
    if (state.present) beginMatching();
    else { state.phase = 'empty'; updateUI(); announce('人物已离开，姿势推荐与轮廓已隐藏。'); }
  }
  async function changeScene(scene) {
    if (!(scene in model.scenes)) return;
    cancelMatching(); state.scene = scene; state.poseIndex = 0; state.shot = null;
    imageError = false;
    if (state.present) beginMatching();
    else {
      state.phase = 'empty'; updateUI();
      const capturedScene = scene;
      try { await loadImage('assets/scenes/' + scene + '.svg'); if (state.scene === capturedScene) updateUI(); }
      catch (_) { if (state.scene === capturedScene) { imageError = true; updateUI(); } }
    }
  }
  function focusDemo() {
    const target = window.innerWidth < 621 ? $('demo') : $('experience');
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function startDemo() {
    state.shot = null; state.present = true;
    focusDemo(); beginMatching();
  }
  function capture() {
    if ($('shutter').disabled || state.phase === 'review') return;
    cancelMatching();
    const photo = document.createElement('canvas'); photo.width = 720; photo.height = 960;
    const photoContext = photo.getContext('2d');
    if (!photoContext) return;
    paintScene(photoContext, false);
    const pose = activePose();
    state.shot = { canvas: photo, assessment: model.evaluateShot({ present: state.present, distance: state.distance, framing: pose.framing, bounds: sourceBounds(pose) }) };
    state.phase = 'review'; state.crop = true;
    $('shutter-flash').classList.remove('flash');
    updateUI();
    if (!reducedMotion) { void $('shutter-flash').offsetWidth; $('shutter-flash').classList.add('flash'); }
    announce('示例照片已拍摄。' + state.shot.assessment.title + state.shot.assessment.text);
    $('retake').focus({ preventScroll: true });
  }
  function openGallery(single = false) {
    dialogTrigger = document.activeElement;
    const items = single ? [activePose()] : [...poses.values()];
    $('dialog-title').textContent = single ? activePose().name : '找到自然的自己。';
    $('dialog-intro').textContent = single ? '当前推荐 · ' + activePose().scene : '动画动作示例，按实际环境选择安全、舒适的动作。';
    const grid = $('pose-grid'); grid.replaceChildren(); grid.classList.toggle('single', single);
    for (const pose of items) {
      const article = document.createElement('article'); article.className = 'gallery-item' + (single ? ' single' : '');
      const img = document.createElement('img'); img.src = assetUrl('assets/poses/' + pose.id + '.webp'); img.alt = pose.name + '的动画姿势参考'; img.width = 576; img.height = 768;
      const title = document.createElement('h3'); title.textContent = pose.name;
      const text = document.createElement('p'); text.textContent = pose.action;
      article.append(img, title, text); grid.append(article);
    }
    $('pose-dialog').showModal();
    document.body.style.overflow = 'hidden';
  }
  function closeDialog() { $('pose-dialog').close(); }
  $('pose-dialog').addEventListener('close', () => { document.body.style.overflow = ''; if (dialogTrigger) dialogTrigger.focus({ preventScroll: true }); });
  $('pose-dialog').addEventListener('click', event => { if (event.target === $('pose-dialog')) { const box = event.target.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(); } });
  $('close-dialog').addEventListener('click', closeDialog);
  $('dialog-done').addEventListener('click', () => { closeDialog(); startDemo(); });
  $('open-gallery').addEventListener('click', () => openGallery());
  $('pose-preview').addEventListener('click', () => openGallery(true));
  $('start-demo').addEventListener('click', startDemo);
  $('enter-person').addEventListener('click', togglePerson);
  $('toggle-person').addEventListener('click', togglePerson);
  $('next-pose').addEventListener('click', () => { state.poseIndex = (state.poseIndex + 1) % model.scenes[state.scene].poses.length; beginMatching(); });
  document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => changeScene(button.dataset.scene)));
  $('distance').addEventListener('input', event => { state.distance = Number(event.target.value); updateUI(); });
  $('distance').addEventListener('change', () => announce(model.distanceLabel(state.distance) + '，按快门查看这一张的建议。'));
  $('toggle-outline').addEventListener('click', () => { state.outline = !state.outline; updateUI(); announce(state.outline ? '细发光轮廓已显示。' : '轮廓已隐藏，可以自由取景。'); });
  $('toggle-grid').addEventListener('click', () => { state.grid = !state.grid; updateUI(); });
  $('shutter').addEventListener('click', capture);
  $('retake').addEventListener('click', () => { state.shot = null; state.phase = state.present ? 'ready' : 'empty'; updateUI(); announce('已返回取景，可以继续拍摄。'); $('shutter').focus({ preventScroll: true }); });
  $('toggle-crop').addEventListener('click', () => { state.crop = !state.crop; updateUI(); announce(state.crop ? '裁剪参考框已显示，原片未修改。' : '裁剪参考框已隐藏，正在查看原片。'); });
  $('try-review').addEventListener('click', () => { state.scene = 'park'; state.poseIndex = 0; state.distance = 5; startDemo(); announce('已切换到留白较多的公园示例。按下快门查看裁剪建议。'); });
  if (!ctx) {
    $('empty-state').querySelector('p').textContent = '当前浏览器不支持相机演示。';
    $('enter-person').hidden = true;
    $('start-demo').disabled = true;
  }
  loadImage('assets/scenes/campus.svg').then(updateUI).catch(() => { imageError = true; updateUI(); });
  // Load the first reference quietly; errors are handled if the visitor enters the scene.
  loadImage('assets/poses/wall_space.webp').catch(() => {});
  updateUI();
})();

