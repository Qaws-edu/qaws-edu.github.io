/* الأستاذة أسماء: رفيقة متحركة تنتقل بين أماكن الصفحة وتتحدث بفقرات قصيرة بالفصحى.
   الصور: assets/asmaa/asmaa-exact.png (صورة واحدة بلا أي تعديل، والتنوع بالحركة والموضع والجمل فقط)
   لإضافة وضع جديد أضف اسمه في POSES. لتغيير حركتها عدّل SCREENS. */
(function(){
var DIR='assets/asmaa/'; var V='?v=20261128-5';
var GROUPS=['wave','point','cheer','think','book'];
var FILE='asmaa-full'; var POSES=[FILE];
function grp(k){return GROUPS.indexOf(k)>-1?k:null;}
function variant(g){return g;}
var W=108,H=156;
var REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* خطوات كل شاشة: t = العنصر المقصود، pos = أين تقف، wait = الانتظار قبل الانتقال، say = اسم مجموعة الجمل */
var SCREENS={
  home:[{say:'home'},{say:'homeGo',wait:5500}],
  stages:[{say:'stages'},{say:'stagesGo',wait:5500}],
  progress:[{say:'progress'},{say:'progressGo',wait:5500}],
  stage:[{say:'stage'},{say:'stageGo',wait:5500}],
  lesson:[{say:'lesson'},{say:'lessonGo',wait:5500}],
  test:[{say:'test'},{say:'testGo',wait:5500}],
  profiles:[{say:'profiles'},{say:'progressGo',wait:5500}],
  parent:[{say:'parent'},{say:'progressGo',wait:5500}]
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
  progress:['كل خطوة تقرّبك من الإتقان','انظر كم تقدّمت حتى الآن','تقدّمك يسعدني كثيرًا'],
  profiles:['لكل واحد ملفه وتقدّمه الخاص','هنا تُدار الملفات الشخصية'],
  parent:['تابع التقدّم أولًا بأول','هنا ترى نشاط كل ملف'],
  progressGo:['واصل، فالإنجاز قريب','هيا نضيف خطوة جديدة','أنت تتقدّم بثبات'],
  tap:['أحسنت، أنا هنا معك','هيا بنا نتعلّم','أنت تتقدّم بثبات','استمر، أنت رائع','أنا سعيدة برؤيتك','لا تتوقف، أنت على الطريق'],
  pick:['فكّر جيدًا قبل أن تثبّت إجابتك','اختيار جيد، هل أنت متأكد؟','خذ لحظة وراجع اختيارك','حسنًا، تابع بقية الأسئلة'],
  correct:['أحسنت! اجتزت الاختبار','رائع! إجاباتك صحيحة','ممتاز، أنت بطل','عمل رائع، استمر هكذا'],
  wrong:['لا بأس، راجع الإجابات وحاول مرة أخرى','قريب جدًا، حاول مرة أخرى','الخطأ يعلّمنا، أعد المحاولة','لا تيأس، أنت تستطيع'],
  done:['أحسنت! أنهيت الدرس','عمل رائع، أنهيت الدرس','ممتاز، خطوة جديدة أنجزتها','فخورة بك، هيا للتالي']
};
window.AsmaaPools=POOLS;
var lastLine=null,lastIdx={};
function pick(k){
  var p=POOLS[k]||POOLS.tap, i, n=0;
  do{ i=Math.floor(Math.random()*p.length); n++; }
  while(n<12 && (i===lastIdx[k] || p[i]===lastLine) && p.length>1);
  lastIdx[k]=i; lastLine=p[i]; return p[i];
}
var ACTION_POSE={pick:'think',correct:'cheer',wrong:'point',done:'cheer',tap:null};
var MAIN=GROUPS;
function initialPose(){
  var last=null; try{last=localStorage.getItem('qaws-asmaa-pose');}catch(e){}
  var c=MAIN.filter(function(p){return p!==grp(last);});
  var p=c[Math.floor(Math.random()*c.length)];
  try{localStorage.setItem('qaws-asmaa-pose',p);}catch(e){}
  return p;
}
var curScreen='home',el,imgA,imgB,bub,talkT,stepT,cur=null,front='A',visits=0,curStep=null,curX=0,side=null;

function build(){
  el=document.createElement('div'); el.className='companion';
  el.innerHTML='<div class="c-bubble" role="status"></div><div class="c-body"><img class="c-img a on" alt="الأستاذة أسماء"><img class="c-img b" alt="" aria-hidden="true"></div>';
  var st=document.createElement('style'); st.textContent='.companion.hero-mode .c-bubble{left:auto;right:-14px;top:auto;bottom:100%;margin-bottom:12px;transform:translateY(8px);max-width:210px}\n.companion.hero-mode .c-bubble::after{top:100%;left:auto;right:60px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:12px solid #fff;border-bottom:0}\n.companion.talk.hero-mode .c-bubble{transform:none}\n@media(max-width:1250px){.companion.hero-mode .c-bubble{max-width:160px;font-size:14px}}'; document.head.appendChild(st);
  document.body.appendChild(el);
  bub=el.querySelector('.c-bubble'); imgA=el.querySelector('.a'); imgB=el.querySelector('.b');
  imgA.removeAttribute('src');
  el.querySelector('.c-body').addEventListener('click',function(){
    var c=MAIN.filter(function(p){return p!==grp(cur);});
    Asmaa.say(pick('tap'),c[Math.floor(Math.random()*c.length)],4000);
  });
  window.addEventListener('resize',function(){ if(curStep) goTo(curStep,true); });
  window.addEventListener('load',function(){ if(curStep) goTo(curStep,true); });
}
function setPose(p){
  if(!p) return; var g=grp(p)||'wave';
  var b=el.querySelector('.c-body'); b.setAttribute('data-mood',''); void b.offsetWidth; b.setAttribute('data-mood',g);
  if(imgA.getAttribute('src')) { cur=g; return; }
  imgA.src=DIR+FILE+'.png'+V; imgA.classList.add('on'); cur=g;
}
function goTo(step,instant){
  var hero=(curScreen==='home'&&window.innerWidth>=900)?document.querySelector('.hero'):null;
  var n=hero||document.querySelector('.aband'); if(!n) return;
  var r=n.getBoundingClientRect(), L=r.left+scrollX, T=r.top+scrollY;
  var S=hero?1.4:1;
  side = hero ? 'r' : (step.side || (side==='r'?'l':'r'));
  var x = side==='r' ? L+r.width-(hero?150*S+24:W+6) : L+6;
  var y = T+r.height-H*S+(hero?10:4);
  el.classList.toggle('hero-mode',!!hero);
  el.style.transformOrigin=hero?'0 0':'';
  if(instant||REDUCED) el.classList.add('jump'); else el.classList.remove('jump');
  el.classList.toggle('side-r',side==='r'); el.classList.toggle('side-l',side==='l');
  el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'+(hero?' scale('+S+')':'');
  curStep={say:step.say,side:side}; curX=x;
}
window.Asmaa={
  dir:DIR, names:POSES,
  get:function(name,cls){return '<img class="asmaa '+(cls||'')+'" src="'+DIR+FILE+'.png'+V+'" alt="الأستاذة أسماء">';},
  enter:function(screen){
    if(!el) build();
    el.style.display='';
    clearTimeout(stepT); clearTimeout(talkT);
    curScreen=screen; var steps=SCREENS[screen]||SCREENS.home;
    side=null; var wasSide=null;
    var first=visits===0; visits++;
    if(first) setPose(initialPose());
    function run(i){
      var st=steps[i]; if(!st) return;
      goTo(i===0?{say:st.say,side:'r'}:st,first&&i===0); if(i>0){} 
      setTimeout(function(){ Asmaa.say(pick(st.say),null,i===0?6000:4500); },(first&&i===0)?100:(REDUCED?0:900));
      if(steps[i+1] && !REDUCED) stepT=setTimeout(function(){run(i+1);}, steps[i+1].wait||5000);
    }
    run(0);
  },
  hide:function(){ if(el) el.style.display='none'; },
  event:function(k){
    clearTimeout(stepT);
    Asmaa.say(pick(k),ACTION_POSE[k]||null,3800);
  },
  say:function(text,pose,ms){
    if(!el) build();
    if(pose) setPose(pose);
    bub.textContent=text;
    el.classList.add('talk');
    clearTimeout(talkT);
    talkT=setTimeout(function(){el.classList.remove('talk');},ms||4500);
  }
};
})();

