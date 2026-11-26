/* Qaws content structure — skeleton only, no lesson content yet.
   Each stage: units -> lessons (video / activity / exercise) + unit test.
   Lesson bodies are placeholders; content gets filled later per stage. */
(function(){
const N = ['١','٢','٣','٤','٥','٦','٧','٨','٩','١٠','١١'];
const UNIT_NAMES = ['الوحدة الأولى','الوحدة الثانية','الوحدة الثالثة','الوحدة الرابعة'];
const UNIT_COLORS = ['u-coral','u-blue','u-pink','u-green'];
const LESSON_TYPES = [
  {type:'video',    ty:'فيديو الشرح',   title:'درس الشرح'},
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
  {id:'prekg',  name:'Pre-Kg',        sub:'Pre-KG',  badge:'P', color:'c-coral'},
  {id:'kg',     name:'KG',            sub:'KG',      badge:'K', color:'c-yellow'},
  {id:'p1',     name:'الأول الابتدائي',  sub:'',        badge:'١', color:'c-blue'},
  {id:'p2',     name:'الثاني الابتدائي', sub:'',        badge:'٢', color:'c-pink'},
  {id:'p3',     name:'الثالث الابتدائي', sub:'',        badge:'٣', color:'c-green'},
  {id:'p4',     name:'الرابع الابتدائي', sub:'',        badge:'٤', color:'c-coral'},
  {id:'p5',     name:'الخامس الابتدائي', sub:'',        badge:'٥', color:'c-yellow'},
  {id:'p6',     name:'السادس الابتدائي', sub:'',        badge:'٦', color:'c-blue'},
  {id:'m1',     name:'الأول الإعدادي',   sub:'',        badge:'١', color:'c-pink'},
  {id:'m2',     name:'الثاني الإعدادي',  sub:'',        badge:'٢', color:'c-green'},
  {id:'m3',     name:'الثالث الإعدادي',  sub:'',        badge:'٣', color:'c-coral'},
].map((s,i)=>Object.assign(s, {idx:i, units: makeUnits()}));
})();
