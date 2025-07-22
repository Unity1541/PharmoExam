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
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 科目映射
    const subjectMapping = {
        'pharmacology': '藥理藥化',
        'biopharmaceutics': '生物藥劑',
        'analysis': '藥物分析',
        'law': '藥事行政法規',
        'therapeutics': '藥物治療',
        'pharmaceutics': '藥劑學',
        'pharmacognosy': '生藥學'
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
            document.getElementById(leaderboardContainerId).classList.add('active');
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
            
            // Client-side sorting
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
});