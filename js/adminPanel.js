

document.addEventListener('DOMContentLoaded', () => {
    const adminContainer = document.getElementById('admin-container');

    // Super-gatekeeper: Check for initialization errors first.
    if (window.firebaseInitializationError) {
        adminContainer.innerHTML = `
            <div class="login-container fade-in" style="max-width: 650px;">
                 <div class="login-header">
                    <svg class="login-icon" style="color: var(--danger-color);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 style="background: var(--danger-color); -webkit-background-clip: text;">Firebase 設定錯誤</h2>
                    <p>您的 Firebase 設定檔 (<code>js/firebase.js</code>) 存在格式錯誤，導致管理後台無法啟動。請檢查您的設定是否從 Firebase 控制台完整複製。</p>
                </div>
                <div class="demo-info" style="text-align: left; background-color: rgba(239, 68, 68, 0.1); color: #c05621;">
                    <p><strong>錯誤詳情：</strong></p>
                    <pre style="white-space: pre-wrap; word-wrap: break-word;">${window.firebaseInitializationError.message}</pre>
                </div>
                 <div style="margin-top: 2rem; text-align: center;">
                    <a href="index.html" class="link">返回首頁</a>
                </div>
            </div>`;
        return;
    }

    // Gatekeeper: Check if Firebase is configured before doing anything.
    if (!isFirebaseConfigured()) {
        adminContainer.innerHTML = `
            <div class="login-container fade-in" style="max-width: 600px;">
                <div class="login-header">
                    <svg class="login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <h2>設定未完成</h2>
                    <p>您必須先設定 Firebase 才能使用此功能。</p>
                </div>
                <div class="demo-info" style="text-align: left; background-color: rgba(99, 102, 241, 0.05); color: #4f46e5;">
                    <p><strong>請依照以下步驟完成設定：</strong></p>
                    <ol style="padding-left: 20px; margin: 0.5rem 0 1rem 0;">
                        <li>開啟 <code>js/firebase.js</code> 檔案。</li>
                        <li>將您從 Firebase 控制台取得的設定物件貼入 <code>firebaseConfig</code>。</li>
                        <li>在 Firebase > Authentication 服務中，啟用「電子郵件/密碼」登入。</li>
                        <li>手動新增一個管理員帳號 (例如: admin@example.com)。</li>
                    </ol>
                </div>
                <div class="demo-info" style="text-align: left; background-color: rgba(245, 158, 11, 0.1); color: #b45309; margin-top: 1rem;">
                    <p><strong>設定後仍看到此畫面？請嘗試以下疑難排解：</strong></p>
                    <ul style="padding-left: 20px; margin-top: 0.5rem;">
                        <li><strong>檢查設定值：</strong> 確認 <code>js/firebase.js</code> 中所有 "YOUR_..." 的預設值都已被替換。</li>
                        <li><strong>檢查複製內容：</strong> 確認您已完整複製 <code>firebaseConfig</code> 物件，包含開頭的 <code>{</code> 與結尾的 <code>}</code>。</li>
                        <li><strong>清除快取：</strong> 按下 <code>Ctrl+Shift+R</code> (或 Mac 的 <code>Cmd+Shift+R</code>) 強制重新整理頁面，以清除瀏覽器快取。</li>
                    </ul>
                </div>
                <div style="margin-top: 2rem; text-align: center;">
                    <a href="index.html" class="link">返回首頁</a>
                </div>
            </div>
        `;
        // Stop all further execution
        return;
    }
    
    // --- Firebase is configured, proceed with normal admin panel logic ---

    const questionsCollection = db.collection('questions');
    const leaderboardCollection = db.collection('leaderboard');
    const examAttemptsCollection = db.collection('examAttempts');

    const availableYears = ['2025', '2024', '2023', '2022', '2021'];
    const availableSubjects = ['藥理藥化', '生物藥劑', '藥物分析', '藥事行政法規', '藥物治療', '藥劑學', '生藥學'];
    const commonExamTypes = ['第一次藥師考試', '第二次藥師考試', '小考練習區'];
    const pharmacognosyOnlyExamTypes = [
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
    const allExamTypes = [...commonExamTypes, ...pharmacognosyOnlyExamTypes];

    let state = {
        isLoggedIn: false,
        user: null,
        // Question state
        questions: [],
        filteredQuestions: [],
        loading: false,
        editingQuestionId: null,
        showForm: false,
        filters: {
            searchTerm: '',
            year: '',
            subject: '',
            examType: '',
        },
        expandedQuestionId: null,
        selectedQuestionIds: new Set(),
        // Attempt state
        examAttempts: [],
        filteredExamAttempts: [],
        loadingAttempts: false,
        viewingAttempt: null,
    };

    function setState(newState) {
        Object.assign(state, newState);
        render();
    }

    // Check auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            document.body.classList.add('admin');
            setState({ isLoggedIn: true, user, loading: true, loadingAttempts: true });
            loadQuestions();
            loadExamAttempts();
        } else {
            document.body.classList.remove('admin');
            setState({ isLoggedIn: false, user: null, questions: [], filteredQuestions: [], examAttempts: [], filteredExamAttempts: [] });
        }
    });

    async function loadQuestions() {
        try {
            const snapshot = await questionsCollection.orderBy('year', 'desc').get();
            const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setState({ questions, filteredQuestions: questions, loading: false });
        } catch (error) {
            console.error("Error loading questions:", error);
            alert('無法載入試題資料。');
            setState({ loading: false });
        }
    }
    
    async function loadExamAttempts() {
        try {
            const snapshot = await examAttemptsCollection.orderBy('date', 'desc').get();
            const attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setState({ examAttempts: attempts, filteredExamAttempts: attempts, loadingAttempts: false });
        } catch (error) {
            console.error("Error loading exam attempts:", error);
            alert('無法載入作答紀錄。');
            setState({ loadingAttempts: false });
        }
    }

    function render() {
        if (!state.isLoggedIn) {
            renderLoginForm();
        } else {
            renderAdminPanel();
        }
        // Attach general listeners after every render
        attachGeneralListeners();
    }
    
    function attachGeneralListeners() {
        document.getElementById('modal-close-btn')?.addEventListener('click', () => setState({ viewingAttempt: null }));
        const reviewModal = document.getElementById('review-modal');
        if (reviewModal) {
            reviewModal.addEventListener('click', (e) => {
                if (e.target === reviewModal) {
                    setState({ viewingAttempt: null });
                }
            });
        }
    }

    function renderLoginForm() {
        adminContainer.innerHTML = `
            <div class="login-container fade-in">
                <div class="login-header">
                    <svg class="login-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <rect width="20" height="16" x="2" y="4" rx="2" stroke="currentColor" fill="none" stroke-width="2"/>
                        <path d="M10 14h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M6 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M6 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M6 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <h2>管理者登入</h2>
                    <p>請輸入您的帳號和密碼</p>
                </div>
                <div id="login-error" style="color: var(--danger-color); margin-bottom: 1rem; text-align: center; display: none;"></div>
                <div class="form-group">
                    <label for="email">信箱</label>
                    <input type="text" id="email" placeholder="請輸入註冊的信箱">
                </div>
                <div class="form-group">
                    <label for="password">密碼</label>
                    <input type="password" id="password" placeholder="請輸入密碼">
                </div>
                <button id="login-btn" class="btn btn-primary">登入</button>
                <div class="demo-info">
                    <p>預設帳號為 <strong>admin@example.com</strong>，密碼為 <strong>xxxx</strong>。<br>請記得在您的 Firebase Authentication 控制台中手動建立此帳號。</p>
                </div>
                <div style="margin-top: 2rem; text-align: center;">
                    <a href="index.html" class="link">返回首頁</a>
                </div>
            </div>
        `;
        attachLoginListeners();
    }

    function updateFormExamTypes() {
        const subject = document.getElementById('form-subject').value;
        const examTypeSelect = document.getElementById('form-exam-type');
        if (!examTypeSelect) return;
        const currentExamTypeValue = examTypeSelect.value;
    
        const examTypes = subject === '生藥學' ? allExamTypes : commonExamTypes;
        
        examTypeSelect.innerHTML = examTypes.map(t => `<option value="${t}">${t}</option>`).join('');
        
        if (examTypes.includes(currentExamTypeValue)) {
            examTypeSelect.value = currentExamTypeValue;
        }
    }
    
    function renderAdminPanel() {
        const { loading, showForm, editingQuestionId, filters, user, viewingAttempt, loadingAttempts, selectedQuestionIds } = state;
        const editingQuestion = editingQuestionId ? state.questions.find(q => q.id === editingQuestionId) : null;
        const hasSelection = selectedQuestionIds.size > 0;
        
        const examTypesForFilter = filters.subject === '生藥學'
            ? allExamTypes
            : (filters.subject ? commonExamTypes : allExamTypes);

        const formInitialSubject = editingQuestion?.subject;
        const examTypesForForm = formInitialSubject === '生藥學' ? allExamTypes : commonExamTypes;

        adminContainer.innerHTML = `
            <div class="admin-panel fade-in">
                <header class="admin-header">
                    <h2>試題管理</h2>
                    <div>
                        <span style="color: var(--secondary-color); margin-right: 1rem;">${user.email}</span>
                        <button id="logout-btn" class="btn btn-secondary">登出</button>
                    </div>
                </header>
                
                <section class="admin-controls">
                    <button id="add-question-btn" class="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        ${showForm && !editingQuestionId ? '取消新增' : '新增題目'}
                    </button>
                     <button id="delete-selected-btn" class="btn btn-secondary" style="background-color: var(--danger-color);" ${!hasSelection ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        刪除選取 (${selectedQuestionIds.size})
                    </button>
                    <input type="search" id="search-input" placeholder="搜尋題目內容..." value="${filters.searchTerm}">
                    <select id="year-filter">
                        <option value="">所有年份</option>
                        ${availableYears.map(y => `<option value="${y}" ${filters.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                    </select>
                    <select id="subject-filter">
                        <option value="">所有科目</option>
                        ${availableSubjects.map(s => `<option value="${s}" ${filters.subject === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <select id="exam-type-filter">
                        <option value="">所有類型</option>
                        ${examTypesForFilter.map(t => `<option value="${t}" ${filters.examType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </section>

                <section id="question-form-container" class="glass-card" style="display: ${showForm ? 'block' : 'none'};">
                    <form id="question-form">
                        <h3>${editingQuestionId ? '編輯題目' : '新增題目'}</h3>
                        <div class="question-form-grid">
                            <div class="form-group">
                                <label for="form-year">年份</label>
                                <select id="form-year" required>
                                    ${availableYears.map(y => `<option value="${y}" ${editingQuestion?.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="form-subject">科目</label>
                                <select id="form-subject" required>
                                    ${availableSubjects.map(s => `<option value="${s}" ${editingQuestion?.subject === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                             <div class="form-group">
                                <label for="form-exam-type">考試類型</label>
                                <select id="form-exam-type" required>
                                    ${examTypesForForm.map(t => `<option value="${t}" ${editingQuestion?.examType === t ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group full-width">
                                <label for="form-content">題目內容</label>
                                <textarea id="form-content" rows="3" required>${editingQuestion?.content || ''}</textarea>
                            </div>
                            <div class="options-group">
                                ${[0,1,2,3].map(i => `
                                <div class="form-group">
                                    <label for="form-option-${i}">選項 ${i + 1}</label>
                                    <input type="text" id="form-option-${i}" value="${editingQuestion?.options[i] || ''}" required>
                                </div>`).join('')}
                            </div>
                            <div class="answer-group">
                                <label>正確答案</label>
                                <div class="answer-options">
                                    ${[0,1,2,3].map(i => `
                                    <label>
                                        <input type="radio" name="answer" value="${i}" ${editingQuestion?.answer === i ? 'checked' : ''} required>
                                        選項 ${i+1}
                                    </label>`).join('')}
                                </div>
                            </div>
                            <div class="form-group full-width">
                                <label for="form-explanation">詳解 (選填)</label>
                                <textarea id="form-explanation" rows="4" placeholder="請在此輸入題目的詳細解釋...">${editingQuestion?.explanation || ''}</textarea>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancel-edit-btn" class="btn btn-secondary">取消</button>
                            <button type="submit" class="btn btn-primary">${editingQuestionId ? '儲存變更' : '建立題目'}</button>
                        </div>
                    </form>
                </section>

                <main id="question-list-container">
                    ${loading ? '<div class="loading-spinner">載入中...</div>' : renderQuestionList()}
                </main>
                
                 <!-- 作答紀錄管理 -->
                <section class="glass-card" style="margin-top: 2rem;">
                    <h3>作答紀錄管理</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">此處列出所有使用者的考試紀錄。您可以查看詳細作答情況或刪除紀錄。</p>
                    <div id="attempt-list-container">
                         ${loadingAttempts ? '<div class="loading-spinner">載入中...</div>' : renderAttemptList()}
                    </div>
                </section>

                <section class="glass-card" style="margin-top: 2rem;">
                    <h3>排名管理</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">此操作將會清除所有科目的排行榜資料，此操作無法復原。</p>
                    <button id="clear-leaderboard-btn" class="btn btn-secondary" style="background-color: var(--danger-color);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        清除所有排名
                    </button>
                </section>
            </div>
            
            <!-- Modal for viewing attempt review -->
            <div id="review-modal" class="modal-overlay" style="display: ${viewingAttempt ? 'flex' : 'none'};">
                <div class="modal-content glass-card">
                    <button id="modal-close-btn" class="modal-close">&times;</button>
                    <div id="modal-body">
                        ${viewingAttempt ? renderAnswerReview(viewingAttempt.questions, {}) : ''}
                    </div>
                </div>
            </div>
        `;
        attachAdminListeners();
    }

    function renderQuestionList() {
        const { filteredQuestions, expandedQuestionId, selectedQuestionIds } = state;

        if (filteredQuestions.length === 0) {
            return '<div class="no-questions">找不到符合條件的題目，或尚未建立任何題目。</div>';
        }
        
        const areAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestionIds.has(q.id));

        return `
            <div class="question-list-actions" style="margin-bottom: 1rem; padding: 0.5rem 1rem; display: flex; align-items: center; background-color: rgba(238, 242, 255, 0.5); border-radius: var(--border-radius);">
                <input type="checkbox" id="select-all-checkbox" style="margin-right: 0.75rem; transform: scale(1.2);" ${areAllFilteredSelected ? 'checked' : ''}>
                <label for="select-all-checkbox" style="font-weight: 500; color: var(--secondary-color);">全選/取消全選目前顯示的 ${filteredQuestions.length} 個題目</label>
            </div>
            <div class="question-list">
                ${filteredQuestions.map(q => `
                <div class="question-item" id="q-item-${q.id}" style="${selectedQuestionIds.has(q.id) ? 'background-color: rgba(99, 102, 241, 0.05); border-left-color: #a5b4fc;' : ''}">
                    <div class="question-item-header">
                        <input type="checkbox" class="question-checkbox" data-id="${q.id}" ${selectedQuestionIds.has(q.id) ? 'checked' : ''} style="margin-right: 1.25rem; flex-shrink: 0; transform: scale(1.2); cursor: pointer;">
                        <div style="flex-grow: 1;">
                            <div class="question-item-tags">
                                <span class="tag">${q.year}</span>
                                <span class="tag">${q.subject}</span>
                                <span class="tag">${q.examType}</span>
                            </div>
                            <p class="question-item-title">${q.content}</p>
                        </div>
                        <div class="question-item-actions">
                            <button class="action-btn expand-btn" data-id="${q.id}" title="查看選項">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                   ${expandedQuestionId === q.id ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
                                </svg>
                            </button>
                            <button class="action-btn edit-btn" data-id="${q.id}" title="編輯">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="action-btn delete-btn" data-id="${q.id}" title="刪除">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                    <div class="question-item-details ${expandedQuestionId === q.id ? 'expanded' : ''}">
                        <ol style="list-style-type: upper-alpha; padding-left: 20px;">
                            ${q.options.map((opt, i) => `
                                <li class="${q.answer === i ? 'correct' : ''}">
                                    ${opt} ${q.answer === i ? '<strong>(正確答案)</strong>' : ''}
                                </li>
                            `).join('')}
                        </ol>
                        ${q.explanation ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(203, 213, 225, 0.3);"><strong>詳解：</strong><br>${q.explanation.replace(/\n/g, '<br>')}</div>` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
        `;
    }
    
    function renderAttemptList() {
        const { filteredExamAttempts } = state;
        if (filteredExamAttempts.length === 0) {
            return '<div class="no-questions" style="padding: var(--spacing-8)">尚無任何作答紀錄。</div>';
        }

        return `
            <div class="attempt-list">
                ${filteredExamAttempts.map(attempt => {
                    const attemptDate = attempt.date ? new Date(attempt.date.seconds * 1000).toLocaleString('zh-TW') : 'N/A';
                    return `
                    <div class="attempt-item">
                        <div class="attempt-item-header">
                            <div class="attempt-item-info">
                                <div class="question-item-tags">
                                    <span class="tag">${attempt.year}</span>
                                    <span class="tag">${attempt.leaderboardCategory}</span>
                                    <span class="tag">${attempt.examType}</span>
                                </div>
                                <p class="attempt-item-info nickname">${attempt.nickname} - <span style="color: var(--primary-color);">${attempt.score}分</span></p>
                                <p class="attempt-item-info date">考試時間：${attemptDate}</p>
                            </div>
                            <div class="attempt-item-actions">
                                <button class="action-btn view-attempt-btn" data-id="${attempt.id}" title="查看詳情">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                                <button class="action-btn delete-attempt-btn" data-id="${attempt.id}" data-exam-id="${attempt.examId}" title="刪除紀錄">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }
    
    function attachLoginListeners() {
        const loginBtn = document.getElementById('login-btn');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorDiv = document.getElementById('login-error');

        const performLogin = () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            errorDiv.style.display = 'none';

            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    console.error("Login failed:", error);
                    errorDiv.textContent = `登入失敗: ${error.message}`;
                    errorDiv.style.display = 'block';
                });
        };

        loginBtn.addEventListener('click', performLogin);
        emailInput.addEventListener('keypress', (e) => e.key === 'Enter' && performLogin());
        passwordInput.addEventListener('keypress', (e) => e.key === 'Enter' && performLogin());
    }

    function attachAdminListeners() {
        document.getElementById('logout-btn')?.addEventListener('click', () => auth.signOut());
        document.getElementById('add-question-btn')?.addEventListener('click', toggleAddForm);
        document.getElementById('cancel-edit-btn')?.addEventListener('click', cancelEdit);
        document.getElementById('question-form')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('search-input')?.addEventListener('input', handleFilterChange);
        document.getElementById('year-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('subject-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('exam-type-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('form-subject')?.addEventListener('change', updateFormExamTypes);
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
        document.querySelectorAll('.expand-btn').forEach(btn => btn.addEventListener('click', handleExpand));
        document.getElementById('clear-leaderboard-btn')?.addEventListener('click', handleClearLeaderboard);
        
        // Listeners for multi-select
        document.querySelectorAll('.question-checkbox').forEach(cb => cb.addEventListener('change', handleQuestionSelectionChange));
        document.getElementById('select-all-checkbox')?.addEventListener('change', handleSelectAllChange);
        document.getElementById('delete-selected-btn')?.addEventListener('click', handleDeleteSelected);
        
        // Listeners for attempts
        document.querySelectorAll('.view-attempt-btn').forEach(btn => btn.addEventListener('click', handleViewAttempt));
        document.querySelectorAll('.delete-attempt-btn').forEach(btn => btn.addEventListener('click', handleDeleteAttempt));
    }
    
    async function handleClearLeaderboard() {
        if (confirm('確定要清除所有科目的歷史排名嗎？此操作無法復原。')) {
            try {
                const snapshot = await leaderboardCollection.get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                alert('所有排名資料已成功清除。');
            } catch (error) {
                console.error("Error clearing leaderboard: ", error);
                alert('清除排名時發生錯誤。');
            }
        }
    }

    function handleFilterChange() {
        const filters = {
            searchTerm: document.getElementById('search-input').value,
            year: document.getElementById('year-filter').value,
            subject: document.getElementById('subject-filter').value,
            examType: document.getElementById('exam-type-filter').value,
        };

        const currentSubject = document.getElementById('subject-filter').value;
        const examTypeFilter = document.getElementById('exam-type-filter');
        const examTypesForFilter = currentSubject === '生藥學'
            ? allExamTypes
            : (currentSubject ? commonExamTypes : allExamTypes);
        
        if (!examTypesForFilter.includes(examTypeFilter.value)) {
            filters.examType = '';
        }

        const filteredQuestions = state.questions.filter(q => {
            const searchMatch = q.content.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const yearMatch = !filters.year || q.year === filters.year;
            const subjectMatch = !filters.subject || q.subject === filters.subject;
            const examTypeMatch = !filters.examType || q.examType === filters.examType;
            return searchMatch && yearMatch && subjectMatch && examTypeMatch;
        });
        setState({ filters, filteredQuestions });
    }

    function toggleAddForm() {
        setState({ showForm: !state.showForm, editingQuestionId: null });
    }

    function cancelEdit() {
        setState({ showForm: false, editingQuestionId: null });
    }

    function handleEdit(e) {
        const id = e.currentTarget.dataset.id;
        setState({ editingQuestionId: id, showForm: true, expandedQuestionId: null });
        document.getElementById('question-form-container').scrollIntoView({ behavior: 'smooth' });
    }

    async function handleDelete(e) {
        const id = e.currentTarget.dataset.id;
        if (confirm('確定要刪除此題目嗎？此操作無法復原。')) {
            try {
                await questionsCollection.doc(id).delete();
                loadQuestions(); // Refresh list
            } catch (error) {
                console.error("Error deleting question:", error);
                alert('刪除題目時發生錯誤。');
            }
        }
    }
    
    function handleExpand(e) {
        const id = e.currentTarget.dataset.id;
        setState({ expandedQuestionId: state.expandedQuestionId === id ? null : id });
    }
    
    function handleQuestionSelectionChange(e) {
        const questionId = e.target.dataset.id;
        const isChecked = e.target.checked;
        const newSelectedIds = new Set(state.selectedQuestionIds);

        if (isChecked) {
            newSelectedIds.add(questionId);
        } else {
            newSelectedIds.delete(questionId);
        }
        setState({ selectedQuestionIds: newSelectedIds });
    }

    function handleSelectAllChange(e) {
        const isChecked = e.target.checked;
        const newSelectedIds = new Set(state.selectedQuestionIds);
        
        if (isChecked) {
            state.filteredQuestions.forEach(q => newSelectedIds.add(q.id));
        } else {
            state.filteredQuestions.forEach(q => newSelectedIds.delete(q.id));
        }
        setState({ selectedQuestionIds: newSelectedIds });
    }

    async function handleDeleteSelected() {
        const count = state.selectedQuestionIds.size;
        if (count === 0) return;
        if (!confirm(`確定要刪除選取的 ${count} 個題目嗎？此操作無法復原。`)) return;
        
        setState({ loading: true });

        try {
            const batch = db.batch();
            state.selectedQuestionIds.forEach(id => {
                const docRef = questionsCollection.doc(id);
                batch.delete(docRef);
            });
            await batch.commit();

            alert(`已成功刪除 ${count} 個題目。`);
            
            setState({ selectedQuestionIds: new Set() });
            loadQuestions();
            
        } catch (error) {
            console.error("Error deleting selected questions:", error);
            alert('刪除題目時發生錯誤。');
            setState({ loading: false });
        }
    }

    function handleViewAttempt(e) {
        const attemptId = e.currentTarget.dataset.id;
        const attempt = state.examAttempts.find(a => a.id === attemptId);
        setState({ viewingAttempt: attempt });
    }

    async function handleDeleteAttempt(e) {
        const attemptDocId = e.currentTarget.dataset.id;
        const examId = e.currentTarget.dataset.examId;
        if (!confirm(`確定要刪除此筆作答紀錄嗎？\n這將會同時從資料庫和排行榜中移除，此操作無法復原。`)) {
            return;
        }

        try {
            const batch = db.batch();
            
            // 1. Delete the attempt record
            const attemptRef = examAttemptsCollection.doc(attemptDocId);
            batch.delete(attemptRef);

            // 2. Find and delete the corresponding leaderboard record
            if (examId) { // Only try to delete if examId exists
                const leaderboardQuery = await leaderboardCollection.where('examId', '==', examId).limit(1).get();
                if (!leaderboardQuery.empty) {
                    const leaderboardDocId = leaderboardQuery.docs[0].id;
                    const leaderboardRef = leaderboardCollection.doc(leaderboardDocId);
                    batch.delete(leaderboardRef);
                }
            }

            // 3. Commit the batch
            await batch.commit();
            alert('紀錄已成功刪除。');
            
            // 4. Refresh data
            setState({ loadingAttempts: true });
            loadExamAttempts();
        } catch (error) {
            console.error("Error deleting attempt:", error);
            alert(`刪除紀錄時發生錯誤: ${error.message}`);
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const newQuestionData = {
            year: form.querySelector('#form-year').value,
            subject: form.querySelector('#form-subject').value,
            examType: form.querySelector('#form-exam-type').value,
            content: form.querySelector('#form-content').value,
            options: [
                form.querySelector('#form-option-0').value,
                form.querySelector('#form-option-1').value,
                form.querySelector('#form-option-2').value,
                form.querySelector('#form-option-3').value,
            ],
            answer: parseInt(form.querySelector('input[name="answer"]:checked').value, 10),
            explanation: form.querySelector('#form-explanation').value.trim()
        };

        try {
            if (state.editingQuestionId) {
                await questionsCollection.doc(state.editingQuestionId).update(newQuestionData);
            } else {
                await questionsCollection.add(newQuestionData);
            }
            setState({ showForm: false, editingQuestionId: null, loading: true });
            loadQuestions(); // Refresh list
        } catch (error) {
            console.error("Error saving question:", error);
            alert('儲存題目時發生錯誤。');
        }
    }
    
    function renderAnswerReview(questions, userAnswers) { // userAnswers is not needed here
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