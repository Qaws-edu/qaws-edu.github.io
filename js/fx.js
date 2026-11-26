/* Qaws interactive layer: things move and react to the visitor. Additive, safe to remove. */
(function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
var COLORS=['#F5D349','#F07B5F','#7D9BE8','#8CCD6F','#F0A6C2'], SHAPES=['★','✦','●','♥'];
var app=document.getElementById('app'); if(!app) return;
var px=0.5, py=0.5, lastTrail=0;

/* ---- tap/click burst ---- */
function burst(x,y){
  var r=document.createElement('div'); r.className='fx-r'; r.style.left=x+'px'; r.style.top=y+'px'; document.body.appendChild(r);
  setTimeout(function(){r.remove()},650);
  for(var i=0;i<9;i++){
    var p=document.createElement('div'), a=Math.PI*2*i/9+Math.random()*.5, d=40+Math.random()*50;
    p.className='fx-p'; p.textContent=SHAPES[i%SHAPES.length];
    p.style.cssText='left:'+x+'px;top:'+y+'px;--dx:'+Math.cos(a)*d+'px;--dy:'+Math.sin(a)*d+'px;--rot:'+(Math.random()*360-180)+'deg;--c:'+COLORS[i%5]+';--s:'+(14+Math.random()*12)+'px';
    document.body.appendChild(p); setTimeout((function(q){return function(){q.remove()}})(p),850);
  }
}
document.addEventListener('pointerdown',function(e){ burst(e.clientX,e.clientY); });

/* ---- pointer: crayon trail (mouse only) + parallax ---- */
document.addEventListener('pointermove',function(e){
  px=e.clientX/innerWidth; py=e.clientY/innerHeight;
  if(e.pointerType==='mouse'){
    var n=performance.now(); if(n-lastTrail>70){ lastTrail=n;
      var t=document.createElement('div'); t.className='fx-trail';
      t.style.cssText='left:'+e.clientX+'px;top:'+e.clientY+'px;--c:'+COLORS[(n/70|0)%5];
      document.body.appendChild(t); setTimeout(function(){t.remove()},700); }
  }
});
/* touch / tilt: also steer parallax by finger */
document.addEventListener('touchmove',function(e){ var t=e.touches[0]; if(t){px=t.clientX/innerWidth;py=t.clientY/innerHeight;} },{passive:true});

/* ---- mascot looks toward the visitor, sun + clouds follow with depth ---- */
function frame(){
  var dx=(px-.5), dy=(py-.5);
  document.querySelectorAll('.asmaa').forEach(function(m){
    var b=m.getBoundingClientRect(); if(b.bottom<0||b.top>innerHeight) return;
    var mx=(b.left+b.width/2)/innerWidth; m.style.rotate=Math.max(-9,Math.min(9,(px-mx)*22))+'deg';
  });
  var s=document.querySelector('.hero .sun'); if(s) s.style.marginTop=dy*14+'px', s.style.marginLeft=dx*-18+'px';
  var h=document.querySelector('.hero .rainbow'); if(h) h.style.translate=dx*-10+'px '+dy*-6+'px';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---- mascot click: jump + speech bubble ---- */
var LINES=['أهلاً! يلا نتعلم 🌈','برافو عليك!','كمّل، إنت شاطر','حرف جديد النهاردة؟','يلا نلعب!'];
document.addEventListener('click',function(e){
  var m=e.target.closest&&e.target.closest('.asmaa'); if(!m) return;
  m.classList.remove('fx-jump'); void m.offsetWidth; m.classList.add('fx-jump');
  var host=m.parentElement; if(getComputedStyle(host).position==='static') host.style.position='relative';
  var old=host.querySelector('.fx-tip'); if(old) old.remove();
  var tip=document.createElement('div'); tip.className='fx-tip'; tip.textContent=LINES[Math.random()*LINES.length|0];
  tip.style.top='0'; tip.style.left='50%'; tip.style.translate='-50% 0'; host.appendChild(tip);
  setTimeout(function(){tip.remove()},1800);
});

/* ---- scroll reveal + rainbow path lengths, re-run on every route render ---- */
var io=new IntersectionObserver(function(es){ es.forEach(function(en){
  if(en.isIntersecting){ en.target.classList.add('fx-in'); io.unobserve(en.target); } }); },{threshold:.12});
function prep(){
  var hh=document.querySelector('.hero'); if(hh&&!hh.querySelector('.c3')){var c=document.createElement('div'); c.className='cloud c3'; hh.appendChild(c);}
  var i=0;
  document.querySelectorAll('.card,.stage,.unit,.node-col .node,.section-title,.banner').forEach(function(el){
    if(el.dataset.fx) return; el.dataset.fx=1; el.classList.add('fx-hide');
    el.style.setProperty('--d',(i++%4)*.07+'s'); io.observe(el); });
}
new MutationObserver(function(){ prep(); setTimeout(function(){document.querySelectorAll('.fx-hide:not(.fx-in)').forEach(function(e){var b=e.getBoundingClientRect(); if(b.top<innerHeight) e.classList.add('fx-in')})},1500); }).observe(app,{childList:true});
prep();
})();
