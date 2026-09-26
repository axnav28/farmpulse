import type { AdvisoryPriority, AdvisoryStatus } from '../components/AdvisoryStatusBadge';

export type AdvisoryLanguage = 'English' | 'Hindi' | 'Marathi' | 'Bengali' | 'Tamil' | 'Telugu' | 'Gujarati' | 'Kannada';

export interface AdvisoryLocalizedContent {
  detectedProblem: string;
  recommendedAction: string;
  farmerMessage: string;
}

export interface AdvisoryRecord {
  id: string;
  farmerName: string;
  village: string;
  farmId: string;
  detectedProblem: string;
  recommendedAction: string;
  farmerMessage: string;
  priority: AdvisoryPriority;
  status: AdvisoryStatus;
  timestamp: string;
}

export const advisorySeedData: AdvisoryRecord[] = [
  {
    id: 'adv-001',
    farmerName: 'Ramesh Kumar',
    village: 'Hardoi, Uttar Pradesh',
    farmId: 'UP-WHT-2041',
    detectedProblem: 'Low soil moisture detected in the northeast wheat plot',
    recommendedAction: 'Irrigate the affected section within 48 hours and inspect for moisture recovery on the next field visit',
    farmerMessage: 'Your wheat crop may weaken due to low moisture. Please irrigate the affected section within 2 days and follow up with your local field officer if the soil remains dry.',
    priority: 'High',
    status: 'Pending',
    timestamp: '2026-04-11T09:10:00+05:30',
  },
  {
    id: 'adv-002',
    farmerName: 'Sunita Devi',
    village: 'Kota, Rajasthan',
    farmId: 'RJ-MST-1187',
    detectedProblem: 'Heat stress signal rising across the mustard parcel',
    recommendedAction: 'Shift irrigation to early morning, inspect flower retention, and notify extension staff if canopy loss expands',
    farmerMessage: 'Heat stress may affect your mustard crop. Irrigate early in the morning and contact the extension officer if flower drop increases.',
    priority: 'Medium',
    status: 'Delivered',
    timestamp: '2026-04-11T08:25:00+05:30',
  },
  {
    id: 'adv-003',
    farmerName: 'Harpreet Singh',
    village: 'Moga, Punjab',
    farmId: 'PB-RCE-4572',
    detectedProblem: 'Standing water risk detected after repeated rainfall in the paddy plot',
    recommendedAction: 'Drain excess water within 24 hours and inspect root health before the next advisory cycle',
    farmerMessage: 'Waterlogging risk is rising in your paddy field. Drain excess water within 1 day and speak with your extension worker if yellowing spreads.',
    priority: 'High',
    status: 'Failed',
    timestamp: '2026-04-11T07:40:00+05:30',
  },
  {
    id: 'adv-004',
    farmerName: 'Meena Patil',
    village: 'Belagavi, Karnataka',
    farmId: 'KA-SGN-3348',
    detectedProblem: 'Pest-risk signal elevated on the sugarcane block',
    recommendedAction: 'Conduct a pest scouting visit in the next 72 hours and prepare a location-specific spray advisory if infestation is confirmed',
    farmerMessage: 'A pest-risk alert has been detected for your sugarcane field. Please allow a field inspection within 3 days and follow the official spray guidance if advised.',
    priority: 'Medium',
    status: 'Acknowledged',
    timestamp: '2026-04-10T17:15:00+05:30',
  },
  {
    id: 'adv-005',
    farmerName: 'Asha Naik',
    village: 'Koraput, Odisha',
    farmId: 'OD-MIL-9062',
    detectedProblem: 'Vegetation stress anomaly detected in the rainfed millet plot',
    recommendedAction: 'Prioritize a field verification visit and assess moisture and nutrient stress before the next rainfall window',
    farmerMessage: 'Stress has been detected in your millet field. A field visit is being prioritized to check moisture and nutrient conditions before the next rain.',
    priority: 'Low',
    status: 'Pending',
    timestamp: '2026-04-10T15:00:00+05:30',
  },
  {
    id: 'adv-006',
    farmerName: 'Venkatesh Rao',
    village: 'Guntur, Andhra Pradesh',
    farmId: 'AP-CHL-6714',
    detectedProblem: 'Temperature spike likely to affect chilli fruit setting',
    recommendedAction: 'Issue shade and irrigation timing guidance through the block extension office before the afternoon heat peak',
    farmerMessage: 'High temperature may affect chilli fruit setting. Follow irrigation timing guidance from your block extension office before peak afternoon heat.',
    priority: 'Medium',
    status: 'Delivered',
    timestamp: '2026-04-10T13:30:00+05:30',
  },
];

const advisoryTranslations: Record<string, Record<AdvisoryLanguage, AdvisoryLocalizedContent>> = {
  'adv-001': {
    English: {
      detectedProblem: 'Low soil moisture detected in the northeast wheat plot',
      recommendedAction: 'Irrigate the affected section within 48 hours and inspect for moisture recovery on the next field visit',
      farmerMessage: 'Your wheat crop may weaken due to low moisture. Please irrigate the affected section within 2 days and follow up with your local field officer if the soil remains dry.',
    },
    Hindi: {
      detectedProblem: 'उत्तर-पूर्वी गेहूं प्लॉट में मिट्टी की नमी कम पाई गई है',
      recommendedAction: 'प्रभावित हिस्से में 48 घंटे के भीतर सिंचाई करें और अगली फील्ड विजिट में नमी की स्थिति जांचें',
      farmerMessage: 'आपकी गेहूं फसल कम नमी के कारण कमजोर हो सकती है। कृपया 2 दिनों के भीतर प्रभावित हिस्से में सिंचाई करें और मिट्टी सूखी रहे तो स्थानीय कृषि अधिकारी से संपर्क करें।',
    },
    Marathi: {
      detectedProblem: 'ईशान्य गहू पट्ट्यात मातीतील ओलावा कमी आढळला आहे',
      recommendedAction: 'प्रभावित भागात 48 तासांच्या आत पाणी द्या आणि पुढील भेटीत ओलाव्याची स्थिती तपासा',
      farmerMessage: 'मातीतील कमी ओलाव्यामुळे तुमची गहू पिके कमकुवत होऊ शकतात. कृपया 2 दिवसांत प्रभावित भागाला पाणी द्या आणि जमीन कोरडी राहिल्यास स्थानिक कृषी अधिकाऱ्याशी संपर्क साधा.',
    },
    Bengali: {
      detectedProblem: 'উত্তর-পূর্ব গমের প্লটে মাটির আর্দ্রতা কম ধরা পড়েছে',
      recommendedAction: '৪৮ ঘণ্টার মধ্যে ক্ষতিগ্রস্ত অংশে সেচ দিন এবং পরবর্তী পরিদর্শনে আর্দ্রতা পরীক্ষা করুন',
      farmerMessage: 'কম মাটির আর্দ্রতার কারণে আপনার গমের ফসল দুর্বল হতে পারে। অনুগ্রহ করে ২ দিনের মধ্যে প্রভাবিত অংশে সেচ দিন এবং মাটি শুকনো থাকলে স্থানীয় কৃষি কর্মকর্তার সঙ্গে যোগাযোগ করুন।',
    },
    Tamil: {
      detectedProblem: 'வடகிழக்கு கோதுமை நிலத்தில் மண் ஈரப்பதம் குறைவாக உள்ளது',
      recommendedAction: '48 மணி நேரத்திற்குள் பாதிக்கப்பட்ட பகுதியை பாசனம் செய்து அடுத்த பார்வையில் ஈரப்பதத்தை சரிபார்க்கவும்',
      farmerMessage: 'மண் ஈரப்பதம் குறைவதால் உங்கள் கோதுமை பயிர் பலவீனமாகலாம். தயவுசெய்து 2 நாட்களுக்குள் பாதிக்கப்பட்ட பகுதியில் பாசனம் செய்யவும்; மண் இன்னும் வறண்டிருந்தால் உள்ளூர் விரிவாக்க அலுவலரை தொடர்பு கொள்ளவும்.',
    },
    Telugu: {
      detectedProblem: 'ఈశాన్య గోధుమ పొలంలో నేల తేమ తక్కువగా గుర్తించబడింది',
      recommendedAction: '48 గంటల్లో ప్రభావిత భాగానికి నీరు పెట్టి, తదుపరి పర్యవేక్షణలో తేమ స్థాయిని తనిఖీ చేయండి',
      farmerMessage: 'తక్కువ నేల తేమ కారణంగా మీ గోధుమ పంట బలహీనపడవచ్చు. దయచేసి 2 రోజుల్లో ప్రభావిత భాగానికి నీరు పెట్టండి; నేల ఇంకా ఎండగా ఉంటే స్థానిక వ్యవసాయ అధికారిని సంప్రదించండి.',
    },
    Gujarati: {
      detectedProblem: 'ઉત્તર-પૂર્વ ગહૂં પ્લોટમાં જમીનની ભેજ ઓછી જોવા મળી છે',
      recommendedAction: '48 કલાકમાં અસરગ્રસ્ત ભાગને સિંચાઈ આપો અને આગામી મુલાકાતે ભેજની સ્થિતિ તપાસો',
      farmerMessage: 'જમીનમાં ભેજ ઓછી હોવાથી તમારી ગહૂંની પાક નબળી પડી શકે છે. કૃપા કરીને 2 દિવસમાં અસરગ્રસ્ત ભાગને પાણી આપો અને જમીન સુકી રહે તો સ્થાનિક કૃષિ અધિકારીનો સંપર્ક કરો.',
    },
    Kannada: {
      detectedProblem: 'ಈಶಾನ್ಯ ಗೋಧಿ ಹೊಲದಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆಯಾಗಿದೆ',
      recommendedAction: '48 ಗಂಟೆಗಳ ಒಳಗೆ ബാധಿತ ಭಾಗಕ್ಕೆ ನೀರಾವರಿ ನೀಡಿ ಮತ್ತು ಮುಂದಿನ ಭೇಟಿ ವೇಳೆ ತೇವಾಂಶ ಪರಿಶೀಲಿಸಿ',
      farmerMessage: 'ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆ ಇರುವುದರಿಂದ ನಿಮ್ಮ ಗೋಧಿ ಬೆಳೆ ದುರ್ಬಲವಾಗಬಹುದು. ದಯವಿಟ್ಟು 2 ದಿನಗಳ ಒಳಗೆ ബാധಿತ ಭಾಗಕ್ಕೆ ನೀರು ನೀಡಿ; ಮಣ್ಣು ಇನ್ನೂ ಒಣವಾಗಿದ್ದರೆ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    },
  },
  'adv-002': {
    English: {
      detectedProblem: 'Heat stress signal rising across the mustard parcel',
      recommendedAction: 'Shift irrigation to early morning, inspect flower retention, and notify extension staff if canopy loss expands',
      farmerMessage: 'Heat stress may affect your mustard crop. Irrigate early in the morning and contact the extension officer if flower drop increases.',
    },
    Hindi: {
      detectedProblem: 'सरसों के खेत में गर्मी के तनाव का संकेत बढ़ रहा है',
      recommendedAction: 'सिंचाई सुबह जल्दी करें, फूलों की स्थिति देखें और नुकसान बढ़ने पर विस्तार कर्मियों को सूचित करें',
      farmerMessage: 'गर्मी का तनाव आपकी सरसों फसल को प्रभावित कर सकता है। सुबह जल्दी सिंचाई करें और फूल गिरने लगे तो विस्तार अधिकारी से संपर्क करें।',
    },
    Marathi: {
      detectedProblem: 'मोहरीच्या शेतात उष्णतेचा ताण वाढत आहे',
      recommendedAction: 'पहाटे सिंचन करा, फुलांची स्थिती तपासा आणि हानी वाढल्यास विस्तार अधिकाऱ्यांना कळवा',
      farmerMessage: 'उष्णतेचा ताण तुमच्या मोहरीच्या पिकावर परिणाम करू शकतो. सकाळी लवकर पाणी द्या आणि फुले गळू लागल्यास विस्तार अधिकाऱ्याशी संपर्क साधा.',
    },
    Bengali: {
      detectedProblem: 'সরিষার জমিতে তাপজনিত চাপের সংকেত বাড়ছে',
      recommendedAction: 'ভোরে সেচ দিন, ফুল ধরে থাকার অবস্থা দেখুন এবং ক্ষতি বাড়লে সম্প্রসারণ কর্মীদের জানান',
      farmerMessage: 'তাপজনিত চাপ আপনার সরিষা ফসলে প্রভাব ফেলতে পারে। ভোরে সেচ দিন এবং ফুল ঝরতে থাকলে কৃষি সম্প্রসারণ কর্মকর্তার সঙ্গে যোগাযোগ করুন।',
    },
    Tamil: {
      detectedProblem: 'கடுகு நிலத்தில் வெப்ப அழுத்த சிக்னல் அதிகரிக்கிறது',
      recommendedAction: 'அதிகாலை பாசனம் செய்யவும், மலர் நிலையைப் பாருங்கள், இலை சேதம் அதிகரித்தால் விரிவாக்க குழுவுக்கு தெரிவிக்கவும்',
      farmerMessage: 'வெப்ப அழுத்தம் உங்கள் கடுகு பயிரை பாதிக்கலாம். அதிகாலை பாசனம் செய்யவும்; மலர்கள் உதிரத் தொடங்கினால் விரிவாக்க அலுவலரை தொடர்பு கொள்ளவும்.',
    },
    Telugu: {
      detectedProblem: 'ఆవాల పొలంలో వేడి ఒత్తిడి సంకేతం పెరుగుతోంది',
      recommendedAction: 'ఉదయం తొందరగా నీరుపారుదల చేయండి, పూల నిల్వను చూడండి, నష్టం పెరిగితే విస్తరణ సిబ్బందికి తెలియజేయండి',
      farmerMessage: 'వేడి ఒత్తిడి మీ ఆవాల పంటను ప్రభావితం చేయవచ్చు. ఉదయం త్వరగా నీరు పెట్టండి; పూల రాలిక పెరిగితే విస్తరణ అధికారిని సంప్రదించండి.',
    },
    Gujarati: {
      detectedProblem: 'રાઈના ખેતરમાં ગરમીના તાણનું સંકેત વધી રહ્યું છે',
      recommendedAction: 'સવારે વહેલી સિંચાઈ કરો, ફૂલની સ્થિતિ જુઓ અને નુકસાન વધે તો વિસ્તરણ ટીમને જાણ કરો',
      farmerMessage: 'ગરમીનો તાણ તમારી રાઈની પાકને અસર કરી શકે છે. સવારે વહેલી સિંચાઈ કરો અને ફૂલ પડવા લાગે તો વિસ્તરણ અધિકારીનો સંપર્ક કરો.',
    },
    Kannada: {
      detectedProblem: 'ಸಾಸಿವೆ ತೋಟದಲ್ಲಿ ಬಿಸಿಗಾಳಿ ಒತ್ತಡದ ಸೂಚನೆ ಹೆಚ್ಚುತ್ತಿದೆ',
      recommendedAction: 'ಬೆಳಿಗ್ಗೆ ಬೇಗ ನೀರಾವರಿ ಮಾಡಿ, ಹೂವಿನ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ, ಹಾನಿ ಹೆಚ್ಚಾದರೆ ವಿಸ್ತರಣಾ ಸಿಬ್ಬಂದಿಗೆ ತಿಳಿಸಿ',
      farmerMessage: 'ಬಿಸಿಗಾಳಿ ಒತ್ತಡವು ನಿಮ್ಮ ಸಾಸಿವೆ ಬೆಳೆ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ. ಬೆಳಿಗ್ಗೆ ಬೇಗ ನೀರು ನೀಡಿ; ಹೂಗಳು ಬೀಳಲು ಆರಂಭಿಸಿದರೆ ವಿಸ್ತರಣಾ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    },
  },
  'adv-003': {
    English: {
      detectedProblem: 'Standing water risk detected after repeated rainfall in the paddy plot',
      recommendedAction: 'Drain excess water within 24 hours and inspect root health before the next advisory cycle',
      farmerMessage: 'Waterlogging risk is rising in your paddy field. Drain excess water within 1 day and speak with your extension worker if yellowing spreads.',
    },
    Hindi: {
      detectedProblem: 'धान के खेत में बार-बार बारिश के बाद जलभराव का जोखिम मिला है',
      recommendedAction: '24 घंटे में अतिरिक्त पानी निकालें और अगले चक्र से पहले जड़ों की स्थिति जांचें',
      farmerMessage: 'आपके धान के खेत में जलभराव का जोखिम बढ़ रहा है। 1 दिन के भीतर अतिरिक्त पानी निकालें और पीलापन बढ़े तो विस्तार कार्यकर्ता से बात करें।',
    },
    Marathi: {
      detectedProblem: 'धानाच्या शेतात वारंवार पावसानंतर पाणी साचण्याचा धोका आढळला आहे',
      recommendedAction: '24 तासांत अतिरिक्त पाणी काढून टाका आणि पुढील सल्ल्यापूर्वी मुळांची स्थिती तपासा',
      farmerMessage: 'तुमच्या धानाच्या शेतात पाणी साचण्याचा धोका वाढत आहे. 1 दिवसात अतिरिक्त पाणी काढा आणि पिवळेपणा वाढल्यास विस्तार कर्मचाऱ्याशी बोला.',
    },
    Bengali: {
      detectedProblem: 'ধানের জমিতে বারবার বৃষ্টির পরে জল দাঁড়িয়ে থাকার ঝুঁকি ধরা পড়েছে',
      recommendedAction: '২৪ ঘণ্টার মধ্যে অতিরিক্ত জল নামান এবং পরবর্তী পরামর্শের আগে শিকড়ের অবস্থা দেখুন',
      farmerMessage: 'আপনার ধানের জমিতে জলাবদ্ধতার ঝুঁকি বাড়ছে। ১ দিনের মধ্যে অতিরিক্ত জল বের করুন এবং হলদে ভাব বাড়লে সম্প্রসারণ কর্মীর সঙ্গে কথা বলুন।',
    },
    Tamil: {
      detectedProblem: 'நெல் வயலில் தொடர்ச்சியான மழைக்கு பின் நீர் தேக்கம் அபாயம் கண்டறியப்பட்டது',
      recommendedAction: '24 மணி நேரத்தில் அதிகப்படியான நீரை வடித்து அடுத்த ஆலோசனைக்கு முன் வேர் நிலையைப் பார்க்கவும்',
      farmerMessage: 'உங்கள் நெல் வயலில் நீர்நிலை அபாயம் அதிகரிக்கிறது. 1 நாளுக்குள் அதிக நீரை வெளியேற்றவும்; மஞ்சள் நிறம் அதிகரித்தால் விரிவாக்க பணியாளரை தொடர்பு கொள்ளவும்.',
    },
    Telugu: {
      detectedProblem: 'వరి పొలంలో వరుస వర్షాల తరువాత నీరు నిల్వ ఉండే ప్రమాదం గుర్తించబడింది',
      recommendedAction: '24 గంటల్లో అదనపు నీటిని బయటకు పంపి తదుపరి సలహాకు ముందు వేర్ల పరిస్థితిని పరిశీలించండి',
      farmerMessage: 'మీ వరి పొలంలో నీటి నిల్వ ప్రమాదం పెరుగుతోంది. 1 రోజులో అదనపు నీటిని తొలగించండి; ఆకులు పసుపు పడితే విస్తరణ సిబ్బందిని సంప్రదించండి.',
    },
    Gujarati: {
      detectedProblem: 'ધાનના ખેતરમાં વારંવાર વરસાદ પછી પાણી ભરાવાનો ખતરો મળ્યો છે',
      recommendedAction: '24 કલાકમાં વધારાનું પાણી કાઢી નાખો અને આગામી સલાહ પહેલાં મૂળોની સ્થિતિ તપાસો',
      farmerMessage: 'તમારા ધાનના ખેતરમાં પાણી ભરાવાનો ખતરો વધી રહ્યો છે. 1 દિવસમાં વધારાનું પાણી કાઢો અને પીળાશ ફેલાય તો વિસ્તરણ કર્મચારીનો સંપર્ક કરો.',
    },
    Kannada: {
      detectedProblem: 'ನೆಲದ ಅಕ್ಕಿ ಹೊಲದಲ್ಲಿ ಮರುಮರು ಮಳೆಯಿಂದ ನೀರು ನಿಂತುಕೊಳ್ಳುವ ಅಪಾಯ ಕಂಡುಬಂದಿದೆ',
      recommendedAction: '24 ಗಂಟೆಗಳೊಳಗೆ ಹೆಚ್ಚುವರಿ ನೀರನ್ನು ಹೊರಹಾಕಿ ಮುಂದಿನ ಸಲಹೆಯ ಮೊದಲು ಬೇರುಗಳ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ',
      farmerMessage: 'ನಿಮ್ಮ ಅಕ್ಕಿ ಹೊಲದಲ್ಲಿ ನೀರು ನಿಲ್ಲುವ ಅಪಾಯ ಹೆಚ್ಚುತ್ತಿದೆ. 1 ದಿನದೊಳಗೆ ಹೆಚ್ಚುವರಿ ನೀರನ್ನು ತೆಗೆದುಹಾಕಿ; ಹಳದಿ ಬಣ್ಣ ಹೆಚ್ಚಾದರೆ ವಿಸ್ತರಣಾ ಸಿಬ್ಬಂದಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    },
  },
  'adv-004': {
    English: {
      detectedProblem: 'Pest-risk signal elevated on the sugarcane block',
      recommendedAction: 'Conduct a pest scouting visit in the next 72 hours and prepare a location-specific spray advisory if infestation is confirmed',
      farmerMessage: 'A pest-risk alert has been detected for your sugarcane field. Please allow a field inspection within 3 days and follow the official spray guidance if advised.',
    },
    Hindi: {
      detectedProblem: 'गन्ना क्षेत्र में कीट जोखिम संकेत बढ़ा हुआ है',
      recommendedAction: 'अगले 72 घंटों में फील्ड निरीक्षण करें और संक्रमण की पुष्टि होने पर स्थान-विशिष्ट स्प्रे सलाह तैयार करें',
      farmerMessage: 'आपके गन्ने के खेत के लिए कीट जोखिम चेतावनी मिली है। कृपया 3 दिनों के भीतर निरीक्षण की अनुमति दें और आधिकारिक स्प्रे सलाह का पालन करें।',
    },
    Marathi: {
      detectedProblem: 'ऊस पट्ट्यात कीड जोखमीचा संकेत वाढला आहे',
      recommendedAction: 'पुढील 72 तासांत शेत तपासणी करा आणि प्रादुर्भाव निश्चित झाल्यास स्थानिक फवारणी सल्ला तयार करा',
      farmerMessage: 'तुमच्या ऊस शेतासाठी कीड जोखमीचा इशारा आढळला आहे. कृपया 3 दिवसांत शेत तपासणी होऊ द्या आणि अधिकृत फवारणी मार्गदर्शनाचे पालन करा.',
    },
    Bengali: {
      detectedProblem: 'আখের জমিতে পোকা ঝুঁকির সংকেত বেড়েছে',
      recommendedAction: 'পরবর্তী ৭২ ঘণ্টার মধ্যে মাঠ পরিদর্শন করুন এবং আক্রমণ নিশ্চিত হলে স্থানভিত্তিক স্প্রে পরামর্শ দিন',
      farmerMessage: 'আপনার আখের জমির জন্য পোকা ঝুঁকির সতর্কতা ধরা পড়েছে। ৩ দিনের মধ্যে মাঠ পরিদর্শনের সুযোগ দিন এবং প্রয়োজনে সরকারি স্প্রে নির্দেশনা অনুসরণ করুন।',
    },
    Tamil: {
      detectedProblem: 'கரும்பு பகுதியிலில் பூச்சி அபாய சிக்னல் உயர்ந்துள்ளது',
      recommendedAction: 'அடுத்த 72 மணிநேரத்தில் புல ஆய்வு செய்து தாக்கம் உறுதியாக இருந்தால் பகுதி-சார்ந்த தெளிப்பு ஆலோசனை தயாரிக்கவும்',
      farmerMessage: 'உங்கள் கரும்பு வயலுக்கு பூச்சி அபாய எச்சரிக்கை கிடைத்துள்ளது. தயவுசெய்து 3 நாட்களுக்குள் புல ஆய்வை அனுமதிக்கவும்; தேவையானால் அதிகாரப்பூர்வ தெளிப்பு வழிகாட்டுதலைப் பின்பற்றவும்.',
    },
    Telugu: {
      detectedProblem: 'చెరకు బ్లాక్‌లో పురుగు ప్రమాద సంకేతం పెరిగింది',
      recommendedAction: 'తదుపరి 72 గంటల్లో పీడకల పరిశీలన చేసి, ప్రభావం నిర్ధారణ అయితే ప్రాంతానుసారంగా స్ప్రే సలహా సిద్ధం చేయండి',
      farmerMessage: 'మీ చెరకు పొలానికి పురుగు ప్రమాద హెచ్చరిక గుర్తించబడింది. దయచేసి 3 రోజుల్లోపు ఫీల్డ్ తనిఖీకి అనుమతించండి మరియు అవసరమైతే అధికారిక స్ప్రే సూచనలను అనుసరించండి.',
    },
    Gujarati: {
      detectedProblem: 'ઉસના ખંડમાં જીવાત જોખમનું સંકેત વધી ગયું છે',
      recommendedAction: 'આગામી 72 કલાકમાં ખેતર નિરીક્ષણ કરો અને પ્રકોપની પુષ્ટિ થાય તો વિસ્તાર-વિશેષ સ્પ্রে સલાહ તૈયાર કરો',
      farmerMessage: 'તમારા ઉસના ખેતર માટે જીવાત જોખમ એલર્ટ મળ્યું છે. કૃપા કરીને 3 દિવસની અંદર ખેતર તપાસ થવા દો અને જરૂરી હોય તો સત્તાવાર સ્પ্রে માર્ગદર્શન અનુસરો.',
    },
    Kannada: {
      detectedProblem: 'ಕಬ್ಬು ಭಾಗದಲ್ಲಿ ಕೀಟ ಅಪಾಯದ ಸೂಚನೆ ಹೆಚ್ಚಾಗಿದೆ',
      recommendedAction: 'ಮುಂದಿನ 72 ಗಂಟೆಗಳಲ್ಲಿ ಕೀಟ ಪರಿಶೀಲನೆ ನಡೆಸಿ ದಾಳಿ ದೃಢಪಟ್ಟರೆ ಸ್ಥಳಾನುಗುಣ ಸಿಂಪಡಣೆ ಸಲಹೆ ಸಿದ್ಧಪಡಿಸಿ',
      farmerMessage: 'ನಿಮ್ಮ ಕಬ್ಬು ಹೊಲಕ್ಕೆ ಕೀಟ ಅಪಾಯದ ಎಚ್ಚರಿಕೆ ಕಂಡುಬಂದಿದೆ. ದಯವಿಟ್ಟು 3 ದಿನಗಳೊಳಗೆ ಹೊಲ ಪರಿಶೀಲನೆಗೆ ಅವಕಾಶ ನೀಡಿ ಮತ್ತು ಅಗತ್ಯವಿದ್ದರೆ ಅಧಿಕೃತ ಸಿಂಪಡಣೆ ಮಾರ್ಗದರ್ಶನವನ್ನು ಅನುಸರಿಸಿ.',
    },
  },
  'adv-005': {
    English: {
      detectedProblem: 'Vegetation stress anomaly detected in the rainfed millet plot',
      recommendedAction: 'Prioritize a field verification visit and assess moisture and nutrient stress before the next rainfall window',
      farmerMessage: 'Stress has been detected in your millet field. A field visit is being prioritized to check moisture and nutrient conditions before the next rain.',
    },
    Hindi: {
      detectedProblem: 'बारानी बाजरा खेत में वनस्पति तनाव असामान्यता पाई गई है',
      recommendedAction: 'फील्ड सत्यापन को प्राथमिकता दें और अगली बारिश से पहले नमी व पोषक तनाव का आकलन करें',
      farmerMessage: 'आपके बाजरा खेत में तनाव पाया गया है। अगली बारिश से पहले नमी और पोषक स्थिति जांचने के लिए फील्ड विजिट प्राथमिकता पर रखी गई है।',
    },
    Marathi: {
      detectedProblem: 'पावसावर अवलंबून असलेल्या बाजरीच्या शेतात वनस्पती ताण आढळला आहे',
      recommendedAction: 'शेत पडताळणीला प्राधान्य द्या आणि पुढील पावसापूर्वी ओलावा व पोषण ताण तपासा',
      farmerMessage: 'तुमच्या बाजरीच्या शेतात ताण आढळला आहे. पुढील पावसापूर्वी ओलावा आणि पोषण स्थिती तपासण्यासाठी शेत भेट प्राधान्याने केली जात आहे.',
    },
    Bengali: {
      detectedProblem: 'বৃষ্টিনির্ভর মিলেট জমিতে উদ্ভিদ চাপের অস্বাভাবিকতা ধরা পড়েছে',
      recommendedAction: 'মাঠ যাচাইকে অগ্রাধিকার দিন এবং পরের বৃষ্টির আগে আর্দ্রতা ও পুষ্টির চাপ মূল্যায়ন করুন',
      farmerMessage: 'আপনার মিলেট জমিতে চাপ শনাক্ত হয়েছে। পরের বৃষ্টির আগে আর্দ্রতা ও পুষ্টির অবস্থা দেখতে মাঠ পরিদর্শনকে অগ্রাধিকার দেওয়া হচ্ছে।',
    },
    Tamil: {
      detectedProblem: 'மழை சார்ந்த கேழ்வரகு நிலத்தில் தாவர அழுத்த அசாதாரணம் கண்டறியப்பட்டது',
      recommendedAction: 'புல சரிபார்ப்பை முன்னுரிமையாக்கி அடுத்த மழைக்கு முன் ஈரப்பதம் மற்றும் ஊட்டச்சத்து அழுத்தத்தை மதிப்பிடுங்கள்',
      farmerMessage: 'உங்கள் கேழ்வரகு வயலில் அழுத்தம் கண்டறியப்பட்டுள்ளது. அடுத்த மழைக்கு முன் ஈரப்பதம் மற்றும் ஊட்டச்சத்து நிலையைப் பார்ப்பதற்காக புல ஆய்வு முன்னுரிமைப்படுத்தப்பட்டுள்ளது.',
    },
    Telugu: {
      detectedProblem: 'వర్షాధార మిల్లెట్ పొలంలో వృక్ష ఒత్తిడి అసాధారణత గుర్తించబడింది',
      recommendedAction: 'ఫీల్డ్ నిర్ధారణకు ప్రాధాన్యం ఇచ్చి, తదుపరి వర్షానికి ముందు తేమ మరియు పోషక ఒత్తిడిని అంచనా వేయండి',
      farmerMessage: 'మీ మిల్లెట్ పొలంలో ఒత్తిడి గుర్తించబడింది. తదుపరి వర్షానికి ముందు తేమ మరియు పోషక పరిస్థితిని పరీక్షించేందుకు ఫీల్డ్ సందర్శనకు ప్రాధాన్యం ఇస్తున్నారు.',
    },
    Gujarati: {
      detectedProblem: 'વરસાદ આધારિત મિલેટ ખેતરમાં વનસ્પતિ તાણ અસામાન્યતા મળી છે',
      recommendedAction: 'ખેતર ચકાસણીને પ્રાથમિકતા આપો અને આગામી વરસાદ પહેલાં ભેજ અને પોષક તાણનું મૂલ્યાંકન કરો',
      farmerMessage: 'તમારા મિલેટ ખેતરમાં તાણ જોવા મળ્યો છે. આગામી વરસાદ પહેલાં ભેજ અને પોષક સ્થિતિ તપાસવા માટે ખેતર મુલાકાતને પ્રાથમિકતા આપવામાં આવી છે.',
    },
    Kannada: {
      detectedProblem: 'ಮಳೆಯಾಧಾರಿತ ಸಜ್ಜೆ ಹೊಲದಲ್ಲಿ ಸಸ್ಯ ಒತ್ತಡದ ಅಸಾಮಾನ್ಯತೆ ಕಂಡುಬಂದಿದೆ',
      recommendedAction: 'ಹೊಲ ಪರಿಶೀಲನೆಗೆ ಆದ್ಯತೆ ನೀಡಿ ಮತ್ತು ಮುಂದಿನ ಮಳೆಯ ಮೊದಲು ತೇವಾಂಶ ಮತ್ತು ಪೋಷಕ ಒತ್ತಡವನ್ನು ಅಳೆಯಿರಿ',
      farmerMessage: 'ನಿಮ್ಮ ಸಜ್ಜೆ ಹೊಲದಲ್ಲಿ ಒತ್ತಡ ಕಂಡುಬಂದಿದೆ. ಮುಂದಿನ ಮಳೆಯ ಮೊದಲು ತೇವಾಂಶ ಮತ್ತು ಪೋಷಕ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಲು ಹೊಲ ಭೇಟಿ ಆದ್ಯತೆಯ ಮೇಲೆ ಇಡಲಾಗಿದೆ.',
    },
  },
  'adv-006': {
    English: {
      detectedProblem: 'Temperature spike likely to affect chilli fruit setting',
      recommendedAction: 'Issue shade and irrigation timing guidance through the block extension office before the afternoon heat peak',
      farmerMessage: 'High temperature may affect chilli fruit setting. Follow irrigation timing guidance from your block extension office before peak afternoon heat.',
    },
    Hindi: {
      detectedProblem: 'तापमान बढ़ने से मिर्च में फल लगने पर असर पड़ सकता है',
      recommendedAction: 'दोपहर की तेज गर्मी से पहले ब्लॉक विस्तार कार्यालय के माध्यम से छाया और सिंचाई समय संबंधी सलाह जारी करें',
      farmerMessage: 'उच्च तापमान मिर्च में फल लगने को प्रभावित कर सकता है। दोपहर की तेज गर्मी से पहले ब्लॉक विस्तार कार्यालय की सिंचाई सलाह का पालन करें।',
    },
    Marathi: {
      detectedProblem: 'तापमान वाढल्याने मिरचीच्या फळधारणेवर परिणाम होऊ शकतो',
      recommendedAction: 'दुपारच्या उष्णतेपूर्वी ब्लॉक विस्तार कार्यालयामार्फत सावली आणि सिंचन वेळेचे मार्गदर्शन द्या',
      farmerMessage: 'उच्च तापमानामुळे मिरचीची फळधारणा प्रभावित होऊ शकते. दुपारच्या उष्णतेपूर्वी ब्लॉक विस्तार कार्यालयाच्या सिंचन मार्गदर्शनाचे पालन करा.',
    },
    Bengali: {
      detectedProblem: 'তাপমাত্রা বৃদ্ধির ফলে লঙ্কার ফল ধরায় প্রভাব পড়তে পারে',
      recommendedAction: 'দুপুরের গরমের আগে ব্লক অফিসের মাধ্যমে ছায়া ও সেচের সময় সংক্রান্ত নির্দেশনা দিন',
      farmerMessage: 'উচ্চ তাপমাত্রা লঙ্কার ফল ধরায় প্রভাব ফেলতে পারে। দুপুরের তীব্র গরমের আগে ব্লক সম্প্রসারণ অফিসের সেচ নির্দেশনা অনুসরণ করুন।',
    },
    Tamil: {
      detectedProblem: 'வெப்பநிலை உயர்வு மிளகாய் கனிவரவை பாதிக்கலாம்',
      recommendedAction: 'மதிய வெப்ப உச்சத்துக்கு முன் தொகுதி விரிவாக்க அலுவலகம் மூலம் நிழல் மற்றும் பாசன நேர வழிகாட்டுதல் வழங்கவும்',
      farmerMessage: 'அதிக வெப்பம் மிளகாய் கனிவரவை பாதிக்கலாம். மதிய வெப்ப உச்சத்திற்கு முன் தொகுதி விரிவாக்க அலுவலகத்தின் பாசன வழிகாட்டுதலைப் பின்பற்றவும்.',
    },
    Telugu: {
      detectedProblem: 'ఉష్ణోగ్రత పెరగడం మిర్చి ఫల ధారణను ప్రభావితం చేయవచ్చు',
      recommendedAction: 'మధ్యాహ్న వేడి గరిష్టానికి ముందు బ్లాక్ విస్తరణ కార్యాలయం ద్వారా నీడ మరియు నీటిపారుదల సమయ సూచనలు ఇవ్వండి',
      farmerMessage: 'అధిక ఉష్ణోగ్రత మిర్చి ఫల ధారణను ప్రభావితం చేయవచ్చు. మధ్యాహ్న గరిష్ట వేడి ముందే బ్లాక్ విస్తరణ కార్యాలయ నీటిపారుదల సూచనలను అనుసరించండి.',
    },
    Gujarati: {
      detectedProblem: 'તાપમાન વધારાથી મરચાંના ફળ બંધારણ પર અસર થઈ શકે છે',
      recommendedAction: 'બપોરની ગરમી પહેલા બ્લોક વિસ્તરણ કચેરી મારફતે છાયા અને સિંચાઈ સમય અંગે માર્ગદર્શન આપો',
      farmerMessage: 'ઉચ્ચ તાપમાન મરચાંના ફળ બંધારણને અસર કરી શકે છે. બપોરની ગરમી પહેલાં બ્લોક વિસ્તરણ કચેરીની સિંચાઈ માર્ગદર્શિકાનું પાલન કરો.',
    },
    Kannada: {
      detectedProblem: 'ತಾಪಮಾನ ಏರಿಕೆಯಿಂದ ಮೆಣಸಿನಕಾಯಿ ಹಣ್ಣುಗಟ್ಟುವಿಕೆಗೆ ಪರಿಣಾಮ ಬೀಳಬಹುದು',
      recommendedAction: 'ಮಧ್ಯಾಹ್ನದ ಉಷ್ಣತೆಯ ಗರಿಷ್ಠ ಮುನ್ನ ಬ್ಲಾಕ್ ವಿಸ್ತರಣಾ ಕಚೇರಿ ಮೂಲಕ ನೆರಳು ಮತ್ತು ನೀರಾವರಿ ಸಮಯದ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ',
      farmerMessage: 'ಹೆಚ್ಚಿನ ತಾಪಮಾನವು ಮೆಣಸಿನಕಾಯಿ ಹಣ್ಣುಗಟ್ಟುವಿಕೆಗೆ ಪರಿಣಾಮ ಬೀಳಬಹುದು. ಮಧ್ಯಾಹ್ನದ ಉಷ್ಣತೆ ಹೆಚ್ಚುವ ಮೊದಲು ಬ್ಲಾಕ್ ವಿಸ್ತರಣಾ ಕಚೇರಿಯ ನೀರಾವರಿ ಮಾರ್ಗದರ್ಶನ ಅನುಸರಿಸಿ.',
    },
  },
};

export function getLocalizedAdvisoryContent(advisory: AdvisoryRecord, language: AdvisoryLanguage): AdvisoryLocalizedContent {
  return advisoryTranslations[advisory.id]?.[language] ?? advisoryTranslations[advisory.id]?.English ?? {
    detectedProblem: advisory.detectedProblem,
    recommendedAction: advisory.recommendedAction,
    farmerMessage: advisory.farmerMessage,
  };
}
