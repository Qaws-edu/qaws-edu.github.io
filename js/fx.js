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
function say(m,txt,dx,ms){
  var host=m.parentElement; if(getComputedStyle(host).position==='static') host.style.position='relative';
  var old=host.querySelector('.fx-tip'); if(old) old.remove();
  var tip=document.createElement('div'); tip.className='fx-tip'; tip.textContent=txt||LINES[Math.random()*LINES.length|0];
  tip.style.top='0'; tip.style.left='50%'; tip.style.translate='calc(-50% + '+(dx||0)+'px) 0'; host.appendChild(tip);
  setTimeout(function(){tip.remove()},ms||2200);
}
document.addEventListener('click',function(e){
  var m=e.target.closest&&e.target.closest('.asmaa'); if(!m) return;
  m.classList.remove('fx-jump'); void m.offsetWidth; m.classList.add('fx-jump');
  say(m,null,D.el?D.x:0);
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

/* ---- Ms. Asmaa: walks toward the visitor's finger/pointer, talks now and then, and can be dragged and dropped ---- */
var CHAT=['أهلاً يا بطل! 👋','أنا جنبك 🌈','يلا نتعلم حرف جديد','تعالى العب معايا!','إنت بتتحسن كل يوم','شدّني وحطّني فين ما تحب 😄','برافو عليك!'];
var D={el:null,mode:'walk',x:0,y:0,vy:0,dir:1,base:0,sx:0,sy:0,px0:0,py0:0,moved:false,id:null,last:0,lim:90,ptrX:null,ptrT:0,nextSay:0};
function walker(){ return document.querySelector('.hero .hero-guide')||document.querySelector('.hero .mascot-wrap .asmaa'); }
function adopt(el){
  var cs=(getComputedStyle(el).translate||'0 0').split(' '), x0=parseFloat(cs[0])||0, y0=parseFloat(cs[1])||0;
  var b=el.getBoundingClientRect(); D.el=el; D.base=b.left+b.width/2-x0; D.x=x0; D.y=0; D.mode='walk'; var hr=el.closest('.hero'); D.lim=Math.min((hr?hr.clientWidth:innerWidth)*.4,innerWidth>=1024?420:innerWidth>=700?300:170);
  D.nextSay=performance.now()+9000; if(!D.greeted){D.greeted=true; setTimeout(function(){ if(document.contains(el)) say(el,'ازيك أنا مس أسماء',D.x,4500); },700);} el.classList.add('fx-follow'); el.draggable=false; el.style.translate=x0+'px 0px';
}
function seen(e){ D.ptrX=e.clientX; D.ptrT=performance.now(); }
document.addEventListener('pointermove',seen); 
document.addEventListener('touchstart',function(e){var t=e.touches[0]; if(t){D.ptrX=t.clientX;D.ptrT=performance.now();}},{passive:true});
document.addEventListener('touchmove',function(e){var t=e.touches[0]; if(t){D.ptrX=t.clientX;D.ptrT=performance.now();}},{passive:true});
document.addEventListener('pointerdown',function(e){
  seen(e); var el=D.el; if(!el||!el.contains(e.target)&&e.target!==el) return;
  D.mode='drag'; D.moved=false; D.id=e.pointerId; D.px0=e.clientX; D.py0=e.clientY; D.sx=D.x; D.sy=D.y; D.vy=0;
  try{el.setPointerCapture(e.pointerId);}catch(_){}
},true);
document.addEventListener('pointermove',function(e){
  if(D.mode!=='drag'||e.pointerId!==D.id) return;
  var dx=e.clientX-D.px0, dy=e.clientY-D.py0;
  if(!D.moved&&Math.hypot(dx,dy)<7) return;
  D.moved=true; e.preventDefault();
  var nx=Math.max(-D.lim,Math.min(D.lim,D.sx+dx)); if(Math.abs(nx-D.x)>1) D.dir=nx>D.x?1:-1;
  D.x=nx; D.y=Math.max(-150,Math.min(0,D.sy+dy));
});
function drop(e){
  if(D.mode!=='drag'||(e&&e.pointerId!==D.id)) return;
  if(!D.moved){ D.mode='walk'; return; }
  D.mode='fall'; D.vy=0; D.nextSay=performance.now()+2500; setTimeout(function(){D.moved=false},80);
}
document.addEventListener('pointerup',drop); document.addEventListener('pointercancel',drop);
document.addEventListener('click',function(e){ if(D.moved&&e.target.closest&&e.target.closest('.asmaa,.hero-guide')){e.stopPropagation();e.preventDefault();} },true);
document.addEventListener('dragstart',function(e){ if(e.target.closest&&e.target.closest('.asmaa,.hero-guide')) e.preventDefault(); },true);
var wander=1, wanderT=0;
function tick(t){
  requestAnimationFrame(tick);
  var el=walker(); if(!el){D.el=null;return;}
  if(el!==D.el) adopt(el);
  var dt=Math.min(40,t-(D.last||t)); D.last=t;
  var y=D.y, bob=0, sc=1;
  if(D.mode==='fall'){ D.vy+=.9; D.y=Math.min(0,D.y+D.vy); y=D.y; if(D.y>=0){D.y=0;D.mode='walk';} }
  else if(D.mode==='walk'){
    var sp=.03, walking=true, near=t-D.ptrT<5000&&D.ptrX!=null;
    if(near){ var gap=D.ptrX-(D.base+D.x); if(Math.abs(gap)>45){D.dir=gap>0?1:-1; sp=.055;} else walking=false; }
    else { if(t>wanderT){wanderT=t+4000+Math.random()*4000; if(Math.random()<.25) wander=-wander;} D.dir=wander; }
    if(walking){ D.x+=D.dir*dt*sp; if(D.x>D.lim){D.x=D.lim;wander=-1;D.dir=-1} if(D.x<-D.lim){D.x=-D.lim;wander=1;D.dir=1}
      bob=-Math.abs(Math.sin(t/110))*9; }
    y=D.y+bob;
    if(t>D.nextSay){ D.nextSay=t+9000+Math.random()*7000; if(!document.hidden) say(el,CHAT[Math.random()*CHAT.length|0],D.x); }
  } else if(D.mode==='drag'){ sc=1.08; }
  el.style.translate=D.x.toFixed(1)+'px '+y.toFixed(1)+'px'; el.style.scale=(D.dir===-1?-sc:sc)+' '+sc;
}
requestAnimationFrame(tick);
})();
