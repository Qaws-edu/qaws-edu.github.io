/* الشات: سؤال الطالب ومس أسماء ترد. يعمل بفايربيس (Firestore + Auth).
   قبل ضبط js/config.js تظهر صفحة انتظار لطيفة مع زر واتساب اختياري.
   الطالب: دخول مجهول تلقائي + اسمه من ملفه. المعلّمة: دخول بالبريد وكلمة السر. */
(function(){
let app=null, auth=null, db=null, unsub=null, me=null, ownerMode=false, openThread=null;
const LS='qaws-chat-v1';

function cfg(){ return window.QAWS_CONFIG||{}; }
/* الشات يتفعّل فقط بعد اكتمال إعدادات فايربيس + بريد المعلّمة (أي بعد إنشاء حسابها ونشر القواعد) */
function configured(){ const f=cfg().firebase; return !!(f && f.apiKey && f.projectId && cfg().ownerEmail); }
const U=()=>window.QawsUI;
const AR=n=>U().AR(n);
function appEl(){ return document.querySelector('#app'); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function chatName(){
  try{ const s=JSON.parse(localStorage.getItem(LS))||{}; if(s.name) return s.name; }catch(e){}
  try{ return U().Store.cur().name||''; }catch(e){ return ''; }
}
function saveName(n){ let s={}; try{ s=JSON.parse(localStorage.getItem(LS))||{} }catch(e){}
  s.name=n; try{ localStorage.setItem(LS, JSON.stringify(s)); }catch(e){} }
function cleanup(){ if(unsub){ unsub(); unsub=null; } }
window.addEventListener('hashchange', ()=>{ if((location.hash||'')!=='#/ask') cleanup(); });

/* ---------- صفحة الانتظار (فايربيس غير مفعّل بعد) ---------- */
function mountPending(){
  const wa=(cfg().whatsapp||'').replace(/[^0-9]/g,'');
  const waBtn = wa
    ? '<a class="cta green" target="_blank" rel="noopener" href="https://wa.me/'+wa+'?text='+encodeURIComponent('السلام عليكم '+cfg().ownerName+'، عندي سؤال في المنهج:')+'">راسل '+esc(cfg().ownerName)+' على واتساب</a>'
    : '<div class="note">اسأل '+esc(cfg().ownerName)+' في الحصة الآن، وقريبًا تراسلها من هنا مباشرة.</div>';
  appEl().innerHTML=U().header({back:'#/', title:'اسأل '+esc(cfg().ownerName)})
    +'<section class="banner"><h1>اسأل '+esc(cfg().ownerName)+'</h1><p>راسل المعلّمة بأي سؤال في المنهج</p></section>'
    +U().acard('اسألني ما تشاء، أنا معك')
    +'<div class="content"><section class="infocard exinfo"><div class="exrow"><span>المحادثة المباشرة</span><b>قريبًا</b></div></section>'
    +waBtn
    +'<a class="ownerlink" href="#/ask-owner">دخول '+esc(cfg().ownerName)+'</a></div>'
    +U().GROUND+U().nav('ask');
}

/* ---------- تحميل فايربيس عند الحاجة ---------- */
const FBV='10.12.2';
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function ensureFb(){
  if(app) return true;
  try{
    await loadScript('https://www.gstatic.com/firebasejs/'+FBV+'/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/'+FBV+'/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/'+FBV+'/firebase-firestore-compat.js');
    app=firebase.initializeApp(cfg().firebase);
    auth=firebase.auth(); db=firebase.firestore();
    return true;
  }catch(e){ return false; }
}

/* جلسة فايربيس تُستعاد بشكل غير متزامن — ننتظر أول حالة دخول قبل الحكم عليها */
function waitAuth(){
  return new Promise(res=>{
    if(!auth) return res(null);
    let done=false;
    const t=setTimeout(()=>{ if(!done){ done=true; res(auth.currentUser); } },2500);
    try{ auth.onAuthStateChanged(u=>{ if(!done){ done=true; clearTimeout(t); res(u); } }); }
    catch(e){ if(!done){ done=true; clearTimeout(t); res(auth.currentUser); } }
  });
}

/* ---------- عرض الطالب ---------- */
function mountStudent(){
  const name=chatName();
  appEl().innerHTML=U().header({back:'#/', title:'اسأل '+esc(cfg().ownerName)})
    +'<section class="strip"><div class="stl"><b>محادثتك مع '+esc(cfg().ownerName)+'</b><span>تصلك الإجابة هنا</span></div></section>'
    +'<div class="content">'
    +'<div class="minrow"><span>اسمك الذي تراه المعلّمة</span><input class="namein sm" id="chname" type="text" maxlength="20" value="'+esc(name)+'"></div>'
    +'<div class="chatbox" id="chbox"><div class="chatload">جارٍ فتح المحادثة…</div></div>'
    +'<div class="chatinput"><input class="namein" id="chtext" type="text" maxlength="500" placeholder="اكتب سؤالك هنا"><button class="chsend" id="chsend">أرسل</button></div>'
    +'<a class="ownerlink" href="#/ask-owner">دخول '+esc(cfg().ownerName)+'</a></div>'
    +U().GROUND+U().nav('ask');
  const box=document.querySelector('#chbox');
  ensureFb().then(async ok=>{
    if(!ok){ box.innerHTML='<div class="chatload">تعذّر الاتصال. تأكد من الإنترنت وحاول مجددًا.</div>'; return; }
    const u=await waitAuth();
    if(u && u.email===cfg().ownerEmail){ ownerMode=true; mountOwnerThreads(); return; }
    try{
      if(!u) await auth.signInAnonymously();
      me=auth.currentUser;
      const nm=(document.querySelector('#chname').value||'').trim()||'طالب';
      const sref=db.collection('students').doc(me.uid);
      sref.get().then(s=>{ if(!s.exists && window.QawsNotify) QawsNotify.toOwner('signup','طالب جديد انضم: '+nm); }).catch(()=>{});
      sref.set({name:nm, lastActive:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      unsub=db.collection('students').doc(me.uid).collection('messages').orderBy('t','asc').limit(200)
        .onSnapshot(snap=>renderMsgs(box, snap.docs.map(d=>d.data())));
    }catch(e){ box.innerHTML='<div class="chatload">تعذّر الدخول. حاول مجددًا.</div>'; }
  });
  document.querySelector('#chname').onchange=e=>{
    const n=e.target.value.trim(); saveName(n);
    if(me) db.collection('students').doc(me.uid).set({name:n||'طالب'},{merge:true});
  };
  const send=()=>{
    const inp=document.querySelector('#chtext');
    const t=(inp.value||'').trim(); if(!t||!me) return;
    inp.value='';
    const nm=(document.querySelector('#chname').value||'').trim()||'طالب';
    saveName(nm);
    db.collection('students').doc(me.uid).set({name:nm, lastActive:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    db.collection('students').doc(me.uid).collection('messages').add({from:'student', text:t, t:firebase.firestore.FieldValue.serverTimestamp()});
    if(window.QawsNotify) QawsNotify.toOwner('chat','رسالة جديدة من '+nm+' في المحادثة');
  };
  document.querySelector('#chsend').onclick=send;
  document.querySelector('#chtext').addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
}
function renderMsgs(box, msgs, sname){
  if(!msgs.length){ box.innerHTML='<div class="chatload">اكتب أول سؤال لك، و'+esc(cfg().ownerName)+' ستجيبك هنا.</div>'; return; }
  box.innerHTML=msgs.map(m=>{
    const mine=(m.from==='owner')===ownerMode;
    const who= m.from==='owner' ? esc(cfg().ownerName) : (ownerMode ? esc(sname||'الطالب') : 'أنت');
    return '<div class="bubrow '+(mine?'me':'her')+'"><div class="bub'+(m.from==='owner'?' owner':'')+'"><div class="bubwho">'+who+'</div>'+esc(m.text)+'</div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
}

/* ---------- عرض المعلّمة ---------- */
function mountOwner(){
  appEl().innerHTML=U().header({back:'#/ask', title:'دخول '+esc(cfg().ownerName)})
    +'<section class="banner"><h1>دخول '+esc(cfg().ownerName)+'</h1><p>من هنا تردّين على أسئلة الطلاب</p></section>'
    +'<div class="content editbox"><input class="namein" id="owmail" type="email" maxlength="60" placeholder="البريد الإلكتروني" value="'+esc(cfg().ownerEmail||'')+'">'
    +'<input class="namein" id="owpass" type="password" maxlength="60" placeholder="كلمة السر">'
    +'<button class="cta green" id="owenter">دخول</button>'
    +'<div class="aderr" id="owerr"></div></div>'
    +U().GROUND+U().nav('ask');
  document.querySelector('#owenter').onclick=async ()=>{
    const err=document.querySelector('#owerr'); err.textContent='';
    const ok=await ensureFb();
    if(!ok){ err.textContent='تعذّر الاتصال بالخدمة.'; return; }
    auth.signInWithEmailAndPassword(document.querySelector('#owmail').value.trim(), document.querySelector('#owpass').value)
      .then(async ()=>{
        if((auth.currentUser||{}).email===cfg().ownerEmail){ ownerMode=true; mountOwnerThreads(); }
        else { await auth.signOut(); err.textContent='هذا الحساب ليس حساب المعلّمة.'; }
      })
      .catch(()=>{ err.textContent='بيانات الدخول غير صحيحة.'; });
  };
}
function mountOwnerThreads(){
  appEl().innerHTML=U().header({back:'#/ask', title:'أسئلة الطلاب'})
    +'<section class="banner"><h1>أسئلة الطلاب</h1><p>اضغطي على اسم الطالب لفتح محادثته</p></section>'
    +'<div class="content"><div id="owlist"><div class="chatload">جارٍ تحميل الأسئلة…</div></div>'
    +'<button class="adbtn" id="owout">تسجيل الخروج</button></div>'
    +U().GROUND+U().nav('ask');
  document.querySelector('#owout').onclick=()=>{ auth.signOut(); ownerMode=false; location.hash='#/ask'; };
  db.collection('students').orderBy('lastActive','desc').limit(50).get().then(snap=>{
    const el=document.querySelector('#owlist'); if(!el) return;
    if(snap.empty){ el.innerHTML='<div class="emptynote">لا توجد أسئلة بعد</div>'; return; }
    el.innerHTML=snap.docs.map(d=>{
      const s=d.data();
      return '<button class="prow owrow" data-t="'+d.id+'" data-n="'+esc(s.name||'طالب')+'"><div class="pm"><h3>'+esc(s.name||'طالب')+'</h3></div><div class="go">‹</div></button>';
    }).join('');
    document.querySelectorAll('.owrow').forEach(b=>b.onclick=()=>mountOwnerThread(b.dataset.t, b.dataset.n));
  }).catch(()=>{ const el=document.querySelector('#owlist'); if(el) el.innerHTML='<div class="chatload">تعذّر التحميل.</div>'; });
}
function mountOwnerThread(sid, name){
  openThread=sid; ownerMode=true;
  appEl().innerHTML=U().header({back:'#/ask', title:name})
    +'<div class="content"><div class="chatbox" id="chbox"><div class="chatload">جارٍ فتح المحادثة…</div></div>'
    +'<div class="chatinput"><input class="namein" id="chtext" type="text" maxlength="500" placeholder="اكتبي ردّك هنا"><button class="chsend" id="chsend">أرسل</button></div>'
    +'<button class="adbtn" id="owback">عودة لقائمة الأسئلة</button></div>'
    +U().GROUND+U().nav('ask');
  const box=document.querySelector('#chbox');
  cleanup();
  unsub=db.collection('students').doc(sid).collection('messages').orderBy('t','asc').limit(200)
    .onSnapshot(snap=>renderMsgs(box, snap.docs.map(d=>d.data()), name));
  const send=()=>{
    const inp=document.querySelector('#chtext');
    const t=(inp.value||'').trim(); if(!t) return;
    inp.value='';
    db.collection('students').doc(sid).collection('messages').add({from:'owner', text:t, t:firebase.firestore.FieldValue.serverTimestamp()});
    if(window.QawsNotify) QawsNotify.toStudent(sid,'reply','ردّت '+(cfg().ownerName||'المعلّمة')+' على رسالتك في المحادثة');
    db.collection('students').doc(sid).set({lastActive:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  };
  document.querySelector('#chsend').onclick=send;
  document.querySelector('#chtext').addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
  document.querySelector('#owback').onclick=()=>{ cleanup(); mountOwnerThreads(); };
}

/* ---------- المدخل ---------- */
function mountAsk(){
  ownerMode=false; openThread=null; cleanup();
  if(!configured()){ mountPending(); return; }
  mountStudent();
}
function mountAskOwner(){
  if(!configured()){
    appEl().innerHTML=U().header({back:'#/ask', title:'دخول '+esc(cfg().ownerName)})
      +'<section class="banner"><h1>الخدمة غير مفعّلة بعد</h1><p>سيتم تفعيل الشات بعد ضبط إعدادات فايربيس — الخطوات في ملف FIREBASE-SETUP.md</p></section>'
      +U().GROUND+U().nav('ask');
    return;
  }
  ensureFb().then(async ok=>{
    const u = ok ? await waitAuth() : null;
    if(u && u.email===cfg().ownerEmail){ ownerMode=true; mountOwnerThreads(); } else mountOwner();
  });
}

window.QawsChat={
  mountAsk:mountAsk,
  mountAskOwner:mountAskOwner,
  fbConfigured:configured,
  /* دخول المعلّمة بحساب فايربيس — يستخدمه قسم الاختبارات أيضًا */
  fbOwnerSignIn: async function(email, pass){
    const ok=await ensureFb();
    if(!ok) return {ok:false, err:'تعذّر الاتصال بالخدمة.'};
    try{
      await auth.signInWithEmailAndPassword((email||'').trim(), pass||'');
      if((auth.currentUser||{}).email===cfg().ownerEmail) return {ok:true};
      await auth.signOut();
      return {ok:false, err:'هذا الحساب ليس حساب المعلّمة.'};
    }catch(e){ return {ok:false, err:'بيانات الدخول غير صحيحة.'}; }
  },
  fbOwnerSignedIn: function(){ return !!(auth && auth.currentUser && auth.currentUser.email===cfg().ownerEmail); },
  /* هل لدى الزائر جلسة معلّمة محفوظة؟ ينتظر استعادة الجلسة — يستخدمه قسم الاختبارات */
  fbOwnerSession: async function(){
    const ok=await ensureFb();
    if(!ok) return false;
    const u=await waitAuth();
    return !!(u && u.email===cfg().ownerEmail);
  }
};
})();
