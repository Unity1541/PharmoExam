


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

    const examAreas = ['國考區', '各科練習題', '小考練習區'];
    const availableYears = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];
    const availableSubjects = ['藥理藥化', '生物藥劑', '藥物分析', '藥事行政法規', '藥物治療', '藥劑學', '生藥學'];
    
    const nationalExamTypes = ['第一次藥師考試', '第二次藥師考試'];
    const quizExamType = '綜合測驗';

    // Chapters for Practice Area
    const practiceChapters = {
        '藥理藥化': ['藥物效力學', '藥物動力學', '擬交感神經作用藥', '交感神經阻斷劑', '擬副交感神經作用藥', '膽鹼神經阻斷藥', '神經肌肉阻斷劑', '神經節阻斷劑', '鎮靜催眠藥', '抗精神病藥', '抗憂鬱藥', '抗焦慮症藥', '抗躁鬱藥', '抗癲癇藥', '抗帕金森藥', '肌肉疾病用藥', '全身麻醉溶劑', '局部麻醉溶劑', '中樞興奮藥、濫用藥物', '麻醉性鎮痛藥', '非固醇類抗炎鎮痛藥', '抗痛風藥', '風濕性關節炎治療藥物', '自泌素及相關藥物', '抗組織胺藥', '抗高血壓藥', '心臟衰竭治療藥物', '利尿劑', '降血脂藥', '心絞痛治療藥物', '心律不整治療藥物', '血栓症治療藥物', '貧血、血液疾病治療藥物', '糖尿病治療藥物', '甲状腺疾病治療藥物', '下視丘及腦下垂體激素', '腎上腺類固醇激素', '雄性激素', '雌性激素', '黃體激素', '鈣調節藥', '抗生素', '抗感染藥物', '抗病毒藥物', '抗黴菌藥物', '抗分枝桿菌藥物 (結核病、痲瘋)', '抗原蟲藥物、驅蟲蟲藥', '抗癌藥物、化學治療藥', '免疫抑制藥、免疫調節藥', '基因療法', '消化性潰瘍用藥', '腹瀉、便秘、腸道疾病用藥', '呼吸道疾病用藥', '止吐藥、鎮咳劑', '皮膚疾病用藥', '重金屬及藥物中毒的解毒藥', '中草藥及天然物'],
        '生藥學': ['生藥學緒論與研發', '生物科技藥品', '碳水化合物(醣類)', '配糖體(苷類)', '鞣質(鞣酸)', '生物鹼', '苯丙烷類', '萜類化合物', '揮發油', '脂質', '類固醇', '樹脂', '中藥學'],
        '藥物分析': ['藥物分析基本概念', '容量分析原理', '酸滴定分析法', '鹼滴定分析法', '非水滴定分析法', '沉澱滴定分析法', '錯合滴定分析法', '重量分析法', '氧化還原分析法', '灰份、水份測定法', '浸出物測定法、殘灼檢查法、易碳化物檢查法', '脂質測定法', '揮發油測定法', '生物鹼測定法', '光譜分析法', '紫外光及可視光吸光度測定法', '紅外光吸光度測定法', '螢光光度測定法', '拉曼光譜分析法', '焰光光度測定法、濁度明度測定法', '核磁共振光譜測定法', '質譜儀分析法', '旋光度測定法', '折光率測定法', '電位、電量、離子選擇性電極分析法', '薄層層析法', '高效能液相層析法', '氣相層析法', '毛細管電泳分析法', '超臨界流體層析法及萃取法', '藥物萃取方法', '中華藥典'],
        '生物藥劑': [],
        '藥事行政法規': [],
        '藥物治療': [],
        '藥劑學': [],
    };
    
    const allExamTypes = [...new Set([...nationalExamTypes, quizExamType, ...Object.values(practiceChapters).flat()])];

    let state = {
        isLoggedIn: false,
        user: null,
        questions: [],
        filteredQuestions: [],
        loading: false,
        editingQuestionId: null,
        showForm: false,
        filters: {
            searchTerm: '',
            area: '',
            year: '',
            subject: '',
            examType: '',
        },
        expandedQuestionId: null,
        selectedQuestionIds: new Set(),
        examAttempts: [],
        filteredExamAttempts: [],
        loadingAttempts: false,
        viewingAttempt: null,
    };

    function setState(newState) {
        Object.assign(state, newState);
        render();
    }

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
            // Sort by a timestamp if available, otherwise no specific order from db
            const snapshot = await questionsCollection.get();
            const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.year || 0) - (a.year || 0));
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
        attachGeneralListeners();
    }
    
    function attachGeneralListeners() {
        document.getElementById('modal-close-btn')?.addEventListener('click', () => {
            const reviewModal = document.getElementById('review-modal');
            if (reviewModal) reviewModal.style.display = 'none';
            setState({ viewingAttempt: null })
        });
        const reviewModal = document.getElementById('review-modal');
        if (reviewModal) {
            reviewModal.addEventListener('click', (e) => {
                if (e.target === reviewModal) {
                    reviewModal.style.display = 'none';
                    setState({ viewingAttempt: null });
                }
            });
        }
    }

    function renderLoginForm() {
        adminContainer.innerHTML = `
            <div class="login-container card fade-in">
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
    
    function renderAdminPanel() {
        const { loading, showForm, editingQuestionId, filters, user, viewingAttempt, loadingAttempts, selectedQuestionIds } = state;
        const editingQuestion = editingQuestionId ? state.questions.find(q => q.id === editingQuestionId) : null;
        const hasSelection = selectedQuestionIds.size > 0;
        
        let modalContent = '';
        if (viewingAttempt) {
            modalContent = renderAnalysisReport(viewingAttempt);
        }

        adminContainer.innerHTML = `
            <div class="admin-panel fade-in">
                <header class="admin-header">
                    <h2>試題管理</h2>
                    <div>
                        <span style="color: var(--text-secondary); margin-right: 1rem;">${user.email}</span>
                        <button id="logout-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            登出
                        </button>
                    </div>
                </header>
                
                <section class="admin-controls">
                    <button id="add-question-btn" class="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        ${showForm && !editingQuestionId ? '取消新增' : '新增題目'}
                    </button>
                     <button id="delete-selected-btn" class="btn btn-danger" ${!hasSelection ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        刪除選取 (${selectedQuestionIds.size})
                    </button>
                    <input type="search" id="search-input" placeholder="搜尋題目內容..." value="${filters.searchTerm}">
                    <select id="area-filter">
                        <option value="">所有專區</option>
                        ${examAreas.map(a => `<option value="${a}" ${filters.area === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
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
                        ${allExamTypes.map(t => `<option value="${t}" ${filters.examType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </section>

                <section id="question-form-container" class="card" style="display: ${showForm ? 'block' : 'none'};">
                    <form id="question-form">
                        <h3>${editingQuestionId ? '編輯題目' : '新增題目'}</h3>
                        <div class="question-form-grid">
                            <div class="form-group">
                                <label for="form-area">專區</label>
                                <select id="form-area" required>
                                    <option value="" disabled ${!editingQuestion ? 'selected' : ''}>-- 請選擇專區 --</option>
                                    ${examAreas.map(a => `<option value="${a}" ${editingQuestion?.area === a ? 'selected' : ''}>${a}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group" id="form-group-year">
                                <label for="form-year">年份</label>
                                <select id="form-year">
                                    ${availableYears.map(y => `<option value="${y}" ${editingQuestion?.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group" id="form-group-subject">
                                <label for="form-subject">科目</label>
                                <select id="form-subject">
                                     ${availableSubjects.map(s => `<option value="${s}" ${editingQuestion?.subject === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                             <div class="form-group" id="form-group-exam-type">
                                <label for="form-exam-type">考試類型/章節</label>
                                <select id="form-exam-type">
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
                            <button type="button" id="cancel-edit-btn" class="btn btn-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                取消
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                ${editingQuestionId ? '儲存變更' : '建立題目'}
                            </button>
                        </div>
                    </form>
                </section>

                <main id="question-list-container">
                    ${loading ? '<div class="loading-spinner">載入中...</div>' : renderQuestionList()}
                </main>
                
                 <!-- 作答紀錄管理 -->
                <section class="card" style="margin-top: 2rem;">
                    <h3>作答紀錄管理</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">此處列出所有使用者的考試紀錄。您可以查看詳細作答情況或刪除紀錄。</p>
                    <div id="attempt-list-container">
                         ${loadingAttempts ? '<div class="loading-spinner">載入中...</div>' : renderAttemptList()}
                    </div>
                </section>

                <section class="card" style="margin-top: 2rem;">
                    <h3>排名管理</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">此操作將會清除所有科目的排行榜資料，此操作無法復原。</p>
                    <button id="clear-leaderboard-btn" class="btn btn-danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        清除所有排名
                    </button>
                </section>
            </div>
            
            <div id="review-modal" class="modal-overlay" style="display: ${viewingAttempt ? 'flex' : 'none'};">
                <div class="modal-content">
                    <button id="modal-close-btn" class="modal-close">&times;</button>
                    <div id="modal-body">${modalContent}</div>
                </div>
            </div>
        `;

        if (viewingAttempt) {
            animateProgressCircle(viewingAttempt.score);
        }

        attachAdminListeners();
        // Manually trigger form update if editing
        if (editingQuestionId) {
            updateFormFields();
            const formExamType = document.getElementById('form-exam-type');
            if(editingQuestion.examType) {
                 formExamType.value = editingQuestion.examType;
            }
        }
    }

    function renderQuestionList() {
        const { filteredQuestions, expandedQuestionId, selectedQuestionIds } = state;

        if (filteredQuestions.length === 0) {
            return '<div class="no-questions">找不到符合條件的題目，或尚未建立任何題目。</div>';
        }
        
        const areAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestionIds.has(q.id));

        return `
            <div class="question-list-actions" style="margin-bottom: 1rem; padding: 0.5rem 1rem; display: flex; align-items: center; background-color: var(--bg-color); border: 1px solid var(--card-border); border-radius: var(--border-radius);">
                <input type="checkbox" id="select-all-checkbox" style="margin-right: 0.75rem; transform: scale(1.2);" ${areAllFilteredSelected ? 'checked' : ''}>
                <label for="select-all-checkbox" style="font-weight: 500; color: var(--text-secondary);">全選/取消全選目前顯示的 ${filteredQuestions.length} 個題目</label>
            </div>
            <div class="question-list">
                ${filteredQuestions.map(q => `
                <div class="question-item" id="q-item-${q.id}" style="${selectedQuestionIds.has(q.id) ? 'background-color: #EFF6FF; border-left-color: #93C5FD;' : ''}">
                    <div class="question-item-header">
                        <input type="checkbox" class="question-checkbox" data-id="${q.id}" ${selectedQuestionIds.has(q.id) ? 'checked' : ''} style="margin-right: 1.25rem; flex-shrink: 0; transform: scale(1.2); cursor: pointer;">
                        <div style="flex-grow: 1;">
                            <div class="question-item-tags">
                                <span class="tag">${q.area}</span>
                                ${q.year ? `<span class="tag">${q.year}</span>` : ''}
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
                    <div class="question-item-details ${expandedQuestionId === q.id ? 'expanded' : ''}" style="display: ${expandedQuestionId === q.id ? 'block' : 'none'};">
                        <ol style="list-style-type: upper-alpha; padding-left: 20px;">
                            ${q.options.map((opt, i) => `
                                <li class="${q.answer === i ? 'correct' : ''}">
                                    ${opt} ${q.answer === i ? '<strong>(正確答案)</strong>' : ''}
                                </li>
                            `).join('')}
                        </ol>
                        ${q.explanation ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--card-border);"><strong>詳解：</strong><br>${q.explanation.replace(/\n/g, '<br>')}</div>` : ''}
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
                                    <span class="tag">${attempt.area}</span>
                                    ${attempt.year ? `<span class="tag">${attempt.year}</span>` : ''}
                                    <span class="tag">${attempt.subject}</span>
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

    function updateFormFields() {
        const area = document.getElementById('form-area').value;
        const subject = document.getElementById('form-subject').value;
        const yearGroup = document.getElementById('form-group-year');
        const subjectGroup = document.getElementById('form-group-subject');
        const examTypeGroup = document.getElementById('form-group-exam-type');
        const examTypeSelect = document.getElementById('form-exam-type');
        
        // Hide all by default
        yearGroup.style.display = 'none';
        subjectGroup.style.display = 'none';
        examTypeGroup.style.display = 'none';

        let examTypes = [];

        switch (area) {
            case '國考區':
                yearGroup.style.display = 'block';
                subjectGroup.style.display = 'block';
                examTypeGroup.style.display = 'block';
                examTypes = nationalExamTypes;
                break;
            case '各科練習題':
                subjectGroup.style.display = 'block';
                examTypeGroup.style.display = 'block';
                examTypes = practiceChapters[subject] || [];
                break;
            case '小考練習區':
                subjectGroup.style.display = 'block';
                // examType is not selected by user but set programmatically
                break;
        }

        examTypeSelect.innerHTML = examTypes.map(t => `<option value="${t}">${t}</option>`).join('');
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
        // Filters
        document.getElementById('search-input')?.addEventListener('input', handleFilterChange);
        document.getElementById('area-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('year-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('subject-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('exam-type-filter')?.addEventListener('change', handleFilterChange);
        // Form dynamics
        document.getElementById('form-area')?.addEventListener('change', updateFormFields);
        document.getElementById('form-subject')?.addEventListener('change', updateFormFields);

        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
        document.querySelectorAll('.expand-btn').forEach(btn => btn.addEventListener('click', handleExpand));
        document.getElementById('clear-leaderboard-btn')?.addEventListener('click', handleClearLeaderboard);
        
        document.querySelectorAll('.question-checkbox').forEach(cb => cb.addEventListener('change', handleQuestionSelectionChange));
        document.getElementById('select-all-checkbox')?.addEventListener('change', handleSelectAllChange);
        document.getElementById('delete-selected-btn')?.addEventListener('click', handleDeleteSelected);
        
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
            area: document.getElementById('area-filter').value,
            year: document.getElementById('year-filter').value,
            subject: document.getElementById('subject-filter').value,
            examType: document.getElementById('exam-type-filter').value,
        };

        const filteredQuestions = state.questions.filter(q => {
            const searchMatch = !filters.searchTerm || q.content.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const areaMatch = !filters.area || q.area === filters.area;
            const yearMatch = !filters.year || q.year === filters.year;
            const subjectMatch = !filters.subject || q.subject === filters.subject;
            const examTypeMatch = !filters.examType || q.examType === filters.examType;
            return searchMatch && areaMatch && yearMatch && subjectMatch && examTypeMatch;
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
        const details = document.querySelector(`#q-item-${id} .question-item-details`);
        if (details) {
            if (state.expandedQuestionId === id) {
                details.style.display = 'none';
                setState({ expandedQuestionId: null });
            } else {
                // Collapse previously opened one if any
                const oldDetails = state.expandedQuestionId ? document.querySelector(`#q-item-${state.expandedQuestionId} .question-item-details`) : null;
                if(oldDetails) oldDetails.style.display = 'none';

                details.style.display = 'block';
                setState({ expandedQuestionId: id });
            }
        }
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
            const attemptRef = examAttemptsCollection.doc(attemptDocId);
            batch.delete(attemptRef);
            if (examId) {
                const leaderboardQuery = await leaderboardCollection.where('examId', '==', examId).limit(1).get();
                if (!leaderboardQuery.empty) {
                    const leaderboardDocId = leaderboardQuery.docs[0].id;
                    const leaderboardRef = leaderboardCollection.doc(leaderboardDocId);
                    batch.delete(leaderboardRef);
                }
            }
            await batch.commit();
            alert('紀錄已成功刪除。');
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
        const area = form.querySelector('#form-area').value;
        if (!area) {
            alert('請選擇一個專區');
            return;
        }
        
        const newQuestionData = {
            area: area,
            subject: form.querySelector('#form-subject').value,
            content: form.querySelector('#form-content').value,
            options: [
                form.querySelector('#form-option-0').value,
                form.querySelector('#form-option-1').value,
                form.querySelector('#form-option-2').value,
                form.querySelector('#form-option-3').value,
            ],
            answer: parseInt(form.querySelector('input[name="answer"]:checked').value, 10),
            explanation: form.querySelector('#form-explanation').value.trim(),
            year: null,
            examType: null,
        };

        switch (area) {
            case '國考區':
                newQuestionData.year = form.querySelector('#form-year').value;
                newQuestionData.examType = form.querySelector('#form-exam-type').value;
                if (!newQuestionData.year || !newQuestionData.subject || !newQuestionData.examType) {
                    alert('國考區題目必須包含年份、科目和考試類型。'); return;
                }
                break;
            case '各科練習題':
                newQuestionData.examType = form.querySelector('#form-exam-type').value;
                if (!newQuestionData.subject || !newQuestionData.examType) {
                    alert('各科練習題必須包含科目和章節。'); return;
                }
                break;
            case '小考練習區':
                newQuestionData.examType = quizExamType; // Assign default type
                if (!newQuestionData.subject) {
                    alert('小考練習區必須包含科目。'); return;
                }
                break;
        }

        try {
            if (state.editingQuestionId) {
                await questionsCollection.doc(state.editingQuestionId).update(newQuestionData);
            } else {
                await questionsCollection.add(newQuestionData);
            }
            setState({ showForm: false, editingQuestionId: null, loading: true });
            loadQuestions(); // Refresh list
        } catch (error)
        {
            console.error("Error saving question:", error);
            alert('儲存題目時發生錯誤。');
        }
    }
    
    function formatTime(seconds) {
        if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function animateProgressCircle(score) {
        const circle = document.querySelector('.progress-ring-track-green');
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