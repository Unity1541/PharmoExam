

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
    
    const allSubjects = ['藥理藥化', '生物藥劑', '藥物分析', '藥事行政法規', '藥物治療', '藥劑學', '生藥學'];
    const availableExamTypes = ['第一次藥師考試', '第二次藥師考試', '小考練習區'];
    const pharmacognosyExamTypes = [
        '第一次藥師考試',
        '第二次藥師考試',
        '小考練習區',
        '生藥學緒論與研發',
        '生物科技藥品',
        '碳水化合物(醣類)',
        '配糖體(苷類)',
        '鞣質(鞣酸)',
        '生物鹼',
        '苯丙烷類',
        '萜類化合物',
        '揮發油',
        '脂質',
        '類固醇',
        '樹脂',
        '中藥學'
    ];
    const pharmacologyExamTypes = [
        '藥物效力學', '藥物動力學', '擬交感神經作用藥', '交感神經阻斷劑', '擬副交感神經作用藥', '膽鹼神經阻斷藥', '神經肌肉阻斷劑', '神經節阻斷劑', '鎮靜催眠藥', '抗精神病藥', '抗憂鬱藥', '抗焦慮症藥', '抗躁鬱藥', '抗癲癇藥', '抗帕金森藥', '肌肉疾病用藥', '全身麻醉溶劑', '局部麻醉溶劑', '中樞興奮藥、濫用藥物', '麻醉性鎮痛藥', '非固醇類抗炎鎮痛藥', '抗痛風藥', '風濕性關節炎治療藥物', '自泌素及相關藥物', '抗組織胺藥', '抗高血壓藥', '心臟衰竭治療藥物', '利尿劑', '降血脂藥', '心絞痛治療藥物', '心律不整治療藥物', '血栓症治療藥物', '貧血、血液疾病治療藥物', '糖尿病治療藥物', '甲状腺疾病治療藥物', '下視丘及腦下垂體激素', '腎上腺類固醇激素', '雄性激素', '雌性激素', '黃體激素', '鈣調節藥', '抗生素', '抗感染藥物', '抗病毒藥物', '抗黴菌藥物', '抗分枝桿菌藥物 (結核病、痲瘋)', '抗原蟲藥物、驅蟲蟲藥', '抗癌藥物、化學治療藥', '免疫抑制藥、免疫調節藥', '基因療法', '消化性潰瘍用藥', '腹瀉、便秘、腸道疾病用藥', '呼吸道疾病用藥', '止吐藥、鎮咳劑', '皮膚疾病用藥', '重金屬及藥物中毒的解毒藥', '中草藥及天然物'
    ];
    let allQuestions = [];

    // 狀態變量
    let currentStep = 0; // 0: 暱稱, 1: 年份, 2: 科目, 3: 考試類型, 4: 考試中, 5: 結果
    let nickname = '';
    let selectedYear = null;
    let selectedSubject = null;
    let selectedExamType = null;
    let timeLimit = 30; // 預設 30 分鐘
    let timeLeft = timeLimit * 60;
    let examInProgress = false;
    let currentQuestions = [];
    let answers = {};
    let score = 0;
    let timer = null;
    let latestExamId = null;

    // 獲取DOM元素
    const nicknameStep = document.getElementById('nickname-step');
    const yearStep = document.getElementById('year-step');
    const subjectStep = document.getElementById('subject-step');
    const examTypeStep = document.getElementById('exam-type-step');
    const examStep = document.getElementById('exam-step');
    const resultStep = document.getElementById('result-step');
    
    const nicknameInput = document.getElementById('nickname-input');
    const startBtn = document.getElementById('start-btn');
    const yearSelect = document.getElementById('year-select');
    const yearNextBtn = document.getElementById('year-next-btn');
    
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

    // 綁定事件
    startBtn.addEventListener('click', () => {
        if (nicknameInput.value.trim() === '') {
            alert('請輸入暱稱');
            return;
        }
        nickname = nicknameInput.value.trim();
        currentStep = 1;
        updateUI();
    });

    yearNextBtn.addEventListener('click', () => {
        if (yearSelect.value === '') {
            alert('請選擇年度');
            return;
        }
        selectedYear = yearSelect.value;
        currentStep = 2;
        updateUI();
    });

    // 更新UI
    function updateUI() {
        [nicknameStep, yearStep, subjectStep, examTypeStep, examStep, resultStep].forEach(el => el.style.display = 'none');
        
        switch (currentStep) {
            case 0: nicknameStep.style.display = 'block'; break;
            case 1: yearStep.style.display = 'block'; break;
            case 2: renderSubjectStep(); subjectStep.style.display = 'block'; break;
            case 3: renderExamTypeStep(); examTypeStep.style.display = 'block'; break;
            case 4: renderExamStep(); examStep.style.display = 'block'; break;
            case 5: 
                if (usePreviewMode) {
                    renderResultStepPreview();
                } else {
                    renderResultStep();
                }
                resultStep.style.display = 'block'; 
                break;
        }
    }

    // 渲染科目選擇步驟
    function renderSubjectStep() {
        let html = `
            <h2 class="step-title">選擇考試科目</h2>
            <p class="step-description">您選擇了 ${selectedYear} 年度，請選擇科目：</p>
            <div class="selection-grid">
        `;
        
        allSubjects.forEach(subject => {
            const hasQuestions = allQuestions.some(q => q.year === selectedYear && q.subject === subject);
            const disabledClass = hasQuestions ? '' : 'disabled';
            
            html += `
                <div class="selection-card ${disabledClass}" data-subject="${subject}" ${!hasQuestions ? 'aria-disabled="true"' : ''}>
                    <h3>${subject}</h3>
                    <p>${hasQuestions ? `選擇 ${subject}` : `${selectedYear} 年無 ${subject} 相關題目`}</p>
                </div>
            `;
        });
        
        html += `</div>`;
        subjectStep.innerHTML = html;
        
        document.querySelectorAll('.selection-card:not(.disabled)').forEach(card => {
            card.addEventListener('click', () => {
                selectedSubject = card.getAttribute('data-subject');
                currentStep = 3;
                updateUI();
            });
        });
    }

    // 渲染考試類型選擇步驟
    function renderExamTypeStep() {
        if (selectedSubject === '藥理藥化') {
            // Use dropdown for pharmacology
            let html = `
                <h2 class="step-title">選擇考試章節</h2>
                <p class="step-description">您選擇了 ${selectedYear} 年 ${selectedSubject}，請從下方選單選擇一個小節開始測驗。</p>
                <div class="select-container">
                    <div class="select-wrapper">
                        <select id="exam-type-select" class="glass-select">
                            <option value="" disabled selected>-- 選擇一個章節 --</option>
            `;

            const allPharmacologyTypes = [...availableExamTypes, ...pharmacologyExamTypes];
            allPharmacologyTypes.forEach(examType => {
                const hasQuestions = allQuestions.some(q => 
                    q.year === selectedYear && 
                    q.subject === selectedSubject && 
                    q.examType === examType
                );
                const disabledAttr = hasQuestions ? '' : 'disabled';
                const label = hasQuestions ? examType : `${examType} (無題目)`;
                html += `<option value="${examType}" ${disabledAttr}>${label}</option>`;
            });
            
            html += `
                        </select>
                    </div>
                </div>
                <div class="button-container">
                    <button id="start-exam-from-select" class="btn btn-primary">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        開始測驗
                    </button>
                </div>
            `;
            examTypeStep.innerHTML = html;

            document.getElementById('start-exam-from-select').addEventListener('click', () => {
                const selectElement = document.getElementById('exam-type-select');
                if (selectElement.value) {
                    selectedExamType = selectElement.value;
                    startExam();
                } else {
                    alert('請選擇一個章節');
                }
            });

        } else {
            // Existing card logic for other subjects
            const currentExamTypes = selectedSubject === '生藥學' ? pharmacognosyExamTypes : availableExamTypes;

            let html = `
                <h2 class="step-title">選擇考試類型</h2>
                <p class="step-description">您選擇了 ${selectedYear} 年 ${selectedSubject}，請選擇考試類型：</p>
                <div class="selection-grid">
            `;

            currentExamTypes.forEach(examType => {
                const hasQuestions = allQuestions.some(q => 
                    q.year === selectedYear && 
                    q.subject === selectedSubject && 
                    q.examType === examType
                );
                const disabledClass = hasQuestions ? '' : 'disabled';

                html += `
                    <div class="selection-card ${disabledClass}" data-exam-type="${examType}" ${!hasQuestions ? 'aria-disabled="true"' : ''}>
                        <h3>${examType}</h3>
                        <p>${hasQuestions ? '點擊開始測驗' : '此分類下尚無試題'}</p>
                    </div>
                `;
            });

            html += `</div>`;
            examTypeStep.innerHTML = html;

            document.querySelectorAll('.selection-card:not(.disabled)').forEach(card => {
                card.addEventListener('click', () => {
                    selectedExamType = card.getAttribute('data-exam-type');
                    startExam();
                });
            });
        }
    }


    // 開始考試
    function startExam() {
        currentQuestions = allQuestions.filter(q => 
            q.year === selectedYear && 
            q.subject === selectedSubject &&
            q.examType === selectedExamType
        );

        if (currentQuestions.length === 0) {
            alert(`${selectedYear} 年 ${selectedSubject} (${selectedExamType}) 尚無試題。`);
            return;
        }
        answers = {};
        currentQuestions.forEach(q => { answers[q.id] = null; });
        examInProgress = true;
        timeLeft = timeLimit * 60;
        latestExamId = `exam_${Date.now()}`;
        currentStep = 4;
        updateUI();
        startTimer();
    }

    // 渲染考試步驟
    function renderExamStep() {
        let html = `
            <div class="exam-header glass-card">
                <div>
                    <h2>${selectedYear}年 ${selectedSubject} (${selectedExamType})</h2>
                    <p>考生：${nickname} | 共 ${currentQuestions.length} 題</p>
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
        examStep.innerHTML = html;
        
        document.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const questionId = item.getAttribute('data-question');
                const optionIndex = parseInt(item.getAttribute('data-option'));
                
                document.querySelectorAll(`.option-item[data-question="${questionId}"]`).forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
                answers[questionId] = optionIndex;
                updateProgressBar();
            });
        });
        document.getElementById('submit-exam').addEventListener('click', submitExam);
    }

    function updateProgressBar() {
        const answeredCount = Object.values(answers).filter(a => a !== null).length;
        const percentage = (answeredCount / currentQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
    }

    function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft--;
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) timeDisplay.textContent = formatTime(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timer);
                alert('時間到！將自動提交答案。');
                submitExam();
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async function submitExam() {
        clearInterval(timer);
        examInProgress = false;
        let correctCount = 0;
        currentQuestions.forEach(q => { if (answers[q.id] === q.answer) correctCount++; });
        score = currentQuestions.length > 0 ? Math.round((correctCount / currentQuestions.length) * 100) : 0;
        
        if (usePreviewMode) {
            currentStep = 5;
            updateUI();
            return;
        }

        // --- New split error handling ---
        let attemptSaved = false;
        try {
            await saveExamAttempt();
            attemptSaved = true; // This will now create the examAttempts collection
        } catch (error) {
            console.error("CRITICAL: Failed to save the detailed exam attempt record.", error);
            const isPermissionError = error.message.toLowerCase().includes('permission');
            const userFriendlyMessage = isPermissionError
                ? `這通常表示您的 Firestore 安全性規則不允許寫入資料。請檢查 Firebase 控制台中的「Firestore Database > 規則」分頁設定，或參考 FIREBASE_SETUP.md 的疑難排解部分。`
                : `請檢查您的網路連線或 Firebase 設定。`;
            
            alert(`發生嚴重錯誤，無法儲存您的作答紀錄。\n\n您的分數是 ${score} 分，但詳細紀錄遺失。\n\n錯誤訊息: ${error.message}\n\n${userFriendlyMessage}`);
        }

        // If attempt was saved, now try to update the leaderboard.
        if (attemptSaved) {
            try {
                await updateLeaderboard();
            } catch (error) {
                console.error("NON-CRITICAL: Failed to update leaderboard, likely a missing index.", error);
                alert(`您的作答紀錄已儲存成功，但更新排行榜時失敗了！\n\n這通常是因為缺少必要的資料庫索引。請打開瀏覽器開發人員主控台(F12)，找到錯誤訊息中的連結並點擊以建立索引。\n\n錯誤訊息: ${error.message}`);
            }
        }
        
        currentStep = 5;
        updateUI();
    }

    async function saveExamAttempt() {
        const detailedQuestions = currentQuestions.map(q => ({
            content: q.content,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || '',
            userAnswer: answers[q.id] === null ? -1 : answers[q.id]
        }));
    
        const attemptData = {
            examId: latestExamId,
            nickname: nickname,
            nickname_lowercase: nickname.toLowerCase(),
            year: selectedYear,
            subject: selectedSubject,
            examType: selectedExamType,
            score: score,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            questions: detailedQuestions,
            leaderboardCategory: selectedExamType === '小考練習區' ? '小考練習區' : selectedSubject
        };
    
        // This is a simple add operation and should not require a composite index.
        await examAttemptsCollection.add(attemptData);
    }

    async function updateLeaderboard() {
        const leaderboardCategory = selectedExamType === '小考練習區' ? '小考練習區' : selectedSubject;

        const userRecord = {
            nickname,
            nickname_lowercase: nickname.toLowerCase(),
            score,
            subject: leaderboardCategory,
            year: selectedYear,
            examType: selectedExamType,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            examId: latestExamId
        };

        // This query requires a composite index on (subject, nickname_lowercase)
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

    function renderAnswerReview(questions, userAnswers) {
        let reviewHtml = `
            <div class="answer-review-section">
                <h3 class="answer-review-title">作答回顧</h3>
        `;
        
        questions.forEach((q, index) => {
            const userAnswer = q.userAnswer !== undefined ? q.userAnswer : userAnswers[q.id];
            const isCorrect = userAnswer === q.answer;
            const itemClass = isCorrect ? 'correct' : 'incorrect';
            
            reviewHtml += `
                <div class="review-question-item ${itemClass}">
                    <div class="review-question-content">
                        <div class="review-question-number">${index + 1}</div>
                        <div class="question-text">${q.content}</div>
                    </div>
                    <div class="review-options-list">
                        ${q.options.map((opt, optIndex) => {
                            let optionClass = '';
                            let icon = '';
                            const isUserAnswer = optIndex === userAnswer;
                            const isCorrectAnswer = optIndex === q.answer;

                            if (isCorrectAnswer) {
                                optionClass = 'correct-answer';
                                icon = `<svg class="review-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="color: var(--success-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>`;
                            }
                            if (isUserAnswer && !isCorrectAnswer) {
                                optionClass = 'user-selected';
                                icon = `<svg class="review-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="color: var(--danger-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path></svg>`;
                            }

                            return `
                                <div class="review-option ${optionClass}">
                                    ${icon || '<div class="review-option-icon"></div>'}
                                    <span>${opt}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${q.explanation ? `
                    <div class="explanation-box">
                        <strong>詳解：</strong>
                        <p>${q.explanation.replace(/\n/g, '<br>')}</p>
                    </div>` : ''}
                </div>
            `;
        });
        
        reviewHtml += `</div>`;
        return reviewHtml;
    }


    async function renderResultStep() {
        resultStep.innerHTML = `<div class="loading-spinner">正在計算您的成績與排名...</div>`;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const leaderboardCategory = selectedExamType === '小考練習區' ? '小考練習區' : selectedSubject;

        try {
            const q = leaderboardCollection.where('subject', '==', leaderboardCategory);
            const snapshot = await q.get();
            let subjectLeaderboard = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
            
            subjectLeaderboard.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                const dateA = a.date ? a.date.toMillis() : 0;
                const dateB = b.date ? b.date.toMillis() : 0;
                return dateB - dateA;
            });
            
            const userRankData = subjectLeaderboard.find(item => item.examId === latestExamId);
            const userRank = userRankData ? subjectLeaderboard.indexOf(userRankData) + 1 : "N/A";
            const topFive = subjectLeaderboard.slice(0, 5);

            let html = `
                <div class="result-container glass-card fade-in">
                     <div class="${score >= 60 ? 'result-icon success' : 'result-icon failure'}">
                        ${score >= 60 ? 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' : 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'}
                    </div>
                    <h2 class="result-title">${score >= 60 ? '恭喜通過！' : '再接再厲！'}</h2>
                    <p>${selectedYear}年 ${selectedSubject} (${selectedExamType}) | 考生：${nickname}</p>
                    
                    <div class="score-container">
                        <div class="result-score">
                            <span class="score-value">${score}</span>
                            <span class="score-total">/100</span>
                        </div>
                    </div>
                    
                    <div class="rank-info">
                        <p>您在 ${leaderboardCategory} 排行榜中排名第 <strong>${userRank}</strong> 名</p>
                    </div>
                    
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
                    html += `
                        <div class="rank-item ${item.examId === latestExamId ? 'current-user' : ''}">
                            <div class="rank-position">${index + 1}</div>
                            <div class="rank-nickname">${item.nickname}</div>
                            <div class="rank-score">${item.score}</div>
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                    <div class="button-group" style="margin-top: 2rem;">
                        <a href="index.html" class="btn btn-secondary">返回首頁</a>
                        <a href="exam.html" class="btn btn-primary">再測一次</a>
                    </div>
                </div>
            `;
            
            const detailedQuestions = currentQuestions.map(q => ({
                ...q,
                userAnswer: answers[q.id]
            }));
            html += renderAnswerReview(detailedQuestions, {});

            resultStep.innerHTML = html;
        } catch (error) {
             console.error("Error rendering results:", error);
             resultStep.innerHTML = `<div class="glass-card fade-in" style="padding: 2rem;"><p class="no-data">無法載入排名資料，但您的分數是 ${score} 分。</p></div>`
        }
    }

    function renderResultStepPreview() {
        let html = `
            <div class="result-container glass-card fade-in">
                 <div class="${score >= 60 ? 'result-icon success' : 'result-icon failure'}">
                    ${score >= 60 ? 
                        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' : 
                        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'}
                </div>
                <h2 class="result-title">${score >= 60 ? '恭喜通過！' : '再接再厲！'}</h2>
                <p>${selectedYear}年 ${selectedSubject} (${selectedExamType}) | 考生：${nickname}</p>
                
                <div class="score-container">
                    <div class="result-score">
                        <span class="score-value">${score}</span>
                        <span class="score-total">/100</span>
                    </div>
                </div>
                
                <div class="rank-info">
                    <p>預覽模式下不計算排名</p>
                </div>
                
                 <div class="button-group" style="margin-top: 2rem;">
                    <a href="index.html" class="btn btn-secondary">返回首頁</a>
                    <a href="exam.html" class="btn btn-primary">再測一次</a>
                </div>
            </div>
        `;

        const detailedQuestions = currentQuestions.map(q => ({
            ...q,
            userAnswer: answers[q.id]
        }));
        html += renderAnswerReview(detailedQuestions, {});

        resultStep.innerHTML = html;
    }

    // Initialize the page
    async function initialize() {
        await loadAllQuestions();
        updateUI();
    }
    
    initialize();
});