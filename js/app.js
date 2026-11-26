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
  video:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="#fff" stroke="#141414" stroke-width="2"/><path d="M10 9.5 L15 12 L10 14.5 z" fill="#FF6F5E" stroke="#141414" stroke-width="1.5"/></svg>',
  activity:'<svg viewBox="0 0 24 24"><path d="M4 19 L8 5 L12 19 M6 14 L10 14 M15 8 L20 19 M20 8 L15 19" fill="none" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/></svg>',
  exercise:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="#fff" stroke="#141414" stroke-width="2"/><path d="M7 10h10M7 14h6" stroke="#141414" stroke-width="2" stroke-linecap="round"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="9" rx="2" fill="none" stroke="#9b978c" stroke-width="2.2"/><path d="M9 10 V7 a3 3 0 0 1 6 0 v3" fill="none" stroke="#9b978c" stroke-width="2.2"/></svg>',
  star:'<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="#FFD500" stroke="#141414" stroke-width="2" stroke-linejoin="round"/></svg>',
  starGrey:'<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="#C9C6BC" stroke="#9b978c" stroke-width="2" stroke-linejoin="round"/></svg>'
};
const LOGO = '<a class="logo" href="#/"><svg width="40" height="26" viewBox="0 0 40 26"><path d="M3 23 A17 17 0 0 1 37 23" fill="none" stroke="#FF6F5E" stroke-width="5" stroke-linecap="round"/><path d="M8 23 A12 12 0 0 1 32 23" fill="none" stroke="#FFD500" stroke-width="5" stroke-linecap="round"/><path d="M13 23 A7 7 0 0 1 27 23" fill="none" stroke="#2B5BE4" stroke-width="5" stroke-linecap="round"/></svg><div class="word">قَوْس</div></a>';
const HUD = '<div class="hud">'
  +'<div class="pill"><svg viewBox="0 0 24 24"><path d="M12 2 C14 6 18 8 18 13 a6 6 0 0 1-12 0 c0-5 4-7 6-11z" fill="#FF6F5E" stroke="#141414" stroke-width="2"/></svg> ٥</div>'
  +'<div class="pill"><svg viewBox="0 0 24 24"><path d="M12 20 C4 14 3 8 7.5 6.5 C10 5.7 12 8 12 9 c0-1 2-3.3 4.5-2.5 C21 8 20 14 12 20z" fill="#FF9FC0" stroke="#141414" stroke-width="2"/></svg> ٣</div>'
  +'</div>';
const FOOTER = '<footer><div class="mini">قَوْس</div>اتعلّم العربي باللعب — للأطفال</footer>';

function header(opts){
  opts = opts||{};
  const side = opts.back
    ? '<a class="back" href="'+opts.back+'">→</a><div class="headtitle">'+opts.title+'</div>'
    : LOGO;
  return '<header><div class="side">'+side+'</div>'+HUD+'</header>';
}
function guide(pose, html){
  return '<div class="guide">'+window.Asmaa.get(pose,'bust-img')+'<div class="gbubble">'+html+'</div></div>';
}
function celebrate(title, msg, then){
  const ov = document.createElement('div');
  ov.className='overlay';
  ov.innerHTML = '<div class="celebrate">'+window.Asmaa.get('cheer')
    +'<h2>'+title+'</h2><p>'+msg+'</p><button class="cta green">كمّل</button></div>';
  document.body.appendChild(ov);
  ov.querySelector('button').onclick = ()=>{ ov.remove(); then(); };
}

/* ---------------- views ---------------- */
function vHome(){
  return header({})
  +'<section class="hero"><div class="sun"></div><div class="cloud c1"></div><div class="cloud c2"></div>'
  +'<h1>اتعلّم <span class="hl">العربي</span><br>وإنت بتلعب!</h1>'
  +'<p>مغامرة الحروف والكلمات خطوة بخطوة</p>'
  +'<a class="cta" href="#/stages">يلّا نبدأ!</a>'
  +'<div class="mascot-wrap">'
  +  '<svg class="rainbow sketch" viewBox="0 0 320 210" fill="none">'
  +   '<path d="M30 190 A130 130 0 0 1 290 190" stroke="#F07B5F" stroke-width="16" stroke-linecap="round"/>'
  +   '<path d="M46 190 A114 114 0 0 1 274 190" stroke="#F5D349" stroke-width="16" stroke-linecap="round"/>'
  +   '<path d="M62 190 A98 98 0 0 1 258 190" stroke="#7D9BE8" stroke-width="16" stroke-linecap="round"/>'
  +   '<path d="M40 60 l4 10 10 4 -10 4 -4 10 -4-10 -10-4 10-4z" fill="#fff" stroke="#413C9C" stroke-width="3" stroke-linejoin="round"/>'
  +   '<circle cx="296" cy="110" r="6" fill="#F0A6C2" stroke="#413C9C" stroke-width="3"/>'
  +  '</svg>'
  +  window.Asmaa.get('wave')
  + '</div>'
  +'</section>'
  +'<section class="path"><h2 class="section-title">طريق المغامرة</h2><div class="node-col">'
  +'<div class="node done off1">ا</div><div class="node done off2">ب</div>'
  +'<div class="node current"><div class="start-tag">ابدأ من هنا</div>ت</div>'
  +'<div class="node lock off3">ث</div><div class="node lock off4">ج</div>'
  +'</div></section>'
  +'<section class="cards">'
  +'<div class="card"><div class="ic i-blue">'+ICONS.exercise+'</div><div><h3>الحروف</h3><p>كل حرف لعبة: شكله، صوته، وبيكتب إزاي</p></div></div>'
  +'<div class="card"><div class="ic i-coral">'+ICONS.exercise+'</div><div><h3>الكلمات</h3><p>كلمات من حياتهم: البيت، المدرسة، الأكل</p></div></div>'
  +'<div class="card"><div class="ic i-pink">'+ICONS.video+'</div><div><h3>قصص قصيرة</h3><p>حكايات بالحروف اللي اتعلمها، بصوت وصور</p></div></div>'
  +'</section>'+FOOTER;
}

function vStages(){
  let cards = STAGES.map((st,i)=>{
    const open = Store.stageOpen(i);
    const pct = Store.stagePct(i);
    if(!open) return '<div class="stage locked"><div class="locktag">🔒</div><div class="num">'+st.badge+'</div><h3>'+st.name+'</h3><div class="sub">'+(i? 'تتفتح بعد '+STAGES[i-1].name : '')+'</div></div>';
    return '<a class="stage" href="#/stage/'+i+'"><div class="num '+st.color+'">'+st.badge+'</div><h3>'+st.name+'</h3>'
      +(st.sub?'<div class="sub">'+st.sub+'</div>':'')
      +'<div class="bar"><i style="width:'+pct+'%"></i></div><div class="pct">'+(pct? pct+'٪':'لسه')+'</div></a>';
  }).join('');
  return header({})
  +'<section class="banner"><h1>اختار مرحلتك</h1><p>١١ مرحلة من التمهيدي لتالتة إعدادي</p></section>'
  +'<div class="grid">'+cards+'</div>'+FOOTER;
}

function vStage(si){
  const st = STAGES[si];
  let lessons=0; st.units.forEach(u=>lessons+=u.lessons.length);
  const pct = Store.stagePct(si);
  const units = st.units.map((un,u)=>{
    if(!Store.unitOpen(si,u))
      return '<div class="unit locked-unit"><div class="unit-head"><div class="un">'+un.num+'</div><div><h2>'+un.name+'</h2><div class="st">تتفتح بعد الوحدة اللي قبلها</div></div></div></div>';
    const rows = un.lessons.map((ls,l)=>{
      const done = Store.lessonDone(si,u,l);
      const open = Store.lessonOpen(si,u,l);
      const cls = done?'done':(open?'now':'lock');
      const go = done?'✓':(open?'▶':'🔒');
      return '<a class="lesson '+cls+'" href="#/lesson/'+si+'/'+u+'/'+l+'"><div class="ic">'+(ICONS[ls.type]||ICONS.video)+'</div><div><h4>'+ls.title+'</h4><div class="ty">'+ls.ty+'</div></div><div class="go">'+go+'</div></a>';
    }).join('');
    const tOpen = Store.testOpen(si,u), tDone = Store.testDone(si,u);
    const test = '<a class="test-row '+(tDone?'':(tOpen?'':'lock'))+'" href="#/test/'+si+'/'+u+'"><div class="ic">'+(tOpen||tDone?ICONS.star:ICONS.starGrey)+'</div><div><h4>'+un.test.title+'</h4><div class="ty">'+(tDone?'خلصتة ✓':(tOpen?'متاح دلوقتي':'يتفتح بعد كل الدروس'))+'</div></div></a>';
    return '<div class="unit"><div class="unit-head"><div class="un '+un.color+'">'+un.num+'</div><div><h2>'+un.name+'</h2><div class="st">'+un.lessons.length+' دروس + اختبار</div></div></div>'+rows+test+'</div>';
  }).join('');
  return header({back:'#/stages', title:st.name})
  +'<section class="banner grassb"><h1>'+st.name+'</h1>'
  +'<div class="meta-chips"><div class="chip">'+st.units.length+' وحدات</div><div class="chip">'+lessons+' درس</div><div class="chip">'+st.units.length+' اختبارات</div></div>'
  +'<div class="pbar"><div class="lbl"><span>تقدّمك في المرحلة</span><span>'+pct+'٪</span></div><div class="rail"><i style="width:'+pct+'%"></i></div></div></section>'
  + guide('bust','النهارده نكمل مغامرتنا! ابدأ من الدرس اللي <b>لونه أزرق</b>')
  +'<div class="content">'+units+'</div>'+FOOTER;
}

function vLesson(si,u,l){
  const st=STAGES[si], un=st.units[u], ls=un.lessons[l];
  let body='';
  if(ls.type==='video'){
    body = '<div class="video-slot"><div class="play"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 z" fill="#fff" stroke="#141414" stroke-width="2"/></svg></div><div class="cap">مكان فيديو الشرح</div></div>'
      +'<div class="note">هنا هيتحط فيديو مس أسماء بيشرح الدرس</div>';
  } else if(ls.type==='activity'){
    body = '<div class="video-slot"><div style="font-size:44px">🧩</div><div class="cap">مكان النشاط التفاعلي</div></div>'
      +'<div class="note">هنا هيبقى نشاط تفاعلي (توصيل، سحب وإفلات، صوت)</div>';
  } else {
    body = '<div class="q"><h3>سؤال تجريبي — شكل التمرين</h3>'
      +'<button class="opt">الاختيار الأول</button><button class="opt">الاختيار التاني</button><button class="opt">الاختيار التالت</button></div>'
      +'<div class="note">هنا هتتحط أسئلة التمرين الحقيقية</div>';
  }
  return header({back:'#/stage/'+si, title:st.name})
  + guide('bust','<b>'+ls.title+'</b> — '+ls.ty+' في '+un.name)
  +'<div class="lesson-body">'+body
  +'<button class="cta green" id="finish">خلصت الدرس ✓</button></div>'+FOOTER;
}

function vTest(si,u){
  const st=STAGES[si], un=st.units[u];
  const qs = [1,2,3].map(i=>'<div class="q"><h3>سؤال تجريبي '+N[i-1]+'</h3>'
    +'<button class="opt" data-c="'+(i===1?1:0)+'">الاختيار الأول</button>'
    +'<button class="opt" data-c="'+(i===1?0:1)+'">الاختيار التاني</button>'
    +'<button class="opt" data-c="0">الاختيار التالت</button></div>').join('');
  return header({back:'#/stage/'+si, title:un.test.title})
  + guide('bust','ركّز كويس وخد وقتك، <b>إنت تقدر!</b>')
  +'<div class="lesson-body">'+qs
  +'<div class="note">نموذج شكل الاختبار — الأسئلة الحقيقية هتتملي من محتوى الوحدة</div>'
  +'<button class="cta" id="submit">سلّم الإجابات</button></div>'+FOOTER;
}

/* ---------------- wiring ---------------- */
function bindLesson(si,u,l){
  const b=$('#finish'); if(!b) return;
  b.onclick=()=>{ Store.markLesson(si,u,l);
    celebrate('أحسنت!','خلصت الدرس، كمّل اللي بعده', ()=>{ location.hash='#/stage/'+si; }); };
}
function bindTest(si,u){
  document.querySelectorAll('.q').forEach(q=>{
    q.querySelectorAll('.opt').forEach(o=>o.onclick=()=>{
      q.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));
      o.classList.add('sel');
    });
  });
  const b=$('#submit'); if(!b) return;
  b.onclick=()=>{
    let ok=true;
    document.querySelectorAll('.q').forEach(q=>{
      const sel=q.querySelector('.opt.sel');
      q.querySelectorAll('.opt').forEach(x=>{x.classList.remove('right','wrong'); if(x.dataset.c==='1')x.classList.add('right');});
      if(sel && sel.dataset.c!=='1'){ sel.classList.add('wrong'); ok=false; }
      if(!sel) ok=false;
    });
    if(ok){ Store.markTest(si,u);
      celebrate('أحسنت!','عديت الاختبار واتفتحت الوحدة اللي بعدها', ()=>{ location.hash='#/stage/'+si; });
    }
  };
}

/* ---------------- router ---------------- */
function route(){
  const h = location.hash || '#/';
  const app = $('#app');
  window.scrollTo(0,0);
  let m;
  if(h==='#/'||h==='#'){ app.innerHTML=vHome(); return; }
  if(h==='#/stages'){ app.innerHTML=vStages(); return; }
  if(m=h.match(/^#\/stage\/(\d+)$/)){ app.innerHTML=vStage(+m[1]); return; }
  if(m=h.match(/^#\/lesson\/(\d+)\/(\d+)\/(\d+)$/)){ app.innerHTML=vLesson(+m[1],+m[2],+m[3]); bindLesson(+m[1],+m[2],+m[3]); return; }
  if(m=h.match(/^#\/test\/(\d+)\/(\d+)$/)){ app.innerHTML=vTest(+m[1],+m[2]); bindTest(+m[1],+m[2]); return; }
  app.innerHTML=vHome();
}
window.addEventListener('hashchange', route);
route();
})();
