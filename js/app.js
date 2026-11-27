/* Qaws — app shell: router, profiles store, views */
(function(){
const $ = sel => document.querySelector(sel);
const STAGES = window.QAWS_STAGES;
const N = ['١','٢','٣','٤','٥','٦','٧','٨','٩','١٠'];
const AR = n => String(n).replace(/\d/g, d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const fmtDate = t => { const d=new Date(t); return AR(d.getDate())+' '+MONTHS[d.getMonth()]; };

/* ---------------- profiles store ---------------- */
const Store = {
  key:'qaws-progress-v2', oldKey:'qaws-progress-v1', s:null,
  newProfile(name){ return {name:name||'', avatar:Math.floor(Math.random()*8), img:null, myStage:null, lessons:{}, tests:{}, events:[]}; },
  load(){ if(this.s) return this.s;
    try{ this.s = JSON.parse(localStorage.getItem(this.key)) || null }catch(e){ this.s=null }
    if(!this.s){
      let old=null; try{ old=JSON.parse(localStorage.getItem(this.oldKey)); }catch(e){}
      const p=this.newProfile('ملفي');
      if(old){ p.lessons=old.lessons||{}; p.tests=old.tests||{}; }
      this.s={active:'p1', profiles:{p1:p}};
      this.save();
    }
    const ids=Object.keys(this.s.profiles);
    if(ids.length>1 || ids[0]!=='p1'){
      const cur=this.s.profiles[this.s.active]||this.s.profiles[ids[0]];
      const m=this.newProfile(cur.name); m.avatar=cur.avatar; m.img=cur.img; m.myStage=cur.myStage;
      ids.forEach(id=>{ const p=this.s.profiles[id]||{};
        Object.assign(m.lessons, p.lessons||{}); Object.assign(m.tests, p.tests||{});
        m.events=m.events.concat(p.events||[]); });
      m.events.sort((x,y)=>x.t-y.t); m.events=m.events.slice(-100);
      this.s={active:'p1', profiles:{p1:m}}; this.save();
    }
    return this.s; },
  save(){ try{ localStorage.setItem(this.key, JSON.stringify(this.s)); }catch(e){} },
  cur(){ const s=this.load(); return s.profiles[s.active] || (s.profiles[s.active=Object.keys(s.profiles)[0]]); },
  setActive(id){ if(this.load().profiles[id]){ this.s.active=id; this.save(); } },
  addProfile(){ const s=this.load(); const id='p'+Date.now(); s.profiles[id]=this.newProfile(''); s.active=id; this.save(); return id; },
  updateProfile(name,avatar,img){ const p=this.cur(); p.name=(name||'').trim()||'ملفي'; p.avatar=avatar; p.img=img; this.save(); },
  lkey(si,u,l){ return si+'/'+u+'/'+l; },
  lessonDone(si,u,l){ return !!this.cur().lessons[this.lkey(si,u,l)]; },
  testDone(si,u){ return !!this.cur().tests[si+'/'+u]; },
  markLesson(si,u,l){ const p=this.cur(); if(!p.lessons[this.lkey(si,u,l)]){ p.lessons[this.lkey(si,u,l)]=1; p.events.push({t:Date.now(),k:'lesson',si,u,l}); p.events=p.events.slice(-100); } this.save(); },
  markTest(si,u){ const p=this.cur(); if(!p.tests[si+'/'+u]){ p.tests[si+'/'+u]=1; p.events.push({t:Date.now(),k:'test',si,u}); p.events=p.events.slice(-100); } this.save(); },
  getMyStage(){ return this.cur().myStage; },
  setMyStage(i){ this.cur().myStage=i; this.save(); },
  lessonOpen(si,u,l){ return true; },
  testOpen(si,u){ return true; },
  unitOpen(si,u){ return true; },
  stageOpen(si){ return true; },
  unitPct(p,si,u){ const un=STAGES[si].units[u]; let done=0,total=0;
    un.lessons.forEach((ls,l)=>{ if(ls&&ls._cmsh)return; total++; if(p.lessons[this.lkey(si,u,l)]) done++; });
    if(!un._testHidden){ total++; if(p.tests[si+'/'+u]) done++; }
    return total? Math.round(done/total*100):0; },
  stagePct(si){ return this.stagePctFor(this.cur(),si); },
  stagePctFor(p,si){ const st=STAGES[si]; let done=0,total=0;
    st.units.forEach((un,u)=>{ if(un._cmsh)return; un.lessons.forEach((ls,l)=>{ if(ls&&ls._cmsh)return; total++; if(p.lessons[this.lkey(si,u,l)]) done++; });
      if(!un._testHidden){ total++; if(p.tests[si+'/'+u]) done++; } });
    return total? Math.round(done/total*100):0; }
};

/* ---------------- avatars ---------------- */
const AV_COLS=['#EFC93C','#8FB4E6','#9CD285','#F6C9A8','#EB9FC2','#7FD3C4','#EE8A6E','#B9A8E6'];
const AVATARS = AV_COLS.map(c=>'<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="'+c+'" stroke="#4A3B6E" stroke-width="2.5"/><circle cx="23" cy="28" r="3.4" fill="#4A3B6E"/><circle cx="41" cy="28" r="3.4" fill="#4A3B6E"/><path d="M22 39 q10 9 20 0" stroke="#4A3B6E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>');
function AVIMG(p,cls){ cls=cls||'avimg';
  return p.img ? '<img class="'+cls+'" src="'+p.img+'" alt="">' : '<span class="'+cls+' avsvg">'+AVATARS[p.avatar||0]+'</span>'; }

/* ---------------- shared bits ---------------- */
const ICONS = {
  video:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#4A3B6E" stroke-width="2"/><path d="M10 9.5 L15 12 L10 14.5 z" fill="#F29682" stroke="#4A3B6E" stroke-width="1.5"/></svg>',
  activity:'<svg viewBox="0 0 24 24"><path d="M4 19 L8 5 L12 19 M6 14 L10 14 M15 8 L20 19 M20 8 L15 19" fill="none" stroke="#4A3B6E" stroke-width="2.2" stroke-linecap="round"/></svg>',
  exercise:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#4A3B6E" stroke-width="2"/><path d="M7 10h10M7 14h6" stroke="#4A3B6E" stroke-width="2" stroke-linecap="round"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="9" rx="2" fill="none" stroke="#A79FB8" stroke-width="2.2"/><path d="M9 10 V7 a3 3 0 0 1 6 0 v3" fill="none" stroke="#A79FB8" stroke-width="2.2"/></svg>',
  star:'<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="#F2E394" stroke="#4A3B6E" stroke-width="2" stroke-linejoin="round"/></svg>',
  starGrey:'<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="none" stroke="#A79FB8" stroke-width="2" stroke-linejoin="round"/></svg>'
};
const TILE_LETTER='<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="14" fill="#FFF6E0"/><line x1="11" y1="25" x2="53" y2="25" stroke="#EFD7A4" stroke-width="2" stroke-dasharray="4 4"/><line x1="11" y1="41" x2="53" y2="41" stroke="#EFD7A4" stroke-width="2" stroke-dasharray="4 4"/><text x="32" y="42" text-anchor="middle" font-family="Cairo" font-size="32" font-weight="800" fill="#4A3B6E" transform="rotate(-3 32 32)">ب</text><circle cx="32" cy="50" r="2.6" fill="#F29682"/></svg>';
const TILE_WORD='<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="14" fill="#E9F7EE"/><path d="M14 31 L32 17 L50 31 z" fill="#F5806A" stroke="#4A3B6E" stroke-width="1.6" stroke-linejoin="round"/><rect x="20" y="31" width="24" height="14" fill="#FFD25E" stroke="#4A3B6E" stroke-width="1.6"/><rect x="28.5" y="35" width="7" height="10" fill="#4A3B6E"/><rect x="15" y="49" width="34" height="10" rx="5" fill="#fff" stroke="#4A3B6E" stroke-width="1.6"/><text x="32" y="57" text-anchor="middle" font-family="Almarai" font-size="8" font-weight="800" fill="#4A3B6E">بَيْت</text></svg>';
const TILE_BOOK='<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="14" fill="#FBEAF3"/><path d="M32 19 C26 14 16 14 11 17 L11 44 C16 41 26 41 32 46 C38 41 48 41 53 44 L53 17 C48 14 38 14 32 19 z" fill="#fff" stroke="#4A3B6E" stroke-width="2" stroke-linejoin="round"/><path d="M32 19 L32 46" stroke="#4A3B6E" stroke-width="2"/><path d="M17 25 q7 -2 11 1 M17 32 q7 -2 11 1 M36 25 q7 -3 11 -1 M36 32 q7 -3 11 -1" stroke="#F29682" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M50 8 l1.6 3.7 3.7 1.6 -3.7 1.6 -1.6 3.7 -1.6 -3.7 -3.7 -1.6 3.7 -1.6 z" fill="#FFD25E" stroke="#4A3B6E" stroke-width="1"/></svg>';
const LOGO = '<a class="logo" href="#/"><svg width="40" height="26" viewBox="0 0 40 26"><path d="M3 23 A17 17 0 0 1 37 23" fill="none" stroke="#F29682" stroke-width="5" stroke-linecap="round"/><path d="M8 23 A12 12 0 0 1 32 23" fill="none" stroke="#F2E394" stroke-width="5" stroke-linecap="round"/><path d="M13 23 A7 7 0 0 1 27 23" fill="none" stroke="#AEC6F0" stroke-width="5" stroke-linecap="round"/></svg><div class="word">قَوْس</div></a>';
const GROUND = '<footer class="ground"><svg width="44" height="28" viewBox="0 0 40 26"><path d="M3 23 A17 17 0 0 1 37 23" fill="none" stroke="#F5806A" stroke-width="5" stroke-linecap="round"/><path d="M8 23 A12 12 0 0 1 32 23" fill="none" stroke="#FFD25E" stroke-width="5" stroke-linecap="round"/><path d="M13 23 A7 7 0 0 1 27 23" fill="none" stroke="#5BB5F0" stroke-width="5" stroke-linecap="round"/></svg><div class="mini">قَوْس</div><div class="tag">تعلّم العربية باللعب</div></footer>';
const NAV_ICONS = {
  home:'<svg viewBox="0 0 24 24"><path d="M4 11 L12 4 L20 11 V19 a1 1 0 0 1-1 1 H5 a1 1 0 0 1-1-1z M10 20 V14 H14 V20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  stages:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  progress:'<svg viewBox="0 0 24 24"><path d="M12 3 L14.5 8.5 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.5 8.5 z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  parent:'<svg viewBox="0 0 24 24"><path d="M2 12 C6 6 18 6 22 12 C18 18 6 18 2 12 z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  exams:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 8 h6 M9 12 h6 M9 16 h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};
const ASK_ICON='<svg viewBox="0 0 24 24"><path d="M12 3 C6.5 3 3 6.6 3 10.7 C3 14.8 6.5 18.4 12 18.4 C13 18.4 14 18.3 14.9 18 L19 20 L18.2 16.2 C20 14.9 21 12.9 21 10.7 C21 6.6 17.5 3 12 3 z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
function nav(active){
  const t=[['home','#/','الرئيسية'],['stages','#/stages','المراحل'],['exams','#/exams','الاختبارات'],['progress','#/progress','تقدّمي'],['parent','#/parent','متابعة']];
  const fab = active==='ask' ? '' : '<a class="askfab" href="#/ask" title="اسأل مس أسماء">'+ASK_ICON+'</a>';
  return fab+'<nav class="tabbar">'+t.map(x=>'<a class="tab'+(x[0]===active?' on':'')+'" href="'+x[1]+'">'+NAV_ICONS[x[0]]+'<span>'+x[2]+'</span></a>').join('')+'</nav>';
}
const BAND = '<section class="aband"></section>';
function acard(txt){ return '<section class="acard"><div class="abub">'+txt+'</div><img class="aimg" src="assets/asmaa/asmaa-full.png?v=20261128-6" alt="الأستاذة أسماء"></section>'; }

function header(opts){
  opts = opts||{};
  const side = opts.back
    ? '<a class="back" href="'+opts.back+'">→</a><div class="headtitle">'+opts.title+'</div>'
    : LOGO;
  const bell = '<a class="hbell" href="#/notifications" title="الإشعارات"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="nbadge" id="nbadge" hidden></span></a>';
  return '<header><div class="side">'+side+'</div><div class="side">'+bell+'<a class="havatar" href="#/profiles" title="الملفات الشخصية">'+AVIMG(Store.cur())+'</a></div></header>';
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

/* ---------------- نمط المرحلة الإعدادية ---------------- */
const isPrep = i => typeof i==='number' && i>=8 && !!STAGES[i];
const PREP_WELCOME_KEY='qaws-prep-welcome-v1';
function applyTheme(routeSi){
  const s = isPrep(routeSi) ? routeSi : Store.getMyStage();
  document.body.classList.toggle('prep', isPrep(s));
}
function prepWelcome(then){
  const ov = document.createElement('div');
  ov.className='overlay';
  ov.innerHTML = '<div class="celebrate prepwelcome"><img class="asmaa" src="assets/asmaa/asmaa-full.png?v=20261128-6" alt="مس أسماء">'
    +'<h2>أهلًا بيك من جديد في قوس!</h2><p>كبرت، وكبرت معاك أحلامك وطموحاتك .. وحان وقت رحلة جديدة من المعرفة والإنجاز.</p>'
    +'<button class="cta green">نكبر معك، ونتعلم معاً</button></div>';
  document.body.appendChild(ov);
  ov.querySelector('button').onclick = ()=>{ ov.remove(); then(); };
}
function vPrepHome(my){
  const st=STAGES[my], pct=Store.stagePct(my);
  let curU=-1;
  st.units.forEach((un,u)=>{ if(curU<0 && !un._cmsh && Store.unitPct(Store.cur(),my,u)<100) curU=u; });
  const unitLine = pct>=100 ? 'أنهيت كل وحدات مرحلتك — إنجاز يستحق الفخر!' : (curU>=0 ? 'أنت الآن في '+st.units[curU].name : 'رحلتك تبدأ الآن');
  const GRADES=[[8,'g-navy','بداية قوية لمستقبل مشرق'],[9,'g-teal','تحديات أكبر.. وثقة أعلى'],[10,'g-terra','خطوتك الأخيرة نحو المستقبل']];
  const gcards=GRADES.map(g=>{
    const s=STAGES[g[0]]; if(!s || s._cmsh) return '';
    return '<a class="gcard '+g[1]+'" href="#/stage/'+g[0]+'"><span class="gnum">'+s.badge+'</span><h3>'+s.name+'</h3><p>'+g[2]+'</p><span class="ggo">ابدأ التعلم ←</span></a>';
  }).join('');
  const QLESSON='<svg viewBox="0 0 24 24"><path d="M4 5 C7 3.5 10 3.5 12 5 C14 3.5 17 3.5 20 5 L20 18 C17 16.5 14 16.5 12 18 C10 16.5 7 16.5 4 18 z M12 5 L12 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const QTRAIN='<svg viewBox="0 0 24 24"><path d="M5 12 l4 4 L19 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const quick='<div class="quickrow">'
    +'<a href="#/stage/'+my+'"><span class="qic">'+QLESSON+'</span>شرح الدروس</a>'
    +'<a href="#/stage/'+my+'"><span class="qic">'+QTRAIN+'</span>التدريبات</a>'
    +'<a href="#/exams"><span class="qic">'+NAV_ICONS.exams+'</span>الاختبارات</a>'
    +'<a href="#/progress"><span class="qic">'+NAV_ICONS.progress+'</span>مستواي الدراسي</a></div>';
  return header({})
  +'<section class="prephero"><h1>أهلًا بيك من جديد في قوس!</h1>'
  +'<p class="pht">كبرت، وكبرت معاك أحلامك وطموحاتك ..<br>وحان وقت رحلة جديدة من المعرفة والإنجاز.</p>'
  +'<a class="phcta" href="#/stage/'+my+'">نكبر معك، ونتعلم معاً</a></section>'
  +'<section class="prepcard"><h2>تابع تقدمك الدراسي</h2><div class="pc-sub">'+unitLine+'</div>'
  +'<div class="rail"><i style="width:'+pct+'%"></i></div>'
  +'<div class="pc-row"><span class="pc-note">أحلامك تستحق المحاولة</span><span class="pc-pct">'+AR(pct)+'٪</span></div></section>'
  +'<section class="prepsec"><h2>اختر صفك الدراسي</h2><div class="psub">ابدأ رحلتك في المرحلة الإعدادية</div><div class="gcards">'+gcards+'</div></section>'
  +quick
  +GROUND+nav('home');
}

/* ---------------- views ---------------- */
function vHome(){
  const myS=Store.getMyStage();
  if(isPrep(myS)) return vPrepHome(myS);
  const nodes=[['done off1','١'],['done off2','٢'],['current','٣'],['lock off3','٤'],['lock off4','٥']];
  const nh = nodes.map((n,i)=>'<div class="node '+n[0]+'">'+(n[0]==='current'?'<div class="start-tag">ابدأ من هنا</div>':'')+n[1]+'</div>').join('');
  return header({})
  +'<section class="hero"><div class="sun"></div><div class="cloud c1"></div>'
  +'<h1>هيا نتعلّم <span class="hl">اللغة العربية</span><br>ونحن نلعب!</h1>'
  +'<p>رحلتنا الممتعة مع الحروف والكلمات</p>'
  +'<a class="cta" href="#/stages">هيا نبدأ!</a></section>'
  +'<section class="aband scene"><svg class="rainbow" viewBox="0 0 320 210" fill="none"><path d="M30 200 A130 130 0 0 1 290 200" stroke="#F5806A" stroke-width="16" stroke-linecap="round"/><path d="M46 200 A114 114 0 0 1 274 200" stroke="#FFD25E" stroke-width="16" stroke-linecap="round"/><path d="M62 200 A98 98 0 0 1 258 200" stroke="#5BB5F0" stroke-width="16" stroke-linecap="round"/></svg></section>'
  +'<section class="path"><h2 class="section-title">طريق المغامرة</h2><div class="node-col">'+nh+'</div></section>'
  +'<section class="cards"><h2 class="section-title sm">ماذا سنتعلّم؟</h2><div class="tiles3">'
  +'<div class="tile3"><div class="tic">'+TILE_LETTER+'</div><h3>الحروف</h3><p>لكل حرف لعبة: شكله وصوته وطريقة كتابته</p><a class="tplay" href="letters-game.html">العب لعبة الحروف</a></div>'
  +'<div class="tile3"><div class="tic">'+TILE_WORD+'</div><h3>الكلمات</h3><p>كلمات من الحياة اليومية: البيت والمدرسة والطعام</p></div>'
  +'<div class="tile3"><div class="tic">'+TILE_BOOK+'</div><h3>قصص قصيرة</h3><p>حكايات بالحروف التي تعلّمتها، بالصوت والصورة</p></div>'
  +'</div></section>'
  +GROUND+nav('home');
}

function vStages(){
  const ARC='<svg width="72" height="46" viewBox="0 0 40 26"><path d="M3 23 A17 17 0 0 1 37 23" fill="none" stroke="#F29682" stroke-width="5" stroke-linecap="round"/><path d="M8 23 A12 12 0 0 1 32 23" fill="none" stroke="#F2E394" stroke-width="5" stroke-linecap="round"/><path d="M13 23 A7 7 0 0 1 27 23" fill="none" stroke="#AEC6F0" stroke-width="5" stroke-linecap="round"/></svg>';
  return header({})
  +'<section class="banner"><h1>اختر مرحلتك</h1><p>ابتدائي أم إعدادي؟</p></section>'
  +acard('أهلًا بك، أي مرحلة تريد؟')
  +'<div class="lvlpick">'
  +'<a class="lvlcard lvl-pri" href="#/stages/pri"><span class="lvl-arc">'+ARC+'</span><h3>ابتدائي</h3><p>من Pre-Kg إلى السادس الابتدائي</p><span class="lvlgo">هيا نلعب ونتعلّم ←</span></a>'
  +'<a class="lvlcard lvl-prep" href="#/stages/prep"><span class="lvl-arc">'+ARC+'</span><h3>إعدادي</h3><p>من الأول إلى الثالث الإعدادي</p><span class="lvlgo">نكبر معك، ونتعلم معاً ←</span></a>'
  +'</div>'
  +GROUND+nav('stages');
}
function vStageGrades(prep){
  const my = Store.getMyStage();
  const cards = STAGES.map((st,i)=>{
    if(st._cmsh) return '';
    if(prep ? i<8 : i>=8) return '';
    const pct = Store.stagePct(i);
    const pick = (my===i) ? '<span class="pickme">مرحلتك ✓</span>' : '<button class="pick" data-pick="'+i+'">مرحلتي</button>';
    return '<a class="stage" href="#/stage/'+i+'">'+pick+'<div class="num '+st.color+'">'+st.badge+'</div><h3>'+st.name+'</h3>'
      +'<div class="bar"><i style="width:'+pct+'%"></i></div><div class="pct">'+(pct? AR(pct)+'٪ مكتمل':'لم تبدأ بعد')+'</div></a>';
  }).join('');
  return header({back:'#/stages', title:prep?'إعدادي':'ابتدائي'})
  +'<section class="banner"><h1>'+(prep?'المرحلة الإعدادية':'المرحلة الابتدائية')+'</h1><p>'+(prep?'اختر صفك من الأول إلى الثالث الإعدادي':'اختر صفك من Pre-Kg إلى السادس الابتدائي')+'</p></section>'
  +acard(prep?'اختر صفك، وأنا معك':'أهلًا بك، أي مرحلة تريد؟')
  +'<div class="grid">'+cards+'</div>'
  +GROUND+nav('stages');
}
function bindStages(){
  document.querySelectorAll('.pick').forEach(b=>b.onclick=e=>{
    e.preventDefault(); e.stopPropagation();
    const i=+b.dataset.pick;
    Store.setMyStage(i); Asmaa.event('done');
    if(isPrep(i)){
      let seen=null; try{ seen=localStorage.getItem(PREP_WELCOME_KEY); }catch(err){}
      if(!seen){
        try{ localStorage.setItem(PREP_WELCOME_KEY,'1'); }catch(err){}
        prepWelcome(()=>route()); return;
      }
    }
    route();
  });
}

function vProgress(){
  const p = Store.cur(), my = p.myStage;
  if(my==null || !STAGES[my]){
    return header({})
    +'<section class="banner"><h1>تقدّمي</h1><p>كل طالب يتابع مرحلته من هنا</p></section>'
    +acard('كل خطوة تقرّبك من الإتقان')
    +'<section class="emptybox"><h2>لم تختر مرحلتك بعد</h2><p>افتح صفحة المراحل واضغط «مرحلتي» على المرحلة التي تدرسها</p><a class="cta" href="#/stages">اختيار مرحلتي</a></section>'
    +GROUND+nav('progress');
  }
  const st = STAGES[my], pct = Store.stagePct(my);
  const urows = st.units.map((un,u)=>{
    const up = Store.unitPct(p,my,u);
    return '<div class="urow"><div class="un2 '+un.color+'">'+un.num+'</div><div class="um"><h4>'+un.name+'</h4>'+rail(up)+'</div><div class="upct">'+AR(up)+'٪</div></div>';
  }).join('');
  return header({})
  +'<section class="banner"><div class="bnum '+st.color+'">'+st.badge+'</div><h1>مرحلتك: '+st.name+'</h1><a class="chlink" href="#/stages">تغيير المرحلة</a>'
  +'<div class="pbar"><div class="lbl"><span>تقدّمك في المرحلة</span><span>'+AR(pct)+'٪</span></div>'+rail(pct)+'</div></section>'
  +acard('انظر كم تقدّمت حتى الآن')
  +'<section class="content"><h2 class="section-title sm">وحداتك</h2>'+urows+'</section>'
  +GROUND+nav('progress');
}

function vStage(si){
  const st = STAGES[si];
  const pct = Store.stagePct(si);
  const units = st.units.map((un,u)=>{
    if(un._cmsh) return '';
    const rows = un.lessons.map((ls,l)=>{
      if(ls._cmsh) return '';
      const done = Store.lessonDone(si,u,l);
      const cls = done?'done':'now';
      const go = done?'✓':'▶';
      return '<a class="lesson '+cls+'" href="#/lesson/'+si+'/'+u+'/'+l+'"><div class="ic">'+(ICONS[ls.type]||ICONS.video)+'</div><div><h4>'+ls.title+'</h4><div class="ty">'+ls.ty+'</div></div><div class="go">'+go+'</div></a>';
    }).join('');
    const tDone = Store.testDone(si,u);
    const test = un._testHidden ? '' : '<a class="test-row" href="#/test/'+si+'/'+u+'"><div class="ic">'+ICONS.star+'</div><div><h4>'+un.test.title+'</h4><div class="ty">'+(tDone?'تم الإنجاز ✓':'متاح الآن')+'</div></div></a>';
    return '<div class="unit"><div class="unit-head"><div class="un '+un.color+'">'+un.num+'</div><div><h2>'+un.name+'</h2><div class="st">دروس واختبار</div></div></div>'+rows+test+'</div>';
  }).join('');
  return header({back:isPrep(si)?'#/stages/prep':'#/stages', title:st.name})
  +'<section class="banner"><div class="bnum '+st.color+'">'+st.badge+'</div><h1>'+st.name+'</h1>'
    +'<div class="pbar"><div class="lbl"><span>تقدّمك في المرحلة</span><span>'+AR(pct)+'٪</span></div>'+rail(pct)+'</div></section>'
  +BAND
  +'<div class="content units">'+units+'</div>'
  +GROUND+nav('stages');
}

function stepper(si,u,cur,isTest){
  const un=STAGES[si].units[u];
  let d=un.lessons.map((ls,l)=>ls&&ls._cmsh?'':'<i class="'+(Store.lessonDone(si,u,l)?'done':(!isTest&&l===cur?'cur':''))+'"></i>').join('');
  d+='<i class="t '+(Store.testDone(si,u)?'done':(isTest?'cur':''))+'"></i>';
  return d;
}

function videoEmbed(url){
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,20})/);
  if(m) return '<div class="video-slot real"><iframe src="https://www.youtube-nocookie.com/embed/'+m[1]+'" title="فيديو الدرس" allowfullscreen allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';
  return '<div class="video-slot real"><video controls src="'+url+'"></video></div>';
}
function vLesson(si,u,l){
  const st=STAGES[si], un=st.units[u], ls=un.lessons[l];
  let media='';
  if(ls.videoUrl) media += videoEmbed(ls.videoUrl);
  else if(ls.type==='video'){
    media = '<div class="video-slot"><div class="play"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 z" fill="none" stroke="#4A3B6E" stroke-width="2.4" stroke-linejoin="round"/></svg></div><div class="cap">مكان فيديو الشرح</div></div>';
  } else if(ls.type==='activity'){
    media += '<div class="video-slot"><div class="play">'+ICONS.activity+'</div><div class="cap">مكان النشاط التفاعلي</div></div>';
  } else {
    media += '<div class="q"><h3>سؤال تجريبي — شكل التمرين</h3><button class="opt">الاختيار الأول</button><button class="opt">الاختيار الثاني</button><button class="opt">الاختيار الثالث</button></div>';
  }
  if(ls.body) media += '<section class="infocard"><div class="cmsbody">'+ls.body+'</div></section>';
  const sk = '<section class="infocard"><h3>ملخص الدرس</h3><div class="skl"><i></i><i></i><i class="s"></i></div></section>'
    +'<section class="infocard"><h3>الكلمات الجديدة</h3><div class="tiles"><i></i><i></i><i></i><i></i></div></section>';
  return header({back:'#/stage/'+si, title:st.name})
  +'<section class="strip"><div class="stl"><b>'+un.name+'</b><span>'+ls.title+' · '+ls.ty+'</span></div><div class="steps">'+stepper(si,u,l,false)+'</div></section>'
  +BAND
  +'<div class="lesson-body">'+media+sk
  +'<a class="gbtn" href="letters-game.html">'+TILE_LETTER+'<span>العب لعبة الحروف</span></a>'
  +'<button class="cta green" id="finish">أنهيتُ الدرس ✓</button>'
  +'<a class="link" href="#/stage/'+si+'">العودة إلى '+un.name+'</a></div>'
  +GROUND+nav('stages');
}

function vTest(si,u){
  const st=STAGES[si], un=st.units[u];
  const real = un.test && Array.isArray(un.test.questions) && un.test.questions.length ? un.test.questions : null;
  const qs = real
    ? real.map((q,i)=>'<div class="q"><div class="qn">'+N[i]+'</div><h3>'+q.q+'</h3>'
      +q.opts.map((o,oi)=>'<button class="opt" data-c="'+(oi===q.c?1:0)+'">'+o+'</button>').join('')+'</div>').join('')
    : [1,2,3].map(i=>'<div class="q"><div class="qn">'+N[i-1]+'</div><h3>سؤال تجريبي '+N[i-1]+'</h3>'
      +'<button class="opt" data-c="'+(i===1?1:0)+'">الاختيار الأول</button>'
      +'<button class="opt" data-c="'+(i===1?0:1)+'">الاختيار الثاني</button>'
      +'<button class="opt" data-c="0">الاختيار الثالث</button></div>').join('');
  return header({back:'#/stage/'+si, title:un.test.title})
  +'<section class="strip"><div class="stl"><b>'+un.name+'</b><span id="qcount">٠ من '+AR(real?real.length:3)+' أسئلة</span></div><div class="steps wide"><div class="rail" id="qrail"><i style="width:0%"></i></div></div></section>'
  +BAND
  +'<div class="lesson-body">'+qs
  +(real?'':'<div class="note">نموذج لشكل الاختبار — ستُوضع الأسئلة الحقيقية من محتوى الوحدة</div>')
  +'<button class="cta" id="submit">سلّم الإجابات</button>'
  +'<a class="link" href="#/stage/'+si+'">العودة إلى '+un.name+'</a></div>'
  +GROUND+nav('stages');
}

/* ---------------- profiles ---------------- */
function vProfiles(){
  const p=Store.cur();
  const sub=(p.myStage!=null && STAGES[p.myStage])?'<span class="stgbadge">'+STAGES[p.myStage].name+'</span>':'<div class="emptynote">لم تختر مرحلتك بعد</div>';
  return header({})
  +'<section class="banner"><h1>الملف الشخصي</h1><p>اسمك وصورتك ومرحلتك</p></section>'
  +acard('تقدّمك يسعدني كثيرًا!')
  +'<section class="content"><div class="phead"><div class="bigav">'+AVIMG(p)+'</div><h2 class="pname">'+(p.name||'بلا اسم')+'</h2>'+sub+'</div>'
  +'<a class="cta blue" href="#/profile-edit">تعديل الملف</a><div id="ownerpanel"></div></section>'+contactBox()
  +GROUND+nav('');
}
/* زر لوحة التحكم: يظهر فقط لو الجلسة الحالية هي حساب مس أسماء (والحماية الفعلية في قواعد فايربيس) */
function contactBox(){
  var C=window.QAWS_CONFIG||{},ph=String(C.phone||'').replace(/[^0-9]/g,''),wa=String(C.whatsapp||'').replace(/[^0-9]/g,'');
  if(!ph&&!wa) return '';
  return '<section class="content contactbox"><h3 style="text-align:center;margin-top:6px">تواصل مع '+(C.ownerName||'مس أسماء')+'</h3>'
    +(ph?'<a class="cta blue" href="tel:+2'+ph+'">اتصال: '+ph+'</a>':'')
    +(wa?'<a class="cta green" target="_blank" rel="noopener" href="https://wa.me/'+wa+'">واتساب</a>':'')+'</section>';
}
function mountOwnerPanel(){
  try{
    if(!(window.QawsChat&&QawsChat.fbConfigured&&QawsChat.fbConfigured())) return;
    QawsChat.fbOwnerSession().then(function(ok){
      var box=document.getElementById('ownerpanel');
      if(!ok||!box) return;
      box.innerHTML='<a class="cta green ownerbtn" href="admin.html">لوحة التحكم — تعديل الموقع</a>';
    }).catch(function(){});
  }catch(e){}
}
let editTmp=null;
function vProfileEdit(){
  const p=Store.cur();
  editTmp={avatar:p.avatar||0, img:p.img||null};
  const picks=AVATARS.map((a,i)=>'<button type="button" class="'+(i===editTmp.avatar&&!editTmp.img?'sel':'')+'" data-av="'+i+'">'+a+'</button>').join('');
  return header({back:'#/profiles', title:'تعديل الملف'})
  +acard('تقدّمك يسعدني كثيرًا!')
  +'<section class="content editbox"><div class="bigav" id="avprev">'+AVIMG(editTmp.img?{img:editTmp.img}:{avatar:editTmp.avatar})+'</div>'
  +'<input class="namein" id="pname" type="text" maxlength="20" placeholder="اكتب الاسم" value="'+(p.name||'')+'">'
  +'<h3 class="minih">اختر صورتك</h3><div class="avpick">'+picks+'</div>'
  +'<label class="cta blue uploadbtn" for="filein">ارفع صورة من جهازك</label><input id="filein" type="file" accept="image/*" hidden>'
  +'<button class="cta green" id="saveprof">حفظ</button></section>'
  +GROUND+nav('');
}
function bindProfileEdit(){
  const prev=$('#avprev');
  document.querySelectorAll('.avpick button').forEach(b=>b.onclick=()=>{
    editTmp.avatar=+b.dataset.av; editTmp.img=null;
    document.querySelectorAll('.avpick button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    prev.innerHTML=AVIMG({avatar:editTmp.avatar});
  });
  $('#filein').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ const im=new Image();
      im.onload=()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128;
        const cx=cv.getContext('2d'); const s=Math.min(im.width,im.height);
        cx.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,128,128);
        editTmp.img=cv.toDataURL('image/jpeg',.82);
        document.querySelectorAll('.avpick button').forEach(x=>x.classList.remove('sel'));
        prev.innerHTML=AVIMG({img:editTmp.img});
      }; im.src=r.result; };
    r.readAsDataURL(f);
  };
  $('#saveprof').onclick=()=>{ Store.updateProfile($('#pname').value, editTmp.avatar, editTmp.img); location.hash='#/profiles'; };
}

/* ---------------- parent follow ---------------- */
function evText(e){
  const st=STAGES[e.si]; if(!st) return '';
  const un=st.units[e.u]; if(!un) return '';
  if(e.k==='lesson'){ const ls=un.lessons[e.l]; if(!ls) return ''; return 'أتمَّ درس «'+ls.title+'»، '+un.name; }
  return 'اجتاز «'+un.test.title+'»، '+st.name;
}
function vParent(){
  const p=Store.cur();
  let mid;
  if(p.myStage==null || !STAGES[p.myStage]){
    mid='<div class="emptynote">لم يختر مرحلته بعد</div>';
  } else {
    const st=STAGES[p.myStage], pct=Store.stagePctFor(p,p.myStage);
    const urows=st.units.map((un,u)=>{
      const up=Store.unitPct(p,p.myStage,u);
      return '<div class="urow"><div class="un2 '+un.color+'">'+un.num+'</div><div class="um"><h4>'+un.name+'</h4>'+rail(up)+'</div><div class="upct">'+AR(up)+'٪</div></div>';
    }).join('');
    mid='<div class="pbar parentbar"><div class="lbl"><span>تقدّمه في المرحلة</span><span>'+AR(pct)+'٪</span></div>'+rail(pct)+'</div>'
      +'<h2 class="section-title sm">الوحدات</h2>'+urows;
  }
  const evs=(p.events||[]).slice().reverse();
  const timeline = evs.length
    ? '<div class="tl">'+evs.map(e=>'<div class="ev"><div class="et">'+evText(e)+'</div><div class="ed">'+fmtDate(e.t)+'</div></div>').join('')+'</div>'
    : '<div class="emptynote">لا يوجد نشاط بعد</div>';
  const badge=(p.myStage!=null&&STAGES[p.myStage])?'<span class="stgbadge">'+STAGES[p.myStage].name+'</span>':'';
  return header({})
  +'<section class="banner"><h1>متابعة التقدّم</h1><p>تابع المستوى أولًا بأول على مدار السنة</p></section>'
  +acard('تقدّمك يسعدني كثيرًا!')
  +'<section class="content"><div class="phead"><div class="bigav">'+AVIMG(p)+'</div><h2 class="pname">'+(p.name||'بلا اسم')+'</h2>'+badge+'</div>'
  +mid
  +'<h2 class="section-title sm">خط التقدّم</h2>'+timeline+'</section>'
  +GROUND+nav('parent');
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
  let m, mm, rsi=null;
  if(mm=h.match(/^#\/stage\/(\d+)$/)) rsi=+mm[1];
  else if(mm=h.match(/^#\/(?:lesson|test)\/(\d+)\//)) rsi=+mm[1];
  applyTheme(rsi);
  const prepMode=document.body.classList.contains('prep');
  if(h==='#/'||h==='#'){ app.innerHTML=vHome(); if(prepMode) Asmaa.hide(); else Asmaa.enter('home'); return; }
  if(h==='#/stages'){ document.body.classList.remove('prep'); app.innerHTML=vStages(); Asmaa.hide(); return; }
  if(h==='#/stages/pri'){ document.body.classList.remove('prep'); app.innerHTML=vStageGrades(false); bindStages(); Asmaa.hide(); return; }
  if(h==='#/stages/prep'){ document.body.classList.add('prep'); app.innerHTML=vStageGrades(true); bindStages(); Asmaa.hide(); return; }
  if(h==='#/progress'){ app.innerHTML=vProgress(); Asmaa.hide(); return; }
  if(h==='#/profiles'){ app.innerHTML=vProfiles(); Asmaa.hide(); mountOwnerPanel(); return; }
  if(h==='#/profile-edit'){ app.innerHTML=vProfileEdit(); bindProfileEdit(); Asmaa.hide(); return; }
  if(h==='#/parent'){ app.innerHTML=vParent(); Asmaa.hide(); return; }
  if(h==='#/notifications'){ if(window.QawsNotify) QawsNotify.mount(); Asmaa.hide(); return; }
  if(h==='#/exams'){ QawsExams.mountList(); Asmaa.hide(); return; }
  if(m=h.match(/^#\/exam\/([\w-]+)$/)){ QawsExams.mountExam(m[1]); Asmaa.hide(); return; }
  if(h==='#/exams-admin'){ QawsExams.mountAdmin(); Asmaa.hide(); return; }
  if(h==='#/ask'){ QawsChat.mountAsk(); Asmaa.hide(); return; }
  if(h==='#/ask-owner'){ QawsChat.mountAskOwner(); Asmaa.hide(); return; }
  if(m=h.match(/^#\/stage\/(\d+)$/)){ app.innerHTML=vStage(+m[1]); if(prepMode) Asmaa.hide(); else Asmaa.enter('stage'); return; }
  if(m=h.match(/^#\/lesson\/(\d+)\/(\d+)\/(\d+)$/)){ app.innerHTML=vLesson(+m[1],+m[2],+m[3]); bindLesson(+m[1],+m[2],+m[3]); if(prepMode) Asmaa.hide(); else Asmaa.enter('lesson'); return; }
  if(m=h.match(/^#\/test\/(\d+)\/(\d+)$/)){ app.innerHTML=vTest(+m[1],+m[2]); bindTest(+m[1],+m[2]); if(prepMode) Asmaa.hide(); else Asmaa.enter('test'); return; }
  app.innerHTML=vHome(); Asmaa.enter('home');
}
/* ---------------- exports for exams/chat modules ---------------- */
window.QawsUI={header:header, GROUND:GROUND, nav:nav, acard:acard, Store:Store, AR:AR, N:N, ICONS:ICONS, celebrate:celebrate, rail:rail, AVIMG:AVIMG};

window.addEventListener('hashchange', route);
if(window.QawsNotify){ try{ QawsNotify.init(); }catch(e){} }
route();
})();
