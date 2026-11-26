/* Qaws content structure — skeleton only, no lesson content yet.
   Each stage: units -> lessons (video / activity / exercise) + unit test.
   Lesson bodies are placeholders; content gets filled later per stage. */
(function(){
const N = ['١','٢','٣','٤','٥','٦','٧','٨','٩','١٠','١١'];
const UNIT_NAMES = ['الوحدة الأولى','الوحدة التانية','الوحدة التالتة','الوحدة الرابعة'];
const UNIT_COLORS = ['u-coral','u-blue','u-pink','u-green'];
const LESSON_TYPES = [
  {type:'video',    ty:'فيديو شرح',   title:'درس الشرح'},
  {type:'activity', ty:'نشاط تفاعلي', title:'النشاط التفاعلي'},
  {type:'exercise', ty:'تمرين',        title:'التمرين'},
];

function makeUnits(){
  return UNIT_NAMES.map((name,i)=>({
    name, color: UNIT_COLORS[i], num: N[i],
    lessons: LESSON_TYPES.map((t,j)=>({
      type: t.type, ty: t.ty,
      title: t.title + ' ' + N[j],
      // content slots to fill later:
      videoUrl: t.type==='video' ? '' : undefined,
      body: ''
    })),
    test: { title: 'اختبار ' + name, questions: [] }
  }));
}

window.QAWS_STAGES = [
  {id:'prekg',  name:'تمهيدي',        sub:'Pre-KG',  badge:'ت', color:'c-coral'},
  {id:'kg',     name:'رياض الأطفال',  sub:'KG',      badge:'ر', color:'c-yellow'},
  {id:'p1',     name:'أولى ابتدائي',  sub:'',        badge:'١', color:'c-blue'},
  {id:'p2',     name:'تانية ابتدائي', sub:'',        badge:'٢', color:'c-pink'},
  {id:'p3',     name:'تالتة ابتدائي', sub:'',        badge:'٣', color:'c-green'},
  {id:'p4',     name:'رابعة ابتدائي', sub:'',        badge:'٤', color:'c-coral'},
  {id:'p5',     name:'خامسة ابتدائي', sub:'',        badge:'٥', color:'c-yellow'},
  {id:'p6',     name:'سادسة ابتدائي', sub:'',        badge:'٦', color:'c-blue'},
  {id:'m1',     name:'أولى إعدادي',   sub:'',        badge:'١', color:'c-pink'},
  {id:'m2',     name:'تانية إعدادي',  sub:'',        badge:'٢', color:'c-green'},
  {id:'m3',     name:'تالتة إعدادي',  sub:'',        badge:'٣', color:'c-coral'},
].map((s,i)=>Object.assign(s, {idx:i, units: makeUnits()}));
})();
