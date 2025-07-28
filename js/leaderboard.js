document.addEventListener('DOMContentLoaded', function() {
    // Super-gatekeeper: Check for initialization errors first.
    if (window.firebaseInitializationError) {
        const leaderboardSection = document.querySelector('.leaderboard-section');
        leaderboardSection.innerHTML = `
            <div class="login-header" style="padding: 2rem 0;">
                <svg class="login-icon" style="color: var(--danger-color);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2 style="background: var(--danger-color); -webkit-background-clip: text;">Firebase 設定錯誤</h2>
                <p>無法載入排行榜，因為 <code>js/firebase.js</code> 檔案中的設定格式有誤。</p>
                <pre style="max-width: 600px; margin: 1rem auto; text-align: left; padding: 1rem; background-color: rgba(239, 68, 68, 0.05); border-radius: 0.75rem; color: #c05621; white-space: pre-wrap; word-wrap: break-word;">${window.firebaseInitializationError.message}</pre>
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
            return `
                <div class="history-item" data-attempt-id="${attempt.id}">
                    <div class="history-item-info">
                        <h4>${attempt.year} ${attempt.leaderboardCategory} (${attempt.examType})</h4>
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
        modalBody.innerHTML = renderAnswerReview(attempt.questions);
        reviewModal.style.display = 'flex';
    }

    function renderAnswerReview(questions) {
        let reviewHtml = `
            <div class="answer-review-section">
                <h3 class="answer-review-title">作答回顧</h3>
        `;
        
        questions.forEach((q, index) => {
            const userAnswer = q.userAnswer;
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
});