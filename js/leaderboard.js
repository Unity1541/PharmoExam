
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
    const announcementsCollection = usePreviewMode ? null : db.collection('announcements');
    const settingsCollection = usePreviewMode ? null : db.collection('settings');
    
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
            
            let targetContent;
            if (this.dataset.tab === 'announcements') {
                targetContent = document.getElementById('announcements-content');
            } else {
                const subjectKey = this.getAttribute('data-subject');
                const leaderboardContainerId = `${Object.keys(subjectMapping).find(key => subjectMapping[key] === subjectKey)}-leaderboard`;
                targetContent = document.getElementById(leaderboardContainerId);
            }
            
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    if (usePreviewMode) {
        showPreviewWarning();
    }
    
    loadAllLeaderboards();
    loadAnnouncements();
    loadCountdown();

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
            renderLeaderboard(MOCK_LEADERBOARD[subject] || [], container, subject);
            return;
        }

        try {
            const q = leaderboardCollection.where('subject', '==', subject);
            const snapshot = await q.get();

            let leaderboardData = snapshot.docs.map(doc => doc.data());
            
            leaderboardData.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                const dateA = a.date ? a.date.toMillis() : 0;
                const dateB = b.date ? b.date.toMillis() : 0;
                return dateB - dateA;
            });
            
            const top5 = leaderboardData.slice(0, 5);
            renderLeaderboard(top5, container, subject);

        } catch (error) {
            console.error(`Error loading leaderboard for ${subject}:`, error);
            container.innerHTML = `<div class="empty-leaderboard"><p>載入排名時出錯，請檢查 Firebase 設定。</p></div>`;
        }
    }
    
    function getScoreClass(score) {
        if (score >= 80) return '';
        if (score >= 60) return 'medium';
        return 'low';
    }

    function renderLeaderboard(data, container, subject) {
        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-leaderboard">
                    <p>暫無排名數據</p>
                </div>
            `;
            return;
        }

        let tableBodyHtml = data.map((item, index) => {
            const rank = index + 1;
            let rankClass = 'rank-other';
            if (rank === 1) rankClass = 'rank-1';
            if (rank === 2) rankClass = 'rank-2';
            if (rank === 3) rankClass = 'rank-3';

            const itemDate = item.date && item.date.seconds ? new Date(item.date.seconds * 1000).toLocaleDateString() : 'N/A';
            const scoreClass = getScoreClass(item.score);

            let detailsHtml = '-';
            if (subject === '小考練習區' && item.actualSubject) {
                detailsHtml = `小考: ${item.actualSubject}`;
            } else if (item.examType) {
                detailsHtml = item.examType;
            }

            const completionTime = formatTime(item.completionTime);
            
            return `
                <tr>
                    <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                    <td>${item.nickname}</td>
                    <td><span class="score-badge ${scoreClass}">${item.score}</span></td>
                    <td class="details-col" title="${detailsHtml}">${detailsHtml}</td>
                    <td>${completionTime}</td>
                    <td>${itemDate}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>暱稱</th>
                        <th>分數</th>
                        <th class="details-col-header">詳情</th>
                        <th>完成時間</th>
                        <th>日期</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyHtml}
                </tbody>
            </table>
        `;
    }

    async function loadAnnouncements() {
        const container = document.getElementById('announcements-content');
        if (usePreviewMode) {
            const mockAnnouncements = [
                { title: '系統維護公告', content: '親愛的同學您好：\n本系統預計於 2025/10/25 (六) 凌晨 02:00 - 04:00 進行系統維護，屆時將暫停服務。\n造成不便，敬請見諒。', timestamp: { seconds: new Date().getTime()/1000 } },
                { title: '歡迎使用新版線上考試系統！', content: '我們很高興推出全新改版的考試系統，提供更流暢的使用體驗與更豐富的功能。', timestamp: { seconds: (new Date().getTime()/1000) - 86400 } }
            ];
            renderAnnouncements(mockAnnouncements, container);
            return;
        }
        
        try {
            const snapshot = await announcementsCollection.orderBy('timestamp', 'desc').get();
            const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAnnouncements(announcements, container);
        } catch (error) {
            console.error("Error loading announcements:", error);
            container.innerHTML = `<div class="empty-leaderboard"><p>載入公告時發生錯誤。</p></div>`;
        }
    }
    
    function renderAnnouncements(data, container) {
        if (data.length === 0) {
            container.innerHTML = `<div class="empty-leaderboard"><p>目前沒有任何公告。</p></div>`;
            return;
        }
        
        const html = data.map(ann => {
            const date = ann.timestamp ? new Date(ann.timestamp.seconds * 1000).toLocaleDateString('zh-TW') : '';
            return `
                <div class="announcement-item">
                    <h4>${ann.title}</h4>
                    <div class="date">${date}</div>
                    <p>${ann.content}</p>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="announcement-list">${html}</div>`;
    }
    
    async function loadCountdown() {
        const daysSpan = document.getElementById('countdown-days');
        if (!daysSpan) return;
    
        if (usePreviewMode) {
            daysSpan.textContent = '120';
            return;
        }
    
        try {
            const doc = await settingsCollection.doc('mainConfig').get();
            if (doc.exists) {
                const data = doc.data();
                const examDateStr = data.examDate; // Expects "YYYY-MM-DD"
                if (examDateStr) {
                    const examDate = new Date(examDateStr + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    
                    const diffTime = examDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
                    if (diffDays >= 0) {
                        daysSpan.textContent = diffDays;
                    } else {
                        daysSpan.textContent = '已結束';
                    }
                } else {
                     daysSpan.textContent = '未設定';
                }
            } else {
                daysSpan.textContent = '未設定';
            }
        } catch (error) {
            console.error("Error loading countdown date:", error);
            daysSpan.textContent = '錯誤';
        }
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

        searchHistoryBtn.innerHTML = '<div class="loading"></div> 搜尋中...';
        searchHistoryBtn.disabled = true;
        
        const nicknameLower = nickname.toLowerCase();

        try {
            const snapshot = await examAttemptsCollection
                .where('nickname_lowercase', '==', nicknameLower)
                .get();
            
            if (snapshot.empty) {
                historyResultsContainer.innerHTML = `<p class="no-data" style="text-align: center;">找不到暱稱為「${nickname}」的考試紀錄。</p>`;
                return;
            }

            let attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            attempts.sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));

            renderHistoryResults(attempts);

        } catch (error) {
            console.error("Error searching history:", error);
            historyResultsContainer.innerHTML = `<p class="no-data" style="text-align: center;">查詢時發生錯誤，請稍後再試。</p>`;
        } finally {
            searchHistoryBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                查詢紀錄
            `;
            searchHistoryBtn.disabled = false;
        }
    }

    function renderHistoryResults(attempts) {
        let tableBodyHtml = attempts.map(attempt => {
            const attemptDate = attempt.date ? new Date(attempt.date.seconds * 1000).toLocaleString('zh-TW') : 'N/A';
            let title = `${attempt.area} - ${attempt.subject}`;
            if(attempt.area === '國考區') {
                title = `${attempt.year} ${attempt.subject} (${attempt.examType})`
            } else {
                 title = `${attempt.area} - ${attempt.subject} (${attempt.examType})`
            }
            const scoreClass = getScoreClass(attempt.score);

            return `
                <tr>
                    <td>${title}</td>
                    <td>${attemptDate}</td>
                    <td><span class="score-badge ${scoreClass}">${attempt.score}</span></td>
                    <td><button class="view-btn" data-attempt-id="${attempt.id}">查看詳情</button></td>
                </tr>
            `;
        }).join('');

        historyResultsContainer.innerHTML = `
            <table class="leaderboard-table">
                <thead>
                    <tr><th>測驗項目</th><th>日期</th><th>分數</th><th>操作</th></tr>
                </thead>
                <tbody>${tableBodyHtml}</tbody>
            </table>
        `;

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const attemptId = btn.dataset.attemptId;
                const selectedAttempt = attempts.find(a => a.id === attemptId);
                showReviewModal(selectedAttempt);
            });
        });
    }

    function showReviewModal(attempt) {
        if (!attempt) return;
        modalBody.innerHTML = renderAnalysisReport(attempt);
        reviewModal.style.display = 'flex';
        
        document.getElementById('print-user-attempt-btn')?.addEventListener('click', () => {
            handlePrintAttempt(attempt);
        });
    }
    
    function formatTime(seconds) {
        if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <div class="analysis-container" id="printable-user-report">
            <div class="analysis-header">
                <div class="analysis-icon-container">
                    <!-- SVG Removed for PDF compatibility -->
                </div>
                <h2>測驗結果分析</h2>
                <p>深入分析您的答題表現，發現學習重點與改進方向</p>
            </div>
            <div class="analysis-main-grid">
                <div class="analysis-score-card card no-hover">
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
                <div class="analysis-achievements-card card no-hover">
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
            ${renderAnswerReview(questions)}
        </div>
        `;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem;">
                <h3 class="section-title" style="margin: 0; border: none; font-size: 1.25rem;">作答紀錄詳情</h3>
                <button id="print-user-attempt-btn" class="btn btn-secondary">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                   列印報告
                </button>
            </div>
          ${reportHTML}
        `;
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
                                icon = `<span class="review-option-icon">✔</span>`;
                            } else if (isUserAnswer) {
                                optionClass = 'user-selected';
                                icon = `<span class="review-option-icon">✖</span>`;
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

    function handlePrintAttempt(attempt) {
        if (!attempt) return;
        
        const printButton = document.getElementById('print-user-attempt-btn');
        const originalBtnHTML = printButton ? printButton.innerHTML : '';
        if(printButton) {
            printButton.disabled = true;
            printButton.innerHTML = '<div class="loading"></div> 準備列印...';
        }
    
        const sourceElement = document.getElementById('printable-user-report');
        if (!sourceElement) {
            if (printButton) {
                printButton.disabled = false;
                printButton.innerHTML = originalBtnHTML;
            }
            alert('找不到可列印的報告內容。');
            return;
        }
    
        let printContainer = document.getElementById('print-only-container');
        if (!printContainer) {
            printContainer = document.createElement('div');
            printContainer.id = 'print-only-container';
            document.body.appendChild(printContainer);
        }
        
        printContainer.innerHTML = sourceElement.innerHTML;
    
        setTimeout(() => {
            window.print();
            if(printButton) {
                printButton.disabled = false;
                printButton.innerHTML = originalBtnHTML;
            }
        }, 100);
    }

    // Add parallax effect to hero section
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        
        if (hero && scrolled < 800) { // Only apply effect when hero is somewhat visible
            hero.style.transform = `translateY(${scrolled * 0.4}px)`;
        }
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick, { passive: true });
});