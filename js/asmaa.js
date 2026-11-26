/* الأستاذة أسماء: رفيقة متحركة تنتقل بين أماكن الصفحة وتتحدث بفقرات قصيرة بالفصحى.
   الصور: assets/asmaa/{wave,point,cheer,think,book,bust}.png
   لتبديل الأوضاع انسخ ملفات جديدة بنفس الأسماء، ولا حاجة لتعديل الكود.
   لإضافة وضع جديد أضف اسمه في POSES. لتغيير حركتها عدّل SCREENS. */
(function(){
var DIR='assets/asmaa/';
var POSES=['wave','point','book','think','cheer','bust'];
var W=150,H=156;
var REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* خطوات كل شاشة: t = العنصر المقصود، pos = أين تقف، wait = الانتظار قبل الانتقال، say = اسم مجموعة الجمل */
var SCREENS={
  home:[{t:'.mascot-wrap',pos:'inside-bottom',say:'home'},{t:'.node.current',pos:'left',say:'homeGo',wait:5200}],
  stages:[{t:'.aslot',pos:'inside',say:'stages'},{t:'.stage:not(.locked)',pos:'above',say:'stagesGo',wait:5000}],
  stage:[{t:'.aslot',pos:'inside',say:'stage'},{t:'.lesson.now',pos:'above',say:'stageGo',wait:5000}],
  lesson:[{t:'.aslot',pos:'inside',say:'lesson'},{t:'#finish',pos:'above-right',say:'lessonGo',wait:5500}],
  test:[{t:'.aslot',pos:'inside',say:'test'},{t:'#submit',pos:'above-right',say:'testGo',wait:5500}]
};
/* مجموعات الجمل: تدور الجمل ولا تتكرر الجملة نفسها مرتين متتاليتين */
var POOLS={
  home:['أهلًا، أنا مس أسماء','أهلًا بك، هيا نبدأ رحلتنا','مرحبًا بك، يسعدني أن أراك','أهلًا بالبطل، هل أنت مستعد؟'],
  homeGo:['هنا تبدأ رحلتك مع الحروف','هذه أولى خطواتك، هيا بنا','الطريق يبدأ من هنا'],
  stages:['اختر مرحلتك، وأنا معك','لكل مرحلة مغامرة جديدة','أهلًا بك، أي مرحلة تريد؟'],
  stagesGo:['ابدأ من هنا','هذه مرحلتك المفتوحة','اضغط عليها لنبدأ'],
  stage:['هيا نكمل مغامرتنا اليوم','أهلًا بك في هذه المرحلة','لنتقدّم خطوة جديدة'],
  stageGo:['ابدأ بهذا الدرس','هذا درسك الحالي','هيا إلى الدرس التالي'],
  lesson:['أصغِ جيدًا إلى الشرح','خذ وقتك، لا تستعجل','انتبه، فالشرح ممتع'],
  lessonGo:['عندما تنتهي، اضغط هنا','بعد المشاهدة، اضغط هنا','أنهِ الدرس من هنا'],
  test:['ركّز جيدًا، أنت قادر على ذلك','فكّر قبل أن تجيب','تذكّر ما تعلّمته'],
  testGo:['بعد أن تجيب، سلّم إجاباتك','عندما تنتهي، اضغط هنا','راجع إجاباتك ثم سلّمها'],
  tap:['أحسنت، أنا هنا معك','هيا بنا نتعلّم','أنت تتقدّم بثبات','استمر، أنت رائع','أنا سعيدة برؤيتك','لا تتوقف، أنت على الطريق'],
  pick:['فكّر جيدًا قبل أن تثبّت إجابتك','اختيار جيد، هل أنت متأكد؟','خذ لحظة وراجع اختيارك','حسنًا، تابع بقية الأسئلة'],
  correct:['أحسنت! اجتزت الاختبار','رائع! إجاباتك صحيحة','ممتاز، أنت بطل','عمل رائع، استمر هكذا'],
  wrong:['لا بأس، راجع الإجابات وحاول مرة أخرى','قريب جدًا، حاول مرة أخرى','الخطأ يعلّمنا، أعد المحاولة','لا تيأس، أنت تستطيع'],
  done:['أحسنت! أنهيت الدرس','عمل رائع، أنهيت الدرس','ممتاز، خطوة جديدة أنجزتها','فخورة بك، هيا للتالي']
};
var lastLine=null,lastIdx={};
function pick(k){
  var p=POOLS[k]||POOLS.tap, i, n=0;
  do{ i=Math.floor(Math.random()*p.length); n++; }
  while(n<12 && (i===lastIdx[k] || p[i]===lastLine) && p.length>1);
  lastIdx[k]=i; lastLine=p[i]; return p[i];
}
var ACTION_POSE={pick:'think',correct:'cheer',wrong:'point',done:'cheer',tap:null};
var MAIN=['wave','point','cheer','think','book'];
function initialPose(){
  var last=null; try{last=localStorage.getItem('qaws-asmaa-pose');}catch(e){}
  var c=MAIN.filter(function(p){return p!==last;});
  var p=c[Math.floor(Math.random()*c.length)];
  try{localStorage.setItem('qaws-asmaa-pose',p);}catch(e){}
  return p;
}
var el,imgA,imgB,bub,talkT,stepT,cur=null,front='A',visits=0,curStep=null,curX=0;

function build(){
  el=document.createElement('div'); el.className='companion';
  el.innerHTML='<div class="c-bubble" role="status"></div><div class="c-body"><img class="c-img a on" alt="الأستاذة أسماء"><img class="c-img b" alt="" aria-hidden="true"></div>';
  document.body.appendChild(el);
  bub=el.querySelector('.c-bubble'); imgA=el.querySelector('.a'); imgB=el.querySelector('.b');
  imgA.removeAttribute('src');
  el.querySelector('.c-body').addEventListener('click',function(){
    var c=MAIN.filter(function(p){return p!==cur;});
    Asmaa.say(pick('tap'),c[Math.floor(Math.random()*c.length)],4000);
  });
  window.addEventListener('resize',function(){ if(curStep) goTo(curStep,true); });
  window.addEventListener('load',function(){ if(curStep) goTo(curStep,true); });
}
function setPose(p){
  if(!p||p===cur) return; cur=p;
  var show=front==='A'?imgB:imgA, hide=front==='A'?imgA:imgB;
  show.src=DIR+p+'.png'; show.classList.add('on'); hide.classList.remove('on');
  front=front==='A'?'B':'A';
}
function ensureSlot(screen){
  var s=document.querySelector('.aslot'); if(s) return s;
  if(screen==='home') return null;
  s=document.createElement('div'); s.className='aslot';
  var ref=document.querySelector('.banner')||document.querySelector('header');
  ref.insertAdjacentElement('afterend',s);
  return s;
}
function rectOf(t){
  var n=document.querySelector(t); if(!n) return null;
  var r=n.getBoundingClientRect();
  return {l:r.left+scrollX,t:r.top+scrollY,w:r.width,h:r.height};
}
function goTo(step,instant){
  var r=rectOf(step.t); if(!r) return;
  var wrap=document.getElementById('app').getBoundingClientRect();
  var minX=wrap.left+scrollX, maxX=wrap.right+scrollX-W;
  var x,y,cx=r.l+r.w/2-W/2;
  if(step.pos==='inside'){ x=cx; y=r.t+r.h-H-4; }
  else if(step.pos==='inside-bottom'){ x=cx; y=r.t+r.h-H+4; }
  else if(step.pos==='above-right'){ x=r.l+r.w-W+30; y=r.t-H+8; }
  else if(step.pos==='above'){ x=cx; y=r.t-H+34; }
  else if(step.pos==='left'){ x=r.l-W+24; y=r.t+r.h/2-H/2; }
  else { x=cx; y=r.t; }
  x=Math.max(minX+4,Math.min(maxX-4,x)); y=Math.max(70,y);
  if(instant||REDUCED) el.classList.add('jump'); else el.classList.remove('jump');
  el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
  curStep=step; curX=x;
}
window.Asmaa={
  dir:DIR, names:POSES,
  get:function(name,cls){return '<img class="asmaa '+(cls||'')+'" src="'+DIR+name+'.png" alt="الأستاذة أسماء">';},
  enter:function(screen){
    if(!el) build();
    clearTimeout(stepT); clearTimeout(talkT);
    var steps=SCREENS[screen]||SCREENS.home;
    ensureSlot(screen);
    var first=visits===0; visits++;
    if(first) setPose(initialPose());
    function run(i){
      var st=steps[i]; if(!st) return;
      goTo(st,first&&i===0);
      setTimeout(function(){ Asmaa.say(pick(st.say),null,i===0?6000:4500); },(first&&i===0)?100:(REDUCED?0:900));
      if(steps[i+1] && !REDUCED) stepT=setTimeout(function(){run(i+1);}, steps[i+1].wait||5000);
    }
    run(0);
  },
  event:function(k){
    clearTimeout(stepT);
    Asmaa.say(pick(k),ACTION_POSE[k]||null,3800);
  },
  say:function(text,pose,ms){
    if(!el) build();
    if(pose) setPose(pose);
    bub.textContent=text;
    var bw=bub.offsetWidth, wr=document.getElementById('app').getBoundingClientRect();
    var cx=curX+W/2, l=cx-bw/2, lo=wr.left+scrollX+8, hi=wr.right+scrollX-8-bw;
    var off=Math.max(lo,Math.min(hi,l))-l;
    bub.style.setProperty('--bx',Math.round(off)+'px');
    el.classList.add('talk');
    clearTimeout(talkT);
    talkT=setTimeout(function(){el.classList.remove('talk');},ms||4500);
  }
};
})();
