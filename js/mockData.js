// js/mockData.js

const MOCK_QUESTIONS = [
    // --- 英文線上測驗 ---
    { id: 'mock_eng_1', area: '全部', year: null, subject: '單字', examType: '單字測驗', content: 'What is the synonym for "Happy"?', options: ['Sad', 'Angry', 'Joyful', 'Tired'], answer: 2, explanation: '"Joyful" is a synonym for "Happy".' },
    { id: 'mock_eng_2', area: '全部', year: null, subject: '單字', examType: '單字測驗', content: 'What is the antonym of "Expand"?', options: ['Enlarge', 'Shrink', 'Grow', 'Stretch'], answer: 1, explanation: '"Shrink" is the opposite of "Expand".' },
    { id: 'mock_eng_3', area: '全部', year: null, subject: '文法', examType: '文法練習', content: 'She _____ to the store yesterday.', options: ['goes', 'going', 'went', 'gone'], answer: 2, explanation: '"Yesterday" indicates past tense, so "went" is correct.' },
    { id: 'mock_eng_4', area: '全部', year: null, subject: '閱讀', examType: '閱讀測驗', content: 'Read the sentence: "The quick brown fox jumps over the lazy dog." Who is jumping?', options: ['The dog', 'The fox', 'Both', 'Neither'], answer: 1, explanation: 'The sentence explicitly states "The quick brown fox jumps...".' },
];

const MOCK_LEADERBOARD = {
    'announcements': [
        { id: 'a1', title: '系統更新', content: '英文測驗系統已全面上線！', date: '2023-11-20', important: true }
    ],
    'vocab': [
        { nickname: 'English Guru', score: 100, examType: '單字測驗', completionTime: 300, date: { seconds: 1672531200 } },
        { nickname: 'Vocab Master', score: 95, examType: '單字測驗', completionTime: 350, date: { seconds: 1672444800 } },
    ],
    'grammar': [
        { nickname: 'Grammar Pro', score: 98, examType: '文法練習', completionTime: 400, date: { seconds: 1672531200 } },
        { nickname: 'Syntax King', score: 92, examType: '文法練習', completionTime: 450, date: { seconds: 1672444800 } },
    ],
    'reading': [
        { nickname: 'Speed Reader', score: 96, examType: '閱讀測驗', completionTime: 500, date: { seconds: 1672531200 } },
        { nickname: 'Bookworm', score: 90, examType: '閱讀測驗', completionTime: 550, date: { seconds: 1672444800 } },
    ]
};