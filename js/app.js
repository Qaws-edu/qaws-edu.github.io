/* Qaws — app shell: router, progress store, views */
(function(){
const $ = sel => document.querySelector(sel);
const STAGES = window.QAWS_STAGES;
const N = ['١','٢','٣','٤','٥','٦','٧','٨','٩','١٠'];

/* ---------------- progress store ---------------- */
const Store = {
  key:'qaws-progress-v1',
  s:null,
  load(){ if(this.s) return this.s;
    try{ this.s = JSON.parse(localStorage.getItem(this.key)) || null }catch(e){ this.s=null }
    if(!this.s) this.s = {lessons:{}, tests:{}};
    return this.s; },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.s)); },
  lkey(si,u,l){ return si+'/'+u+'/'+l; },
  lessonDone(si,u,l){ return !!this.load().lessons[this.lkey(si,u,l)]; },
  testDone(si,u){ return !!this.load().tests[si+'/'+u]; },
  markLesson(si,u,l){ this.load().lessons[this.lkey(si,u,l)] = 1; this.save(); },
  markTest(si,u){ this.load().tests[si+'/'+u] = 1; this.save(); },
  lessonOpen(si,u,l){
    if(l>0) return this.lessonDone(si,u,l-1);
    if(u>0) return this.testDone(si,u-1);
    return this.stageOpen(si);
  },
  testOpen(si,u){ const st=STAGES[si]; return st.units[u].lessons.every((_,l)=>this.lessonDone(si,u,l)); },
  unitOpen(si,u){ return u===0 ? this.stageOpen(si) : this.testDone(si,u-1); },
  stageOpen(si){ if(si===0) return true;
    const prev=STAGES[si-1];
    return prev.units.every((_,u)=>this.testDone(si-1,u)); },
  stagePct(si){ const st=STAGES[si]; let done=0,total=0;
    st.units.forEach((un,u)=>{ un.lessons.forEach((_,l)=>{total++; if(this.lessonDone(si,u,l))done++;});
      total++; if(this.testDone(si,u))done++; });
    return total? Math.round(done/total*100):0; }
};

/* ---------------- shared bits ---------------- */
const ICONS = {
  video:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#4A3B6E" stroke-width="2"/><path d="M10 9.5 L15 12 L10 14.5 z" fill="#F29682" stroke="#4A3B6E" stroke-width="1.5"/></svg>',
  activity:'<svg viewBox="0 0 24 24"><path d="M4 19 L8 5 L12 19 M6 14 L10 14 M15 8 L20 19 M20 8 L15 19" fill="none" stroke="#4A3B6E" stroke-width="2.2" stroke-linecap="round"/></svg>',
  exercise:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#4A3B6E" stroke-width="2"/><path d="M7 10h10M7 14h6" stroke="#4A3B6E" stroke-width="2" stroke-linecap="round"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="9" rx="2" fill="none" stroke="#A79FB8" stroke-width="2.2"/><path d="M9 10 V7 a3 3 0 0 1 6 0 v3" fill="none" stroke="#A79FB8" stroke-width="2.2"/></svg>',
  star:'<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="#F2E394" stroke="#4A3B6E" stroke-width="2" stroke-linejoin="round"/></svg>',
  starGrey:'<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="none" stroke="#A79FB8" stroke-width="2" stroke-linejoin="round"/></svg>'
};
const LOGO = '<a class="logo" href="#/"><svg width="40" height="26" viewBox="0 0 40 26"><path d="M3 23 A17 17 0 0 1 37 23" fill="none" stroke="#F29682" stroke-width="5" stroke-linecap="round"/><path d="M8 23 A12 12 0 0 1 32 23" fill="none" stroke="#F2E394" stroke-width="5" stroke-linecap="round"/><path d="M13 23 A7 7 0 0 1 27 23" fill="none" stroke="#AEC6F0" stroke-width="5" stroke-linecap="round"/></svg><div class="word">قَوْس</div></a>';
const HUD = '';
const AR = n => String(n).replace(/\d/g, d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const GROUND = '<footer class="ground"><svg width="44" height="28" viewBox="0 0 40 26"><path d="M3 23 A17 17 0 0 1 37 23" fill="none" stroke="#F5806A" stroke-width="5" stroke-linecap="round"/><path d="M8 23 A12 12 0 0 1 32 23" fill="none" stroke="#FFD25E" stroke-width="5" stroke-linecap="round"/><path d="M13 23 A7 7 0 0 1 27 23" fill="none" stroke="#5BB5F0" stroke-width="5" stroke-linecap="round"/></svg><div class="mini">قَوْس</div><div class="tag">تعلّم العربية باللعب</div></footer>';
const NAV_ICONS = {
  home:'<svg viewBox="0 0 24 24"><path d="M4 11 L12 4 L20 11 V19 a1 1 0 0 1-1 1 H5 a1 1 0 0 1-1-1z M10 20 V14 H14 V20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  stages:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  progress:'<svg viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>'
};
function nav(active){
  const t=[['home','#/','الرئيسية'],['stages','#/stages','المراحل'],['progress','#/progress','تقدّمي']];
  return '<nav class="tabbar">'+t.map(x=>'<a class="tab'+(x[0]===active?' on':'')+'" href="'+x[1]+'">'+NAV_ICONS[x[0]]+'<span>'+x[2]+'</span></a>').join('')+'</nav>';
}
const BAND = '<section class="aband"></section>';
function totals(){
  let st=STAGES.length,un=0,ls=0,ts=0,dl=0,dt=0;
  STAGES.forEach((s,si)=>s.units.forEach((u,ui)=>{un++;ts++;if(Store.testDone(si,ui))dt++;u.lessons.forEach((_,li)=>{ls++;if(Store.lessonDone(si,ui,li))dl++;});}));
  return {st,un,ls,ts,dl,dt,pct:Math.round((dl+dt)/(ls+ts)*100)};
}

function header(opts){
  opts = opts||{};
  const side = opts.back
    ? '<a class="back" href="'+opts.back+'">→</a><div class="headtitle">'+opts.title+'</div>'
    : LOGO;
  return '<header><div class="side">'+side+'</div>'+HUD+'</header>';
}

function celebrate(title, msg, then){
  const ov = document.createElement('div');
  ov.className='overlay';
  ov.innerHTML = '<div class="celebrate">'+window.Asmaa.get('cheer')
    +'<h2>'+title+'</h2><p>'+msg+'</p><button class="cta green">تابِع</button></div>';
  document.body.appendChild(ov);
  ov.querySelector('button').onclick = ()=>{ ov.remove(); then(); };
}
function rail(pct){ return '<div class="rail"><i style="width:'+pct+'%"></i></div>'; }
function chips(a){ return '<div class="meta-chips">'+a.map(x=>'<div class="chip">'+x+'</div>').join('')+'</div>'; }

/* ---------------- views ---------------- */
function vHome(){
  const T=totals();
  const nodes=[['done off1','١'],['done off2','٢'],['current','٣'],['lock off3','٤'],['lock off4','٥']];
  const nh = nodes.map((n,i)=>'<div class="node '+n[0]+'">'+(n[0]==='current'?'<div class="start-tag">ابدأ من هنا</div>':'')+n[1]+'</div>').join('');
  return header({})
  +'<section class="hero"><div class="sun"></div><div class="cloud c1"></div>'
  +'<h1>هيا نتعلّم <span class="hl">اللغة العربية</span><br>ونحن نلعب!</h1>'
  +'<p>رحلتنا الممتعة مع الحروف والكلمات</p>'
  +'<a class="cta" href="#/stages">هيا نبدأ!</a></section>'
  +'<section class="aband scene"><svg class="rainbow" viewBox="0 0 320 210" fill="none"><path d="M30 200 A130 130 0 0 1 290 200" stroke="#F5806A" stroke-width="16" stroke-linecap="round"/><path d="M46 200 A114 114 0 0 1 274 200" stroke="#FFD25E" stroke-width="16" stroke-linecap="round"/><path d="M62 200 A98 98 0 0 1 258 200" stroke="#5BB5F0" stroke-width="16" stroke-linecap="round"/></svg></section>'
  +'<section class="path"><h2 class="section-title">طريق المغامرة</h2><div class="node-col">'+nh+'</div></section>'
  +'<section class="cards"><h2 class="section-title sm">ماذا سنتعلّم؟</h2>'
  +'<div class="card"><div class="ic i-blue">'+ICONS.exercise+'</div><div><h3>الحروف</h3><p>لكل حرف لعبة: شكله وصوته وطريقة كتابته</p></div></div>'
  +'<div class="card"><div class="ic i-coral">'+ICONS.exercise+'</div><div><h3>الكلمات</h3><p>كلمات من الحياة اليومية: البيت والمدرسة والطعام</p></div></div>'
  +'<div class="card"><div class="ic i-pink">'+ICONS.video+'</div><div><h3>قصص قصيرة</h3><p>حكايات بالحروف التي تعلّمتها، بالصوت والصورة</p></div></div></section>'
  +GROUND+nav('home');
}

function stageCounts(st){ let l=0; st.units.forEach(u=>l+=u.lessons.length); return AR(st.units.length)+' وحدات · '+AR(l)+' درسًا'; }

function vStages(){
  const T=totals();
  const cards = STAGES.map((st,i)=>{
    const open = Store.stageOpen(i), pct = Store.stagePct(i);
    if(!open) return '<div class="stage locked"><div class="locktag">'+ICONS.lock+'</div><div class="num">'+st.badge+'</div><h3>'+st.name+'</h3><div class="bar"><i style="width:0"></i></div><div class="pct">تُفتح بعد '+STAGES[i-1].name+'</div></div>';
    return '<a class="stage" href="#/stage/'+i+'"><div class="num '+st.color+'">'+st.badge+'</div><h3>'+st.name+'</h3>'
      +'<div class="bar"><i style="width:'+pct+'%"></i></div><div class="pct">'+(pct? AR(pct)+'٪ مكتمل':'لم تبدأ بعد')+'</div></a>';
  }).join('');
  return header({})
  +'<section class="banner"><h1>اختر مرحلتك</h1><p>من التمهيدي إلى الثالث الإعدادي</p>'
  +'<div class="pbar"><div class="lbl"><span>تقدّمك العام</span><span>'+AR(T.pct)+'٪</span></div>'+rail(T.pct)+'</div></section>'
  +BAND
  +'<div class="grid">'+cards+'</div>'
  +GROUND+nav('stages');
}

function vProgress(){
  const T=totals();
  const rows = STAGES.map((st,i)=>{ const p=Store.stagePct(i);
    return '<a class="prow'+(Store.stageOpen(i)?'':' lockd')+'" href="'+(Store.stageOpen(i)?'#/stage/'+i:'#/stages')+'"><div class="num '+st.color+'">'+st.badge+'</div><div class="pm"><h3>'+st.name+'</h3>'+rail(p)+'</div><div class="pp">'+AR(p)+'٪</div></a>';
  }).join('');
  return header({})
  +'<section class="banner"><h1>تقدّمي</h1><p>كل خطوة تقرّبك من الإتقان</p>'
  +'<div class="pbar"><div class="lbl"><span>التقدّم العام</span><span>'+AR(T.pct)+'٪</span></div>'+rail(T.pct)+'</div></section>'
  +BAND
  +'<section class="stats tight"><div class="stat"><b>'+AR(T.dl)+'</b><span>درسًا مكتملًا</span></div><div class="stat"><b>'+AR(T.dt)+'</b><span>اختبارًا مجتازًا</span></div><div class="stat"><b>٠</b><span>أيام متتالية</span></div></section>'
  +'<section class="content"><h2 class="section-title sm">المراحل</h2><div class="plist">'+rows+'</div></section>'
  +GROUND+nav('progress');
}

function vStage(si){
  const st = STAGES[si];
  let lessons=0; st.units.forEach(u=>lessons+=u.lessons.length);
  const pct = Store.stagePct(si);
  const units = st.units.map((un,u)=>{
    const total=un.lessons.length+1;
    let dn=0; un.lessons.forEach((_,l)=>{if(Store.lessonDone(si,u,l))dn++;}); if(Store.testDone(si,u))dn++;
    if(!Store.unitOpen(si,u))
      return '<div class="unit locked-unit"><div class="unit-head"><div class="un">'+un.num+'</div><div><h2>'+un.name+'</h2><div class="st">تُفتح بعد إتمام الوحدة السابقة</div></div><div class="ucount">'+ICONS.lock+'</div></div></div>';
    const rows = un.lessons.map((ls,l)=>{
      const done = Store.lessonDone(si,u,l), open = Store.lessonOpen(si,u,l);
      const cls = done?'done':(open?'now':'lock');
      const go = done?'✓':(open?'▶':ICONS.lock);
      return '<a class="lesson '+cls+'" href="#/lesson/'+si+'/'+u+'/'+l+'"><div class="ic">'+(ICONS[ls.type]||ICONS.video)+'</div><div><h4>'+ls.title+'</h4><div class="ty">'+ls.ty+'</div></div><div class="go">'+go+'</div></a>';
    }).join('');
    const tOpen = Store.testOpen(si,u), tDone = Store.testDone(si,u);
    const test = '<a class="test-row '+(tDone||tOpen?'':'lock')+'" href="#/test/'+si+'/'+u+'"><div class="ic">'+(tOpen||tDone?ICONS.star:ICONS.starGrey)+'</div><div><h4>'+un.test.title+'</h4><div class="ty">'+(tDone?'تم الإنجاز ✓':(tOpen?'متاح الآن':'يُفتح بعد إتمام جميع الدروس'))+'</div></div></a>';
    return '<div class="unit"><div class="unit-head"><div class="un '+un.color+'">'+un.num+'</div><div><h2>'+un.name+'</h2><div class="st">دروس واختبار</div></div></div>'+rows+test+'</div>';
  }).join('');
  return header({back:'#/stages', title:st.name})
  +'<section class="banner"><div class="bnum '+st.color+'">'+st.badge+'</div><h1>'+st.name+'</h1>'
    +'<div class="pbar"><div class="lbl"><span>تقدّمك في المرحلة</span><span>'+AR(pct)+'٪</span></div>'+rail(pct)+'</div></section>'
  +BAND
  +'<div class="content">'+units+'</div>'
  +GROUND+nav('stages');
}

function stepper(si,u,cur,isTest){
  const un=STAGES[si].units[u];
  let d=un.lessons.map((_,l)=>'<i class="'+(Store.lessonDone(si,u,l)?'done':(!isTest&&l===cur?'cur':''))+'"></i>').join('');
  d+='<i class="t '+(Store.testDone(si,u)?'done':(isTest?'cur':''))+'"></i>';
  return d;
}

function vLesson(si,u,l){
  const st=STAGES[si], un=st.units[u], ls=un.lessons[l];
  let media;
  if(ls.type==='video'){
    media = '<div class="video-slot"><div class="play"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 z" fill="none" stroke="#4A3B6E" stroke-width="2.4" stroke-linejoin="round"/></svg></div><div class="cap">مكان فيديو الشرح</div></div>';
  } else if(ls.type==='activity'){
    media = '<div class="video-slot"><div class="play">'+ICONS.activity+'</div><div class="cap">مكان النشاط التفاعلي</div></div>';
  } else {
    media = '<div class="q"><h3>سؤال تجريبي — شكل التمرين</h3><button class="opt">الاختيار الأول</button><button class="opt">الاختيار الثاني</button><button class="opt">الاختيار الثالث</button></div>';
  }
  const sk = '<section class="infocard"><h3>ملخص الدرس</h3><div class="skl"><i></i><i></i><i class="s"></i></div></section>'
    +'<section class="infocard"><h3>الكلمات الجديدة</h3><div class="tiles"><i></i><i></i><i></i><i></i></div></section>';
  return header({back:'#/stage/'+si, title:st.name})
  +'<section class="strip"><div class="stl"><b>'+un.name+'</b><span>'+ls.title+' · '+ls.ty+'</span></div><div class="steps">'+stepper(si,u,l,false)+'</div></section>'
  +BAND
  +'<div class="lesson-body">'+media+sk
  +'<button class="cta green" id="finish">أنهيتُ الدرس ✓</button>'
  +'<a class="link" href="#/stage/'+si+'">العودة إلى '+un.name+'</a></div>'
  +GROUND+nav('stages');
}

function vTest(si,u){
  const st=STAGES[si], un=st.units[u];
  const qs = [1,2,3].map(i=>'<div class="q"><div class="qn">'+N[i-1]+'</div><h3>سؤال تجريبي '+N[i-1]+'</h3>'
    +'<button class="opt" data-c="'+(i===1?1:0)+'">الاختيار الأول</button>'
    +'<button class="opt" data-c="'+(i===1?0:1)+'">الاختيار الثاني</button>'
    +'<button class="opt" data-c="0">الاختيار الثالث</button></div>').join('');
  return header({back:'#/stage/'+si, title:un.test.title})
  +'<section class="strip"><div class="stl"><b>'+un.name+'</b><span id="qcount">٠ من ٣ أسئلة</span></div><div class="steps wide"><div class="rail" id="qrail"><i style="width:0%"></i></div></div></section>'
  +BAND
  +'<div class="lesson-body">'+qs
  +'<div class="note">نموذج لشكل الاختبار — ستُوضع الأسئلة الحقيقية من محتوى الوحدة</div>'
  +'<button class="cta" id="submit">سلّم الإجابات</button>'
  +'<a class="link" href="#/stage/'+si+'">العودة إلى '+un.name+'</a></div>'
  +GROUND+nav('stages');
}

/* ---------------- wiring ---------------- */
function bindLesson(si,u,l){
  const b=$('#finish'); if(!b) return;
  b.onclick=()=>{ Store.markLesson(si,u,l); Asmaa.event('done');
    celebrate('أحسنت!','أنهيت الدرس، تابِع إلى ما بعده', ()=>{ location.hash='#/stage/'+si; }); };
}
function bindTest(si,u){
  const qs=document.querySelectorAll('.q');
  const upd=()=>{ let n=0; qs.forEach(q=>{ if(q.querySelector('.opt.sel')) n++; });
    $('#qcount').textContent=AR(n)+' من '+AR(qs.length)+' أسئلة';
    $('#qrail i').style.width=Math.round(n/qs.length*100)+'%'; };
  qs.forEach(q=>{
    q.querySelectorAll('.opt').forEach(o=>o.onclick=()=>{
      q.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));
      o.classList.add('sel'); Asmaa.event('pick'); upd();
    });
  });
  const b=$('#submit'); if(!b) return;
  b.onclick=()=>{
    let ok=true;
    qs.forEach(q=>{
      const sel=q.querySelector('.opt.sel');
      q.querySelectorAll('.opt').forEach(x=>{x.classList.remove('right','wrong'); if(x.dataset.c==='1')x.classList.add('right');});
      if(sel && sel.dataset.c!=='1'){ sel.classList.add('wrong'); ok=false; }
      if(!sel) ok=false;
    });
    if(!ok) Asmaa.event('wrong');
    if(ok){ Store.markTest(si,u); Asmaa.event('correct');
      celebrate('أحسنت!','اجتزت الاختبار وانفتحت الوحدة التالية', ()=>{ location.hash='#/stage/'+si; });
    }
  };
}

/* ---------------- router ---------------- */
function route(){
  const h = location.hash || '#/';
  const app = $('#app');
  window.scrollTo(0,0);
  let m;
  if(h==='#/'||h==='#'){ app.innerHTML=vHome(); Asmaa.enter('home'); return; }
  if(h==='#/stages'){ app.innerHTML=vStages(); Asmaa.enter('stages'); return; }
  if(h==='#/progress'){ app.innerHTML=vProgress(); Asmaa.enter('progress'); return; }
  if(m=h.match(/^#\/stage\/(\d+)$/)){ app.innerHTML=vStage(+m[1]); Asmaa.enter('stage'); return; }
  if(m=h.match(/^#\/lesson\/(\d+)\/(\d+)\/(\d+)$/)){ app.innerHTML=vLesson(+m[1],+m[2],+m[3]); bindLesson(+m[1],+m[2],+m[3]); Asmaa.enter('lesson'); return; }
  if(m=h.match(/^#\/test\/(\d+)\/(\d+)$/)){ app.innerHTML=vTest(+m[1],+m[2]); bindTest(+m[1],+m[2]); Asmaa.enter('test'); return; }
  app.innerHTML=vHome(); Asmaa.enter('home');
}
window.addEventListener('hashchange', route);
route();
})();
