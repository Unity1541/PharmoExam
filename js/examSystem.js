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
    
    const allSubjects = ['藥理藥化', '生物藥劑', '藥物分析', '藥事行政法規', '藥物治療', '藥劑學', '生藥學'];
    const availableExamTypes = ['第一次藥師考試', '第二次藥師考試', '小考練習區'];
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
        let html = `
            <h2 class="step-title">選擇考試類型</h2>
            <p class="step-description">您選擇了 ${selectedYear} 年 ${selectedSubject}，請選擇考試類型：</p>
            <div class="selection-grid">
        `;

        availableExamTypes.forEach(examType => {
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
        
        if (!usePreviewMode) {
            await updateLeaderboard();
        }

        currentStep = 5;
        updateUI();
    }

    async function updateLeaderboard() {
        // If the exam type is '小考練習區', we group it under its own leaderboard category.
        // Otherwise, we group it by the subject.
        const leaderboardCategory = selectedExamType === '小考練習區' ? '小考練習區' : selectedSubject;

        const userRecord = {
            nickname,
            score,
            subject: leaderboardCategory, // Use the determined category for leaderboard grouping
            year: selectedYear,
            examType: selectedExamType,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            examId: latestExamId
        };

        try {
            const querySnapshot = await leaderboardCollection
                .where('subject', '==', leaderboardCategory) // Query using the leaderboard category
                .where('nickname', '==', nickname)
                .get();

            if (!querySnapshot.empty) {
                // To simplify, we always update the latest score for a given user in a category.
                // A more complex logic could be to only update if the new score is higher.
                const docId = querySnapshot.docs[0].id;
                await leaderboardCollection.doc(docId).update(userRecord);
            } else {
                await leaderboardCollection.add(userRecord);
            }
        } catch (error) {
            console.error("Error updating leaderboard:", error);
        }
    }

    function renderAnswerReview(questions, userAnswers) {
        let reviewHtml = `
            <div class="answer-review-section">
                <h3 class="answer-review-title">作答回顧</h3>
        `;
        
        questions.forEach((q, index) => {
            const userAnswer = userAnswers[q.id];
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
            
            html += renderAnswerReview(currentQuestions, answers);

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

        html += renderAnswerReview(currentQuestions, answers);

        resultStep.innerHTML = html;
    }

    // Initialize the page
    async function initialize() {
        await loadAllQuestions();
        updateUI();
    }
    
    initialize();
});