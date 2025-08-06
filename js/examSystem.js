

document.addEventListener('DOMContentLoaded', () => {
    const examContainer = document.getElementById('exam-container');
    // Super-gatekeeper: Check for initialization errors first.
    if (window.firebaseInitializationError) {
        examContainer.innerHTML = `
            <div class="glass-card fade-in" style="max-width: 650px; margin: 2rem auto;">
                 <div class="login-header">
                    <svg class="login-icon" style="color: var(--danger-color);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 style="background: var(--danger-color); -webkit-background-clip: text;">Firebase 設定錯誤</h2>
                    <p>您的 Firebase 設定檔 (<code>js/firebase.js</code>) 存在格式錯誤，導致應用程式無法啟動。請檢查您的設定是否從 Firebase 控制台完整複製。</p>
                </div>
                <div class="demo-info" style="text-align: left; background-color: rgba(239, 68, 68, 0.1); color: #c05621;">
                    <p><strong>錯誤詳情：</strong></p>
                    <pre style="white-space: pre-wrap; word-wrap: break-word;">${window.firebaseInitializationError.message}</pre>
                </div>
            </div>`;
        return; // Stop execution
    }

    const usePreviewMode = !isFirebaseConfigured();
    const questionsCollection = usePreviewMode ? null : db.collection('questions');
    const leaderboardCollection = usePreviewMode ? null : db.collection('leaderboard');
    const examAttemptsCollection = usePreviewMode ? null : db.collection('examAttempts');
    
    // Data Definitions
    const examAreas = {
        '國考區': '按年份和科目進行完整的國家考試模擬測驗。',
        '各科練習題': '針對特定科目的不同章節進行深入練習。',
        '小考練習區': '對單一科目進行快速的綜合測驗。'
    };
    const allSubjects = ['藥理藥化', '生物藥劑', '藥物分析', '藥事行政法規', '藥物治療', '藥劑學', '生藥學'];
    const availableYears = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];
    const nationalExamTypes = ['第一次藥師考試', '第二次藥師考試'];
    const quizExamType = '綜合測驗';
    const practiceChapters = {
        '藥理藥化': ['藥物效力學', '藥物動力學', '擬交感神經作用藥', '交感神經阻斷劑', '擬副交感神經作用藥', '膽鹼神經阻斷藥', '神經肌肉阻斷劑', '神經節阻斷劑', '鎮靜催眠藥', '抗精神病藥', '抗憂鬱藥', '抗焦慮症藥', '抗躁鬱藥', '抗癲癇藥', '抗帕金森藥', '肌肉疾病用藥', '全身麻醉溶劑', '局部麻醉溶劑', '中樞興奮藥、濫用藥物', '麻醉性鎮痛藥', '非固醇類抗炎鎮痛藥', '抗痛風藥', '風濕性關節炎治療藥物', '自泌素及相關藥物', '抗組織胺藥', '抗高血壓藥', '心臟衰竭治療藥物', '利尿劑', '降血脂藥', '心絞痛治療藥物', '心律不整治療藥物', '血栓症治療藥物', '貧血、血液疾病治療藥物', '糖尿病治療藥物', '甲状腺疾病治療藥物', '下視丘及腦下垂體激素', '腎上腺類固醇激素', '雄性激素', '雌性激素', '黃體激素', '鈣調節藥', '抗生素', '抗感染藥物', '抗病毒藥物', '抗黴菌藥物', '抗分枝桿菌藥物 (結核病、痲瘋)', '抗原蟲藥物、驅蟲蟲藥', '抗癌藥物、化學治療藥', '免疫抑制藥、免疫調節藥', '基因療法', '消化性潰瘍用藥', '腹瀉、便秘、腸道疾病用藥', '呼吸道疾病用藥', '止吐藥、鎮咳劑', '皮膚疾病用藥', '重金屬及藥物中毒的解毒藥', '中草藥及天然物'],
        '生藥學': ['生藥學緒論與研發', '生物科技藥品', '碳水化合物(醣類)', '配糖體(苷類)', '鞣質(鞣酸)', '生物鹼', '苯丙烷類', '萜類化合物', '揮發油', '脂質', '類固醇', '樹脂', '中藥學'],
        // Add other subjects here if they have chapters
    };

    let allQuestions = [];

    // State Management
    let state = {
        view: 'NICKNAME', // NICKNAME, AREA, SELECTION_1, SELECTION_2, SELECTION_3, EXAM, RESULT
        nickname: '',
        selectedArea: null,
        selectedYear: null,
        selectedSubject: null,
        selectedExamType: null, // Can be chapter or exam time
        timeLimit: 30,
        timeLeft: 1800,
        currentQuestions: [],
        answers: {},
        score: 0,
        timer: null,
        latestExamId: null,
    };

    function setState(newState) {
        state = { ...state, ...newState };
        render();
    }

    // DOM Elements
    const stepDivs = {
        NICKNAME: document.getElementById('nickname-step'),
        AREA: document.getElementById('area-step'),
        SELECTION_1: document.getElementById('dynamic-step-1'),
        SELECTION_2: document.getElementById('dynamic-step-2'),
        SELECTION_3: document.getElementById('dynamic-step-3'),
        EXAM: document.getElementById('exam-step'),
        RESULT: document.getElementById('result-step'),
    };
    
    function showPreviewWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'demo-info';
        warningDiv.style.margin = '1rem auto 0 auto';
        warningDiv.style.textAlign = 'center';
        warningDiv.style.maxWidth = '800px';
        warningDiv.innerHTML = '<p><strong>預覽模式</strong>：目前正在使用預設題目。您的成績將不會被記錄。請設定 <code>js/firebase.js</code> 以啟用完整功能。</p>';
        document.querySelector('.container > header').insertAdjacentElement('afterend', warningDiv);
    }

    async function loadAllQuestions() {
        if (usePreviewMode) {
            allQuestions = MOCK_QUESTIONS;
            showPreviewWarning();
            return;
        }
        try {
            const snapshot = await questionsCollection.get();
            allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error loading questions from Firestore:", error);
            alert("無法從資料庫載入試題，請檢查 Firebase 設定或網路連線。");
        }
    }
    
    function render() {
        Object.values(stepDivs).forEach(div => div.style.display = 'none');
        const currentViewDiv = stepDivs[state.view];
        if (currentViewDiv) {
            currentViewDiv.style.display = 'block';
            // Render content for the current view
            switch (state.view) {
                case 'AREA': renderAreaStep(); break;
                case 'SELECTION_1': renderSelectionStep1(); break;
                case 'SELECTION_2': renderSelectionStep2(); break;
                case 'SELECTION_3': renderSelectionStep3(); break;
                case 'EXAM': renderExamStep(); break;
                case 'RESULT': renderResultStep(); break;
            }
        }
    }

    function renderAreaStep() {
        let html = `
            <h2 class="step-title">選擇測驗專區</h2>
            <p class="step-description">請選擇您要進行的測驗類型。</p>
            <div class="selection-grid">
        `;
        for (const area in examAreas) {
            html += `
                <div class="selection-card" data-area="${area}">
                    <h3>${area}</h3>
                    <p>${examAreas[area]}</p>
                </div>
            `;
        }
        html += `</div>`;
        stepDivs.AREA.innerHTML = html;
        stepDivs.AREA.querySelectorAll('.selection-card').forEach(card => {
            card.addEventListener('click', () => {
                setState({ selectedArea: card.dataset.area, view: 'SELECTION_1' });
            });
        });
    }

    function renderSelectionStep1() {
        switch (state.selectedArea) {
            case '國考區': renderYearSelection('SELECTION_1'); break;
            case '各科練習題': renderSubjectSelection('SELECTION_1', Object.keys(practiceChapters)); break;
            case '小考練習區': renderSubjectSelection('SELECTION_1', allSubjects); break;
        }
    }

    function renderSelectionStep2() {
        switch (state.selectedArea) {
            case '國考區': renderSubjectSelection('SELECTION_2', allSubjects); break;
            case '各科練習題': renderChapterSelection(); break;
        }
    }
    
    function renderSelectionStep3() {
        switch (state.selectedArea) {
            case '國考區': renderNationalExamTypeSelection(); break;
        }
    }

    // Generic Render Functions
    function renderYearSelection(viewKey) {
        const container = stepDivs[viewKey];
        let html = `
            <h2 class="step-title">步驟 2：選擇年度</h2>
            <p class="step-description">您選擇了【${state.selectedArea}】</p>
            <div class="selection-grid">
        `;
        availableYears.forEach(year => {
            const hasQuestions = allQuestions.some(q => q.area === '國考區' && q.year === year);
            html += `
                <div class="selection-card ${hasQuestions ? '' : 'disabled'}" data-year="${year}">
                    <h3>${year}</h3>
                    <p>${hasQuestions ? `選擇 ${year} 年` : '該年度無相關題目'}</p>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        container.querySelectorAll('.selection-card:not(.disabled)').forEach(card => {
            card.addEventListener('click', () => setState({ selectedYear: card.dataset.year, view: 'SELECTION_2' }));
        });
    }

    function renderSubjectSelection(viewKey, subjects) {
        const container = stepDivs[viewKey];
        const nextView = viewKey === 'SELECTION_1' ? 'SELECTION_2' : 'SELECTION_3';
        let html = `
            <h2 class="step-title">選擇科目</h2>
            <p class="step-description">您選擇了【${state.selectedArea}】${state.selectedYear ? ` - ${state.selectedYear}年` : ''}</p>
            <div class="selection-grid">
        `;
        subjects.forEach(subject => {
            const hasQuestions = allQuestions.some(q => q.area === state.selectedArea && (state.selectedYear ? q.year === state.selectedYear : true) && q.subject === subject);
            html += `
                <div class="selection-card ${hasQuestions ? '' : 'disabled'}" data-subject="${subject}">
                    <h3>${subject}</h3>
                     <p>${hasQuestions ? `選擇 ${subject}` : '此科目無相關題目'}</p>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        container.querySelectorAll('.selection-card:not(.disabled)').forEach(card => {
            card.addEventListener('click', () => {
                const subject = card.dataset.subject;
                if (state.selectedArea === '小考練習區') {
                    setState({ selectedSubject: subject, selectedExamType: quizExamType });
                    startExam();
                } else if (state.selectedArea === '各科練習題' && !practiceChapters[subject]?.length > 0) {
                     alert(`科目 ${subject} 尚未設定章節練習題。`);
                }
                else {
                    setState({ selectedSubject: subject, view: nextView });
                }
            });
        });
    }

    function renderChapterSelection() {
        const container = stepDivs.SELECTION_2;
        const chapters = practiceChapters[state.selectedSubject] || [];
        let html = `
            <h2 class="step-title">選擇練習章節</h2>
            <p class="step-description">您選擇了【${state.selectedSubject}】，請從下方列表中選擇一個章節開始練習。</p>
            <div class="chapter-list-container">
                <ul class="chapter-list">
        `;

        if (chapters.length === 0) {
            html += `<li class="chapter-item disabled">此科目尚無章節分類</li>`;
        } else {
            chapters.forEach(chapter => {
                const hasQuestions = allQuestions.some(q => q.area === '各科練習題' && q.subject === state.selectedSubject && q.examType === chapter);
                html += `
                    <li class="chapter-item ${hasQuestions ? '' : 'disabled'}" data-exam-type="${chapter}">
                        <span>${chapter}</span>
                    </li>
                `;
            });
        }
        
        html += `
                </ul>
            </div>
        `;
        container.innerHTML = html;
        container.querySelectorAll('.chapter-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', () => {
                setState({ selectedExamType: item.dataset.examType });
                startExam();
            });
        });
    }

    function renderNationalExamTypeSelection() {
        const container = stepDivs.SELECTION_3;
        let html = `
            <h2 class="step-title">選擇考試</h2>
            <p class="step-description">您選擇了【${state.selectedYear}年 - ${state.selectedSubject}】</p>
            <div class="selection-grid">
        `;
        nationalExamTypes.forEach(type => {
            const hasQuestions = allQuestions.some(q => q.area === '國考區' && q.year === state.selectedYear && q.subject === state.selectedSubject && q.examType === type);
            html += `
                <div class="selection-card ${hasQuestions ? '' : 'disabled'}" data-exam-type="${type}">
                    <h3>${type}</h3>
                    <p>${hasQuestions ? `開始測驗` : '此場次無相關題目'}</p>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        container.querySelectorAll('.selection-card:not(.disabled)').forEach(card => {
            card.addEventListener('click', () => {
                setState({ selectedExamType: card.dataset.examType });
                startExam();
            });
        });
    }

    // Exam Logic
    function startExam() {
        const { selectedArea, selectedYear, selectedSubject, selectedExamType } = state;
        currentQuestions = allQuestions.filter(q => 
            q.area === selectedArea &&
            q.subject === selectedSubject && 
            q.examType === selectedExamType &&
            (selectedArea !== '國考區' || q.year === selectedYear)
        );

        if (currentQuestions.length === 0) {
            alert('找不到符合條件的試題。');
            setState({ view: 'AREA' });
            return;
        }
        
        const answers = {};
        currentQuestions.forEach(q => { answers[q.id] = null; });

        setState({
            answers,
            currentQuestions,
            timeLeft: state.timeLimit * 60,
            latestExamId: `exam_${Date.now()}`,
            view: 'EXAM',
        });
        startTimer();
    }
    
    function startTimer() {
        clearInterval(state.timer);
        const timer = setInterval(() => {
            state.timeLeft -= 1; // Directly mutate state to avoid re-render
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) {
                timeDisplay.textContent = formatTime(state.timeLeft);
            }
            if (state.timeLeft <= 0) {
                clearInterval(state.timer);
                alert('時間到！將自動提交答案。');
                submitExam();
            }
        }, 1000);
        setState({ timer });
    }

    function renderExamStep() {
        const { selectedArea, selectedYear, selectedSubject, selectedExamType, nickname, timeLeft, currentQuestions } = state;
        let title = `${nickname} | ${selectedArea} | ${selectedSubject} (${selectedExamType})`;
        if (selectedArea === '國考區') {
             title = `${nickname} | ${selectedYear} ${selectedSubject} - ${selectedExamType}`;
        }

        let html = `
            <div class="exam-header glass-card">
                <div>
                    <h2>考試進行中</h2>
                    <p>${title} | 共 ${currentQuestions.length} 題</p>
                </div>
                <div class="timer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span id="time-display">${formatTime(timeLeft)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
            </div>
            <div class="questions-container">
        `;
        
        currentQuestions.forEach((question, index) => {
            html += `
                <div class="question-card">
                    <div class="question-content">
                        <div class="question-number">${index + 1}</div>
                        <div class="question-text">${question.content}</div>
                    </div>
                    <div class="options-list">
            `;
            question.options.forEach((option, optIndex) => {
                html += `
                    <div class="option-item" data-question="${question.id}" data-option="${optIndex}">
                        <div class="option-radio"></div>
                        <span>${option}</span>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        
        html += `
            </div>
            <div class="submit-container">
                <button id="submit-exam" class="btn btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    提交答案
                </button>
            </div>
        `;
        stepDivs.EXAM.innerHTML = html;
        
        stepDivs.EXAM.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const questionId = item.getAttribute('data-question');
                const optionIndex = parseInt(item.getAttribute('data-option'));
                
                document.querySelectorAll(`.option-item[data-question="${questionId}"]`).forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
                state.answers[questionId] = optionIndex;
                updateProgressBar();
            });
        });
        stepDivs.EXAM.querySelector('#submit-exam').addEventListener('click', submitExam);
    }
    
    function updateProgressBar() {
        const answeredCount = Object.values(state.answers).filter(a => a !== null).length;
        const percentage = (answeredCount / state.currentQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async function submitExam() {
        clearInterval(state.timer);
        let correctCount = 0;
        state.currentQuestions.forEach(q => { if (state.answers[q.id] === q.answer) correctCount++; });
        const score = state.currentQuestions.length > 0 ? Math.round((correctCount / state.currentQuestions.length) * 100) : 0;
        
        setState({ score });

        if (usePreviewMode) {
            setState({ view: 'RESULT' });
            return;
        }

        let attemptSaved = false;
        try {
            await saveExamAttempt();
            attemptSaved = true;
        } catch (error) {
            console.error("CRITICAL: Failed to save exam attempt.", error);
            alert(`發生嚴重錯誤，無法儲存您的作答紀錄。您的分數是 ${score} 分，但詳細紀錄遺失。\n\n錯誤: ${error.message}`);
        }

        if (attemptSaved) {
            try {
                await updateLeaderboard();
            } catch (error) {
                console.error("NON-CRITICAL: Failed to update leaderboard.", error);
                alert(`您的作答紀錄已儲存，但更新排行榜時失敗了！\n\n這通常是缺少資料庫索引造成，請檢查瀏覽器主控台中的錯誤連結。\n\n錯誤: ${error.message}`);
            }
        }
        setState({ view: 'RESULT' });
    }

    async function saveExamAttempt() {
        const detailedQuestions = state.currentQuestions.map(q => ({
            content: q.content,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || '',
            userAnswer: state.answers[q.id] === null ? -1 : state.answers[q.id]
        }));
    
        const leaderboardCategory = state.selectedArea === '小考練習區' ? '小考練習區' : state.selectedSubject;
        
        const attemptData = {
            examId: state.latestExamId,
            nickname: state.nickname,
            nickname_lowercase: state.nickname.toLowerCase(),
            area: state.selectedArea,
            year: state.selectedYear || null,
            subject: state.selectedSubject,
            examType: state.selectedExamType,
            score: state.score,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            questions: detailedQuestions,
            leaderboardCategory: leaderboardCategory,
        };
        await examAttemptsCollection.add(attemptData);
    }

    async function updateLeaderboard() {
        const { latestExamId, nickname, selectedSubject, selectedYear, selectedExamType, score, selectedArea } = state;
        const leaderboardCategory = selectedArea === '小考練習區' ? '小考練習區' : selectedSubject;

        const userRecord = {
            nickname,
            nickname_lowercase: nickname.toLowerCase(),
            score,
            subject: leaderboardCategory,
            year: selectedYear || null,
            examType: selectedExamType,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            examId: latestExamId,
        };

        const querySnapshot = await leaderboardCollection
            .where('subject', '==', leaderboardCategory)
            .where('nickname_lowercase', '==', nickname.toLowerCase())
            .get();

        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            await leaderboardCollection.doc(docId).update(userRecord);
        } else {
            await leaderboardCollection.add(userRecord);
        }
    }

    async function renderResultStep() {
        stepDivs.RESULT.innerHTML = `<div class="loading-spinner">正在計算您的成績與排名...</div>`;
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate calculation
        
        const { score, selectedSubject, selectedArea, selectedYear, selectedExamType, nickname, latestExamId } = state;
        const leaderboardCategory = selectedArea === '小考練習區' ? '小考練習區' : selectedSubject;
        
        if (usePreviewMode) {
            renderResultStepPreview();
            return;
        }

        try {
            const snapshot = await leaderboardCollection.where('subject', '==', leaderboardCategory).get();
            let subjectLeaderboard = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
            subjectLeaderboard.sort((a, b) => b.score - a.score || (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));
            
            const userRankData = subjectLeaderboard.find(item => item.examId === latestExamId);
            const userRank = userRankData ? subjectLeaderboard.indexOf(userRankData) + 1 : "N/A";
            const topFive = subjectLeaderboard.slice(0, 5);

            let title = `${selectedArea} | ${selectedSubject} (${selectedExamType})`;
            if (selectedArea === '國考區') {
                title = `${selectedYear}年 ${selectedSubject} - ${selectedExamType}`;
            }

            let html = `
                <div class="result-container glass-card fade-in">
                     <div class="${score >= 60 ? 'result-icon success' : 'result-icon failure'}">
                        ${score >= 60 ? 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' : 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'}
                    </div>
                    <h2 class="result-title">${score >= 60 ? '恭喜通過！' : '再接再厲！'}</h2>
                    <p>${title} | 考生：${nickname}</p>
                    
                    <div class="score-container">
                        <div class="result-score"><span class="score-value">${score}</span><span class="score-total">/100</span></div>
                    </div>
                    
                    <div class="rank-info"><p>您在 ${leaderboardCategory} 排行榜中排名第 <strong>${userRank}</strong> 名</p></div>
                    
                    <h3 class="leaderboard-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.8 5.8 21 7 14.1 2 9.3l7-1L12 2l3 6.3 7 1-5 4.8 1.2 6.9-6.2-3.2Z"></path></svg>
                        ${leaderboardCategory} 排行榜（前五名）
                    </h3>
                    <div class="mini-leaderboard">
            `;
            
            if (topFive.length === 0) {
                html += `<p class="no-data">暫無排名數據</p>`;
            } else {
                topFive.forEach((item, index) => {
                    html += `<div class="rank-item ${item.examId === latestExamId ? 'current-user' : ''}"><div class="rank-position">${index + 1}</div><div class="rank-nickname">${item.nickname}</div><div class="rank-score">${item.score}</div></div>`;
                });
            }
            
            html += `
                    </div>
                    <div class="button-group" style="margin-top: 2rem;">
                        <a href="index.html" class="btn btn-secondary">返回首頁</a>
                        <button id="restart-exam-btn" class="btn btn-primary">再測一次</button>
                    </div>
                </div>
            `;
            
            const detailedQuestions = state.currentQuestions.map(q => ({ ...q, userAnswer: state.answers[q.id] }));
            html += renderAnswerReview(detailedQuestions);
            stepDivs.RESULT.innerHTML = html;
            stepDivs.RESULT.querySelector('#restart-exam-btn').addEventListener('click', () => location.reload());

        } catch (error) {
             console.error("Error rendering results:", error);
             stepDivs.RESULT.innerHTML = `<div class="glass-card fade-in" style="padding: 2rem;"><p class="no-data">無法載入排名資料，但您的分數是 ${score} 分。</p></div>`;
        }
    }

    function renderResultStepPreview() {
        const { score, selectedSubject, selectedArea, selectedYear, selectedExamType, nickname } = state;
        let title = `${selectedArea} | ${selectedSubject} (${selectedExamType})`;
        if (selectedArea === '國考區') {
            title = `${selectedYear}年 ${selectedSubject} - ${selectedExamType}`;
        }
        let html = `
            <div class="result-container glass-card fade-in">
                <div class="${score >= 60 ? 'result-icon success' : 'result-icon failure'}">${score >= 60 ? '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'}</div>
                <h2 class="result-title">${score >= 60 ? '恭喜通過！' : '再接再厲！'}</h2>
                <p>${title} | 考生：${nickname}</p>
                <div class="score-container"><div class="result-score"><span class="score-value">${score}</span><span class="score-total">/100</span></div></div>
                <div class="rank-info"><p>預覽模式下不計算排名</p></div>
                <div class="button-group" style="margin-top: 2rem;"><a href="index.html" class="btn btn-secondary">返回首頁</a><button id="restart-exam-btn" class="btn btn-primary">再測一次</button></div>
            </div>
        `;
        const detailedQuestions = state.currentQuestions.map(q => ({...q, userAnswer: state.answers[q.id]}));
        html += renderAnswerReview(detailedQuestions);
        stepDivs.RESULT.innerHTML = html;
        stepDivs.RESULT.querySelector('#restart-exam-btn').addEventListener('click', () => location.reload());
    }

    function renderAnswerReview(questions) {
        let reviewHtml = `<div class="answer-review-section"><h3 class="answer-review-title">作答回顧</h3>`;
        questions.forEach((q, index) => {
            const isCorrect = q.userAnswer === q.answer;
            reviewHtml += `<div class="review-question-item ${isCorrect ? 'correct' : 'incorrect'}">
                    <div class="review-question-content"><div class="review-question-number">${index + 1}</div><div class="question-text">${q.content}</div></div>
                    <div class="review-options-list">
                        ${q.options.map((opt, optIndex) => {
                            let icon = '';
                            if (optIndex === q.answer) icon = `<svg class="review-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="color: var(--success-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>`;
                            else if (optIndex === q.userAnswer) icon = `<svg class="review-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="color: var(--danger-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path></svg>`;
                            return `<div class="review-option ${optIndex === q.answer ? 'correct-answer' : (optIndex === q.userAnswer ? 'user-selected' : '')}">${icon || '<div class="review-option-icon"></div>'}<span>${opt}</span></div>`;
                        }).join('')}
                    </div>
                    ${q.explanation ? `<div class="explanation-box"><strong>詳解：</strong><p>${q.explanation.replace(/\n/g, '<br>')}</p></div>` : ''}
                </div>`;
        });
        reviewHtml += `</div>`;
        return reviewHtml;
    }

    // Initializer
    document.getElementById('start-btn').addEventListener('click', () => {
        const nickname = document.getElementById('nickname-input').value.trim();
        if (nickname === '') {
            alert('請輸入暱稱');
            return;
        }
        setState({ nickname: nickname, view: 'AREA' });
    });

    async function initialize() {
        await loadAllQuestions();
        render(); // Initial render for nickname screen
    }
    
    initialize();
});