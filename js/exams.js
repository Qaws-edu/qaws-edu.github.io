/* قسم الاختبارات: قائمة، خوض بوقت محدد، تصحيح تلقائي، نتيجة، وإدارة للمعلّمة */
(function(){
const LS='qaws-exams-v1';
let st=null, timer=null, cur=null, phase='intro', answers=[], remaining=0;

function storeLoad(){ if(st) return st;
  try{ st=JSON.parse(localStorage.getItem(LS))||null }catch(e){ st=null }
  if(!st) st={best:{}, local:[]};
  return st; }
function storeSave(){ try{ localStorage.setItem(LS, JSON.stringify(st)); }catch(e){} }
function localExams(){ return storeLoad().local||[]; }
function allExams(){ return (window.QAWS_EXAMS||[]).concat(localExams()); }
function getExam(id){ return allExams().find(e=>e.id===id)||null; }
function isLocal(id){ return localExams().some(e=>e.id===id); }
function best(id){ return storeLoad().best[id]||null; }

const U=()=>window.QawsUI;
const AR=n=>U().AR(n);
function appEl(){ return document.querySelector('#app'); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function clearTimer(){ if(timer){ clearInterval(timer); timer=null; } }
window.addEventListener('hashchange', ()=>{
  const h=location.hash||'#/';
  if(!/^#\/exam(s|-admin)?(\/|$)/.test(h)) clearTimer();
});

/* ---------- قائمة الاختبارات ---------- */
function mountList(){
  clearTimer();
  const exs=allExams();
  const cards = exs.length ? exs.map(e=>{
    const b=best(e.id);
    const bhtml = b ? '<span class="exbest">أفضل نتيجة: '+AR(b.pct)+'٪</span>' : '<span class="exnew">لم يُحل بعد</span>';
    return '<a class="examcard" href="#/exam/'+e.id+'">'
      +'<div class="extop"><h3>'+esc(e.title)+'</h3>'+bhtml+'</div>'
      +'<div class="exmeta"><span>'+AR(e.questions.length)+' أسئلة</span><span>'+AR(e.minutes)+' دقائق</span><span>'+esc(e.stage||'')+'</span></div>'
      +'</a>';
  }).join('') : '<div class="emptynote">لا توجد اختبارات بعد</div>';
  appEl().innerHTML = U().header({back:'#/', title:'الاختبارات'})
    +'<section class="banner"><h1>الاختبارات</h1><p>اختبر نفسك واحصل على نتيجتك فورًا</p></section>'
    +U().acard('ركّز جيدًا، أنت قادر على ذلك')
    +'<div class="content">'+cards
    +'</div>'
    +U().GROUND+U().nav('exams');
}

/* ---------- خوض الاختبار ---------- */
function mountExam(id){
  clearTimer();
  cur=getExam(id); phase='intro'; answers=[];
  if(!cur){ appEl().innerHTML=U().header({back:'#/exams',title:'الاختبارات'})+'<section class="banner"><h1>الاختبار غير موجود</h1></section>'+U().GROUND+U().nav('exams'); return; }
  renderExam();
}
function renderExam(){
  const e=cur;
  if(phase==='intro'){
    const b=best(e.id);
    appEl().innerHTML=U().header({back:'#/exams', title:'اختبار'})
      +'<section class="banner"><h1>'+esc(e.title)+'</h1><p>'+esc(e.stage||'')+'</p></section>'
      +U().acard('فكّر قبل أن تجيب')
      +'<div class="content"><section class="infocard exinfo">'
      +'<div class="exrow"><span>عدد الأسئلة</span><b>'+AR(e.questions.length)+'</b></div>'
      +'<div class="exrow"><span>الوقت</span><b>'+AR(e.minutes)+' دقائق</b></div>'
      +'<div class="exrow"><span>النجاح من</span><b>'+AR(50)+'٪</b></div>'
      +(b?'<div class="exrow"><span>أفضل نتيجة سابقة</span><b>'+AR(b.pct)+'٪</b></div>':'')
      +'</section>'
      +'<button class="cta green" id="exstart">ابدأ الاختبار</button></div>'
      +U().GROUND+U().nav('exams');
    document.querySelector('#exstart').onclick=()=>{ phase='taking'; answers=e.questions.map(()=>null); remaining=e.minutes*60; renderExam(); startTimer(); };
    return;
  }
  if(phase==='taking'){
    const qs=e.questions.map((q,i)=>{
      const opts=q.opts.map((o,j)=>'<button class="opt" data-q="'+i+'" data-o="'+j+'">'+esc(o)+'</button>').join('');
      return '<div class="q" data-qi="'+i+'"><div class="qn">'+U().N[i<10?i:9]+'</div><h3>'+esc(q.q)+'</h3>'+opts+'</div>';
    }).join('');
    appEl().innerHTML=U().header({back:'#/exams', title:e.title})
      +'<section class="strip"><div class="stl"><b>'+esc(e.title)+'</b><span id="excount"></span></div>'
      +'<div class="timerpill" id="extimer"></div></section>'
      +'<div class="lesson-body">'+qs
      +'<button class="cta" id="exsubmit">سلّم الإجابات</button></div>'
      +U().GROUND+U().nav('exams');
    updCount(); updTimer();
    document.querySelectorAll('.opt').forEach(o=>o.onclick=()=>{
      const qi=+o.dataset.q;
      const box=document.querySelector('.q[data-qi="'+qi+'"]');
      box.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));
      o.classList.add('sel'); answers[qi]=+o.dataset.o; updCount();
    });
    document.querySelector('#exsubmit').onclick=()=>{ grade(false); };
    return;
  }
  /* النتيجة */
  const total=e.questions.length;
  let correct=0;
  e.questions.forEach((q,i)=>{ if(answers[i]===q.c) correct++; });
  const pct=Math.round(correct/total*100), pass=pct>=50;
  const b=best(e.id);
  if(!b||pct>b.pct){ storeLoad().best[e.id]={pct:pct, score:correct, total:total, t:Date.now()}; storeSave(); }
  if(window.QawsNotify){
    const nm=((U().Store.cur()||{}).name||'طالب');
    QawsNotify.toOwner('exam', nm+' حل اختبار «'+e.title+'» وحصل على '+pct+'٪ ('+correct+'/'+total+')');
    QawsNotify.toMe('exam', 'نتيجتك في اختبار «'+e.title+'»: '+pct+'٪ ('+correct+'/'+total+')');
  }
  const review=e.questions.map((q,i)=>{
    const opts=q.opts.map((o,j)=>{
      let cls='opt';
      if(j===q.c) cls+=' right';
      else if(answers[i]===j) cls+=' wrong';
      return '<div class="'+cls+'" style="cursor:default">'+esc(o)+'</div>';
    }).join('');
    const me=answers[i];
    const tag= me===null?'<span class="rvtag skip">بدون إجابة</span>':(me===q.c?'<span class="rvtag ok">صحيحة</span>':'<span class="rvtag no">خطأ</span>');
    return '<div class="q">'+tag+'<h3>'+esc(q.q)+'</h3>'+opts+'</div>';
  }).join('');
  appEl().innerHTML=U().header({back:'#/exams', title:'النتيجة'})
    +'<section class="banner"><h1>'+(pass?'أحسنت!':'حاول مرة أخرى')+'</h1><p>'+esc(e.title)+'</p></section>'
    +U().acard(pass?'أنا فخورة بك':'لا بأس، التكرار يعلّم')
    +'<div class="content"><div class="scorewrap"><div class="scorecircle '+(pass?'pass':'fail')+'"><b>'+AR(pct)+'٪</b><span>'+AR(correct)+' من '+AR(total)+'</span></div></div>'
    +'<button class="cta blue" id="exretry">إعادة الاختبار</button>'
    +'<a class="cta green" href="#/exams" style="display:block;text-align:center">العودة إلى الاختبارات</a>'
    +'<h2 class="section-title sm" style="margin-top:26px">مراجعة الإجابات</h2>'+review
    +'</div>'+U().GROUND+U().nav('exams');
  document.querySelector('#exretry').onclick=()=>{ mountExam(e.id); };
}
function updCount(){
  const el=document.querySelector('#excount'); if(!el||!cur) return;
  const n=answers.filter(a=>a!==null).length;
  el.textContent=AR(n)+' من '+AR(cur.questions.length)+' أسئلة';
}
function updTimer(){
  const el=document.querySelector('#extimer'); if(!el) return;
  const m=Math.floor(remaining/60), s=remaining%60;
  el.textContent=AR(m)+':'+AR(s<10?'0'+s:s);
  el.classList.toggle('hot', remaining<=60);
}
function startTimer(){
  clearTimer();
  timer=setInterval(()=>{
    remaining--;
    if(remaining<=0){ grade(true); return; }
    updTimer();
  },1000);
}
function grade(timeout){
  if(phase!=='taking') return;
  clearTimer(); phase='result';
  if(timeout) alert('انتهى الوقت! سنعرض إجاباتك الآن.');
  renderExam();
}

/* ---------- إدارة المعلّمة ---------- */
let draft=null;
async function sha256(t){
  const b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function unlocked(){ return sessionStorage.getItem('qaws-admin')==='1'; }
function mountAdmin(){
  clearTimer();
  if(!unlocked()){
    /* بعد اكتمال فايربيس: الدخول بحساب مس أسماء نفسه. قبله: كود محلي (بصمته في config). */
    const fbReady = window.QawsChat && QawsChat.fbConfigured && QawsChat.fbConfigured();
    if(fbReady){
      appEl().innerHTML=U().header({back:'#/exams', title:'دخول المعلّمة'})
        +'<section class="banner"><h1>دخول المعلّمة</h1><p>جارٍ التحقق من تسجيل الدخول…</p></section>'
        +U().GROUND+U().nav('exams');
      QawsChat.fbOwnerSession().then(has=>{
        if(has){ sessionStorage.setItem('qaws-admin','1'); mountAdmin(); return; }
        appEl().innerHTML=U().header({back:'#/exams', title:'دخول المعلّمة'})
        +'<section class="banner"><h1>دخول المعلّمة</h1><p>بنفس بريد وكلمة سر الشات</p></section>'
        +'<div class="content editbox"><input class="namein" id="admail" type="email" maxlength="60" placeholder="البريد الإلكتروني">'
        +'<input class="namein" id="adpass" type="password" maxlength="60" placeholder="كلمة السر">'
        +'<button class="cta green" id="adenter">دخول</button>'
        +'<div class="aderr" id="aderr"></div></div>'
        +U().GROUND+U().nav('exams');
        document.querySelector('#adenter').onclick=async ()=>{
          const r=await QawsChat.fbOwnerSignIn(document.querySelector('#admail').value, document.querySelector('#adpass').value);
          if(r.ok){ sessionStorage.setItem('qaws-admin','1'); mountAdmin(); }
          else document.querySelector('#aderr').textContent=r.err||'بيانات الدخول غير صحيحة';
        };
      });
      return;
    }
    appEl().innerHTML=U().header({back:'#/exams', title:'دخول المعلّمة'})
      +'<section class="banner"><h1>دخول المعلّمة</h1><p>هذه الصفحة لإدارة الاختبارات فقط</p></section>'
      +'<div class="content editbox"><input class="namein" id="adpass" type="password" maxlength="30" placeholder="كود الدخول">'
      +'<button class="cta green" id="adenter">دخول</button>'
      +'<div class="aderr" id="aderr"></div></div>'
      +U().GROUND+U().nav('exams');
    document.querySelector('#adenter').onclick=async ()=>{
      const v=(document.querySelector('#adpass').value||'').trim();
      const cfgPass=(window.QAWS_CONFIG||{}).ownerPassHash||'';
      const ok = v && cfgPass && (await sha256(v))===cfgPass;
      if(ok){ sessionStorage.setItem('qaws-admin','1'); mountAdmin(); }
      else document.querySelector('#aderr').textContent='الكود غير صحيح';
    };
    return;
  }
  if(draft){ renderEditor(); return; }
  const exs=allExams();
  const rows=exs.map(e=>{
    const loc=isLocal(e.id);
    return '<div class="prow"><div class="pm"><h3>'+esc(e.title)+'</h3>'
      +'<div class="admeta">'+AR(e.questions.length)+' أسئلة · '+AR(e.minutes)+' دقائق · '+(loc?'محفوظ على هذا الجهاز':'أساسي')+'</div></div>'
      +'<button class="adbtn" data-exp="'+e.id+'">تصدير</button>'
      +(loc?'<button class="adbtn del" data-del="'+e.id+'">حذف</button>':'')
      +'</div>';
  }).join('');
  appEl().innerHTML=U().header({back:'#/exams', title:'إدارة الاختبارات'})
    +'<section class="banner"><h1>إدارة الاختبارات</h1><p>أضيفي اختبارًا جديدًا أو صدّري كوده ليُنشر للجميع</p></section>'
    +'<div class="content">'+rows
    +'<button class="cta blue" id="adnew">اختبار جديد +</button>'
    +'<div class="note" style="margin-top:16px">الاختبار الجديد يُحفظ أولًا على هذا الجهاز. ليظهر لكل الطلاب: اضغطي «تصدير» وأرسلي الكود ليوسف ليضيفه إلى ملف الاختبارات، أو الصقيه في js/exams-data.js.</div>'
    +'</div>'+U().GROUND+U().nav('exams');
  document.querySelector('#adnew').onclick=()=>{ draft={id:'ex-'+Date.now(), title:'', stage:'', minutes:5, questions:[]}; renderEditor(); };
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(!confirm('حذف هذا الاختبار من هذا الجهاز؟')) return;
    const s=storeLoad(); s.local=s.local.filter(e=>e.id!==b.dataset.del); storeSave(); mountAdmin();
  });
  document.querySelectorAll('[data-exp]').forEach(b=>b.onclick=()=>exportExam(b.dataset.exp));
}
function exportExam(id){
  const e=getExam(id); if(!e) return;
  const code=JSON.stringify(e,null,2).replace(/"(\w+)":/g,'$1:')+',';
  const ov=document.createElement('div');
  ov.className='overlay';
  ov.innerHTML='<div class="celebrate"><h2>كود الاختبار</h2><p>انسخي هذا الكود وأرسليه ليوسف ليضعه في js/exams-data.js فيصبح الاختبار للجميع</p>'
    +'<textarea class="copybox" readonly>'+esc(code)+'</textarea>'
    +'<button class="cta blue" id="cpbtn">نسخ الكود</button>'
    +'<button class="cta green" id="clbtn">تم</button></div>';
  document.body.appendChild(ov);
  ov.querySelector('#cpbtn').onclick=()=>{
    const ta=ov.querySelector('.copybox'); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    if(navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(()=>{});
    ov.querySelector('#cpbtn').textContent='تم النسخ ✓';
  };
  ov.querySelector('#clbtn').onclick=()=>ov.remove();
}
function renderEditor(){
  const d=draft;
  const qrows=d.questions.map((q,i)=>{
    const opts=q.opts.map((o,j)=>'<div class="optrow"><input type="radio" name="qc'+i+'" data-q="'+i+'" data-o="'+j+'"'+(q.c===j?' checked':'')+'><input class="namein sm" data-q="'+i+'" data-oi="'+j+'" type="text" maxlength="120" placeholder="الاختيار '+AR(j+1)+'" value="'+esc(o)+'"></div>').join('');
    return '<div class="q edq"><div class="edqhead"><b>سؤال '+AR(i+1)+'</b><button class="adbtn del" data-rmq="'+i+'">حذف</button></div>'
      +'<input class="namein" data-qt="'+i+'" type="text" maxlength="200" placeholder="نص السؤال" value="'+esc(q.q)+'">'
      +'<div class="radhint">علّمي الدائرة بجانب الإجابة الصحيحة</div>'+opts+'</div>';
  }).join('');
  appEl().innerHTML=U().header({back:'#/exams', title:'اختبار جديد'})
    +'<div class="content editbox">'
    +'<input class="namein" id="edtitle" type="text" maxlength="80" placeholder="عنوان الاختبار" value="'+esc(d.title)+'">'
    +'<input class="namein" id="edstage" type="text" maxlength="40" placeholder="المرحلة (مثال: الثالث الابتدائي)" value="'+esc(d.stage)+'">'
    +'<div class="minrow"><span>المدة بالدقائق</span><input class="namein num" id="edmin" type="number" min="1" max="120" value="'+d.minutes+'"></div>'
    +qrows
    +'<button class="adbtn add" id="edaddq">+ إضافة سؤال</button>'
    +'<button class="cta green" id="edsave">حفظ الاختبار</button>'
    +'<button class="adbtn" id="edcancel">إلغاء</button>'
    +'<div class="aderr" id="ederr"></div></div>'
    +U().GROUND+U().nav('exams');
  const collect=()=>{
    d.title=document.querySelector('#edtitle').value;
    d.stage=document.querySelector('#edstage').value;
    d.minutes=Math.max(1, Math.min(120, +document.querySelector('#edmin').value||5));
    d.questions.forEach((q,i)=>{
      const qt=document.querySelector('[data-qt="'+i+'"]'); if(qt) q.q=qt.value;
      q.opts=q.opts.map((o,j)=>{ const el=document.querySelector('[data-q="'+i+'"][data-oi="'+j+'"]'); return el?el.value:o; });
      const r=document.querySelector('input[name="qc'+i+'"]:checked');
      q.c = r? +r.dataset.o : null;
    });
  };
  document.querySelector('#edaddq').onclick=()=>{ collect(); d.questions.push({q:'',opts:['','',''],c:null}); renderEditor(); };
  document.querySelectorAll('[data-rmq]').forEach(b=>b.onclick=()=>{ collect(); d.questions.splice(+b.dataset.rmq,1); renderEditor(); });
  document.querySelector('#edcancel').onclick=()=>{ draft=null; mountAdmin(); };
  document.querySelector('#edsave').onclick=()=>{
    collect();
    const err=[];
    if(!d.title.trim()) err.push('اكتبي عنوان الاختبار');
    if(!d.questions.length) err.push('أضيفي سؤالًا واحدًا على الأقل');
    d.questions.forEach((q,i)=>{
      if(!q.q.trim()) err.push('سؤال '+AR(i+1)+': النص فارغ');
      q.opts=q.opts.map(o=>o.trim()).filter(o=>o!=='');
      if(q.opts.length<2) err.push('سؤال '+AR(i+1)+': يلزم اختياران على الأقل');
      if(q.c===null||q.c>=q.opts.length) err.push('سؤال '+AR(i+1)+': حدّدي الإجابة الصحيحة');
    });
    if(err.length){ document.querySelector('#ederr').innerHTML=err.join('<br>'); return; }
    d.questions.forEach(q=>{ if(q.c===null) q.c=0; });
    const s=storeLoad();
    const ix=s.local.findIndex(e=>e.id===d.id);
    const clean={id:d.id, title:d.title.trim(), stage:d.stage.trim(), minutes:d.minutes, questions:d.questions};
    if(ix>-1) s.local[ix]=clean; else s.local.push(clean);
    storeSave(); draft=null; mountAdmin();
  };
}

window.QawsExams={mountList:mountList, mountExam:mountExam, mountAdmin:mountAdmin};
})();
