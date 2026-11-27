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
    try{ auth.getRedirectResult().catch(function(e){ try{ window.__qawsRedirectErr=(e&&e.code)||''; }catch(x){} }); }catch(e){}
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

/* ---------- وسائط الشات: صورة مضغوطة أو رسالة صوتية قصيرة — base64 داخل Firestore (بدون Storage) ---------- */
const MAX_MEDIA=950000, MAX_VOICE_SEC=60;
let rec=null, recChunks=[], recTimer=null, recStream=null;
function escMedia(u){ return (typeof u==='string' && /^(data:image\/|data:audio\/)/.test(u)) ? u : ''; }
function msgInner(m){
  if(m.mtype==='image'){ const u=escMedia(m.media); return u?'<img class="chimg" src="'+u+'" alt="صورة">':''; }
  if(m.mtype==='audio'){ const u=escMedia(m.media); return u?'<audio class="chaud" controls preload="metadata" src="'+u+'"></audio>':''; }
  return esc(m.text);
}
function compressImage(file){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width, h=img.height; const M=1024;
      if(w>M||h>M){ const r=Math.min(M/w,M/h); w=Math.round(w*r); h=Math.round(h*r); }
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      const url=c.toDataURL('image/jpeg',0.72);
      URL.revokeObjectURL(img.src);
      res(url);
    };
    img.onerror=rej;
    img.src=URL.createObjectURL(file);
  });
}
function bindMedia(sendMedia){
  const imgBtn=document.querySelector('#chimg'), micBtn=document.querySelector('#chmic'), file=document.querySelector('#chfile');
  const bar=document.querySelector('#chrec');
  if(!imgBtn||!micBtn||!file) return;
  imgBtn.onclick=()=>file.click();
  file.onchange=async ()=>{
    const f=file.files&&file.files[0]; file.value='';
    if(!f) return;
    if(!/^image\//.test(f.type)){ alert('اختار ملف صورة فقط'); return; }
    try{
      const url=await compressImage(f);
      if(url.length>MAX_MEDIA){ alert('الصورة كبيرة حتى بعد الضغط. جرّب صورة أصغر.'); return; }
      sendMedia({mtype:'image', mime:'image/jpeg', media:url});
    }catch(e){ alert('تعذّرت قراءة الصورة'); }
  };
  micBtn.onclick=async ()=>{
    if(rec) return;
    try{ recStream=await navigator.mediaDevices.getUserMedia({audio:true}); }
    catch(e){ alert('الميكروفون غير متاح. اسمح بالوصول من إعدادات المتصفح.'); return; }
    recChunks=[];
    let mime='';
    try{ mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':(MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':''); }catch(e){}
    try{ rec=new MediaRecorder(recStream, mime?{mimeType:mime}:undefined); }catch(e){ rec=new MediaRecorder(recStream); }
    const t0=Date.now();
    const tick=()=>{ const s=Math.floor((Date.now()-t0)/1000);
      const el=document.querySelector('#chrect'); if(el) el.textContent='⏺ يسجّل… '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
      if(s>=MAX_VOICE_SEC) stopRec(true); };
    rec.ondataavailable=e=>{ if(e.data&&e.data.size) recChunks.push(e.data); };
    rec.onstop=()=>{
      const send=rec._send; rec=null;
      if(recStream){ recStream.getTracks().forEach(t=>t.stop()); recStream=null; }
      clearInterval(recTimer); if(bar) bar.hidden=true;
      if(!send) return;
      const blob=new Blob(recChunks,{type:recChunks[0]?recChunks[0].type:'audio/webm'});
      if(blob.size>700000){ alert('التسجيل طويل. خلّيه أقل من دقيقة.'); return; }
      const rd=new FileReader();
      rd.onload=()=>sendMedia({mtype:'audio', mime:blob.type, media:rd.result});
      rd.readAsDataURL(blob);
    };
    rec._send=false;
    rec.start(250);
    if(bar) bar.hidden=false;
    recTimer=setInterval(tick,500); tick();
    document.querySelector('#chsendrec').onclick=()=>stopRec(true);
    document.querySelector('#chcancelrec').onclick=()=>stopRec(false);
  };
  function stopRec(send){ if(!rec) return; rec._send=send; try{ rec.stop(); }catch(e){} }
}
const MIC_SVG='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/></svg>';
const IMG_SVG='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>';
function mediaBar(){
  return '<button class="chmedia" id="chimg" title="إرسال صورة">'+IMG_SVG+'</button>'
    +'<button class="chmedia" id="chmic" title="رسالة صوتية">'+MIC_SVG+'</button>';
}
const REC_BAR='</div><div class="chrec" id="chrec" hidden><span id="chrect">⏺ يسجّل…</span><button class="chsend sm" id="chsendrec">إرسال</button><button class="adbtn del sm" id="chcancelrec">إلغاء</button></div>';

/* ---------- عرض الطالب ---------- */
function mountStudent(){
  const name=chatName();
  appEl().innerHTML=U().header({back:'#/', title:'اسأل '+esc(cfg().ownerName)})
    +'<section class="strip"><div class="stl"><b>محادثتك مع '+esc(cfg().ownerName)+'</b><span>تصلك الإجابة هنا</span></div></section>'
    +'<div class="content">'
    +'<div class="minrow"><span>اسمك الذي تراه المعلّمة</span><input class="namein sm" id="chname" type="text" maxlength="20" value="'+esc(name)+'"></div>'
    +'<div class="chatbox" id="chbox"><div class="chatload">جارٍ فتح المحادثة…</div></div>'
    +'<div class="chatinput">'+mediaBar()+'<input class="namein" id="chtext" type="text" maxlength="500" placeholder="اكتب سؤالك هنا"><button class="chsend" id="chsend">أرسل</button><input type="file" id="chfile" accept="image/*" hidden>'+REC_BAR
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
  bindMedia(msg=>{
    if(!me) return;
    const nm=(document.querySelector('#chname').value||'').trim()||'طالب';
    db.collection('students').doc(me.uid).collection('messages').add(Object.assign({from:'student', text:'', t:firebase.firestore.FieldValue.serverTimestamp()}, msg));
    db.collection('students').doc(me.uid).set({name:nm, lastActive:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    if(window.QawsNotify) QawsNotify.toOwner('chat',(msg.mtype==='image'?'صورة جديدة من ':'رسالة صوتية جديدة من ')+nm);
  });
  document.querySelector('#chsend').onclick=send;
  document.querySelector('#chtext').addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
}
function renderMsgs(box, msgs, sname){
  if(!msgs.length){ box.innerHTML='<div class="chatload">اكتب أول سؤال لك، و'+esc(cfg().ownerName)+' ستجيبك هنا.</div>'; return; }
  box.innerHTML=msgs.map(m=>{
    const mine=(m.from==='owner')===ownerMode;
    const who= m.from==='owner' ? esc(cfg().ownerName) : (ownerMode ? esc(sname||'الطالب') : 'أنت');
    return '<div class="bubrow '+(mine?'me':'her')+'"><div class="bub'+(m.from==='owner'?' owner':'')+(m.mtype?' media':'')+'"><div class="bubwho">'+who+'</div>'+msgInner(m)+'</div></div>';
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
    +'<div class="chatinput">'+mediaBar()+'<input class="namein" id="chtext" type="text" maxlength="500" placeholder="اكتبي ردّك هنا"><button class="chsend" id="chsend">أرسل</button><input type="file" id="chfile" accept="image/*" hidden>'+REC_BAR
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
  bindMedia(msg=>{
    db.collection('students').doc(sid).collection('messages').add(Object.assign({from:'owner', text:'', t:firebase.firestore.FieldValue.serverTimestamp()}, msg));
    db.collection('students').doc(sid).set({lastActive:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    if(window.QawsNotify) QawsNotify.toStudent(sid,'reply',(msg.mtype==='image'?'أرسلت '+(cfg().ownerName||'المعلّمة')+' صورة في المحادثة':'أرسلت '+(cfg().ownerName||'المعلّمة')+' رسالة صوتية في المحادثة'));
  });
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
  fbSignOut: async function(){ try{ const ok=await ensureFb(); if(ok&&auth) await auth.signOut(); }catch(e){} },
  /* ---- دخول اختياري بحساب Google (للطلاب) ---- */
  fbAccountState: async function(){
    var ok=await ensureFb();
    if(!ok) return {ok:false};
    var u=await waitAuth();
    var owner=!!(u && u.email===cfg().ownerEmail);
    var g=null, pd=(u&&u.providerData)||[];
    for(var i=0;i<pd.length;i++){ if(pd[i].providerId==='google.com') g=pd[i]; }
    var me=(u && !u.isAnonymous && !owner) ? {name:u.displayName||(g&&g.displayName)||'', email:u.email||'', photo:u.photoURL||(g&&g.photoURL)||'', provider:(g?'google':'password')} : null;
    return {ok:true, owner:owner, me:me, anon:!!(u&&u.isAnonymous)};
  },
  /* يربط جلسة الزائر المجهولة بحساب Google على نفس المعرّف حتى لا يضيع تقدّمه */
  /* ---- حسابات الطلاب: بريد وكلمة سر (اختياري) ---- */
  fbStudentSignUp: async function(name,email,pass){
    var ok=await ensureFb(); if(!ok) return {ok:false, err:'تعذّر الاتصال بالخدمة.'};
    var u=auth.currentUser, cred=firebase.auth.EmailAuthProvider.credential(email,pass);
    try{
      if(u && u.isAnonymous){ await u.linkWithCredential(cred); }
      else if(!u){ await auth.createUserWithEmailAndPassword(email,pass); }
      else { await u.linkWithCredential(cred); }
      try{ if(name && auth.currentUser.updateProfile) await auth.currentUser.updateProfile({displayName:name}); }catch(e){}
      try{ if(name && db) await db.collection('students').doc(auth.currentUser.uid).set({name:name, lastActive:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }catch(e){}
      return {ok:true};
    }catch(e){
      var c=(e&&e.code)||'';
      if(c==='auth/credential-already-in-use' && e.credential){
        try{ await auth.signInWithCredential(e.credential); return {ok:true, moved:true}; }
        catch(e2){ return {ok:false, err:'البريد ده مستخدم بالفعل. جرّب تسجيل الدخول.'}; }
      }
      if(c==='auth/email-already-in-use') return {ok:false, err:'البريد ده مستخدم بالفعل. جرّب تسجيل الدخول.'};
      if(c==='auth/weak-password') return {ok:false, err:'كلمة السر قصيرة. 6 حروف على الأقل.'};
      if(c==='auth/invalid-email') return {ok:false, err:'البريد غير صحيح.'};
      if(c==='auth/operation-not-allowed') return {ok:false, err:'تسجيل البريد غير مفعّل حاليًا.'};
      return {ok:false, err:'تعذّر إنشاء الحساب. حاول تاني.'};
    }
  },
  fbStudentSignInEmail: async function(email,pass){
    var ok=await ensureFb(); if(!ok) return {ok:false, err:'تعذّر الاتصال بالخدمة.'};
    try{ await auth.signInWithEmailAndPassword(email,pass); return {ok:true}; }
    catch(e){
      var c=(e&&e.code)||'';
      if(c==='auth/wrong-password'||c==='auth/invalid-credential'||c==='auth/invalid-login-credentials') return {ok:false, err:'البريد أو كلمة السر غلط.'};
      if(c==='auth/user-not-found') return {ok:false, err:'مفيش حساب بالبريد ده. اعمل حساب جديد.'};
      if(c==='auth/invalid-email') return {ok:false, err:'البريد غير صحيح.'};
      if(c==='auth/too-many-requests') return {ok:false, err:'محاولات كثيرة. جرّب بعد شوية.'};
      return {ok:false, err:'تعذّر الدخول. حاول تاني.'};
    }
  },
  fbPasswordReset: async function(email){
    var ok=await ensureFb(); if(!ok) return {ok:false, err:'تعذّر الاتصال بالخدمة.'};
    try{ await auth.sendPasswordResetEmail(email); return {ok:true}; }
    catch(e){
      var c=(e&&e.code)||'';
      if(c==='auth/user-not-found') return {ok:false, err:'مفيش حساب بالبريد ده.'};
      return {ok:false, err:'اكتب بريد صحيح الأول.'};
    }
  },
  fbGoogleSignIn: async function(){
    var ok=await ensureFb();
    if(!ok) return {ok:false, err:'تعذّر الاتصال بالخدمة.'};
    var provider=new firebase.auth.GoogleAuthProvider();
    try{ provider.setCustomParameters({prompt:'select_account'}); }catch(e){}
    var u=auth.currentUser;
    try{
      if(u && u.isAnonymous){ await u.linkWithPopup(provider); return {ok:true, linked:true}; }
      await auth.signInWithPopup(provider);
      return {ok:true, linked:false};
    }catch(e){
      var code=(e&&e.code)||'';
      if(code==='auth/credential-already-in-use' && e.credential){
        try{ await auth.signInWithCredential(e.credential); return {ok:true, linked:false, moved:true}; }
        catch(e2){ return {ok:false, err:'تعذّر الدخول بحساب Google. حاول تاني.'}; }
      }
      if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request') return {ok:false, cancelled:true};
      if(code==='auth/popup-blocked'||code==='auth/operation-not-supported-in-this-environment'||code==='auth/web-storage-unsupported'){
        try{
          if(u && u.isAnonymous){ await u.linkWithRedirect(provider); } else { await auth.signInWithRedirect(provider); }
          return {ok:false, redirecting:true};
        }catch(e3){ return {ok:false, err:'الدخول بحساب Google مش متاح على المتصفح ده. استخدم «إنشاء حساب جديد» أو «الدخول بحساب موجود» بالبريد وكلمة السر.'}; }
      }
      if(code==='auth/network-request-failed') return {ok:false, err:'النت ضعيف. جرّب تاني.'};
      if(code==='auth/unauthorized-domain') return {ok:false, err:'الدخول بحساب Google غير متاح على هذا الموقع حاليًا.'};
      if(code==='auth/account-exists-with-different-credential') return {ok:false, err:'البريد ده مسجّل بطريقة دخول تانية.'};
      if(code==='auth/operation-not-allowed') return {ok:false, err:'الدخول بحساب Google غير مفعّل حاليًا.'};
      return {ok:false, err:'الدخول بحساب Google مش متاح على المتصفح ده. استخدم «إنشاء حساب جديد» أو «الدخول بحساب موجود» بالبريد وكلمة السر.'};
    }
  },
  fbOwnerSession: async function(){
    const ok=await ensureFb();
    if(!ok) return false;
    const u=await waitAuth();
    return !!(u && u.email===cfg().ownerEmail);
  }
};
})();
