// js/mockData.js

const MOCK_QUESTIONS = [
    { id: 'mock1', year: '2024', subject: '藥理藥化', examType: '第一次藥師考試', content: '下列何者為鴉片類止痛劑？', options: ['Aspirin', 'Ibuprofen', 'Morphine', 'Acetaminophen'], answer: 2, explanation: 'Morphine 是一種強效的鴉片類(opioid)止痛劑，常用於緩解中度至重度疼痛。其他選項為非類固醇抗發炎藥(NSAID)或解熱鎮痛藥。' },
    { id: 'mock2', year: '2024', subject: '藥理藥化', examType: '第二次藥師考試', content: 'Penicillin 的主要作用機制為何？', options: ['抑制蛋白質合成', '抑制細胞壁合成', '抑制DNA複製', '抑制葉酸代謝'], answer: 1, explanation: 'Penicillin 屬於 β-內醯胺類抗生素，其主要作用機制是抑制細菌細胞壁中肽聚醣的合成，導致細菌細胞壁缺損，最終使細菌溶解死亡。' },
    { id: 'mock3', year: '2024', subject: '藥劑學', examType: '第一次藥師考試', content: '下列何者為影響藥物穿透血腦障壁(BBB)最主要的因素？', options: ['分子量', '水溶性', '脂溶性', '蛋白質結合率'], answer: 2, explanation: '血腦障壁(Blood-Brain Barrier)主要由緊密連接的內皮細胞構成，形成一個親脂性障壁。因此，藥物的脂溶性越高，越容易穿透BBB進入中樞神經系統。' },
    { id: 'mock4', year: '2024', subject: '藥物分析', examType: '小考練習區', content: '高效液相層析法(HPLC)中，何者為固定相？', options: ['溶劑', '層析管柱', '偵測器', '樣品注射器'], answer: 1, explanation: '在HPLC中，固定相(Stationary Phase)是填充在層析管柱(column)內的微粒物質，用來與樣品中的分析物產生交互作用，達到分離的效果。移動相(Mobile Phase)則是流經管柱的溶劑。' },
    { id: 'mock5', year: '2023', subject: '藥事行政法規', examType: '第一次藥師考試', content: '管制藥品依其成癮性、濫用性及社會危害性，共分為幾級？', options: ['二級', '三級', '四級', '五級'], answer: 2, explanation: '根據台灣的「管制藥品管理條例」，管制藥品依其成癮性、濫用性及社會危害性，共分為四級管理。第一級的成癮性與危害性最高。' },
    { id: 'mock6', year: '2023', subject: '生物藥劑', examType: '第二次藥師考試', content: '藥物動力學中「首渡效應」(First-pass effect) 主要發生在哪個器官？', options: ['腎臟', '肺臟', '肝臟', '心臟'], answer: 2, explanation: '首渡效應指口服藥物經由腸胃道吸收後，會先經由門靜脈系統進入肝臟，在肝臟進行代謝，導致進入全身血液循環前的藥量減少。因此，此效應主要發生在肝臟。' },
    { id: 'mock7', year: '2024', subject: '生藥學', examType: '小考練習區', content: '何者為「君藥」在方劑中的主要作用？', options: ['引經報使', '治療主要病證', '增強君藥藥效', '減輕君藥毒性'], answer: 1, explanation: '在中醫方劑學中，君藥是方劑中針對主病或主證起主要治療作用的藥物，是方劑組合的核心。臣藥輔助君藥，佐藥治療兼證或減輕君藥毒性，使藥引經報使或調和諸藥。' },
];

const MOCK_LEADERBOARD = {
    '藥理藥化': [
        { nickname: '弗萊明', score: 100 },
        { nickname: '杜馬克', score: 95 },
        { nickname: '伯韋', score: 90 },
    ],
    '生物藥劑': [
        { nickname: '諾伊斯', score: 98 },
        { nickname: '惠特尼', score: 92 },
    ],
    '藥物分析': [],
    '藥事行政法規': [
         { nickname: '藥學之父', score: 100 },
    ],
    '藥物治療': [],
    '藥劑學': [
        { nickname: '蓋倫', score: 88 },
        { nickname: '阿維森納', score: 85 },
    ],
    '生藥學': [
        { nickname: '神農氏', score: 99 },
        { nickname: '李時珍', score: 96 },
    ],
};