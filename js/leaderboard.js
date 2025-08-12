document.addEventListener('DOMContentLoaded', function() {
    // Super-gatekeeper: Check for initialization errors first.
    if (window.firebaseInitializationError) {
        const leaderboardSection = document.querySelector('.leaderboard-section');
        leaderboardSection.innerHTML = `
            <div class="login-header" style="padding: 2rem 0;">
                <svg class="login-icon" style="color: var(--danger-color);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2 style="color: var(--danger-color);">Firebase 設定錯誤</h2>
                <p>無法載入排行榜，因為 <code>js/firebase.js</code> 檔案中的設定格式有誤。</p>
                <pre style="max-width: 600px; margin: 1rem auto; text-align: left; padding: 1rem; background-color: #FEF2F2; border-radius: 0.75rem; color: #991B1B; white-space: pre-wrap; word-wrap: break-word;">${window.firebaseInitializationError.message}</pre>
            </div>
        `;
        return;
    }

    const usePreviewMode = !isFirebaseConfigured();
    const leaderboardCollection = usePreviewMode ? null : db.collection('leaderboard');
    const examAttemptsCollection = usePreviewMode ? null : db.collection('examAttempts');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // History search elements
    const historyNicknameInput = document.getElementById('history-nickname-input');
    const searchHistoryBtn = document.getElementById('search-history-btn');
    const historyResultsContainer = document.getElementById('history-results-container');
    const reviewModal = document.getElementById('review-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // 科目映射
    const subjectMapping = {
        'pharmacology': '藥理藥化',
        'biopharmaceutics': '生物藥劑',
        'analysis': '藥物分析',
        'law': '藥事行政法規',
        'therapeutics': '藥物治療',
        'pharmaceutics': '藥劑學',
        'pharmacognosy': '生藥學',
        'quiz': '小考練習區'
    };

    function showPreviewWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'demo-info';
        warningDiv.style.marginBottom = '2rem';
        warningDiv.style.textAlign = 'center';
        warningDiv.innerHTML = '<p><strong>預覽模式</strong>：目前顯示預設排名。請設定 <code>js/firebase.js</code> 以查看即時排行榜。</p>';
        
        const leaderboardSection = document.querySelector('.leaderboard-section');
        if (leaderboardSection) {
            leaderboardSection.insertBefore(warningDiv, leaderboardSection.firstChild);
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            tabContents.forEach(content => content.classList.remove('active'));
            
            const subjectKey = this.getAttribute('data-subject');
            const leaderboardContainerId = `${Object.keys(subjectMapping).find(key => subjectMapping[key] === subjectKey)}-leaderboard`;
            const container = document.getElementById(leaderboardContainerId)
            if (container) {
                container.classList.add('active');
            }
        });
    });
    
    // 加載所有排行榜數據
    if (usePreviewMode) {
        showPreviewWarning();
    }
    loadAllLeaderboards();

    async function loadAllLeaderboards() {
        for (const key in subjectMapping) {
            const subjectName = subjectMapping[key];
            const leaderboardContainer = document.getElementById(`${key}-leaderboard`);
            if (leaderboardContainer) {
                await loadLeaderboardForSubject(subjectName, leaderboardContainer);
            }
        }
    }

    async function loadLeaderboardForSubject(subject, container) {
        if (usePreviewMode) {
            renderLeaderboard(MOCK_LEADERBOARD[subject] || [], container);
            return;
        }

        try {
            // Use a simpler query and sort on the client to avoid needing a composite index.
            const q = leaderboardCollection.where('subject', '==', subject);
            const snapshot = await q.get();

            let leaderboardData = snapshot.docs.map(doc => doc.data());
            
            // Client-side sorting: sort by score desc, then by date desc (newer first)
            leaderboardData.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                const dateA = a.date ? a.date.toMillis() : 0;
                const dateB = b.date ? b.date.toMillis() : 0;
                return dateB - dateA; // Newer scores first for tie-breaking
            });
            
            const top5 = leaderboardData.slice(0, 5);
            renderLeaderboard(top5, container);

        } catch (error) {
            console.error(`Error loading leaderboard for ${subject}:`, error);
            container.innerHTML = `<div class="empty-leaderboard"><p>載入排名時出錯，請檢查 Firebase 設定。</p></div>`;
        }
    }

    function renderLeaderboard(data, container) {
        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-leaderboard">
                    <p>暫無排名數據</p>
                    <a href="exam.html" class="btn btn-primary">參加考試</a>
                </div>
            `;
            return;
        }

        let html = '<div class="leaderboard-cards">';
        data.slice(0, 5).forEach((item, index) => {
            const rankClass = index < 3 ? `top-${index + 1}` : '';
            const medalOrRank = index < 3 
                ? `<div class="medal">${index + 1}</div>` 
                : `<div class="rank">${index + 1}</div>`;
            
            html += `
                <div class="leaderboard-card ${rankClass}">
                    ${medalOrRank}
                    <div class="user-avatar">${item.nickname.charAt(0)}</div>
                    <div class="user-name">${item.nickname}</div>
                    <div class="score">${item.score}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // --- History Search Functionality ---

    if (!usePreviewMode) {
        searchHistoryBtn.addEventListener('click', searchHistory);
        historyNicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchHistory();
            }
        });
        modalCloseBtn.addEventListener('click', () => {
            reviewModal.style.display = 'none';
        });
        reviewModal.addEventListener('click', (e) => {
            if (e.target === reviewModal) {
                reviewModal.style.display = 'none';
            }
        });
    } else {
        // Disable search in preview mode
        historyNicknameInput.disabled = true;
        searchHistoryBtn.disabled = true;
        historyResultsContainer.innerHTML = '<p class="no-data" style="text-align: center;">此功能在預覽模式下不可用。</p>';
    }

    async function searchHistory() {
        const nickname = historyNicknameInput.value.trim();
        if (!nickname) {
            historyResultsContainer.innerHTML = '<p class="no-data" style="text-align: center;">請輸入一個暱稱進行查詢。</p>';
            return;
        }

        historyResultsContainer.innerHTML = '<div class="loading-spinner">正在查詢紀錄...</div>';
        
        const nicknameLower = nickname.toLowerCase();

        try {
            // Query by the lowercase nickname to avoid case-sensitivity issues.
            const snapshot = await examAttemptsCollection
                .where('nickname_lowercase', '==', nicknameLower)
                .get();
            
            if (snapshot.empty) {
                historyResultsContainer.innerHTML = `<p class="no-data" style="text-align: center;">找不到暱稱為「${nickname}」的考試紀錄。</p>`;
                return;
            }

            // Map and sort results on the client side.
            let attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            attempts.sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));

            renderHistoryResults(attempts);

        } catch (error) {
            console.error("Error searching history:", error);
            historyResultsContainer.innerHTML = `<p class="no-data" style="text-align: center;">查詢時發生錯誤，請稍後再試。</p>`;
        }
    }

    function renderHistoryResults(attempts) {
        let html = attempts.map(attempt => {
            const attemptDate = attempt.date ? new Date(attempt.date.seconds * 1000).toLocaleString('zh-TW') : 'N/A';
            let title = `${attempt.area} - ${attempt.subject}`;
            if(attempt.area === '國考區') {
                title = `${attempt.year} ${attempt.subject} (${attempt.examType})`
            } else {
                 title = `${attempt.area} - ${attempt.subject} (${attempt.examType})`
            }

            return `
                <div class="history-item" data-attempt-id="${attempt.id}">
                    <div class="history-item-info">
                        <h4>${title}</h4>
                        <p>考試日期：${attemptDate}</p>
                    </div>
                    <div class="history-item-score">${attempt.score}</div>
                </div>
            `;
        }).join('');

        historyResultsContainer.innerHTML = html;

        // Attach listeners to new items
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const attemptId = item.dataset.attemptId;
                const selectedAttempt = attempts.find(a => a.id === attemptId);
                showReviewModal(selectedAttempt);
            });
        });
    }

    function showReviewModal(attempt) {
        if (!attempt) return;
        modalBody.innerHTML = renderAnalysisReport(attempt);
        reviewModal.style.display = 'flex';
        animateProgressCircle(attempt.score);
    }
    
    function formatTime(seconds) {
        if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function animateProgressCircle(score) {
        const circle = document.querySelector('#review-modal .progress-ring-track-green');
        if (!circle) return;
    
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;
    
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            circle.style.strokeDashoffset = offset;
        }, 100);
    }

    function renderAnalysisReport(attempt) {
        const { score, questions, area, year, subject, examType, completionTime } = attempt;

        const totalQuestions = questions.length;
        const correctCount = questions.filter(q => q.userAnswer === q.answer).length;
        const completionTimeFormatted = formatTime(completionTime);
        let title = `${area} - ${subject} - ${examType}`;
        if (area === '國考區') {
            title = `${year} ${subject} - ${examType}`;
        }
    
        const reportHTML = `
        <div class="analysis-container">
            <div class="analysis-header">
                <div class="analysis-icon-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <rect width="24" height="24" rx="6"/>
                    </svg>
                </div>
                <h2>測驗結果分析</h2>
                <p>深入分析您的答題表現，發現學習重點與改進方向</p>
            </div>
            <div class="analysis-main-grid">
                <div class="analysis-score-card card">
                    <div class="progress-circle" data-progress="${score}">
                        <svg class="progress-ring" width="200" height="200" viewBox="0 0 120 120">
                            <circle class="progress-ring-bg" r="54" cx="60" cy="60"/>
                            <circle class="progress-ring-track-red" r="54" cx="60" cy="60"/>
                            <circle class="progress-ring-track-green" r="54" cx="60" cy="60"/>
                        </svg>
                        <div class="progress-text">${score}%</div>
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
                    <h3><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; color: #f59e0b;"><path d="M12 17.8 5.8 21 7 14.1 2 9.3l7-1L12 2l3 6.3 7 1-5 4.8 1.2 6.9-6.2-3.2Z"></path></svg> 我的成就</h3>
                    <div class="achievement-item">
                        <div class="achievement-icon">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.68,6.34C11.9,4.9,10.29,4.5,9.22,5.29S7.53,7.21,8.32,8.28c.48.65,1.18,1.06,1.93,1.16v1.94c-1.33.2-2.33,1.33-2.33,2.62,0,1.47,1.19,2.67,2.67,2.67s2.67-1.19,2.67-2.67c0-1.29-1-2.42-2.33-2.62V9.32c1.73-.53,2.58-2.31,2.05-3.98Z M17,2H7C4.79,2,3,3.79,3,6v10c0,1.04.42,2,1.17,2.65l1.45-1.24C5.25,17.06,5,16.55,5,16V8c0-1.3.84-2.4,2-2.82V16c0,2.21,1.79,4,4,4s4-1.79,4-4V5.18c1.16.41,2,1.51,2,2.82v8c0,.55-.25,1.06-.62,1.41l1.45,1.24C19.58,18,20,17.04,20,16V6c0-2.21-1.79-4-4-4Z"></path></svg>
                        </div>
                        <div class="achievement-text">
                            <h4>初試啼聲</h4>
                            <p>完成您的第一次測驗！</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    
        const reviewHTML = renderAnswerReview(questions);
        return reportHTML + reviewHTML;
    }

    function renderAnswerReview(questions) {
        let reviewHtml = `
            <div class="analysis-details-section">
                <h3 class="answer-review-title">逐題詳細分析</h3>
        `;
        
        questions.forEach((q, index) => {
            const userAnswer = q.userAnswer;
            const isCorrect = userAnswer === q.answer;
            const itemClass = isCorrect ? 'correct' : 'incorrect';
            
            reviewHtml += `
                <div class="review-question-item ${itemClass}">
                    <div class="review-question-content">
                        <div class="question-number review-question-number">${index + 1}</div>
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
                                icon = `<svg class="review-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>`;
                            }
                            if (isUserAnswer && !isCorrectAnswer) {
                                optionClass = 'user-selected';
                                icon = `<svg class="review-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path></svg>`;
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
});