document.addEventListener('DOMContentLoaded', () => {
    const examContainer = document.getElementById('exam-container');
    // Super-gatekeeper: Check for initialization errors first.
    if (window.firebaseInitializationError) {
        examContainer.innerHTML = `
            <div class="card fade-in" style="max-width: 650px; margin: 2rem auto;">
                 <div class="login-header">
                    <svg class="login-icon" style="color: var(--danger-color);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 style="color: var(--danger-color);">Firebase 設定錯誤</h2>
                    <p>您的 Firebase 設定檔 (<code>js/firebase.js</code>) 存在格式錯誤，導致應用程式無法啟動。請檢查您的設定是否從 Firebase 控制台完整複製。</p>
                </div>
                <div class="demo-info" style="text-align: left; background-color: #FEF2F2; color: #991B1B;">
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
    
    // SPA Navigation Setup
    const openExamBtn = document.getElementById('open-exam-btn');
    const closeExamBtn = document.getElementById('close-exam-btn');
    const heroSection = document.querySelector('.hero');
    const landingMain = document.querySelector('.landing-main');

    function openExam() {
        if(heroSection) heroSection.style.display = 'none';
        if(landingMain) landingMain.style.display = 'none';
        examContainer.style.display = 'block';
        setState({ view: 'NICKNAME', nickname: '' });
        const nameInput = document.getElementById('nickname-input');
        if(nameInput) nameInput.value = '';
    }

    function closeExam() {
        // Simple reload to ensure leaderboard is updated with new scores
        location.reload(); 
    }

    openExamBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openExam();
    });

    closeExamBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        closeExam();
    });
    
    // Data Definitions
    const examAreas = {
        '單字測驗': '練習您的英文字彙能力',
        '文法練習': '加強基礎與進階文法概念',
        '閱讀測驗': '提升文章理解與語感'
    };
    const allSubjects = ['英文']; // simplified to single logic tree
    const availableYears = []; 
    const nationalExamTypes = [];
    const quizExamType = '綜合測驗';
    const practiceChapters = {
        '英文': ['單字', '文法', '閱讀測驗']
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
        timeLimit: 60,
        timeLeft: 3600,
        currentQuestions: [],
        answers: {},
        score: 0,
        timer: null,
        latestExamId: null,
        startTime: 0,
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
                <div class="selection-card no-hover" data-area="${area}">
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
        // Automatically set subject and jump to chapter selection since we only have English now.
        setState({ selectedSubject: '英文', selectedExamType: state.selectedArea });
        startExam();
    }

    function renderSelectionStep2() {
        // Not used anymore.
    }
    
    function renderSelectionStep3() {
        // Not used anymore.
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
                <div class="selection-card no-hover ${hasQuestions ? '' : 'disabled'}" data-year="${year}">
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
                <div class="selection-card no-hover ${hasQuestions ? '' : 'disabled'}" data-subject="${subject}">
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
                <div class="selection-card no-hover ${hasQuestions ? '' : 'disabled'}" data-exam-type="${type}">
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
        const { selectedArea, selectedSubject, selectedExamType } = state;
        const currentQuestions = allQuestions.filter(q => 
            q.examType === selectedExamType
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
            startTime: Date.now(),
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
        const { selectedArea, selectedExamType, nickname, timeLeft, currentQuestions } = state;
        let title = `${nickname} | 英文 | ${selectedExamType}`;

        let html = `
            <div class="exam-header card">
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
        if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
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
    
        const leaderboardCategory = state.selectedExamType === '單字測驗' ? 'vocab' : (state.selectedExamType === '文法練習' ? 'grammar' : 'reading');
        
        const completionTimeInSeconds = Math.floor((Date.now() - state.startTime) / 1000);

        const attemptData = {
            examId: state.latestExamId,
            nickname: state.nickname,
            nickname_lowercase: state.nickname.toLowerCase(),
            area: state.selectedArea,
            year: null,
            subject: '英文',
            examType: state.selectedExamType,
            score: state.score,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            questions: detailedQuestions,
            leaderboardCategory: leaderboardCategory,
            completionTime: completionTimeInSeconds
        };
        await examAttemptsCollection.add(attemptData);
    }

    async function updateLeaderboard() {
        const { latestExamId, nickname, selectedSubject, selectedYear, selectedExamType, score, selectedArea, startTime } = state;
        const leaderboardCategory = selectedExamType === '單字測驗' ? 'vocab' : (selectedExamType === '文法練習' ? 'grammar' : 'reading');
        const completionTimeInSeconds = Math.floor((Date.now() - startTime) / 1000);

        const userRecord = {
            nickname,
            nickname_lowercase: nickname.toLowerCase(),
            score,
            subject: leaderboardCategory,
            year: null,
            examType: selectedExamType,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            examId: latestExamId,
            completionTime: completionTimeInSeconds,
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
        stepDivs.RESULT.innerHTML = `<div class="loading-spinner">正在計算您的成績...</div>`;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { score, currentQuestions, selectedArea, selectedYear, selectedSubject, selectedExamType, startTime } = state;

        const totalQuestions = currentQuestions.length;
        const correctCount = currentQuestions.filter(q => state.answers[q.id] === q.answer).length;
        const completionTime = Math.floor((Date.now() - startTime) / 1000);
        const completionTimeFormatted = formatTime(completionTime);

        let title = `英文 - ${selectedExamType}`;
        
        let reportHTML = `
            <div class="analysis-container">
                <div class="analysis-header">
                    <div class="analysis-icon-container">
                        <!-- SVG Removed for PDF compatibility -->
                    </div>
                    <h2>測驗結果分析</h2>
                    <p>深入分析您的答題表現，發現學習重點與改進方向</p>
                </div>
                <div class="analysis-main-grid">
                    <div class="analysis-score-card card">
                        <div class="simple-score-display ${score >= 60 ? 'pass' : 'fail'}">
                            <div class="score-value">${score}</div>
                            <div class="score-unit">分</div>
                        </div>
                        <div class="analysis-exam-title">「${title}」測驗結果</div>
                        <div class="analysis-stats">
                            <div class="stat-item">
                                <span class="stat-value">${correctCount}</span>
                                <span class="stat-label">答對題數</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${totalQuestions}</span>
                                <span class="stat-label">總題數</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${completionTimeFormatted}</span>
                                <span class="stat-label">完成時間</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">+${score}</span>
                                <span class="stat-label">獲得分數</span>
                            </div>
                        </div>
                    </div>
                    <div class="analysis-achievements-card card">
                        <h3><span style="margin-right: 8px; vertical-align: middle;">⭐</span>我的成就</h3>
                        <div class="achievement-item">
                            <div class="achievement-icon">
                                🏆
                            </div>
                            <div class="achievement-text">
                                <h4>初試啼聲</h4>
                                <p>完成您的第一次測驗！</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        const detailedQuestions = state.currentQuestions.map(q => ({...q, userAnswer: state.answers[q.id]}));
        const reviewHTML = renderAnswerReview(detailedQuestions);
        
        stepDivs.RESULT.innerHTML = reportHTML + reviewHTML;
        
        // Add action buttons below the report
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-group';
        buttonContainer.style.marginTop = '2rem';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.innerHTML = `
            <button id="return-home-btn" class="btn btn-secondary">返回首頁</button>
            <button id="restart-exam-btn" class="btn btn-primary">再測一次</button>
        `;
        stepDivs.RESULT.querySelector('.analysis-container').appendChild(buttonContainer);
        stepDivs.RESULT.querySelector('#restart-exam-btn').addEventListener('click', () => {
             setState({ view: 'AREA', currentQuestions: [], answers: {}, score: 0 });
        });
        stepDivs.RESULT.querySelector('#return-home-btn').addEventListener('click', () => {
             closeExam();
        });
    }

    function renderAnswerReview(questions) {
        let reviewHtml = `
            <div class="analysis-details-section">
                <h3 class="answer-review-title">逐題詳細分析</h3>`;
        questions.forEach((q, index) => {
            const userAnswer = q.userAnswer;
            const isCorrect = userAnswer === q.answer;
            reviewHtml += `<div class="review-question-item ${isCorrect ? 'correct' : 'incorrect'}">
                    <div class="review-question-content"><div class="question-number review-question-number">${index + 1}</div><div class="question-text">${q.content}</div></div>
                    <div class="review-options-list">
                        ${q.options.map((opt, optIndex) => {
                            let optionClass = '';
                            let icon = '';
                            const isUserAnswer = optIndex === userAnswer;
                            const isCorrectAnswer = optIndex === q.answer;

                            if (isCorrectAnswer) {
                                optionClass = 'correct-answer';
                                icon = `<span class="review-option-icon">✔</span>`;
                            } else if (isUserAnswer) {
                                optionClass = 'user-selected';
                                icon = `<span class="review-option-icon">✖</span>`;
                            }
                            return `<div class="review-option ${optionClass}">${icon || '<div class="review-option-icon"></div>'}<span>${opt}</span></div>`;
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