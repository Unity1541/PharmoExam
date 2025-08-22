// js/mockData.js

const MOCK_QUESTIONS = [
    // --- 國考區 ---
    { id: 'mock_nat_1', area: '國考區', year: '2025', subject: '藥理藥化', examType: '第一次藥師考試', content: '【國考題】下列何者為鴉片類止痛劑？', options: ['Aspirin', 'Ibuprofen', 'Morphine', 'Acetaminophen'], answer: 2, explanation: 'Morphine 是一種強效的鴉片類(opioid)止痛劑，常用於緩解中度至重度疼痛。' },
    { id: 'mock_nat_2', area: '國考區', year: '2025', subject: '藥理藥化', examType: '第二次藥師考試', content: '【國考題】Penicillin 的主要作用機制為何？', options: ['抑制蛋白質合成', '抑制細胞壁合成', '抑制DNA複製', '抑制葉酸代謝'], answer: 1, explanation: 'Penicillin 屬於 β-內醯胺類抗生素，其主要作用機制是抑制細菌細胞壁中肽聚醣的合成。' },
    { id: 'mock_nat_3', area: '國考區', year: '2024', subject: '藥劑學', examType: '第一次藥師考試', content: '【國考題】下列何者為影響藥物穿透血腦障壁(BBB)最主要的因素？', options: ['分子量', '水溶性', '脂溶性', '蛋白質結合率'], answer: 2, explanation: '血腦障壁(Blood-Brain Barrier)主要由緊密連接的內皮細胞構成，形成一個親脂性障壁。因此，藥物的脂溶性越高，越容易穿透。' },
    { id: 'mock_nat_4', area: '國考區', year: '2023', subject: '藥事行政法規', examType: '第一次藥師考試', content: '【國考題】管制藥品依其成癮性、濫用性及社會危害性，共分為幾級？', options: ['二級', '三級', '四級', '五級'], answer: 2, explanation: '根據台灣的「管制藥品管理條例」，管制藥品依其成癮性、濫用性及社會危害性，共分為四級管理。' },
    { id: 'mock_nat_5', area: '國考區', year: '2023', subject: '生物藥劑', examType: '第二次藥師考試', content: '【國考題】藥物動力學中「首渡效應」(First-pass effect) 主要發生在哪個器官？', options: ['腎臟', '肺臟', '肝臟', '心臟'], answer: 2, explanation: '首渡效應指口服藥物經由腸胃道吸收後，會先經由門靜脈系統進入肝臟進行代謝。' },

    // --- 各科練習題 ---
    { id: 'mock_prac_1', area: '各科練習題', year: null, subject: '藥理藥化', examType: '藥物動力學', content: '【章節練習】藥物在體內的分佈容積(Vd)主要受到下列何者的影響？', options: ['藥物的吸收速率', '藥物的排除速率', '藥物與組織蛋白的結合能力', '藥物的化學穩定性'], answer: 2, explanation: '分佈容積(Volume of distribution)是一個理論上的容積，它反映了藥物在體內組織與血液之間分佈的廣泛程度。與組織蛋白結合力越強的藥物，Vd越大。' },
    { id: 'mock_prac_2', area: '各科練習題', year: null, subject: '藥理藥化', examType: '藥物效力學', content: '【章節練習】當一種藥物能與受體結合但不能產生最大效應時，稱之為？', options: ['完全致效劑 (Full agonist)', '部分致效劑 (Partial agonist)', '拮抗劑 (Antagonist)', '反致效劑 (Inverse agonist)'], answer: 1, explanation: '部分致效劑能與受體結合並產生次最大(submaximal)的效應，即使佔滿所有受體也無法達到完全致效劑的Emax。' },
    { id: 'mock_prac_3', area: '各科練習題', year: null, subject: '生藥學', examType: '生物鹼', content: '【章節練習】下列何者是從金雞納樹皮中提取，用於治療瘧疾的生物鹼？', options: ['嗎啡 (Morphine)', '奎寧 (Quinine)', '阿托品 (Atropine)', '古柯鹼 (Cocaine)'], answer: 1, explanation: '奎寧(Quinine)是金雞納樹(Cinchona)皮中的主要生物鹼，為歷史悠久的抗瘧疾藥物。' },
    { id: 'mock_prac_4', area: '各科練習題', year: null, subject: '藥物分析', examType: '光譜分析法', content: '【章節練習】Beer-Lambert 定律是哪一種光譜分析法的基本原理？', options: ['紅外光譜法', '核磁共振光譜法', '紫外-可見光吸收光譜法', '質譜法'], answer: 2, explanation: 'Beer-Lambert 定律描述了吸光度與吸光物質濃度及光程長度之間的線性關係，是紫外-可見光吸收光譜法(UV-Vis)的定量基礎。' },
    
    // --- 小考練習區 ---
    { id: 'mock_quiz_1', area: '小考練習區', year: null, subject: '藥理藥化', examType: '綜合測驗', content: '【綜合小考】下列何種藥物過量中毒時，可使用N-acetylcysteine (NAC) 作為解毒劑？', options: ['Aspirin', 'Diazepam', 'Acetaminophen', 'Warfarin'], answer: 2, explanation: 'Acetaminophen (普拿疼) 過量會消耗肝臟的glutathione，產生毒性代謝物。NAC可以作為glutathione的前驅物，補充其存量以解毒。' },
    { id: 'mock_quiz_2', area: '小考練習區', year: null, subject: '藥劑學', examType: '綜合測驗', content: '【綜合小考】在藥物製劑中，為了增加錠劑的硬度並幫助成型，通常會加入下列何種賦形劑？', options: ['潤滑劑 (Lubricant)', '崩散劑 (Disintegrant)', '黏合劑 (Binder)', '稀釋劑 (Diluent)'], answer: 2, explanation: '黏合劑(Binder)或稱黏著劑，其作用是使藥物粉末黏合在一起，增加顆粒或錠劑的機械強度與硬度。' },
    { id: 'mock_quiz_3', area: '小考練習區', year: null, subject: '生藥學', examType: '綜合測驗', content: '【綜合小考】人參 (Ginseng) 的主要活性成分屬於下列何種類型？', options: ['生物鹼 (Alkaloids)', '皂苷 (Saponins)', '黃酮類 (Flavonoids)', '揮發油 (Volatile oils)'], answer: 1, explanation: '人參的主要活性成分是人參皂苷(Ginsenosides)，屬於三萜類的皂苷化合物。' },
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
    '藥物分析': [
        { nickname: '分析大師', score: 99 },
    ],
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
    '小考練習區': [
        { nickname: '練習狂人', score: 98 },
        { nickname: '快手小張', score: 95 },
        { nickname: '答題機器', score: 91 },
    ],
};