/* الإشعارات داخل التطبيق: جرس بعدّاد غير المقروء + صفحة إشعارات.
   الطالب يرى إشعاراته (to=uid) والعامة (to=all). المعلّمة ترى نشاط الطلاب (to=owner).
   تخزين: مجموعة notifications في Firestore. آخر قراءة تُحفظ محليًا على الجهاز.
   لا تُرسل أي إشعار إذا تعذّر الاتصال أو رُفضت الصلاحية — تفشل بصمت. */
(function(){
let app=null, auth=null, db=null, unsubN=null, aud=null, failed=false, initStarted=false, docs=[], mounted=false;
const LS='qaws-notif-seen-v1';

function cfg(){ return window.QAWS_CONFIG||{}; }
function configured(){ const f=cfg().firebase; return !!(f && f.apiKey && f.projectId && cfg().ownerEmail); }
const U=()=>window.QawsUI;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function seenLoad(){ try{ return JSON.parse(localStorage.getItem(LS))||{}; }catch(e){ return {}; } }
function seenSave(s){ try{ localStorage.setItem(LS, JSON.stringify(s)); }catch(e){} }
function audKey(){ return aud==='owner' ? 'owner' : 'u:'+aud; }

/* ---------- فايربيس (يشارك التطبيق مع الشات) ---------- */
const FBV='10.12.2';
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function ensureFb(){
  if(app) return true;
  try{
    if(!window.firebase){
      await loadScript('https://www.gstatic.com/firebasejs/'+FBV+'/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/'+FBV+'/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/'+FBV+'/firebase-firestore-compat.js');
    }
    app=(firebase.apps&&firebase.apps.length)?firebase.app():firebase.initializeApp(cfg().firebase);
    auth=firebase.auth(); db=firebase.firestore();
    return true;
  }catch(e){ return false; }
}
function waitAuth(){
  return new Promise(res=>{
    if(!auth) return res(null);
    let done=false;
    const t=setTimeout(()=>{ if(!done){ done=true; res(auth.currentUser); } },2500);
    try{ auth.onAuthStateChanged(u=>{ if(!done){ done=true; clearTimeout(t); res(u); } }); }
    catch(e){ if(!done){ done=true; clearTimeout(t); res(auth.currentUser); } }
  });
}

/* ---------- المستمع: يُعاد ضبطه عند كل تغيّر لحالة الدخول (طالب/معلّمة) ---------- */
async function setupListener(){
  if(unsubN){ unsubN(); unsubN=null; }
  aud=null;
  let u=await waitAuth();
  if(u && u.email===cfg().ownerEmail){ aud='owner'; }
  else{
    if(!u){ try{ await auth.signInAnonymously(); }catch(e){ failed=true; paint(); return; } }
    u=auth.currentUser;
    if(!u){ failed=true; paint(); return; }
    aud=(u.email===cfg().ownerEmail)?'owner':u.uid;
  }
  failed=false;
  /* بدون orderBy حتى لا نحتاج فهرسًا مركّبًا — الفرز محلي */
  const q = aud==='owner'
    ? db.collection('notifications').where('to','==','owner').limit(100)
    : db.collection('notifications').where('to','in',[aud,'all']).limit(100);
  unsubN=q.onSnapshot(s=>{
    docs=s.docs.map(d=>d.data()).filter(n=>n.t).sort((a,b)=>b.t.toMillis()-a.t.toMillis());
    paint(); if(mounted) renderList();
  }, ()=>{ failed=true; docs=[]; paint(); if(mounted) renderList(); });
}
async function init(){
  if(initStarted) return; initStarted=true;
  if(!configured()) return;
  const ok=await ensureFb(); if(!ok){ failed=true; return; }
  try{ auth.onAuthStateChanged(()=>{ setupListener(); }); }catch(e){ failed=true; }
  setupListener();
}

/* ---------- العدّاد ---------- */
function unreadCount(){
  if(failed||!aud) return 0;
  const seen=seenLoad()[audKey()]||0;
  return docs.filter(n=>n.t && n.t.toMillis()>seen).length;
}
function paint(){
  const b=document.querySelector('#nbadge'); if(!b) return;
  const c=unreadCount();
  if(c>0){ b.textContent=(window.QawsUI?U().AR(c):c); b.hidden=false; } else b.hidden=true;
}
window.addEventListener('hashchange', ()=>{ mounted=false; setTimeout(paint,60); });

/* ---------- صفحة الإشعارات ---------- */
const KICON={chat:'💬', reply:'💬', exam:'📝', signup:'🎓', content:'📚'};
const KLINK={chat:'#/ask', reply:'#/ask', exam:'#/exams'};
function fmt(ms){
  const d=new Date(ms);
  try{ return d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'}); }
  catch(e){ return ''; }
}
function renderList(){
  const box=document.querySelector('#nbox'); if(!box) return;
  if(failed){ box.innerHTML='<div class="nempty">الإشعارات غير متاحة الآن. تحقق من الإنترنت وحاول لاحقًا.</div>'; return; }
  if(!aud){ box.innerHTML='<div class="nempty">جارٍ الاتصال…</div>'; return; }
  if(!docs.length){ box.innerHTML='<div class="nempty">لا إشعارات بعد. '+(aud==='owner'?'نشاط الطلاب يظهر هنا فور حدوثه.':'رسائل '+esc(cfg().ownerName)+' ونتائجك تظهر هنا.')+'</div>'; return; }
  const seen=seenLoad()[audKey()]||0;
  box.innerHTML=docs.map(n=>{
    const ic=KICON[n.kind]||'🔔';
    const link=KLINK[n.kind];
    const isNew=n.t && n.t.toMillis()>seen;
    const inner='<div class="nic">'+ic+'</div><div class="ntx">'+esc(n.text)+'</div><div class="ntm">'+fmt(n.t.toMillis())+'</div>';
    return link
      ? '<a class="nrow'+(isNew?' new':'')+'" href="'+link+'">'+inner+'</a>'
      : '<div class="nrow'+(isNew?' new':'')+'">'+inner+'</div>';
  }).join('');
}
function mount(){
  mounted=true;
  const isOwner=(aud==='owner');
  document.querySelector('#app').innerHTML=U().header({back:'#/', title:'الإشعارات'})
    +'<section class="banner"><h1>الإشعارات</h1><p>'+(isOwner?'نشاط الطلاب لحظة بلحظة':'آخر المستجدات على حسابك')+'</p></section>'
    +'<div class="content"><div id="nbox"><div class="nempty">جارٍ التحميل…</div></div></div>'
    +U().GROUND+U().nav('');
  renderList();
  /* اعتبار الظاهر مقروءًا بعد عرضه */
  const s=seenLoad(); if(aud){ s[audKey()]=Date.now(); seenSave(s); }
  setTimeout(paint,50);
}

/* ---------- الإرسال (يفشل بصمت) ---------- */
async function send(to, kind, text){
  try{
    if(!configured()) return;
    const ok=await ensureFb(); if(!ok) return;
    if(!auth.currentUser) return;
    text=String(text||'').slice(0,190); if(!text) return;
    await db.collection('notifications').add({to:to, kind:kind, text:text, t:firebase.firestore.FieldValue.serverTimestamp()});
  }catch(e){}
}

window.QawsNotify={
  init:init, paint:paint, mount:mount,
  toOwner:(kind,text)=>send('owner',kind,text),
  toStudent:(uid,kind,text)=>{ if(uid) send(uid,kind,text); },
  toAll:(kind,text)=>send('all',kind,text),
  toMe:(kind,text)=>{ if(aud&&aud!=='owner') send(aud,kind,text); }
};
})();
