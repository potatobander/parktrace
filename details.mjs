const sections={solution:['从问题出发，连接完整旅程。','了解用户困难、空间信息与人机协作。'],demo:['现在，亲自走一遍。','从找车位到返程找车，切换原型体验不同的指引。'],prototypes:['同一条路，三种理解方式。','比较地图、地标与解释，找到更适合人的信息表达。'],research:['把设计，交给真实用户。','明确研究假设，规划测试、实物与后续制作。']};
function activate(id,scroll=false){
 if(!sections[id])id='solution';
 document.querySelectorAll('[data-pane]').forEach(el=>el.hidden=el.dataset.pane!==id);
 document.querySelectorAll('[data-section]').forEach(el=>{const active=el.dataset.section===id;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 document.querySelector('#details-title').textContent=sections[id][0];document.querySelector('#details-subtitle').textContent=sections[id][1];
 if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);
 if(scroll)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
}
document.addEventListener('click',event=>{const anchor=event.target.closest('a[href^="#"]');const tryVariant=event.target.closest('[data-try-variant]');if(tryVariant){activate('demo',true);return;}if(!anchor)return;const id=anchor.getAttribute('href').slice(1);if(sections[id]){event.preventDefault();activate(id,true);}},true);
window.addEventListener('hashchange',()=>activate(location.hash.slice(1),true));
activate(location.hash.slice(1));
