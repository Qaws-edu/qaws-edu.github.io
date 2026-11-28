/* لوحة تحكم قَوْس — تحرير كل محتوى الموقع بدون برمجة (للمعلّمة المالكة فقط).
   نموذج العمل: مسودة (cmsDraft) ← نشر (cmsLive) + سجل نشر (cmsHistory) مع استعادة.
   القواعد في Firestore تقصر القراءة/الكتابة للمسودة والكتابة للمنشور على بريد المالكة. */
(function(){
'use strict';
var CFG=window.QAWS_CONFIG||{};
var OWNER=(CFG.ownerEmail||'').toLowerCase();
var root=document.getElementById('root');
var db=null,user=null;
var site=null,data=null;      /* وثائق المسودة الجارية */
var hist=[];
var tab='home';
var selStage=null,selUnit=null;
var dirty=false;

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function clone(o){return JSON.parse(JSON.stringify(o));}
function msg(t,err){var d=document.createElement('div');d.className='adm-msg'+(err?' err':'');d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2600);}
function emptySite(){return {texts:[],replace:[],imgs:[],customCss:'',hiddenSels:[],blocks:[]};}
function emptyData(){return {stages:{},exams:{},addExams:[],pools:{}};}

/* ---------- تسجيل الدخول ---------- */
function renderLogin(err){
  root.innerHTML='<div class="adm-login"><h1>لوحة تحكم قَوْس</h1><p>خاصة بالمعلّمة المالكة — سجّلي بالبريد وكلمة السر</p>'
    +(err?'<p style="color:#B23B3B">'+esc(err)+'</p>':'')
    +'<input class="adm-in" id="em" type="email" placeholder="البريد الإلكتروني" dir="ltr">'
    +'<input class="adm-in" id="pw" type="password" placeholder="كلمة السر" dir="ltr">'
    +'<button class="adm-btn green" id="go" style="width:100%">دخول</button></div>';
  document.getElementById('go').onclick=function(){
    var em=document.getElementById('em').value.trim(),pw=document.getElementById('pw').value;
    firebase.auth().signInWithEmailAndPassword(em,pw).catch(function(e){renderLogin('تعذّر الدخول: '+(e.code||e.message));});
  };
}

/* ---------- تحميل المسودة ---------- */
function getDoc(coll,id){return db.collection(coll).doc(id).get().then(function(d){return d.exists?d.data():null;});}
function loadAll(){
  return Promise.all([getDoc('cmsDraft','site'),getDoc('cmsDraft','data'),getDoc('cmsLive','site'),getDoc('cmsLive','data')])
    .then(function(r){
      site=r[0]||clone(r[2]||emptySite());
      data=r[1]||clone(r[3]||emptyData());
      site.texts=site.texts||[];site.replace=site.replace||[];site.imgs=site.imgs||[];site.hiddenSels=site.hiddenSels||[];site.blocks=site.blocks||[];site.customCss=site.customCss||'';
      data.stages=data.stages||{};data.exams=data.exams||{};data.addExams=data.addExams||[];data.pools=data.pools||{};
      return db.collection('cmsHistory').orderBy('at','desc').limit(10).get();
    }).then(function(s){hist=s.docs.map(function(d){return Object.assign({id:d.id},d.data());});});
}

/* ---------- حفظ ونشر ---------- */
function save(pub){
  var btn=document.querySelectorAll('.adm-actions button');
  for(var i=0;i<btn.length;i++)btn[i].disabled=true;
  var p1=db.collection('cmsDraft').doc('site').set(site);
  var p2=db.collection('cmsDraft').doc('data').set(data);
  Promise.all([p1,p2]).then(function(){
    if(!pub)return null;
    var h={site:clone(site),data:clone(data),at:Date.now(),by:user.email};
    return Promise.all([
      db.collection('cmsLive').doc('site').set(site),
      db.collection('cmsLive').doc('data').set(data),
      db.collection('cmsHistory').add(h)
    ]).then(function(){
      return db.collection('cmsHistory').orderBy('at','desc').get().then(function(s){
        var dels=[];s.docs.forEach(function(d,i){if(i>=10)dels.push(d.ref.delete());});
        hist=s.docs.slice(0,10).map(function(d){return Object.assign({id:d.id},d.data());});
        return Promise.all(dels);
      });
    });
  }).then(function(){
    dirty=false;
    return user.getIdToken(true).then(function(t){try{localStorage.setItem('qawsCmsToken',t);}catch(e){}});
  }).then(function(){
    msg(pub?'نُشرت التعديلات وهي ظاهرة الآن على الموقع':'حُفظت المسودة');
    if(tab==='history')render();
    for(var i=0;i<btn.length;i++)btn[i].disabled=false;
  }).catch(function(e){msg('فشل الحفظ: '+(e.code||e.message),true);for(var i=0;i<btn.length;i++)btn[i].disabled=false;});
}

/* ---------- خانات النصوص الجاهزة ---------- */
var SITE_SLOTS=[
  {sel:'.hero h1 .hl',label:'الرئيسية: كلمة العنوان الملوّنة'},
  {sel:'.hero p',label:'الرئيسية: السطر تحت العنوان'},
  {sel:'.hero .cta',label:'الرئيسية: زر البداية'},
  {sel:'.path .section-title',label:'الرئيسية: عنوان «طريق المغامرة»'},
  {sel:'.start-tag',label:'الرئيسية: وسم «ابدأ من هنا»'},
  {sel:'.cards .section-title',label:'الرئيسية: عنوان «ماذا سنتعلّم؟»'},
  {sel:'.tiles3 .tile3:nth-child(1) h3',label:'بطاقة ١: العنوان'},
  {sel:'.tiles3 .tile3:nth-child(1) p',label:'بطاقة ١: الوصف'},
  {sel:'.tiles3 .tile3:nth-child(1) .tplay',label:'بطاقة ١: نص الزر'},
  {sel:'.tiles3 .tile3:nth-child(2) h3',label:'بطاقة ٢: العنوان'},
  {sel:'.tiles3 .tile3:nth-child(2) p',label:'بطاقة ٢: الوصف'},
  {sel:'.tiles3 .tile3:nth-child(3) h3',label:'بطاقة ٣: العنوان'},
  {sel:'.tiles3 .tile3:nth-child(3) p',label:'بطاقة ٣: الوصف'},
  {sel:'.acard .abub',label:'فقاعة مس أسماء بجانب صورتها'},
  {sel:'.tabbar .tab:nth-child(1) span',label:'القائمة السفلية: تبويب ١'},
  {sel:'.tabbar .tab:nth-child(2) span',label:'القائمة السفلية: تبويب ٢'},
  {sel:'.tabbar .tab:nth-child(3) span',label:'القائمة السفلية: تبويب ٣'},
  {sel:'.tabbar .tab:nth-child(4) span',label:'القائمة السفلية: تبويب ٤'},
  {sel:'.tabbar .tab:nth-child(5) span',label:'القائمة السفلية: تبويب ٥'},
  {sel:'.video-slot .cap',label:'تسمية «مكان الفيديو/النشاط»'},
  {sel:'.gbtn span',label:'زر لعبة الحروف داخل الدرس'},
  {sel:'#finish',label:'زر «أنهيتُ الدرس»'},
  {sel:'#submit',label:'زر «سلّم الإجابات»'},
  {sel:'footer .tag',label:'سطر التذييل'},
  {sel:'footer .mini',label:'اسم الموقع في التذييل'}
];
var IMG_SLOTS=[
  {sel:'.acard .aimg',label:'صورة مس أسماء في البطاقات'},
  {sel:'.companion .c-img',label:'صورة المرافقة المتحركة'},
  {sel:'.celebrate .asmaa',label:'صورة الاحتفال بعد الإنجاز'},
  {sel:'#asmaa',label:'صورة مس أسماء في لعبة الحروف'}
];
var HIDE_PRESETS=[
  {sel:'.path',label:'قسم «طريق المغامرة» (الرئيسية)'},
  {sel:'.cards',label:'قسم «ماذا سنتعلّم؟» (الرئيسية)'},
  {sel:'.aband.scene',label:'قوس قزح (الرئيسية)'},
  {sel:'.acard',label:'بطاقة مس أسماء بصورتها'},
  {sel:'.askfab',label:'زر «اسأل مس أسماء» العائم'},
  {sel:'.tabbar .tab:nth-child(3)',label:'تبويب «الاختبارات» من القائمة'},
  {sel:'.gbtn',label:'زر لعبة الحروف داخل الدرس'},
  {sel:'.video-slot',label:'مكان الفيديو/النشاط في الدروس'}
];

/* ---------- تبويب النصوص ---------- */
function slotVal(sel){var t=site.texts.filter(function(x){return x.sel===sel;})[0];return t?t.text:'';}
function setSlot(sel,text){site.texts=site.texts.filter(function(x){return x.sel!==sel;});if(text)site.texts.push({sel:sel,text:text});dirty=true;}

function vTexts(){
  var h='<div class="adm-card"><h2>نصوص جاهزة للتعديل</h2><div class="adm-hint">اتركي الخانة فارغة ليعود النص الأصلي. تُطبَّق التعديلات بعد النشر.</div>';
  SITE_SLOTS.forEach(function(s){
    h+='<div class="adm-row"><label>'+esc(s.label)+'</label><input class="adm-in" data-slot="'+esc(s.sel)+'" value="'+esc(slotVal(s.sel))+'"></div>';
  });
  h+='</div>';
  h+='<div class="adm-card"><h2>استبدال نص في كل الموقع</h2><div class="adm-hint">يكتب «من» نصًا موجودًا و«إلى» النص الجديد، ويُستبدل في كل مكان يظهر فيه (حتى النصوص المتولّدة). احذفي الصف لإلغائه.</div><div id="pairs"></div>'
    +'<button class="adm-btn sm blue" id="addpair">+ استبدال جديد</button></div>';
  h+='<div class="adm-card"><h2>نصوص إضافية بمحدد CSS</h2><div class="adm-hint">للمتقدمين: محدد CSS ثم النص الجديد لكل العناصر المطابقة.</div><div id="xtexts"></div>'
    +'<button class="adm-btn sm blue" id="addxtext">+ خانة محدد</button></div>';
  return h;
}
function bindTexts(){
  document.querySelectorAll('[data-slot]').forEach(function(inp){
    inp.onchange=function(){setSlot(inp.dataset.slot,inp.value.trim());};
  });
  function pairs(){
    var w=document.getElementById('pairs');w.innerHTML='';
    site.replace.forEach(function(r,i){
      var d=document.createElement('div');d.className='adm-row';
      d.innerHTML='<input class="adm-in" placeholder="من (النص الحالي)" value="'+esc(r.from)+'"><input class="adm-in" placeholder="إلى (النص الجديد)" value="'+esc(r.to||'')+'"><button class="adm-btn sm gray">حذف</button>';
      var ins=d.querySelectorAll('input');
      ins[0].onchange=function(){r.from=ins[0].value;dirty=true;};
      ins[1].onchange=function(){r.to=ins[1].value;dirty=true;};
      d.querySelector('button').onclick=function(){site.replace.splice(i,1);dirty=true;pairs();};
      w.appendChild(d);
    });
  }
  pairs();
  document.getElementById('addpair').onclick=function(){site.replace.push({from:'',to:''});pairs();};
  function xtexts(){
    var known=SITE_SLOTS.map(function(s){return s.sel;});
    var extra=site.texts.filter(function(t){return known.indexOf(t.sel)<0;});
    var w=document.getElementById('xtexts');w.innerHTML='';
    extra.forEach(function(t){
      var d=document.createElement('div');d.className='adm-row';
      d.innerHTML='<input class="adm-in" placeholder="محدد CSS" dir="ltr" value="'+esc(t.sel)+'"><input class="adm-in" placeholder="النص" value="'+esc(t.text)+'"><button class="adm-btn sm gray">حذف</button>';
      var ins=d.querySelectorAll('input');
      ins[0].onchange=function(){t.sel=ins[0].value.trim();dirty=true;};
      ins[1].onchange=function(){t.text=ins[1].value;dirty=true;};
      d.querySelector('button').onclick=function(){site.texts=site.texts.filter(function(x){return x!==t;});dirty=true;xtexts();};
      w.appendChild(d);
    });
  }
  xtexts();
  document.getElementById('addxtext').onclick=function(){site.texts.push({sel:'',text:''});xtexts();};
}

/* ---------- تبويب الواجهة ---------- */
function vLook(){
  var h='<div class="adm-card"><h2>إخفاء أقسام من الموقع</h2><div class="adm-hint">حدّدي ما تريدين إخفاءه عن الطلاب.</div>';
  HIDE_PRESETS.forEach(function(p){
    var on=site.hiddenSels.some(function(x){return x.sel===p.sel;});
    h+='<div class="adm-row"><label><input type="checkbox" data-hide="'+esc(p.sel)+'"'+(on?' checked':'')+'> '+esc(p.label)+'</label></div>';
  });
  h+='<h3>إخفاء بمحدد CSS مخصص</h3><div id="xhides"></div><button class="adm-btn sm blue" id="addxhide">+ محدد لإخفائه</button></div>';
  h+='<div class="adm-card"><h2>ألوان وتنسيقات مخصصة (CSS)</h2><div class="adm-hint">متغيرات الألوان الأساسية: <span dir="ltr">--t1 --t2 --t3</span> (التدرج العلوي) و<span dir="ltr">--yellow --blue --green --coral --pink</span>. مثال: <span dir="ltr">:root{--t1:#FF8FA3}</span></div>'
    +'<textarea class="adm-in code" id="css" placeholder=":root{--t1:#35B6C4}">'+esc(site.customCss)+'</textarea></div>';
  h+='<div class="adm-card"><h2>إضافة قسم HTML جديد</h2><div class="adm-hint">يُدرج القسم قبل/بعد/داخل عنصر تختارينه بمحدد CSS. مثال محدد: <span dir="ltr">.cards</span> وموضع «قبل».</div><div id="blocks"></div>'
    +'<button class="adm-btn sm blue" id="addblock">+ قسم جديد</button></div>';
  return h;
}
function bindLook(){
  document.querySelectorAll('[data-hide]').forEach(function(c){
    c.onchange=function(){
      var sel=c.dataset.hide;
      if(c.checked){if(!site.hiddenSels.some(function(x){return x.sel===sel;}))site.hiddenSels.push({sel:sel});}
      else site.hiddenSels=site.hiddenSels.filter(function(x){return x.sel!==sel;});
      dirty=true;
    };
  });
  function xhides(){
    var known=HIDE_PRESETS.map(function(p){return p.sel;});
    var extra=site.hiddenSels.filter(function(x){return known.indexOf(x.sel)<0;});
    var w=document.getElementById('xhides');w.innerHTML='';
    extra.forEach(function(x){
      var d=document.createElement('div');d.className='adm-row';
      d.innerHTML='<input class="adm-in" placeholder="محدد CSS" dir="ltr" value="'+esc(x.sel)+'"><button class="adm-btn sm gray">حذف</button>';
      d.querySelector('input').onchange=function(){x.sel=this.value.trim();dirty=true;};
      d.querySelector('button').onclick=function(){site.hiddenSels=site.hiddenSels.filter(function(y){return y!==x;});dirty=true;xhides();};
      w.appendChild(d);
    });
  }
  xhides();
  document.getElementById('addxhide').onclick=function(){site.hiddenSels.push({sel:''});xhides();};
  document.getElementById('css').onchange=function(){site.customCss=this.value;dirty=true;};
  function blocks(){
    var w=document.getElementById('blocks');w.innerHTML='';
    site.blocks.forEach(function(b,i){
      var d=document.createElement('div');d.className='adm-item';
      d.innerHTML='<div class="adm-row"><input class="adm-in" placeholder="محدد العنصر المرجعي" dir="ltr" value="'+esc(b.sel)+'">'
        +'<select class="adm-sel"><option value="before">قبله</option><option value="after">بعده</option><option value="prepend">داخله أولًا</option><option value="append">داخله آخرًا</option></select>'
        +'<button class="adm-btn sm gray">حذف</button></div>'
        +'<textarea class="adm-in code" placeholder="<div>محتوى القسم</div>">'+esc(b.html)+'</textarea>';
      var sel=d.querySelector('select');sel.value=b.pos||'before';
      d.querySelector('input').onchange=function(){b.sel=this.value.trim();dirty=true;};
      sel.onchange=function(){b.pos=sel.value;dirty=true;};
      d.querySelector('textarea').onchange=function(){b.html=this.value;dirty=true;};
      d.querySelector('button').onclick=function(){site.blocks.splice(i,1);dirty=true;blocks();};
      w.appendChild(d);
    });
  }
  blocks();
  document.getElementById('addblock').onclick=function(){site.blocks.push({sel:'',pos:'before',html:''});blocks();};
}

/* ---------- تبويب الصور ---------- */
function vImgs(){
  var h='<div class="adm-card"><h2>صور الموقع</h2><div class="adm-hint">رابط صورة (https) أو ارفعي ملفًا (يُحفظ داخل قاعدة البيانات، بحد أقصى ٧٠٠ كيلوبايت). اتركي الخانة فارغة للصورة الأصلية.</div>';
  IMG_SLOTS.forEach(function(s,i){
    var cur=(site.imgs.filter(function(x){return x.sel===s.sel;})[0]||{}).src||'';
    h+='<div class="adm-row"><label>'+esc(s.label)+'</label>'
      +(cur?'<img class="adm-imgprev" src="'+esc(cur)+'">':'')
      +'<input class="adm-in" data-img="'+esc(s.sel)+'" placeholder="رابط الصورة" dir="ltr" value="'+esc(cur)+'">'
      +'<label class="adm-btn sm gray">رفع<input type="file" accept="image/*" data-imgfile="'+esc(s.sel)+'" hidden></label></div>';
  });
  h+='</div><div class="adm-card"><h2>صور إضافية بمحدد CSS</h2><div id="ximgs"></div><button class="adm-btn sm blue" id="addximg">+ صورة بمحدد</button></div>';
  return h;
}
function readImg(file,cb){
  if(file.size>700*1024){msg('الصورة أكبر من ٧٠٠ كيلوبايت',true);return;}
  var r=new FileReader();r.onload=function(){cb(r.result);};r.readAsDataURL(file);
}
function bindImgs(){
  document.querySelectorAll('[data-img]').forEach(function(inp){
    inp.onchange=function(){
      var sel=inp.dataset.img,v=inp.value.trim();
      site.imgs=site.imgs.filter(function(x){return x.sel!==sel;});
      if(v)site.imgs.push({sel:sel,src:v});
      dirty=true;render();
    };
  });
  document.querySelectorAll('[data-imgfile]').forEach(function(inp){
    inp.onchange=function(){
      var f=inp.files[0];if(!f)return;var sel=inp.dataset.imgfile;
      readImg(f,function(url){site.imgs=site.imgs.filter(function(x){return x.sel!==sel;});site.imgs.push({sel:sel,src:url});dirty=true;render();});
    };
  });
  function ximgs(){
    var known=IMG_SLOTS.map(function(s){return s.sel;});
    var extra=site.imgs.filter(function(x){return known.indexOf(x.sel)<0;});
    var w=document.getElementById('ximgs');w.innerHTML='';
    extra.forEach(function(x){
      var d=document.createElement('div');d.className='adm-row';
      d.innerHTML='<input class="adm-in" placeholder="محدد CSS" dir="ltr" value="'+esc(x.sel)+'"><input class="adm-in" placeholder="رابط الصورة" dir="ltr" value="'+esc(x.src)+'"><button class="adm-btn sm gray">حذف</button>';
      var ins=d.querySelectorAll('input');
      ins[0].onchange=function(){x.sel=ins[0].value.trim();dirty=true;};
      ins[1].onchange=function(){x.src=ins[1].value.trim();dirty=true;};
      d.querySelector('button').onclick=function(){site.imgs=site.imgs.filter(function(y){return y!==x;});dirty=true;ximgs();};
      w.appendChild(d);
    });
  }
  ximgs();
  document.getElementById('addximg').onclick=function(){site.imgs.push({sel:'',src:''});ximgs();};
}

/* ---------- تبويب المراحل والدروس ---------- */
function sPatch(id){data.stages[id]=data.stages[id]||{};return data.stages[id];}
function uPatch(st,ui){var p=sPatch(st.id);p.units=p.units||{};p.units[String(ui)]=p.units[String(ui)]||{};return p.units[String(ui)];}
function lPatch(st,ui,li){var p=uPatch(st,ui);p.lessons=p.lessons||{};p.lessons[String(li)]=p.lessons[String(li)]||{};return p.lessons[String(li)];}
function effStages(){
  return window.QAWS_STAGES.map(function(st,i){var p=data.stages[st.id]||{};
    return {st:st,p:p,o:(typeof p.order==='number'?p.order:i)};})
    .sort(function(a,b){return a.o-b.o;});
}
function effUnits(st){
  var sp=data.stages[st.id]||{};
  var base=st.units.map(function(un,i){var up=(sp.units||{})[String(i)]||{};
    return {un:un,ui:i,p:up,o:(typeof up.order==='number'?up.order:i),added:false};})
    .sort(function(a,b){return a.o-b.o;});
  (sp.addUnits||[]).forEach(function(au,ai){base.push({un:au,ui:-1,ai:ai,p:au,o:900+ai,added:true});});
  return base;
}
function effLessons(un,up){
  var base=un.lessons.map(function(ls,i){var lp=(up.lessons||{})[String(i)]||{};
    return {ls:ls,li:i,p:lp,o:(typeof lp.order==='number'?lp.order:i),added:false};})
    .sort(function(a,b){return a.o-b.o;});
  (up.addLessons||[]).forEach(function(al,ai){base.push({ls:al,li:-1,ai:ai,p:al,o:900+ai,added:true});});
  return base;
}
function swapOrd(list,i,j){
  var a=list[i],b=list[j];if(!a||!b)return;
  var ao=a.o,bo=b.o;if(ao===bo){ao=i;bo=j;}
  a.p.order=bo;b.p.order=ao;dirty=true;
}
function stageById(id){return window.QAWS_STAGES.filter(function(s){return s.id===id;})[0];}

function vStages(){
  if(selStage==null){
    var h='<div class="adm-card"><h2>المراحل الدراسية</h2><div class="adm-hint">اختاري مرحلة لتحرير وحداتها ودروسها، أو أعيدي ترتيب المراحل وإخفاءها.</div><div class="adm-list">';
    var L=effStages();
    L.forEach(function(e,i){
      var p=e.p;
      h+='<div class="adm-item"><div class="t">'+esc(p.name!=null?p.name:e.st.name)
        +(p.hidden?'<span class="adm-tag off">مخفية</span>':'')+(p.name!=null||p.hidden||p.order!=null?'<span class="adm-tag">معدّلة</span>':'')+'</div>'
        +'<div class="s">'+esc(e.st.units.length+' وحدة')+'</div>'
        +'<div class="ops"><button class="adm-btn sm blue" data-openstage="'+esc(e.st.id)+'">فتح</button>'
        +'<button class="adm-btn sm gray" data-sup="'+i+'" '+(i===0?'disabled':'')+'>↑</button>'
        +'<button class="adm-btn sm gray" data-sdown="'+i+'" '+(i===L.length-1?'disabled':'')+'>↓</button>'
        +'<button class="adm-btn sm '+(p.hidden?'green':'gray')+'" data-shide="'+esc(e.st.id)+'">'+(p.hidden?'إظهار':'إخفاء')+'</button></div></div>';
    });
    return h+'</div></div>';
  }
  var st=stageById(selStage);if(!st){selStage=null;return vStages();}
  var sp=data.stages[st.id]||{};
  if(selUnit==null){
    var h='<div class="adm-crumbs"><a data-backstage="1">المراحل</a> ← '+esc(sp.name!=null?sp.name:st.name)+'</div>';
    h+='<div class="adm-card"><h2>بيانات المرحلة</h2>'
      +'<div class="adm-row"><label>اسم المرحلة</label><input class="adm-in" id="stname" value="'+esc(sp.name!=null?sp.name:st.name)+'"></div>'
      +'<div class="adm-row"><label>السطر الفرعي</label><input class="adm-in" id="stsub" value="'+esc(sp.sub!=null?sp.sub:(st.sub||''))+'"></div>'
      +'<div class="adm-row"><label>الشارة (حرف/رقم)</label><input class="adm-in" id="stbadge" value="'+esc(sp.badge!=null?sp.badge:st.badge)+'"></div></div>';
    h+='<div class="adm-card"><h2>الوحدات</h2><div class="adm-list">';
    var L=effUnits(st);
    L.forEach(function(e,i){
      var nm=e.p.name!=null?e.p.name:e.un.name;
      h+='<div class="adm-item"><div class="t">'+esc(nm)
        +(e.p.hidden?'<span class="adm-tag off">مخفية</span>':'')+(e.added?'<span class="adm-tag add">مضافة</span>':'')+'</div>'
        +'<div class="s">'+esc((e.un.lessons?e.un.lessons.length:0)+' دروس + اختبار')+'</div>'
        +'<div class="ops"><button class="adm-btn sm blue" data-openunit="'+i+'">فتح</button>'
        +'<button class="adm-btn sm gray" data-uup="'+i+'" '+(i===0?'disabled':'')+'>↑</button>'
        +'<button class="adm-btn sm gray" data-udown="'+i+'" '+(i===L.length-1?'disabled':'')+'>↓</button>'
        +'<button class="adm-btn sm '+(e.p.hidden?'green':'gray')+'" data-uhide="'+i+'">'+(e.p.hidden?'إظهار':'إخفاء')+'</button>'
        +(e.added?'<button class="adm-btn sm gray" data-udel="'+i+'">حذف</button>':'')
        +'</div></div>';
    });
    h+='</div><hr class="adm"><h3>إضافة وحدة</h3>'
      +'<div class="adm-row"><input class="adm-in" id="newun" placeholder="اسم الوحدة الجديدة"><button class="adm-btn sm green" id="addunit">+ إضافة</button></div></div>';
    return h;
  }
  /* مستوى الوحدة: الدروس */
  var UL=effUnits(st),ue=UL[selUnit];if(!ue){selUnit=null;return vStages();}
  var un=ue.un,up=ue.p;
  var h='<div class="adm-crumbs"><a data-backstage="1">المراحل</a> ← <a data-backunit="1">'+esc(sp.name!=null?sp.name:st.name)+'</a> ← '+esc(up.name!=null?up.name:un.name)+'</div>';
  h+='<div class="adm-card"><h2>بيانات الوحدة</h2>'
    +'<div class="adm-row"><label>اسم الوحدة</label><input class="adm-in" id="unname" value="'+esc(up.name!=null?up.name:un.name)+'"></div></div>';
  h+='<div class="adm-card"><h2>الدروس</h2><div class="adm-list">';
  var LL=effLessons(un,up);
  LL.forEach(function(e,i){
    var ls=e.ls;
    h+='<div class="adm-item"><div class="t">'+esc(e.p.title!=null?e.p.title:ls.title)
      +(e.p.hidden?'<span class="adm-tag off">مخفي</span>':'')+(e.added?'<span class="adm-tag add">مضاف</span>':'')
      +(ls.videoUrl||e.p.videoUrl?'<span class="adm-tag">فيديو</span>':'')+'</div>'
      +'<div class="s">'+esc(e.p.ty!=null?e.p.ty:(ls.ty||''))+'</div>'
      +'<div class="ops"><button class="adm-btn sm blue" data-editl="'+i+'">تحرير</button>'
      +'<button class="adm-btn sm gray" data-lup="'+i+'" '+(i===0?'disabled':'')+'>↑</button>'
      +'<button class="adm-btn sm gray" data-ldown="'+i+'" '+(i===LL.length-1?'disabled':'')+'>↓</button>'
      +'<button class="adm-btn sm '+(e.p.hidden?'green':'gray')+'" data-lhide="'+i+'">'+(e.p.hidden?'إظهار':'إخفاء')+'</button>'
      +(e.added?'<button class="adm-btn sm gray" data-ldel="'+i+'">حذف</button>':'')
      +'</div></div>';
  });
  h+='</div><hr class="adm"><h3>إضافة درس</h3>'
    +'<div class="adm-row"><input class="adm-in" id="newls" placeholder="عنوان الدرس الجديد"><select class="adm-sel" id="newlst"><option value="video">فيديو شرح</option><option value="activity">نشاط تفاعلي</option><option value="exercise">تمرين</option></select><button class="adm-btn sm green" id="addls">+ إضافة</button></div></div>';
  /* اختبار الوحدة */
  var tp=up.test||{},tBase=un.test||{title:'اختبار '+un.name,questions:[]};
  h+='<div class="adm-card"><h2>اختبار الوحدة</h2>'
    +'<div class="adm-row"><label>عنوان الاختبار</label><input class="adm-in" id="testtitle" value="'+esc(tp.title!=null?tp.title:tBase.title)+'"></div>'
    +'<div class="adm-row"><label><input type="checkbox" id="testhide"'+(tp.hidden?' checked':'')+'> إخفاء اختبار هذه الوحدة</label></div>'
    +'<div id="testqs"></div></div>';
  h+='<div class="adm-card" id="lessonEditor" style="display:none"></div>';
  return h;
}

/* محرر أسئلة مشترك (اختبار وحدة أو اختبار من البنك) */
function qEditorHTML(qs){
  var h='<div class="adm-list">';
  qs.forEach(function(q,i){
    h+='<div class="adm-q" data-qi="'+i+'"><div class="adm-row"><b>سؤال '+(i+1)+'</b>'
      +'<button class="adm-btn sm gray" data-qup="'+i+'" '+(i===0?'disabled':'')+'>↑</button>'
      +'<button class="adm-btn sm gray" data-qdown="'+i+'" '+(i===qs.length-1?'disabled':'')+'>↓</button>'
      +'<button class="adm-btn sm gray" data-qdel="'+i+'">حذف</button></div>'
      +'<div class="adm-row"><input class="adm-in" data-qq="'+i+'" placeholder="نص السؤال" value="'+esc(q.q)+'"></div>'
      +'<div class="adm-opts">'
      +q.opts.map(function(o,oi){
        return '<div class="adm-row"><input type="radio" name="c'+i+'" data-qc="'+i+'" value="'+oi+'"'+(q.c===oi?' checked':'')+'>'
          +'<input class="adm-in" data-qo="'+i+':'+oi+'" value="'+esc(o)+'">'
          +(q.opts.length>2?'<button class="adm-btn sm gray" data-qodel="'+i+':'+oi+'">×</button>':'')
          +'</div>';
      }).join('')
      +'</div><div class="adm-row">'+(q.opts.length<4?'<button class="adm-btn sm blue" data-qoadd="'+i+'">+ اختيار</button>':'')
      +'<span class="adm-hint">الدائرة = الإجابة الصحيحة</span></div></div>';
  });
  h+='</div><button class="adm-btn sm green" id="qadd">+ سؤال جديد</button>';
  return h;
}
function bindQEditor(container,qs){
  function re(){container.innerHTML=qEditorHTML(qs);bindQEditor(container,qs);dirty=true;}
  container.querySelectorAll('[data-qq]').forEach(function(x){x.onchange=function(){qs[+x.dataset.qq].q=x.value;dirty=true;};});
  container.querySelectorAll('[data-qo]').forEach(function(x){x.onchange=function(){var p=x.dataset.qo.split(':');qs[+p[0]].opts[+p[1]]=x.value;dirty=true;};});
  container.querySelectorAll('[data-qc]').forEach(function(x){x.onchange=function(){qs[+x.dataset.qc].c=+x.value;dirty=true;};});
  container.querySelectorAll('[data-qup]').forEach(function(x){x.onclick=function(){var i=+x.dataset.qup;var t=qs[i-1];qs[i-1]=qs[i];qs[i]=t;re();};});
  container.querySelectorAll('[data-qdown]').forEach(function(x){x.onclick=function(){var i=+x.dataset.qdown;var t=qs[i+1];qs[i+1]=qs[i];qs[i]=t;re();};});
  container.querySelectorAll('[data-qdel]').forEach(function(x){x.onclick=function(){qs.splice(+x.dataset.qdel,1);re();};});
  container.querySelectorAll('[data-qoadd]').forEach(function(x){x.onclick=function(){qs[+x.dataset.qoadd].opts.push('');re();};});
  container.querySelectorAll('[data-qodel]').forEach(function(x){x.onclick=function(){var p=x.dataset.qodel.split(':'),i=+p[0],oi=+p[1];
    qs[i].opts.splice(oi,1);if(qs[i].c>=qs[i].opts.length)qs[i].c=0;re();};});
  var add=container.querySelector('#qadd');
  if(add)add.onclick=function(){qs.push({q:'',opts:['',''],c:0});re();};
}

function bindStages(){
  var back=document.querySelector('[data-backstage]');
  if(back)back.onclick=function(){selStage=null;selUnit=null;render();};
  var bu=document.querySelector('[data-backunit]');
  if(bu)bu.onclick=function(){selUnit=null;render();};
  document.querySelectorAll('[data-openstage]').forEach(function(b){b.onclick=function(){selStage=b.dataset.openstage;selUnit=null;render();};});
  document.querySelectorAll('[data-shide]').forEach(function(b){b.onclick=function(){var p=sPatch(b.dataset.shide);p.hidden=!p.hidden;dirty=true;render();};});
  var SL=selStage==null?effStages():null;
  document.querySelectorAll('[data-sup]').forEach(function(b){b.onclick=function(){var i=+b.dataset.sup;swapOrd(SL,i,i-1);render();};});
  document.querySelectorAll('[data-sdown]').forEach(function(b){b.onclick=function(){var i=+b.dataset.sdown;swapOrd(SL,i,i+1);render();};});
  if(selStage!=null){
    var st=stageById(selStage);
    var sn=document.getElementById('stname');if(sn)sn.onchange=function(){sPatch(st.id).name=sn.value.trim();dirty=true;};
    var ss=document.getElementById('stsub');if(ss)ss.onchange=function(){sPatch(st.id).sub=ss.value;dirty=true;};
    var sb=document.getElementById('stbadge');if(sb)sb.onchange=function(){sPatch(st.id).badge=sb.value;dirty=true;};
    var UL=effUnits(st);
    document.querySelectorAll('[data-openunit]').forEach(function(b){b.onclick=function(){selUnit=+b.dataset.openunit;render();};});
    document.querySelectorAll('[data-uup]').forEach(function(b){b.onclick=function(){var i=+b.dataset.uup;swapOrd(UL,i,i-1);render();};});
    document.querySelectorAll('[data-udown]').forEach(function(b){b.onclick=function(){var i=+b.dataset.udown;swapOrd(UL,i,i+1);render();};});
    document.querySelectorAll('[data-uhide]').forEach(function(b){b.onclick=function(){var e=UL[+b.dataset.uhide];e.p.hidden=!e.p.hidden;if(!e.added)uPatch(st,e.ui).hidden=e.p.hidden;dirty=true;render();};});
    document.querySelectorAll('[data-udel]').forEach(function(b){b.onclick=function(){var e=UL[+b.dataset.udel];
      if(e.added&&confirm('حذف الوحدة المضافة؟')){sPatch(st.id).addUnits.splice(e.ai,1);dirty=true;render();}};});
    var au=document.getElementById('addunit');
    if(au)au.onclick=function(){var n=document.getElementById('newun').value.trim();if(!n)return;
      var p=sPatch(st.id);p.addUnits=p.addUnits||[];p.addUnits.push({name:n,color:'u-blue',num:'•',lessons:[],test:{title:'اختبار '+n,questions:[]}});
      dirty=true;render();};
    if(selUnit!=null){
      var ue=UL[selUnit],un=ue.un,up=ue.p;
      var unn=document.getElementById('unname');if(unn)unn.onchange=function(){if(ue.added)ue.p.name=unn.value.trim();else uPatch(st,ue.ui).name=unn.value.trim();dirty=true;};
      var LL=effLessons(un,up);
      document.querySelectorAll('[data-lup]').forEach(function(b){b.onclick=function(){var i=+b.dataset.lup;swapOrd(LL,i,i-1);render();};});
      document.querySelectorAll('[data-ldown]').forEach(function(b){b.onclick=function(){var i=+b.dataset.ldown;swapOrd(LL,i,i+1);render();};});
      document.querySelectorAll('[data-lhide]').forEach(function(b){b.onclick=function(){var e=LL[+b.dataset.lhide];e.p.hidden=!e.p.hidden;if(!e.added)lPatch(st,ue.ui,e.li).hidden=e.p.hidden;dirty=true;render();};});
      document.querySelectorAll('[data-ldel]').forEach(function(b){b.onclick=function(){var e=LL[+b.dataset.ldel];
        if(e.added&&confirm('حذف الدرس المضاف؟')){(up.addLessons).splice(e.ai,1);dirty=true;render();}};});
      var al=document.getElementById('addls');
      if(al)al.onclick=function(){var n=document.getElementById('newls').value.trim();if(!n)return;
        var ty=document.getElementById('newlst').value;
        var tyL={video:'فيديو الشرح',activity:'نشاط تفاعلي',exercise:'تمرين'}[ty];
        if(ue.added){ue.un.lessons=ue.un.lessons||[];ue.un.lessons.push({type:ty,ty:tyL,title:n,videoUrl:'',body:''});}
        else{var p=uPatch(st,ue.ui);p.addLessons=p.addLessons||[];p.addLessons.push({type:ty,ty:tyL,title:n,videoUrl:'',body:''});}
        dirty=true;render();};
      document.querySelectorAll('[data-editl]').forEach(function(b){b.onclick=function(){
        var e=LL[+b.dataset.editl];openLessonEditor(e,st,ue);
      };});
      var tt=document.getElementById('testtitle');if(tt)tt.onchange=function(){
        var p=ue.added?(ue.p.test=ue.p.test||{}):(uPatch(st,ue.ui).test=uPatch(st,ue.ui).test||{});p.title=tt.value;dirty=true;};
      var th=document.getElementById('testhide');if(th)th.onchange=function(){
        var p=ue.added?(ue.p.test=ue.p.test||{}):(uPatch(st,ue.ui).test=uPatch(st,ue.ui).test||{});p.hidden=th.checked;dirty=true;};
      var tq=document.getElementById('testqs');
      if(tq){
        var tBase=un.test||{questions:[]};
        var cur=(up.test&&up.test.questions!=null)?up.test.questions:null;
        var qs=cur||clone(tBase.questions||[]);
        tq.innerHTML='<h3>أسئلة اختبار الوحدة ('+qs.length+')</h3><div class="adm-hint">حين توجد أسئلة هنا تحل محل النموذج التجريبي على الموقع.</div><div id="tqwrap"></div>';
        var wrap=tq.querySelector('#tqwrap');
        wrap.innerHTML=qEditorHTML(qs);bindQEditor(wrap,qs);
        var commit=function(){var p=ue.added?(ue.p.test=ue.p.test||{}):(uPatch(st,ue.ui).test=uPatch(st,ue.ui).test||{});p.questions=qs;};
        wrap.addEventListener('change',commit,true);
        wrap.addEventListener('click',function(){setTimeout(commit,0);},true);
      }
    }
  }
}
function openLessonEditor(e,st,ue){
  var box=document.getElementById('lessonEditor');box.style.display='';
  var ls=e.ls;
  var cur={title:(e.p.title!=null?e.p.title:ls.title),ty:(e.p.ty!=null?e.p.ty:(ls.ty||'')),
    videoUrl:(e.p.videoUrl!=null?e.p.videoUrl:(ls.videoUrl||'')),body:(e.p.body!=null?e.p.body:(ls.body||''))};
  box.innerHTML='<h2>تحرير الدرس</h2>'
    +'<div class="adm-row"><label>عنوان الدرس</label><input class="adm-in" id="letitle" value="'+esc(cur.title)+'"></div>'
    +'<div class="adm-row"><label>نوع الدرس (الوصف)</label><input class="adm-in" id="lety" value="'+esc(cur.ty)+'"></div>'
    +'<div class="adm-row"><label>رابط فيديو (يوتيوب أو mp4)</label><input class="adm-in" id="levid" dir="ltr" value="'+esc(cur.videoUrl)+'"></div>'
    +'<div class="adm-hint">جسم الدرس (HTML مسموح: فقرات، قوائم، صور برابط):</div>'
    +'<textarea class="adm-in" id="lebody" style="min-height:130px">'+esc(cur.body)+'</textarea>'
    +'<div class="adm-row" style="margin-top:8px"><button class="adm-btn green" id="lesave">تثبيت في المسودة</button><button class="adm-btn gray" id="leclose">إغلاق</button></div>';
  box.scrollIntoView({behavior:'smooth'});
  document.getElementById('leclose').onclick=function(){box.style.display='none';};
  document.getElementById('lesave').onclick=function(){
    var p=e.added?e.p:lPatch(st,ue.ui,e.li);
    p.title=document.getElementById('letitle').value;
    p.ty=document.getElementById('lety').value;
    p.videoUrl=document.getElementById('levid').value.trim();
    p.body=document.getElementById('lebody').value;
    dirty=true;box.style.display='none';msg('ثُبّت الدرس في المسودة');render();
  };
}

/* ---------- تبويب الاختبارات ---------- */
function effExams(){
  var out=window.QAWS_EXAMS.map(function(e,i){var p=data.exams[e.id]||{};
    return {ex:e,p:p,o:(typeof p.order==='number'?p.order:i),added:false};})
    .sort(function(a,b){return a.o-b.o;});
  data.addExams.forEach(function(ae,ai){out.push({ex:ae,p:ae,o:900+ai,added:true,ai:ai});});
  return out;
}
function vExams(){
  var L=effExams();
  var h='<div class="adm-card"><h2>بنك الاختبارات</h2><div class="adm-hint">هذه اختبارات صفحة «الاختبارات» العامة. اختبارات الوحدات تُحرَّر من تبويب المراحل والدروس.</div><div class="adm-list">';
  L.forEach(function(e,i){
    var t=e.p.title!=null?e.p.title:e.ex.title;
    var qs=e.p.questions!=null?e.p.questions:e.ex.questions;
    h+='<div class="adm-item"><div class="t">'+esc(t)
      +(e.p.hidden?'<span class="adm-tag off">مخفي</span>':'')+(e.added?'<span class="adm-tag add">مضاف</span>':'')+'</div>'
      +'<div class="s">'+esc((qs||[]).length+' سؤال · '+(e.p.minutes!=null?e.p.minutes:e.ex.minutes)+' دقائق · '+(e.p.stage!=null?e.p.stage:(e.ex.stage||'')))+'</div>'
      +'<div class="ops"><button class="adm-btn sm blue" data-exedit="'+i+'">تحرير</button>'
      +'<button class="adm-btn sm gray" data-exup="'+i+'" '+(i===0?'disabled':'')+'>↑</button>'
      +'<button class="adm-btn sm gray" data-exdown="'+i+'" '+(i===L.length-1?'disabled':'')+'>↓</button>'
      +'<button class="adm-btn sm '+(e.p.hidden?'green':'gray')+'" data-exhide="'+i+'">'+(e.p.hidden?'إظهار':'إخفاء')+'</button>'
      +(e.added?'<button class="adm-btn sm gray" data-exdel="'+i+'">حذف</button>':'')
      +'</div></div>';
  });
  h+='</div><hr class="adm"><h3>إضافة اختبار</h3>'
    +'<div class="adm-row"><input class="adm-in" id="newex" placeholder="عنوان الاختبار الجديد"><button class="adm-btn sm green" id="addex">+ إضافة</button></div></div>';
  h+='<div class="adm-card" id="examEditor" style="display:none"></div>';
  return h;
}
function bindExams(){
  var L=effExams();
  document.querySelectorAll('[data-exup]').forEach(function(b){b.onclick=function(){var i=+b.dataset.exup;swapOrd(L,i,i-1);render();};});
  document.querySelectorAll('[data-exdown]').forEach(function(b){b.onclick=function(){var i=+b.dataset.exdown;swapOrd(L,i,i+1);render();};});
  document.querySelectorAll('[data-exhide]').forEach(function(b){b.onclick=function(){var e=L[+b.dataset.exhide];
    if(e.added)e.p.hidden=!e.p.hidden;else{var p=data.exams[e.ex.id]=data.exams[e.ex.id]||{};p.hidden=!p.hidden;}
    dirty=true;render();};});
  document.querySelectorAll('[data-exdel]').forEach(function(b){b.onclick=function(){var e=L[+b.dataset.exdel];
    if(e.added&&confirm('حذف الاختبار المضاف؟')){data.addExams.splice(e.ai,1);dirty=true;render();}};});
  document.getElementById('addex').onclick=function(){
    var t=document.getElementById('newex').value.trim();if(!t)return;
    var id='cms-'+Date.now().toString(36);
    data.addExams.push({id:id,title:t,stage:'',minutes:5,questions:[]});
    dirty=true;render();
  };
  document.querySelectorAll('[data-exedit]').forEach(function(b){b.onclick=function(){openExamEditor(L[+b.dataset.exedit]);};});
}
function openExamEditor(e){
  var box=document.getElementById('examEditor');box.style.display='';
  var cur={title:(e.p.title!=null?e.p.title:e.ex.title),stage:(e.p.stage!=null?e.p.stage:(e.ex.stage||'')),
    minutes:(e.p.minutes!=null?e.p.minutes:e.ex.minutes)};
  var qs=clone(e.p.questions!=null?e.p.questions:(e.ex.questions||[]));
  box.innerHTML='<h2>تحرير الاختبار</h2>'
    +'<div class="adm-row"><label>العنوان</label><input class="adm-in" id="extitle" value="'+esc(cur.title)+'"></div>'
    +'<div class="adm-row"><label>المرحلة (وصف)</label><input class="adm-in" id="exstage" value="'+esc(cur.stage)+'"></div>'
    +'<div class="adm-row"><label>المدة بالدقائق</label><input class="adm-in" id="exmin" type="number" min="1" max="60" value="'+esc(cur.minutes)+'"></div>'
    +'<h3>الأسئلة</h3><div id="exqs"></div>'
    +'<div class="adm-row" style="margin-top:8px"><button class="adm-btn green" id="exsave">تثبيت في المسودة</button><button class="adm-btn gray" id="exclose">إغلاق</button></div>';
  var wrap=box.querySelector('#exqs');
  wrap.innerHTML=qEditorHTML(qs);bindQEditor(wrap,qs);
  box.scrollIntoView({behavior:'smooth'});
  document.getElementById('exclose').onclick=function(){box.style.display='none';};
  document.getElementById('exsave').onclick=function(){
    var p=e.added?e.p:(data.exams[e.ex.id]=data.exams[e.ex.id]||{});
    p.title=document.getElementById('extitle').value;
    p.stage=document.getElementById('exstage').value;
    p.minutes=Math.max(1,parseInt(document.getElementById('exmin').value,10)||5);
    p.questions=qs;
    dirty=true;box.style.display='none';msg('ثُبّت الاختبار في المسودة');render();
  };
}

/* ---------- تبويب عبارات مس أسماء ---------- */
var POOL_LABELS={
  home:'الرئيسية: ترحيب',homeGo:'الرئيسية: توجيه للبدء',
  stages:'صفحة المراحل',stagesGo:'صفحة المراحل: توجيه',
  stage:'صفحة المرحلة',stageGo:'صفحة المرحلة: توجيه',
  lesson:'صفحة الدرس',lessonGo:'صفحة الدرس: توجيه',
  test:'صفحة الاختبار',testGo:'صفحة الاختبار: توجيه',
  progress:'صفحة التقدّم',progressGo:'تشجيع التقدّم',
  profiles:'الملف الشخصي',parent:'متابعة ولي الأمر',
  tap:'عند لمس صورتها',pick:'عند اختيار إجابة',
  correct:'عند النجاح',wrong:'عند الخطأ',done:'عند إنهاء درس'
};
function vPools(){
  var base=window.AsmaaPools||{};
  var h='<div class="adm-card"><h2>عبارات مس أسماء المتحركة</h2><div class="adm-hint">كل سطر عبارة، وتظهر إحداها عشوائيًا. اتركي الخانة فارغة ليعود الأصل.</div>';
  Object.keys(POOL_LABELS).forEach(function(k){
    var cur=data.pools[k]||base[k]||[];
    h+='<h3>'+esc(POOL_LABELS[k])+'</h3><textarea class="adm-in" data-pool="'+k+'">'+esc(cur.join('\n'))+'</textarea>';
  });
  return h+'</div>';
}
function bindPools(){
  document.querySelectorAll('[data-pool]').forEach(function(t){
    t.onchange=function(){
      var lines=t.value.split('\n').map(function(s){return s.trim();}).filter(function(s){return s;});
      if(lines.length)data.pools[t.dataset.pool]=lines;else delete data.pools[t.dataset.pool];
      dirty=true;
    };
  });
}

/* ---------- تبويب سجل النشر ---------- */
function vHistory(){
  var h='<div class="adm-card"><h2>سجل النشر</h2><div class="adm-hint">آخر ١٠ نشرات. الاستعادة تنسخ النسخة إلى المسودة، ثم انشريها لتظهر على الموقع.</div>';
  if(!hist.length)h+='<div class="adm-hint">لا يوجد نشر بعد.</div>';
  hist.forEach(function(x){
    var d=new Date(x.at);
    h+='<div class="adm-item"><div class="t">'+esc(d.toLocaleString('ar-EG'))+'</div><div class="s">'+esc(x.by||'')+'</div>'
      +'<div class="ops"><button class="adm-btn sm blue" data-restore="'+x.id+'">استعادة إلى المسودة</button></div></div>';
  });
  return h+'</div>';
}
function bindHistory(){
  document.querySelectorAll('[data-restore]').forEach(function(b){
    b.onclick=function(){
      var x=hist.filter(function(h){return h.id===b.dataset.restore;})[0];if(!x)return;
      if(!confirm('استعادة نسخة '+new Date(x.at).toLocaleString('ar-EG')+' إلى المسودة؟'))return;
      site=clone(x.site||emptySite());data=clone(x.data||emptyData());
      dirty=true;save(false);tab='home';render();
    };
  });
}

/* ---------- الواجهة المبسّطة: الرئيسية + الأقسام الكبيرة ---------- */
var TITLES={home:'الرئيسية',videos:'فيديوهات الدروس',explain:'شروحات الدروس',exams:'الأسئلة والاختبارات',stages:'المراحل والدروس',content:'محتوى الموقع',texts:'النصوص',look:'الواجهة والألوان',imgs:'الصور',pools:'عبارات مس أسماء',students:'الطلاب والإعلانات',history:'السجل والتراجع'};
var ICO={"video": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M10 9.5v5l4.5-2.5z\"/>", "q": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7\"/><path d=\"M12 17h.01\"/>", "book": "<path d=\"M3 5.5C5 4.5 8 4.5 12 6.5c4-2 7-2 9-1v13c-2-1-5-1-9 1-4-2-7-2-9-1z\"/><path d=\"M12 6.5v13\"/>", "layers": "<path d=\"M12 3l9 5-9 5-9-5z\"/><path d=\"M3 12.5l9 5 9-5\"/><path d=\"M3 16.5l9 5 9-5\"/>", "file": "<path d=\"M6 3h9l4 4v14H6z\"/><path d=\"M14 3v5h5\"/><path d=\"M9 13h7M9 17h7\"/>", "users": "<circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5\"/><circle cx=\"17\" cy=\"9\" r=\"2.4\"/><path d=\"M17 14.5c2.4 0 4 1.7 4 4\"/>", "undo": "<path d=\"M9 7L4 12l5 5\"/><path d=\"M4 12h10a6 6 0 0 1 0 12\" transform=\"translate(0 -4)\"/>", "text": "<path d=\"M5 6h14M12 6v13M9 19h6\"/>", "image": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"1.8\"/><path d=\"M4 18l5-5 4 4 3-3 4 4\"/>", "sliders": "<path d=\"M4 7h10M18 7h2M4 17h2M10 17h10\"/><circle cx=\"16\" cy=\"7\" r=\"2\"/><circle cx=\"8\" cy=\"17\" r=\"2\"/>", "chat": "<path d=\"M4 5h16v11H9l-5 4z\"/>", "home": "<path d=\"M4 11l8-7 8 7v9H4z\"/><path d=\"M10 20v-6h4v6\"/>", "moon": "<path d=\"M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z\"/>"};
function ico(k){return '<svg class="adm-ico" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[k]||'')+'</svg>';}
var TILES=[
  ['videos','video','فيديوهات','ألصقي رابط يوتيوب لأي درس'],
  ['exams','q','أسئلة','إضافة وتعديل أسئلة الاختبارات'],
  ['explain','book','شروحات','اكتبي شرح كل درس'],
  ['stages','layers','المراحل والدروس','إضافة وحذف وترتيب'],
  ['content','file','المحتوى','نصوص وصور وألوان الموقع'],
  ['students','users','الطلاب والإعلانات','من دخل، وأرسلي إعلانًا للجميع'],
  ['history','undo','السجل والتراجع','ارجعي لنسخة سابقة']
];
function allLessons(){
  var out=[];
  effStages().forEach(function(se){
    effUnits(se.st).forEach(function(ue){
      effLessons(ue.un,ue.p).forEach(function(le){out.push({st:se.st,sp:se.p,ue:ue,le:le});});
    });
  });
  return out;
}
function lessonPatch(x){return x.le.added?x.le.p:(x.ue.added?x.le.ls:lPatch(x.st,x.ue.ui,x.le.li));}
function lessonVal(x,f){return x.le.p[f]!=null?x.le.p[f]:(x.le.ls[f]||'');}
function ytId(u){var m=String(u||'').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/);return m?m[1]:'';}
function lessonList(kind){
  var L=allLessons(),h='',lastU='',idx=0;
  L.forEach(function(x,i){
    var sn=x.sp.name!=null?x.sp.name:x.st.name,un=x.ue.p.name!=null?x.ue.p.name:x.ue.un.name;
    var key=sn+'|'+un;
    if(key!==lastU){lastU=key;h+='<h3 class="adm-grp">'+esc(sn)+' ← '+esc(un)+'</h3>';}
    var t=lessonVal(x,'title');
    if(kind==='videos'){
      var v=lessonVal(x,'videoUrl'),id=ytId(v);
      h+='<div class="adm-item"><div class="t">'+esc(t)+(v?'<span class="adm-tag add">فيه فيديو</span>':'<span class="adm-tag">بدون فيديو</span>')+'</div>'
        +'<div class="adm-row"><input class="adm-in" dir="ltr" data-vid="'+i+'" placeholder="الصقي رابط يوتيوب هنا" value="'+esc(v)+'">'
        +(v?'<button class="adm-btn sm gray" data-vidclear="'+i+'">حذف الفيديو</button>':'')+'</div>'
        +(id?'<img class="adm-thumb" src="https://img.youtube.com/vi/'+id+'/mqdefault.jpg" alt="">':'')+'</div>';
    } else {
      var b=lessonVal(x,'body');
      h+='<div class="adm-item"><div class="t">'+esc(t)+(b?'<span class="adm-tag add">فيه شرح</span>':'<span class="adm-tag">بدون شرح</span>')+'</div>'
        +'<textarea class="adm-in" data-exp="'+i+'" placeholder="اكتبي شرح الدرس هنا">'+esc(b)+'</textarea></div>';
    }
  });
  return h||'<div class="adm-hint">لا توجد دروس.</div>';
}
var NEWV={
  home:{v:function(){
    return '<div class="adm-hello">أهلًا مس أسماء<small>اختاري ما تريدين تعديله. بعد التعديل اضغطي «نشر» ليظهر للطلاب.</small></div>'
      +'<div class="adm-tiles">'+TILES.map(function(t){return '<button class="adm-tile" data-tab="'+t[0]+'"><span class="ic">'+ico(t[1])+'</span><b>'+t[2]+'</b><small>'+t[3]+'</small></button>';}).join('')+'<a class="adm-tile link" href="admin/molzama.html"><span class="ic">'+ico('book')+'</span><b>ملازم وأغلفة</b><small>صمّمي ملزمة أو غلاف</small></a></div>'
      +'<div class="adm-actions"><button class="adm-btn green" id="pub">نشر التعديلات</button><button class="adm-btn blue" id="prev">معاينة</button><button class="adm-btn gray" id="out">تسجيل الخروج</button></div>';
  },b:function(){}},
  videos:{v:function(){return '<div class="adm-card"><h2>فيديوهات الدروس</h2><div class="adm-hint">افتحي يوتيوب، انسخي رابط الفيديو، والصقيه أمام الدرس. يظهر الفيديو داخل الدرس تلقائيًا بعد النشر.</div>'+lessonList('videos')+'</div>';},
    b:function(){
      var L=allLessons();
      document.querySelectorAll('[data-vid]').forEach(function(i){i.onchange=function(){var u=i.value.trim();if(u&&!ytId(u)&&!/\.mp4(\?|$)/i.test(u)){msg('الرابط غير صحيح، انسخي رابط يوتيوب كاملًا',true);return;}lessonPatch(L[+i.dataset.vid]).videoUrl=u;dirty=true;msg('تم. اضغطي نشر ليظهر');render();};});
      document.querySelectorAll('[data-vidclear]').forEach(function(b){b.onclick=function(){if(!confirm('حذف الفيديو من هذا الدرس؟'))return;lessonPatch(L[+b.dataset.vidclear]).videoUrl='';dirty=true;render();};});
    }},
  explain:{v:function(){return '<div class="adm-card"><h2>شروحات الدروس</h2><div class="adm-hint">اكتبي الشرح بسطور عادية. يظهر تحت الفيديو في صفحة الدرس.</div>'+lessonList('explain')+'</div>';},
    b:function(){
      var L=allLessons();
      document.querySelectorAll('[data-exp]').forEach(function(t){t.onchange=function(){lessonPatch(L[+t.dataset.exp]).body=t.value;dirty=true;msg('تم. اضغطي نشر ليظهر');};});
    }},
  content:{v:function(){
    return '<div class="adm-tiles">'+['texts','imgs','look','pools'].map(function(k){var d={texts:['text','النصوص','غيّري أي كلمة في الموقع'],imgs:['image','الصور','بدّلي الصور'],look:['sliders','الواجهة والألوان','إخفاء أقسام وألوان'],pools:['chat','عبارات مس أسماء','جمل الشخصية المتحركة']}[k];return '<button class="adm-tile" data-tab="'+k+'"><span class="ic">'+ico(d[0])+'</span><b>'+d[1]+'</b><small>'+d[2]+'</small></button>';}).join('')+'</div>';
  },b:function(){}},
  students:{v:function(){
    return '<div class="adm-card"><h2>إعلان لكل الطلاب</h2><div class="adm-hint">يصل كإشعار في جرس الموقع فورًا (بدون الحاجة لنشر).</div>'
      +'<textarea class="adm-in" id="annt" maxlength="200" placeholder="اكتبي الإعلان (حتى ٢٠٠ حرف)"></textarea>'
      +'<div class="adm-row" style="margin-top:8px"><button class="adm-btn green" id="annsend">إرسال الإعلان</button></div></div>'
      +'<div class="adm-card"><h2>الطلاب</h2><div id="stl" class="adm-hint">جارٍ التحميل…</div></div>';
  },b:function(){
    document.getElementById('annsend').onclick=function(){
      var t=document.getElementById('annt').value.trim();if(!t){msg('اكتبي نص الإعلان أولًا',true);return;}
      if(!confirm('إرسال هذا الإعلان لكل الطلاب الآن؟'))return;
      db.collection('notifications').add({to:'all',kind:'content',text:t,t:firebase.firestore.FieldValue.serverTimestamp()})
        .then(function(){document.getElementById('annt').value='';msg('أُرسل الإعلان');}).catch(function(e){msg('فشل الإرسال: '+(e.code||e.message),true);});
    };
    db.collection('students').limit(200).get().then(function(s){
      var box=document.getElementById('stl');if(!box)return;
      var rows=s.docs.map(function(d){var x=d.data(),la=x.lastActive;var ms=la&&la.toMillis?la.toMillis():(typeof la==='number'?la:0);return {n:x.name||'بدون اسم',ms:ms};}).sort(function(a,b){return b.ms-a.ms;});
      if(!rows.length){box.textContent='لا يوجد طلاب مسجّلون بعد.';return;}
      box.className='adm-list';box.innerHTML='<div class="adm-hint">عدد الطلاب: '+rows.length+'</div>'+rows.map(function(r){return '<div class="adm-item"><div class="t">'+esc(r.n)+'</div><div class="s">آخر نشاط: '+(r.ms?esc(new Date(r.ms).toLocaleString('ar-EG')):'غير معروف')+'</div></div>';}).join('');
    }).catch(function(e){var box=document.getElementById('stl');if(box)box.textContent='تعذّر التحميل: '+(e.code||e.message);});
  }}
};
var CONTENT_TABS=['texts','imgs','look','pools'];
function navBar(){
  if(tab==='home')return '';
  var h='<div class="adm-nav"><button class="adm-btn blue" data-tab="home">'+ico('home').replace(/36/g,'18')+' الرئيسية</button><span class="adm-title">'+esc(TITLES[tab]||'')+'</span><button class="adm-btn sm gray" id="thm" type="button">'+ico('moon').replace(/36/g,'16')+' ليلي / نهاري</button></div>';
  if(CONTENT_TABS.indexOf(tab)>=0)h+='<div class="adm-tabs">'+CONTENT_TABS.map(function(k){return '<button data-tab="'+k+'" class="'+(tab===k?'on':'')+'">'+TITLES[k]+'</button>';}).join('')+'</div>';
  return h;
}
function applyTheme(m){document.documentElement.setAttribute('data-theme',m);try{localStorage.setItem('qaws-theme',m);}catch(e){}}
(function(){var m='';try{m=localStorage.getItem('qaws-theme')||'';}catch(e){}if(!m)m=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.setAttribute('data-theme',m);})();

/* ---------- الهيكل العام ---------- */
var TABS=[['texts','النصوص'],['look','الواجهة والألوان'],['imgs','الصور'],['stages','المراحل والدروس'],['exams','الاختبارات'],['pools','عبارات مس أسماء'],['history','سجل النشر']];
function render(){
  var body='';
  if(tab==='texts')body=vTexts();
  else if(tab==='look')body=vLook();
  else if(tab==='imgs')body=vImgs();
  else if(tab==='stages')body=vStages();
  else if(tab==='exams')body=vExams();
  else if(tab==='pools')body=vPools();
  else if(tab==='history')body=vHistory();
  else if(NEWV[tab])body=NEWV[tab].v();
  root.innerHTML='<div class="adm-head"><a href="index.html" style="text-decoration:none;color:inherit"><h1>لوحة تحكم قَوْس</h1></a><a class="adm-btn sm blue" id="backsite" href="index.html" style="text-decoration:none;display:inline-flex;align-items:center">العودة للموقع</a><span class="who">'+esc(user.email)+'</span><button class="adm-btn sm gray" id="out2" type="button">تسجيل الخروج</button></div>'
    +navBar()
    +body
    +(tab==='home'?'':'<div class="adm-actions">'
    +'<button class="adm-btn green" id="pub">نشر التعديلات</button>'
    +'<button class="adm-btn" id="draft">حفظ مسودة</button>'
    +'<button class="adm-btn blue" id="prev">معاينة المسودة</button>'
    +'<button class="adm-btn gray" id="out">تسجيل الخروج</button>'
    +'</div>');
  document.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){tab=b.dataset.tab;selStage=null;selUnit=null;render();};});
  var dr=document.getElementById('draft');if(dr)dr.onclick=function(){save(false);};
  var th=document.getElementById('thm');if(th)th.onclick=function(){applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');};
  document.getElementById('pub').onclick=function(){
    if(confirm('هل تريدين نشر كل التعديلات الآن؟ ستظهر فورًا للطلاب.'))save(true);
  };
  document.getElementById('prev').onclick=function(){window.open('index.html?cmspreview=1','_blank');};
  document.getElementById('out').onclick=function(){firebase.auth().signOut();};
  var o2=document.getElementById('out2');if(o2)o2.onclick=function(){firebase.auth().signOut();};
  if(tab==='texts')bindTexts();
  else if(tab==='look')bindLook();
  else if(tab==='imgs')bindImgs();
  else if(tab==='stages')bindStages();
  else if(tab==='exams')bindExams();
  else if(tab==='pools')bindPools();
  else if(tab==='history')bindHistory();
  else if(NEWV[tab])NEWV[tab].b();
}

/* ---------- الإقلاع ---------- */
firebase.initializeApp(CFG.firebase);
db=firebase.firestore();
firebase.auth().onAuthStateChanged(function(u){
  if(u&&u.email&&u.email.toLowerCase()===OWNER){
    user=u;
    user.getIdToken().then(function(t){try{localStorage.setItem('qawsCmsToken',t);}catch(e){}});
    root.innerHTML='<div class="adm-login"><h1>لوحة تحكم قَوْس</h1><p>جارٍ تحميل المحتوى…</p></div>';
    loadAll().then(render).catch(function(e){
      root.innerHTML='<div class="adm-login"><h1>لوحة تحكم قَوْس</h1><p>فشل التحميل: '+esc(e.code||e.message)+'</p></div>';
    });
  } else {
    if(u)firebase.auth().signOut();
    renderLogin(u?'هذا الحساب ليس حساب المالكة':'');
  }
});
})();
