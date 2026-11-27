/* إعدادات منصة قَوْس — يعدّلها يوسف عند الحاجة */
window.QAWS_CONFIG = {

  /* كود دخول المعلّمة لصفحة إدارة الاختبارات — محفوظ كبصمة SHA-256 فقط وليس كنص واضح.
     لتغييره يوسف: ضع بصمة sha256 للكود الجديد هنا. الحماية النهائية ستنتقل لحساب فايربيس. */
  ownerPassHash: 'f0560ae8da3a79a1ee6a23440c4fa197613cced6142930a3e5410f6a46dd453b',

  /* اسم المعلّمة كما يظهر للطلاب */
  ownerName: 'مس أسماء',

  /* رقم واتساب مس أسماء بالصيغة الدولية بدون + مثل: 2010XXXXXXXX
     اتركه فارغًا '' لإخفاء زر الواتساب */
  whatsapp: '201281938078',
  phone: '01281938078',

  /* بريد مس أسماء الذي تدخل به لوحة الشات — يُملأ بعد إنشاء حسابها في فايربيس.
     الشات لا يتفعّل للطلاب إلا بعد ملء هذا الحقل (حماية حتى تجهز القواعد والحساب). */
  ownerEmail: 'asmaaboelftooh@gmail.com',

  /* إعدادات فايربيس — مشروع qaws-a9d34 (أُنشئ للمنصة، المفاتيح عامة بطبيعتها
     والحماية في قواعد firestore.rules). الخطوات في FIREBASE-SETUP.md */
  firebase: {
    apiKey: 'AIzaSyCF8Pptak45zB5Qef-20TaHrU2YtkoASVw',
    authDomain: 'qaws-a9d34.firebaseapp.com',
    projectId: 'qaws-a9d34',
    storageBucket: 'qaws-a9d34.firebasestorage.app',
    messagingSenderId: '236260934457',
    appId: '1:236260934457:web:09055413524dd30d331ee8'
  }
};
