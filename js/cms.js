/* منصة قَوْس — طبقة المحتوى (CMS overlay).
   تقرأ وثائق cmsLive/site وcmsLive/data من Firestore عبر REST (بدون تحميل أي SDK،
   حتى لا تتعارض مع تهيئة الشات)، وتطبّعها على الصفحة والبيانات:
   - site: نصوص بمحددات CSS، استبدالات نصية عامة، صور، CSS مخصص، إخفاء أقسام، كتل HTML مضافة
   - data: تعديل المراحل/الوحدات/الدروس/اختبارات الوحدات، بنك الاختبارات، عبارات مس أسماء
   معاينة المسودة: ?cmspreview=1 تقرأ cmsDraft (للمعلّمة المسجّلة من اللوحة على نفس المتصفح).
   لو القراءة فشلت يعمل الموقع بالمحتوى الأصلي بدون أي تغيير. */
(function(){
'use strict';

var FB = (window.QAWS_CONFIG && window.QAWS_CONFIG.firebase) || {
  apiKey: 'AIzaSyCF8Pptak45zB5Qef-20TaHrU2YtkoASVw',
  projectId: 'qaws-a9d34'
};
var BASE = 'https://firestore.googleapis.com/v1/projects/'+FB.projectId+'/databases/(default)/documents/';

function preview(){
  try{ return new URLSearchParams(location.search).get('cmspreview')==='1'; }catch(e){ return false; }
}
function token(){
  try{ return localStorage.getItem('qawsCmsToken')||''; }catch(e){ return ''; }
}

/* ---------- فك ترميز Firestore REST إلى JS عادي ---------- */
function dec(v){
  if(!v) return null;
  if('stringValue' in v) return v.stringValue;
  if('integerValue' in v) return parseInt(v.integerValue,10);
  if('doubleValue' in v) return v.doubleValue;
  if('booleanValue' in v) return v.booleanValue;
  if('nullValue' in v) return null;
  if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec);
  if('mapValue' in v){ var o={},f=v.mapValue.fields||{}; for(var k in f) o[k]=dec(f[k]); return o; }
  return null;
}
function decDoc(doc){
  if(!doc||!doc.fields) return null;
  var o={}; for(var k in doc.fields) o[k]=dec(doc.fields[k]);
  return o;
}

function fetchDoc(coll,id){
  var url=BASE+coll+'/'+id, headers={};
  if(coll==='cmsDraft'){ var t=token(); if(!t) return Promise.resolve(null); headers.Authorization='Bearer '+t; }
  return fetch(url,{headers:headers,cache:'no-store'})
    .then(function(r){ if(!r.ok) return null; return r.json(); })
    .then(decDoc)
    .catch(function(){ return null; });
}

/* ---------- ١) ترقيع بيانات المحتوى (مراحل/دروس/اختبارات/عبارات) ---------- */
function num(v,d){ return (typeof v==='number'&&isFinite(v))?v:d; }
function reorder(arr,patchArr){
  /* patchArr: خريطة مفتاحها الفهرس الحالي كنص وفيها order اختياري */
  var dec2=arr.map(function(x,i){
    var p=patchArr&&patchArr[String(i)]||{};
    return {x:x,i:i,o:num(p.order,i)};
  });
  dec2.sort(function(a,b){ return a.o-b.o||a.i-b.i; });
  return dec2.map(function(d){ return d.x; });
}

function applyData(ov){
  if(!ov||typeof ov!=='object') return;
  var STAGES=window.QAWS_STAGES;

  /* المراحل */
  if(STAGES&&ov.stages){
    var sp=ov.stages;
    STAGES.forEach(function(st){
      var p=sp[st.id]; if(!p) return;
      if(p.name!=null) st.name=p.name;
      if(p.sub!=null) st.sub=p.sub;
      if(p.badge!=null) st.badge=p.badge;
      if(p.color!=null) st.color=p.color;
      st._cmsh=!!p.hidden;
      st._ord=num(p.order,st.idx);
      /* الوحدات */
      if(p.units&&st.units){
        st.units.forEach(function(un,ui){
          var up=p.units[String(ui)]; if(!up) return;
          if(up.name!=null) un.name=up.name;
          if(up.color!=null) un.color=up.color;
          un._cmsh=!!up.hidden;
          un._ord=num(up.order,ui);
          if(up.test){ un.test=un.test||{title:'اختبار '+un.name,questions:[]};
            if(up.test.title!=null) un.test.title=up.test.title;
            if(up.test.questions!=null) un.test.questions=up.test.questions;
            un._testHidden=!!up.test.hidden;
          }
          /* الدروس */
          if(up.lessons&&un.lessons){
            un.lessons.forEach(function(ls,li){
              var lp=up.lessons[String(li)]; if(!lp) return;
              if(lp.title!=null) ls.title=lp.title;
              if(lp.ty!=null) ls.ty=lp.ty;
              if(lp.type!=null) ls.type=lp.type;
              if(lp.videoUrl!=null) ls.videoUrl=lp.videoUrl;
              if(lp.body!=null) ls.body=lp.body;
              ls._cmsh=!!lp.hidden;
              ls._ord=num(lp.order,li);
            });
            var sorted=reorder(un.lessons,up.lessons);
            un.lessons.splice.apply(un.lessons,[0,un.lessons.length].concat(sorted));
          }
          (up.addLessons||[]).forEach(function(al){
            if(!al||!al.title) return;
            un.lessons.push({type:al.type||'video',ty:al.ty||al.title,title:al.title,
              videoUrl:al.videoUrl||'',body:al.body||'',_cmsh:!!al.hidden});
          });
        });
        var usorted=reorder(st.units,p.units);
        st.units.splice.apply(st.units,[0,st.units.length].concat(usorted));
      }
      (p.addUnits||[]).forEach(function(au){
        if(!au||!au.name) return;
        st.units.push({name:au.name,color:au.color||'u-blue',num:au.num||'•',
          lessons:[],test:{title:au.testTitle||('اختبار '+au.name),questions:[]},_cmsh:!!au.hidden});
      });
    });
    var ssorted=STAGES.map(function(st,i){return {x:st,i:i,o:num(st._ord,i)};})
      .sort(function(a,b){return a.o-b.o||a.i-b.i;}).map(function(d){return d.x;});
    STAGES.splice.apply(STAGES,[0,STAGES.length].concat(ssorted));
  }

  /* بنك الاختبارات */
  var EX=window.QAWS_EXAMS;
  if(EX&&ov.exams){
    var ep=ov.exams;
    for(var i=EX.length-1;i>=0;i--){
      var e=EX[i],p=ep[e.id]; if(!p) continue;
      if(p.hidden){ EX.splice(i,1); continue; }
      if(p.title!=null) e.title=p.title;
      if(p.stage!=null) e.stage=p.stage;
      if(p.minutes!=null) e.minutes=p.minutes;
      if(p.questions!=null) e.questions=p.questions;
      e._ord=num(p.order,i);
    }
    var esorted=EX.map(function(e,i){return {x:e,i:i,o:num(e._ord,i)};})
      .sort(function(a,b){return a.o-b.o||a.i-b.i;}).map(function(d){return d.x;});
    EX.splice.apply(EX,[0,EX.length].concat(esorted));
  }
  if(EX&&ov.addExams) ov.addExams.forEach(function(ae){
    if(!ae||!ae.id||!ae.title) return;
    if(EX.some(function(e){return e.id===ae.id;})) return;
    EX.push({id:ae.id,title:ae.title,stage:ae.stage||'',minutes:ae.minutes||5,questions:ae.questions||[]});
  });

  /* عبارات مس أسماء */
  if(ov.pools&&window.AsmaaPools){
    for(var k in ov.pools){
      if(Object.prototype.hasOwnProperty.call(ov.pools,k)&&Array.isArray(ov.pools[k])&&ov.pools[k].length)
        window.AsmaaPools[k]=ov.pools[k];
    }
  }
}

/* ---------- ٢) ترقيع الواجهة (نصوص/صور/CSS/أقسام) ---------- */
function applySite(ov){
  if(!ov||typeof ov!=='object'||typeof document==='undefined'||!document.documentElement) return;
  var texts=Array.isArray(ov.texts)?ov.texts:[];
  var imgs=Array.isArray(ov.imgs)?ov.imgs:[];
  var pairs=(Array.isArray(ov.replace)?ov.replace:[]).filter(function(r){return r&&r.from;});
  var hidden=Array.isArray(ov.hiddenSels)?ov.hiddenSels.filter(function(s){return s&&s.sel;}):[];
  var blocks=Array.isArray(ov.blocks)?ov.blocks.filter(function(b){return b&&b.sel&&b.html;}):[];
  var css=typeof ov.customCss==='string'?ov.customCss:'';

  var allCss=css;
  if(hidden.length) allCss+='\n'+hidden.map(function(h){return h.sel+'{display:none!important}';}).join('\n');
  if(allCss.trim()&&!document.getElementById('cms-css')){
    var st=document.createElement('style'); st.id='cms-css'; st.textContent=allCss;
    (document.head||document.documentElement).appendChild(st);
  }

  function slots(){
    var i,j;
    for(i=0;i<texts.length;i++){var t=texts[i]; if(!t||!t.sel||t.text==null) continue;
      try{var els=document.querySelectorAll(t.sel);
        for(j=0;j<els.length;j++) if(els[j].textContent!==t.text) els[j].textContent=t.text;
      }catch(e){}}
    for(i=0;i<imgs.length;i++){var im=imgs[i]; if(!im||!im.sel||!im.src) continue;
      try{var ims=document.querySelectorAll(im.sel);
        for(j=0;j<ims.length;j++) if(ims[j].getAttribute('src')!==im.src) ims[j].setAttribute('src',im.src);
      }catch(e){}}
    for(i=0;i<blocks.length;i++){var b=blocks[i];
      try{
        if(document.querySelector('[data-cms-block="'+i+'"]')) continue;
        var anchor=document.querySelector(b.sel); if(!anchor) continue;
        var el=document.createElement('div');
        el.setAttribute('data-cms-block',String(i));
        el.innerHTML=b.html;
        var nodes=Array.prototype.slice.call(el.childNodes);
        if(b.pos==='prepend'){ var first=anchor.firstChild; nodes.forEach(function(n){anchor.insertBefore(n,first);}); }
        else if(b.pos==='append'){ nodes.forEach(function(n){anchor.appendChild(n);}); }
        else if(b.pos==='after'){ nodes.reverse().forEach(function(n){anchor.parentNode.insertBefore(n,anchor.nextSibling);}); }
        else { nodes.reverse().forEach(function(n){anchor.parentNode.insertBefore(n,anchor);}); }
      }catch(e){}}
  }
  var onceGuard=[];
  function sweep(root){
    if(!pairs.length||!root) return;
    var w,arr=[],n;
    try{ w=document.createTreeWalker(root,4,null); }catch(e){ return; }
    while((n=w.nextNode())) arr.push(n);
    for(var i=0;i<arr.length;i++){
      var nd=arr[i],v=nd.nodeValue,nv=v;
      for(var p=0;p<pairs.length;p++){var r=pairs[p];
        if(nv.indexOf(r.from)<0) continue;
        if(r.to&&r.to.indexOf(r.from)>-1){
          onceGuard[p]=onceGuard[p]||[];
          if(onceGuard[p].indexOf(nd)>-1) continue;
          onceGuard[p].push(nd);
        }
        nv=nv.split(r.from).join(r.to==null?'':r.to);
      }
      if(nv!==v) nd.nodeValue=nv;
    }
  }
  function boot(){ slots(); if(document.body) sweep(document.body); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  if(!pairs.length&&!texts.length&&!imgs.length&&!blocks.length) return;
  var pend=false;
  try{
    new MutationObserver(function(muts){
      if(pend) return; pend=true;
      setTimeout(function(){
        pend=false;
        try{ slots(); }catch(e){}
        try{
          for(var i=0;i<muts.length;i++){var m=muts[i];
            if(m.type==='characterData'&&m.target&&m.target.parentNode) sweep(m.target.parentNode);
            for(var j=0;j<m.addedNodes.length;j++){var nd=m.addedNodes[j];
              if(nd.nodeType===1) sweep(nd);
              else if(nd.nodeType===3&&nd.parentNode) sweep(nd.parentNode);
            }
          }
        }catch(e){}
      },40);
    }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }catch(e){}
}

/* ---------- الإقلاع ---------- */
var _p=null;
function start(){
  if(_p) return _p;
  var coll=preview()?'cmsDraft':'cmsLive';
  _p=Promise.all([fetchDoc(coll,'site'),fetchDoc(coll,'data')]).then(function(rs){
    var site=rs[0],data=rs[1];
    if(data){ window.QAWSCMS_DATA=data; applyData(data); }
    if(site){ window.QAWSCMS_SITE=site; applySite(site); }
    /* أعد عرض الشاشة الحالية بعد ترقيع البيانات (تطبيق SPA يستمع لتغيّر الهاش) */
    if(data&&document.getElementById('app')){
      try{ window.dispatchEvent(new Event('hashchange')); }catch(e){}
    }
    return {site:site,data:data};
  }).catch(function(){ return null; });
  return _p;
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
}

window.QAWSCMS={applySite:applySite,applyData:applyData,start:start,fetchDoc:fetchDoc};
if(typeof module!=='undefined'&&module.exports) module.exports={applyData:applyData};
})();
