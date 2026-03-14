document.addEventListener("DOMContentLoaded", () => {
  const adminContainer = document.getElementById("admin-container");

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

  const questionsCollection = db.collection("questions");
  const leaderboardCollection = db.collection("leaderboard");
  const examAttemptsCollection = db.collection("examAttempts");
  const announcementsCollection = db.collection("announcements");
  const settingsCollection = db.collection("settings");
  const questionSuggestionsCollection = db.collection("questionSuggestions");

  const examAreas = ["單字測驗", "文法練習", "閱讀測驗", "手寫題目"];
  const availableYears = [];
  const availableSubjects = ["英文"];

  const nationalExamTypes = [];
  const quizExamType = "綜合測驗";

  // Chapters for Practice Area
  const practiceChapters = {
    英文: ["單字", "文法", "閱讀測驗"],
  };

  const allExamTypes = examAreas;

  let state = {
    isLoggedIn: false,
    user: null,
    questions: [],
    filteredQuestions: [],
    loading: false,
    initialQuestionLoad: true, // New state to track if a search has been performed
    editingQuestionId: null,
    showForm: false,
    filters: {
      searchTerm: "",
      area: "",
      year: "",
      subject: "",
      examType: "",
    },
    expandedQuestionId: null,
    selectedQuestionIds: new Set(),
    examAttempts: [],
    filteredExamAttempts: [],
    loadingAttempts: false,
    viewingAttempt: null,
    announcements: [],
    loadingAnnouncements: false,
    editingAnnouncementId: null,
    examCountdownDate: "",
    // Uploader state variables
    validatedQuestions: [],
    selectedUploadArea: "",
    // Suggestions state
    suggestions: [],
    loadingSuggestions: false,
  };

  let isGlobalGradingAttached = false;

  function setState(newState) {
    Object.assign(state, newState);
    render();
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      document.body.classList.add("admin");
      setState({
        isLoggedIn: true,
        user,
        loading: false,
        loadingAttempts: true,
        loadingAnnouncements: true,
        initialQuestionLoad: true,
        questions: [],
        filteredQuestions: [],
      });
      loadExamAttempts();
      loadAnnouncements();
      loadSuggestions();
      loadCountdownDate();
    } else {
      document.body.classList.remove("admin");
      setState({
        isLoggedIn: false,
        user: null,
        questions: [],
        filteredQuestions: [],
        examAttempts: [],
        filteredExamAttempts: [],
      });
    }
  });

  async function loadExamAttempts() {
    try {
      const snapshot = await examAttemptsCollection
        .orderBy("date", "desc")
        .get();
      const attempts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setState({
        examAttempts: attempts,
        filteredExamAttempts: attempts,
        loadingAttempts: false,
      });
    } catch (error) {
      console.error("Error loading exam attempts:", error);
      alert("無法載入作答紀錄。");
      setState({ loadingAttempts: false });
    }
  }

  async function loadAnnouncements() {
    try {
      const snapshot = await announcementsCollection
        .orderBy("timestamp", "desc")
        .get();
      const announcements = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setState({ announcements, loadingAnnouncements: false });
    } catch (error) {
      console.error("Error loading announcements:", error);
      setState({ loadingAnnouncements: false });
    }
  }

  async function loadSuggestions() {
    try {
      const snapshot = await questionSuggestionsCollection
        .orderBy("submittedAt", "desc")
        .get();
      const suggestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setState({ suggestions, loadingSuggestions: false });
    } catch (error) {
      console.error("Error loading suggestions:", error);
      setState({ loadingSuggestions: false });
    }
  }

  async function loadCountdownDate() {
    try {
      const doc = await settingsCollection.doc("mainConfig").get();
      if (doc.exists) {
        setState({ examCountdownDate: doc.data().examDate || "" });
      }
    } catch (error) {
      console.error("Error loading countdown date:", error);
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
    document
      .getElementById("modal-close-btn")
      ?.addEventListener("click", () => {
        const reviewModal = document.getElementById("review-modal");
        if (reviewModal) reviewModal.style.display = "none";
        const needsReload = state.needsAttemptReload;
        setState({ viewingAttempt: null, needsAttemptReload: false });
        if (needsReload) loadExamAttempts();
      });
    const reviewModal = document.getElementById("review-modal");
    if (reviewModal) {
      reviewModal.addEventListener("click", (e) => {
        if (e.target === reviewModal) {
          reviewModal.style.display = "none";
          const needsReload = state.needsAttemptReload;
          setState({ viewingAttempt: null, needsAttemptReload: false });
          if (needsReload) loadExamAttempts();
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
    const {
      loading,
      showForm,
      editingQuestionId,
      filters,
      user,
      viewingAttempt,
      loadingAttempts,
      selectedQuestionIds,
      initialQuestionLoad,
      filteredQuestions,
    } = state;
    const editingQuestion = editingQuestionId
      ? state.questions.find((q) => q.id === editingQuestionId)
      : null;
    const hasSelection = selectedQuestionIds.size > 0;
    const hasFilteredQuestions =
      !initialQuestionLoad && filteredQuestions.length > 0;

    let modalContent = "";
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
                        ${showForm && !editingQuestionId ? "取消新增" : "新增題目"}
                    </button>
                     <button id="delete-selected-btn" class="btn btn-danger" ${!hasSelection ? "disabled" : ""}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        刪除選取 (${selectedQuestionIds.size})
                    </button>
                     <button id="print-questions-btn" class="btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        列印考題
                    </button>
                    <input type="search" id="search-input" placeholder="搜尋題目內容..." value="${filters.searchTerm}">
                    <select id="area-filter">
                        <option value="">所有測驗類型</option>
                        ${examAreas.map((a) => `<option value="${a}" ${filters.area === a ? "selected" : ""}>${a}</option>`).join("")}
                    </select>
                </section>

                <section id="question-form-container" class="card" style="display: ${showForm ? "block" : "none"};">
                    <form id="question-form">
                        <h3>${editingQuestionId ? "編輯題目" : "新增題目"}</h3>
                        <div class="question-form-grid">
                            <div class="form-group">
                                <label for="form-area">測驗類型</label>
                                <select id="form-area" required>
                                    <option value="" disabled ${!editingQuestion ? "selected" : ""}>-- 請選擇測驗類型 --</option>
                                    ${examAreas.map((a) => `<option value="${a}" ${editingQuestion?.area === a ? "selected" : ""}>${a}</option>`).join("")}
                                </select>
                            </div>
                            <div class="form-group full-width">
                                <label for="form-content">題目內容</label>
                                <textarea id="form-content" rows="3" required>${editingQuestion?.content || ""}</textarea>
                            </div>
                            <div class="options-group" id="options-section" style="display: ${editingQuestion?.area === "手寫題目" ? "none" : "grid"};"> 
                                ${[0, 1, 2, 3]
                                  .map(
                                    (i) => `
                                <div class="form-group">
                                    <label for="form-option-${i}">選項 ${i + 1}</label>
                                    <input type="text" id="form-option-${i}" value="${editingQuestion?.options?.[i] || ""}" ${editingQuestion?.area !== "手寫題目" ? "required" : ""}>
                                </div>`,
                                  )
                                  .join("")}
                            </div>
                            <div class="answer-group" id="answer-section" style="display: ${editingQuestion?.area === "手寫題目" ? "none" : "block"};"> 
                                <label>正確答案</label>
                                <div class="answer-options">
                                    ${[0, 1, 2, 3]
                                      .map(
                                        (i) => `
                                    <label>
                                        <input type="radio" name="answer" value="${i}" ${editingQuestion?.answer === i ? "checked" : ""} ${editingQuestion?.area !== "手寫題目" ? "required" : ""}>
                                        選項 ${i + 1}
                                    </label>`,
                                      )
                                      .join("")}
                                </div>
                            </div>
                            <div class="form-group" id="time-limit-section" style="display: ${editingQuestion?.area === "手寫題目" ? "block" : "none"};">
                                <label for="form-time-limit">作答時間限制 (分鐘)</label>
                                <input type="number" id="form-time-limit" min="1" max="60" value="${editingQuestion?.timeLimit || 10}" placeholder="請輸入作答時間限制">
                            </div>
                            <div class="form-group full-width">
                                <label for="form-explanation">詳解 (選填)</label>
                                <textarea id="form-explanation" rows="4" placeholder="請在此輸入題目的詳細解釋...">${editingQuestion?.explanation || ""}</textarea>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancel-edit-btn" class="btn btn-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                取消
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                ${editingQuestionId ? "儲存變更" : "建立題目"}
                            </button>
                        </div>
                    </form>
                </section>

                <main id="question-list-container">
                    ${renderQuestionList()}
                </main>

                <!-- 批次上傳題目 -->
                <section class="card" style="margin-top: 2rem;" id="batch-upload-section">
                    <h3>批次上傳題目</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">將 JSON 格式的題目批次上傳至特定測驗類型。</p>
                    <div class="form-group">
                        <label for="uploader-area">測驗類型</label>
                        <select id="uploader-area" class="glass-select" required>
                            <option value="" disabled selected>-- 選擇測驗類型 --</option>
                            ${examAreas.map((a) => `<option value="${a}">${a}</option>`).join("")}
                        </select>
                    </div>
                    <div id="data-input-section" style="display: none; margin-top: 1rem;">
                        <div class="form-group">
                            <label>該區 JSON 格式範例：</label>
                            <pre id="json-example-code" style="background:rgba(0,0,0,0.05); padding:1rem; border-radius:8px; font-size:0.9rem; margin-bottom:1rem; overflow-x:auto; border: 1px solid rgba(0,0,0,0.1);"></pre>
                            <label for="questions-input">題目 JSON 陣列</label>
                            <textarea id="questions-input" rows="15" placeholder="請在此處貼上您的題目 JSON..."></textarea>
                        </div>
                        <div class="form-actions" style="justify-content: flex-start; align-items: center;">
                            <button id="validate-btn" class="btn btn-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                                驗證 JSON
                            </button>
                            <button id="upload-btn" class="btn btn-primary" disabled style="margin-left: 1rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                上傳至 Firebase
                            </button>
                        </div>
                        <div id="status-message" class="status-message" style="display:none; margin-top: 1rem;"></div>
                        <div class="form-group" style="margin-top: 1rem;">
                            <label>驗證結果預覽</label>
                            <pre id="json-preview"><code>點擊「驗證 JSON」以檢查您的資料。</code></pre>
                        </div>
                    </div>
                </section>
                
                 <!-- 作答紀錄管理 -->
                <section class="card" style="margin-top: 2rem;">
                    <h3>作答紀錄管理</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">此處列出所有使用者的考試紀錄。您可以查看詳細作答情況或刪除紀錄。</p>
                    <div style="margin-bottom: 1.5rem;">
                        <button id="clear-attempts-btn" class="btn btn-danger">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            清除所有作答紀錄
                        </button>
                    </div>
                    <div id="attempt-list-container">
                         ${loadingAttempts ? '<div class="loading-spinner">載入中...</div>' : renderAttemptList()}
                    </div>
                </section>

                <!-- 題目建議管理 -->
                <section class="card" style="margin-top: 2rem;">
                    <h3>題目建議管理</h3>
                    <p class="step-description" style="margin-bottom: 1rem;">審核用戶提交的題目建議。您可以批准建議將其加入題庫，或拒絕建議。</p>
                    <div id="suggestions-list-container">
                        ${state.loadingSuggestions ? '<div class="loading-spinner">載入中...</div>' : renderSuggestionsList()}
                    </div>
                </section>

                <section class="admin-section">
                    <h3>系統設定</h3>
                    <div class="form-group">
                        <label for="countdown-date-input">國考倒數日期</label>
                        <p class="step-description" style="margin-bottom: 1rem;">設定顯示在首頁的國考倒數計時器目標日期。</p>
                        <input type="date" id="countdown-date-input" value="${state.examCountdownDate}">
                    </div>
                    <button id="save-countdown-btn" class="btn btn-primary">儲存日期</button>
                </section>
        
                <section class="admin-section">
                    <h3>最新公告管理</h3>
                    <form id="announcement-form" class="card" style="margin-bottom: 2rem;">
                        <h4>${state.editingAnnouncementId ? "編輯公告" : "新增公告"}</h4>
                        <div class="form-group">
                            <label for="announcement-title">標題</label>
                            <input type="text" id="announcement-title" required>
                        </div>
                        <div class="form-group">
                            <label for="announcement-content">內容</label>
                            <textarea id="announcement-content" rows="5" required placeholder="請輸入公告內容..."></textarea>
                        </div>
                        <div class="form-actions" style="justify-content: flex-end;">
                            <button type="button" id="cancel-announcement-edit-btn" class="btn btn-secondary" style="display: none;">取消編輯</button>
                            <button type="submit" class="btn btn-primary">${state.editingAnnouncementId ? "儲存變更" : "發佈公告"}</button>
                        </div>
                    </form>
                    <div id="announcements-list-admin">
                        ${state.loadingAnnouncements ? '<div class="loading-spinner"></div>' : renderAnnouncementsList()}
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
            
            <div id="review-modal" class="modal-overlay" style="display: ${viewingAttempt ? "flex" : "none"};">
                <div class="modal-content">
                    <button id="modal-close-btn" class="modal-close">&times;</button>
                    <div id="modal-body">${modalContent}</div>
                </div>
            </div>
        `;

    if (viewingAttempt) {
      document
        .getElementById("print-attempt-btn")
        ?.addEventListener("click", () => handlePrintAttempt(viewingAttempt));
    }

    attachAdminListeners();
  }

  function renderQuestionList() {
    const {
      filteredQuestions,
      expandedQuestionId,
      selectedQuestionIds,
      initialQuestionLoad,
      loading,
    } = state;

    if (loading) {
      return '<div class="loading-spinner">查詢中...</div>';
    }

    if (initialQuestionLoad) {
      return '<div class="no-questions" style="padding: var(--spacing-8)">請使用上方的篩選器來查詢題目。</div>';
    }

    if (filteredQuestions.length === 0) {
      return '<div class="no-questions" style="padding: var(--spacing-8)">找不到符合條件的題目。</div>';
    }

    const areAllFilteredSelected =
      filteredQuestions.length > 0 &&
      filteredQuestions.every((q) => selectedQuestionIds.has(q.id));

    return `
            <div class="question-list-actions" style="margin-bottom: 1rem; padding: 0.5rem 1rem; display: flex; align-items: center; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
                <input type="checkbox" id="select-all-checkbox" style="margin-right: 0.75rem; transform: scale(1.2);" ${areAllFilteredSelected ? "checked" : ""}>
                <label for="select-all-checkbox" style="font-weight: 500; color: var(--text-secondary);">全選/取消全選目前顯示的 ${filteredQuestions.length} 個題目</label>
            </div>
            <div class="question-list">
                ${filteredQuestions
                  .map(
                    (q) => `
                <div class="question-item" id="q-item-${q.id}" style="${selectedQuestionIds.has(q.id) ? "background-color: #EFF6FF; border-left-color: #93C5FD;" : ""}">
                    <div class="question-item-header">
                        <input type="checkbox" class="question-checkbox" data-id="${q.id}" ${selectedQuestionIds.has(q.id) ? "checked" : ""} style="margin-right: 1.25rem; flex-shrink: 0; transform: scale(1.2); cursor: pointer;">
                        <div style="flex-grow: 1;">
                            <div class="question-item-tags">
                                <span class="tag">${q.area}</span>
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
                    <div class="question-item-details ${expandedQuestionId === q.id ? "expanded" : ""}" style="display: ${expandedQuestionId === q.id ? "block" : "none"};">
                        ${
                          q.area === "手寫題目"
                            ? `<div style="padding: 1rem; background-color: #f9fafb; border-radius: 0.5rem; border-left: 4px solid var(--primary-color); margin-bottom: 1rem;">
                                <strong>測驗類型：</strong>手寫作答題目<br>
                                <strong>作答時限：</strong>${q.timeLimit || 10} 分鐘
                            </div>`
                            : `<ol style="list-style-type: upper-alpha; padding-left: 20px;">
                                ${q.options
                                  .map(
                                    (opt, i) => `
                                    <li class="${q.answer === i ? "correct" : ""}">
                                        ${opt} ${q.answer === i ? "<strong>(正確答案)</strong>" : ""}
                                    </li>
                                `,
                                  )
                                  .join("")}
                            </ol>`
                        }
                        ${q.explanation ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;"><strong>詳解：</strong><br>${q.explanation.replace(/\n/g, "<br>")}</div>` : ""}
                    </div>
                </div>
                `,
                  )
                  .join("")}
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
                ${filteredExamAttempts
                  .map((attempt) => {
                    const attemptDate = attempt.date
                      ? new Date(attempt.date.seconds * 1000).toLocaleString(
                          "zh-TW",
                        )
                      : "N/A";
                    return `
                    <div class="attempt-item">
                        <div class="attempt-item-header">
                            <div class="attempt-item-info">
                                <div class="question-item-tags">
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
                `;
                  })
                  .join("")}
            </div>
        `;
  }

  function renderAnnouncementsList() {
    if (state.announcements.length === 0) {
      return "<p>尚無公告。</p>";
    }
    return state.announcements
      .map((ann) => {
        const date = ann.timestamp
          ? new Date(ann.timestamp.seconds * 1000).toLocaleString("zh-TW")
          : "";
        return `
                <div class="announcement-admin-item">
                    <div class="announcement-admin-item-content">
                        <h5>${ann.title}</h5>
                        <small>${date}</small>
                    </div>
                    <div class="question-item-actions">
                        <button class="action-btn edit-announcement-btn" data-id="${ann.id}" title="編輯">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-btn delete-announcement-btn" data-id="${ann.id}" title="刪除">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  function renderSuggestionsList() {
    if (!state.suggestions || state.suggestions.length === 0) {
      return "<p>尚無題目建議。</p>";
    }
    return state.suggestions
      .map((suggestion) => {
        const date = suggestion.submittedAt
          ? new Date(suggestion.submittedAt.seconds * 1000).toLocaleString(
              "zh-TW",
            )
          : "";
        const statusColor =
          suggestion.status === "approved"
            ? "var(--success-color)"
            : suggestion.status === "rejected"
              ? "var(--danger-color)"
              : "var(--warning-color)";
        const statusText =
          suggestion.status === "approved"
            ? "已批准"
            : suggestion.status === "rejected"
              ? "已拒絕"
              : "待審核";
        return `
                <div class="suggestion-item" style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; background: white;">
                    <div class="suggestion-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                        <div>
                            <h4 style="margin: 0; color: var(--text-primary);">${suggestion.submitterName}</h4>
                            <small style="color: var(--text-secondary);">${date}</small>
                        </div>
                        <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500;">${statusText}</span>
                    </div>
                    <div class="suggestion-content" style="margin-bottom: 0.75rem;">
                        <p><strong>題目內容：</strong>${suggestion.content}</p>
                        <p><strong>類型：</strong>${suggestion.type}</p>
                        ${suggestion.notes ? `<p><strong>補充說明：</strong>${suggestion.notes}</p>` : ""}
                    </div>
                    ${
                      suggestion.status === "pending"
                        ? `
                    <div class="suggestion-actions" style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-success btn-sm approve-suggestion-btn" data-id="${suggestion.id}" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            批准並加入題庫
                        </button>
                        <button class="btn btn-danger btn-sm reject-suggestion-btn" data-id="${suggestion.id}" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            拒絕
                        </button>
                    </div>
                    `
                        : ""
                    }
                </div>
            `;
      })
      .join("");
  }

  function updateFormFields() {
    const formArea = document.getElementById("form-area");
    const optionsSection = document.getElementById("options-section");
    const answerSection = document.getElementById("answer-section");
    const timeLimitSection = document.getElementById("time-limit-section");
    const optionInputs = [0, 1, 2, 3].map((i) =>
      document.getElementById(`form-option-${i}`),
    );
    const answerRadios = document.querySelectorAll('input[name="answer"]');

    if (!formArea || !optionsSection || !answerSection) return;

    const selectedArea = formArea.value;

    if (selectedArea === "手寫題目") {
      // Hide options and answer sections for handwritten questions
      optionsSection.style.display = "none";
      answerSection.style.display = "none";
      // Show time limit section for handwritten questions
      if (timeLimitSection) timeLimitSection.style.display = "block";

      // Remove required attribute from option inputs and answer radios
      optionInputs.forEach((input) => (input.required = false));
      answerRadios.forEach((radio) => (radio.required = false));
    } else {
      // Show options and answer sections for multiple choice questions
      optionsSection.style.display = "grid";
      answerSection.style.display = "block";
      // Hide time limit section for multiple choice questions
      if (timeLimitSection) timeLimitSection.style.display = "none";

      // Add required attribute to option inputs and answer radios
      optionInputs.forEach((input) => (input.required = true));
      answerRadios.forEach((radio) => (radio.required = true));
    }
  }

  function attachLoginListeners() {
    const loginBtn = document.getElementById("login-btn");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorDiv = document.getElementById("login-error");

    const performLogin = () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      errorDiv.style.display = "none";

      auth.signInWithEmailAndPassword(email, password).catch((error) => {
        console.error("Login failed:", error);
        errorDiv.textContent = `登入失敗: ${error.message}`;
        errorDiv.style.display = "block";
      });
    };

    loginBtn.addEventListener("click", performLogin);
    emailInput.addEventListener(
      "keypress",
      (e) => e.key === "Enter" && performLogin(),
    );
    passwordInput.addEventListener(
      "keypress",
      (e) => e.key === "Enter" && performLogin(),
    );
  }

  function attachAdminListeners() {
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", () => auth.signOut());
    document
      .getElementById("add-question-btn")
      ?.addEventListener("click", toggleAddForm);
    document
      .getElementById("cancel-edit-btn")
      ?.addEventListener("click", cancelEdit);
    document
      .getElementById("question-form")
      ?.addEventListener("submit", handleFormSubmit);
    // Filters
    document
      .getElementById("search-input")
      ?.addEventListener("input", handleFilterChange);
    document
      .getElementById("area-filter")
      ?.addEventListener("change", handleFilterChange);
    // Form dynamics
    document
      .getElementById("form-area")
      ?.addEventListener("change", updateFormFields);
    document
      .getElementById("form-subject")
      ?.addEventListener("change", updateFormFields);

    document
      .querySelectorAll(".edit-btn")
      .forEach((btn) => btn.addEventListener("click", handleEdit));
    document
      .querySelectorAll(".delete-btn")
      .forEach((btn) => btn.addEventListener("click", handleDelete));
    document
      .querySelectorAll(".expand-btn")
      .forEach((btn) => btn.addEventListener("click", handleExpand));
    document
      .getElementById("clear-leaderboard-btn")
      ?.addEventListener("click", handleClearLeaderboard);

    document
      .querySelectorAll(".question-checkbox")
      .forEach((cb) =>
        cb.addEventListener("change", handleQuestionSelectionChange),
      );
    document
      .getElementById("select-all-checkbox")
      ?.addEventListener("change", handleSelectAllChange);
    document
      .getElementById("delete-selected-btn")
      ?.addEventListener("click", handleDeleteSelected);

    document
      .querySelectorAll(".view-attempt-btn")
      .forEach((btn) => btn.addEventListener("click", handleViewAttempt));
    document
      .querySelectorAll(".delete-attempt-btn")
      .forEach((btn) => btn.addEventListener("click", handleDeleteAttempt));
    document
      .getElementById("clear-attempts-btn")
      ?.addEventListener("click", handleClearAllAttempts);

    // Print button
    document
      .getElementById("print-questions-btn")
      ?.addEventListener("click", handlePrintQuestions);

    // Grading logic
    if (!isGlobalGradingAttached) {
      document.addEventListener("click", (e) => {
        const saveBtn = e.target.closest('.save-grade-btn');
        if (saveBtn) {
          const questionIndex = saveBtn.dataset.questionIndex;
          const gradeInput = document.getElementById(`grade-${questionIndex}`);
          if (!gradeInput) { alert("找不到評分輸入框，請重新整理頁面。"); return; }
          const grade = parseInt(gradeInput.value, 10);
          if (!isNaN(grade) && grade >= 0 && grade <= 100) {
            handleSaveGrade(questionIndex, grade, false);
          } else {
            alert("請輸入有效的評分 (0-100)。");
          }
        }
      });

      // Auto-save grading on input change
      document.addEventListener("change", (e) => {
        if (e.target.classList.contains("grade-input")) {
          const questionIndex = e.target.dataset.questionIndex;
          const grade = parseInt(e.target.value, 10);
          if (grade >= 0 && grade <= 100) {
            handleSaveGrade(questionIndex, grade, false); // false for no alert
          }
        }
      });
      isGlobalGradingAttached = true;
    }

    // New listeners
    document
      .getElementById("save-countdown-btn")
      ?.addEventListener("click", handleSaveCountdown);
    document
      .getElementById("announcement-form")
      ?.addEventListener("submit", handleAnnouncementSubmit);
    document
      .getElementById("cancel-announcement-edit-btn")
      ?.addEventListener("click", cancelAnnouncementEdit);
    document
      .querySelectorAll(".edit-announcement-btn")
      .forEach((b) => b.addEventListener("click", handleEditAnnouncement));
    document
      .querySelectorAll(".delete-announcement-btn")
      .forEach((b) => b.addEventListener("click", handleDeleteAnnouncement));

    // Uploader Listeners
    document
      .getElementById("uploader-area")
      ?.addEventListener("change", checkConfigAndToggleDataSection);
    document
      .getElementById("validate-btn")
      ?.addEventListener("click", handleValidateJson);
    document
      .getElementById("upload-btn")
      ?.addEventListener("click", handleUploadBatch);

    // Suggestion Listeners
    document
      .querySelectorAll(".approve-suggestion-btn")
      .forEach((btn) => btn.addEventListener("click", handleApproveSuggestion));
    document
      .querySelectorAll(".reject-suggestion-btn")
      .forEach((btn) => btn.addEventListener("click", handleRejectSuggestion));
  }

  // Uploader Logic Methods
  function checkConfigAndToggleDataSection() {
    const area = document.getElementById("uploader-area").value;
    const dataSection = document.getElementById("data-input-section");
    const exampleCode = document.getElementById("json-example-code");
    const questionsInput = document.getElementById("questions-input");

    state.selectedUploadArea = area;

    const isHandwritten = area === "手寫題目";

    const examples = {
      單字測驗: [
        {
          content: 'What is the synonym for "Happy"?',
          options: ["Sad", "Angry", "Joyful", "Tired"],
          answer: 2,
          explanation: '"Joyful" is a synonym for "Happy".',
        },
      ],
      文法練習: [
        {
          content: "She _____ to the store yesterday.",
          options: ["goes", "going", "went", "gone"],
          answer: 2,
          explanation: "Yesterday indicates past tense, so 'went' is correct.",
        },
      ],
      閱讀測驗: [
        {
          content:
            "Read the following passage:\\n'The quick brown fox jumps over the lazy dog.'\\n\\nQuestion: Who is jumping?",
          options: ["The dog", "The fox", "Both", "Neither"],
          answer: 1,
          explanation:
            "The passage explicitly states 'The quick brown fox jumps...'.",
        },
      ],
    };

    if (area) {
      if (exampleCode) {
        if (isHandwritten) {
          exampleCode.textContent = "題目一：請寫出一篇關於環境保護的英文短文。\n題目二：描述你最喜歡的一個旅遊地點。";
        } else {
          const exampleString = JSON.stringify(examples[area] || [], null, 2);
          exampleCode.textContent = exampleString;
        }

        const currentVal = questionsInput.value.trim();
        const isDefault = !currentVal || Object.values(examples).some(ex => JSON.stringify(ex, null, 2) === currentVal) || currentVal.includes("題目一：");
        
        if (isDefault) {
          if (isHandwritten) {
            questionsInput.value = "題目一：請寫出一篇關於環境保護的英文短文。\n題目二：描述你最喜歡的一個旅遊地點。";
            questionsInput.placeholder = "請在此每行輸入一個題目內容...";
          } else {
            questionsInput.value = JSON.stringify(examples[area] || [], null, 2);
            questionsInput.placeholder = "請在此處貼上您的題目 JSON...";
          }
        }
      }

      const description = document.querySelector("#batch-upload-section .step-description");
      if (description) {
        description.textContent = isHandwritten 
            ? "將題目內容按行輸入，每一行將被視為一個新的手寫題目。" 
            : "將 JSON 格式的題目批次上傳至特定測驗類型。";
      }

      if (dataSection.style.display === "none") {
        dataSection.style.display = "block";
        dataSection.classList.add("fade-in");
      }
    } else {
      dataSection.style.display = "none";
    }
  }

  function handleValidateJson() {
    const inputText = document.getElementById("questions-input").value;
    const jsonPreview = document.getElementById("json-preview");
    const uploadBtn = document.getElementById("upload-btn");

    state.validatedQuestions = [];
    uploadBtn.disabled = true;

    if (!inputText.trim()) {
      jsonPreview.innerHTML = `<code style="color: var(--danger-color);">錯誤：輸入框為空。</code>`;
      showUploadStatus("錯誤：輸入框不可為空。", "error");
      return;
    }

    const isHandwritten = state.selectedUploadArea === "手寫題目";

    if (isHandwritten) {
      // Plain text parsing for handwritten questions
      const lines = inputText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        jsonPreview.innerHTML = `<code style="color: var(--danger-color);">錯誤：未偵測到任何題目。</code>`;
        showUploadStatus("錯誤：請至少輸入一個題目。", "error");
        return;
      }
      state.validatedQuestions = lines.map(line => ({
        content: line,
        area: "手寫題目"
      }));
      jsonPreview.innerHTML = `<code>${JSON.stringify(state.validatedQuestions, null, 2)}</code>`;
      uploadBtn.disabled = false;
      showUploadStatus(`成功驗證 ${state.validatedQuestions.length} 個手寫題目，可以上傳。`, "success");
      return;
    }

    // Standard JSON parsing for MC questions
    let parsedData;
    try {
      parsedData = JSON.parse(inputText);
    } catch (e) {
      jsonPreview.innerHTML = `<code style="color: var(--danger-color);">JSON 語法錯誤：<br>${e.message}</code>`;
      showUploadStatus("JSON 語法錯誤，請檢查您的格式。", "error");
      return;
    }

    if (!Array.isArray(parsedData)) {
      jsonPreview.innerHTML = `<code style="color: var(--danger-color);">格式錯誤：最外層必須是一個陣列 ( [...] )。</code>`;
      showUploadStatus("格式錯誤：最外層必須是一個陣列。", "error");
      return;
    }

    const errors = [];
    parsedData.forEach((item, index) => {
      if (typeof item.content !== "string" || !item.content) {
        errors.push(
          `第 ${index + 1} 筆資料：缺少有效的 "content" (字串) 欄位。`,
        );
      }
      if (!Array.isArray(item.options) || item.options.length !== 4) {
        errors.push(
          `第 ${index + 1} 筆資料："options" 必須是一個包含 4 個選項的陣列。`,
        );
      }
      if (
        typeof item.answer !== "number" ||
        item.answer < 0 ||
        item.answer > 3
      ) {
        errors.push(`第 ${index + 1} 筆資料："answer" 必須是 0-3 之間的數字。`);
      }
    });

    if (errors.length > 0) {
      const errorHtml = errors.map((e) => `<li>${e}</li>`).join("");
      jsonPreview.innerHTML = `<code style="color: var(--danger-color);"><ul style="margin: 0; padding-left: 20px;">${errorHtml}</ul></code>`;
      showUploadStatus(
        `發現 ${errors.length} 個內容格式錯誤，請修正後再試。`,
        "error",
      );
      return;
    }

    state.validatedQuestions = parsedData;

    jsonPreview.innerHTML = `<code>${JSON.stringify(parsedData, null, 2)}</code>`;
    uploadBtn.disabled = false;
    showUploadStatus(
      `成功驗證 ${parsedData.length} 筆資料，可以上傳。`,
      "success",
    );
  }

  async function handleUploadBatch() {
    if (state.validatedQuestions.length === 0) {
      alert("沒有可上傳的題目。請先驗證 JSON。");
      return;
    }

    if (
      !confirm(
        `確定要上傳 ${state.validatedQuestions.length} 筆新題目到資料庫嗎？\\n\\n測驗類型: ${state.selectedUploadArea}`,
      )
    ) {
      return;
    }

    const uploadBtn = document.getElementById("upload-btn");
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<div class="loading"></div> 上傳中...';

    try {
      const batch = db.batch();

      state.validatedQuestions.forEach((question) => {
        const docRef = questionsCollection.doc();
        const finalQuestion = {
          area: state.selectedUploadArea,
          year: null,
          subject: "英文",
          examType: state.selectedUploadArea,
          content: question.content,
          explanation: question.explanation || "",
        };

        if (state.selectedUploadArea !== "手寫題目") {
          finalQuestion.options = question.options;
          finalQuestion.answer = question.answer;
        } else {
          finalQuestion.timeLimit = 10; // Default time limit
        }

        batch.set(docRef, finalQuestion);
      });

      await batch.commit();
      alert(`成功上傳 ${state.validatedQuestions.length} 筆題目！`);
      showUploadStatus(
        `成功上傳 ${state.validatedQuestions.length} 筆題目！`,
        "success",
      );
      document.getElementById("questions-input").value = "";
      document.getElementById("json-preview").innerHTML =
        "<code>點擊「驗證 JSON」以產生預覽。</code>";
      state.validatedQuestions = [];
      handleFilterChange();
    } catch (error) {
      console.error("Error uploading questions: ", error);
      showUploadStatus(`上傳失敗: ${error.message}`, "error");
    } finally {
      uploadBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                上傳至 Firebase
            `;
    }
  }

  function showUploadStatus(message, type = "info") {
    const statusDiv = document.getElementById("status-message");
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = "block";
  }

  async function handleApproveSuggestion(e) {
    const suggestionId = e.currentTarget.dataset.id;
    const suggestion = state.suggestions.find((s) => s.id === suggestionId);

    if (!suggestion) return;

    if (
      !confirm(
        `確定要批准此題目建議並加入題庫嗎？\n\n題目：${suggestion.content}`,
      )
    ) {
      return;
    }

    try {
      // Create the question from suggestion
      const questionData = {
        area: suggestion.type,
        subject: "英文",
        content: suggestion.content,
        year: null,
        examType: suggestion.type,
      };

      if (suggestion.type === "手寫題目") {
        // For handwritten questions
        questionData.explanation = suggestion.notes || "";
      } else {
        // For multiple choice, we need to add default options (admin can edit later)
        questionData.options = ["選項A", "選項B", "選項C", "選項D"];
        questionData.answer = 0;
        questionData.explanation = suggestion.notes || "";
      }

      // Add to questions collection
      await questionsCollection.add(questionData);

      // Update suggestion status
      await questionSuggestionsCollection.doc(suggestionId).update({
        status: "approved",
        approvedAt: new Date(),
      });

      alert("題目已成功加入題庫！");
      loadSuggestions(); // Refresh suggestions list
      handleFilterChange(); // Refresh questions list
    } catch (error) {
      console.error("Error approving suggestion:", error);
      alert("批准失敗，請稍後再試。");
    }
  }

  async function handleRejectSuggestion(e) {
    const suggestionId = e.currentTarget.dataset.id;
    const suggestion = state.suggestions.find((s) => s.id === suggestionId);

    if (!suggestion) return;

    if (!confirm(`確定要拒絕此題目建議嗎？\n\n題目：${suggestion.content}`)) {
      return;
    }

    try {
      await questionSuggestionsCollection.doc(suggestionId).update({
        status: "rejected",
        rejectedAt: new Date(),
      });

      alert("題目建議已拒絕。");
      loadSuggestions(); // Refresh suggestions list
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      alert("拒絕失敗，請稍後再試。");
    }
  }

  async function handleClearLeaderboard() {
    if (confirm("確定要清除所有科目的歷史排名嗎？此操作無法復原。")) {
      try {
        const snapshot = await leaderboardCollection.get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        alert("所有排名資料已成功清除。");
      } catch (error) {
        console.error("Error clearing leaderboard: ", error);
        alert("清除排名時發生錯誤。");
      }
    }
  }

  async function handleFilterChange() {
    const filters = {
      searchTerm: document.getElementById("search-input").value.toLowerCase(),
      area: document.getElementById("area-filter").value,
    };

    state.filters = filters;

    if (!filters.area && !filters.searchTerm) {
      setState({
        questions: [],
        filteredQuestions: [],
        initialQuestionLoad: true,
      });
      return;
    }

    setState({ loading: true, initialQuestionLoad: false });

    try {
      let query = questionsCollection;
      if (filters.area) query = query.where("area", "==", filters.area);

      const snapshot = await query.get();
      const fetchedQuestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const clientFilteredQuestions = filters.searchTerm
        ? fetchedQuestions.filter((q) =>
            q.content.toLowerCase().includes(filters.searchTerm),
          )
        : fetchedQuestions;

      setState({
        questions: fetchedQuestions,
        filteredQuestions: clientFilteredQuestions,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching filtered questions:", error);
      alert(
        "查詢題目時發生錯誤，這通常是缺少資料庫索引。請檢查瀏覽器主控台中的錯誤訊息以取得建立索引的連結。",
      );
      setState({
        loading: false,
        questions: [],
        filteredQuestions: [],
        initialQuestionLoad: true,
      });
    }
  }

  function toggleAddForm() {
    setState({ showForm: !state.showForm, editingQuestionId: null });
  }

  function cancelEdit() {
    setState({ showForm: false, editingQuestionId: null });
  }

  function handleEdit(e) {
    const id = e.currentTarget.dataset.id;
    setState({
      editingQuestionId: id,
      showForm: true,
      expandedQuestionId: null,
    });
    document
      .getElementById("question-form-container")
      .scrollIntoView({ behavior: "smooth" });
  }

  async function handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm("確定要刪除此題目嗎？此操作無法復原。")) {
      try {
        await questionsCollection.doc(id).delete();
        handleFilterChange(); // Refresh list based on current filters
      } catch (error) {
        console.error("Error deleting question:", error);
        alert("刪除題目時發生錯誤。");
      }
    }
  }

  function handleExpand(e) {
    const id = e.currentTarget.dataset.id;
    const details = document.querySelector(
      `#q-item-${id} .question-item-details`,
    );
    if (details) {
      if (state.expandedQuestionId === id) {
        details.style.display = "none";
        setState({ expandedQuestionId: null });
      } else {
        const oldDetails = state.expandedQuestionId
          ? document.querySelector(
              `#q-item-${state.expandedQuestionId} .question-item-details`,
            )
          : null;
        if (oldDetails) oldDetails.style.display = "none";

        details.style.display = "block";
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
      state.filteredQuestions.forEach((q) => newSelectedIds.add(q.id));
    } else {
      state.filteredQuestions.forEach((q) => newSelectedIds.delete(q.id));
    }
    setState({ selectedQuestionIds: newSelectedIds });
  }

  async function handleDeleteSelected() {
    const count = state.selectedQuestionIds.size;
    if (count === 0) return;
    if (!confirm(`確定要刪除選取的 ${count} 個題目嗎？此操作無法復原。`))
      return;

    setState({ loading: true });

    try {
      const batch = db.batch();
      state.selectedQuestionIds.forEach((id) => {
        const docRef = questionsCollection.doc(id);
        batch.delete(docRef);
      });
      await batch.commit();
      alert(`已成功刪除 ${count} 個題目。`);
      setState({ selectedQuestionIds: new Set() });
      handleFilterChange();
    } catch (error) {
      console.error("Error deleting selected questions:", error);
      alert("刪除題目時發生錯誤。");
      setState({ loading: false });
    }
  }

  function handleViewAttempt(e) {
    const attemptId = e.currentTarget.dataset.id;
    const attempt = state.examAttempts.find((a) => a.id === attemptId);
    setState({ viewingAttempt: attempt });
  }

  async function handleDeleteAttempt(e) {
    const attemptDocId = e.currentTarget.dataset.id;
    const examId = e.currentTarget.dataset.examId;
    if (
      !confirm(
        `確定要刪除此筆作答紀錄嗎？\n這將會同時從資料庫和排行榜中移除，此操作無法復原。`,
      )
    ) {
      return;
    }
    try {
      const batch = db.batch();
      const attemptRef = examAttemptsCollection.doc(attemptDocId);
      batch.delete(attemptRef);
      if (examId) {
        const leaderboardQuery = await leaderboardCollection
          .where("examId", "==", examId)
          .limit(1)
          .get();
        if (!leaderboardQuery.empty) {
          const leaderboardDocId = leaderboardQuery.docs[0].id;
          const leaderboardRef = leaderboardCollection.doc(leaderboardDocId);
          batch.delete(leaderboardRef);
        }
      }
      await batch.commit();
      alert("紀錄已成功刪除。");
      setState({ loadingAttempts: true });
      loadExamAttempts();
    } catch (error) {
      console.error("Error deleting attempt:", error);
      alert(`刪除紀錄時發生錯誤: ${error.message}`);
    }
  }

  async function handleClearAllAttempts() {
    if (
      !confirm(
        `確定要清除所有 ${state.examAttempts.length} 筆作答紀錄嗎？\n此操作無法復原。排行榜資料不受影響，可另外手動清除。`,
      )
    ) {
      return;
    }

    setState({ loadingAttempts: true });

    try {
      const snapshot = await examAttemptsCollection.get();
      if (snapshot.empty) {
        alert("沒有任何作答紀錄可供刪除。");
        setState({ loadingAttempts: false });
        return;
      }

      // Firestore batches are limited to 500 operations.
      const batchArray = [];
      batchArray.push(db.batch());
      let operationCounter = 0;
      let batchIndex = 0;

      snapshot.docs.forEach((doc) => {
        batchArray[batchIndex].delete(doc.ref);
        operationCounter++;

        if (operationCounter === 500) {
          batchArray.push(db.batch());
          batchIndex++;
          operationCounter = 0;
        }
      });

      await Promise.all(batchArray.map((batch) => batch.commit()));

      alert(`已成功刪除所有 ${snapshot.size} 筆作答紀錄。`);
      await loadExamAttempts(); // This will reset loading state
    } catch (error) {
      console.error("Error clearing all attempts:", error);
      alert(`清除紀錄時發生錯誤: ${error.message}`);
      setState({ loadingAttempts: false });
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const area = form.querySelector("#form-area").value;
    if (!area) {
      alert("請選擇一個專區");
      return;
    }

    let newQuestionData;

    if (area === "手寫題目") {
      // For handwritten questions, only store content and explanation
      newQuestionData = {
        area: area,
        subject: "英文",
        content: form.querySelector("#form-content").value,
        explanation: form.querySelector("#form-explanation").value.trim(),
        timeLimit: parseInt(form.querySelector("#form-time-limit").value, 10) || 10,
        year: null,
        examType: area,
        // No options or answer for handwritten questions
      };
    } else {
      // For multiple choice questions
      newQuestionData = {
        area: area,
        subject: "英文",
        content: form.querySelector("#form-content").value,
        options: [
          form.querySelector("#form-option-0").value,
          form.querySelector("#form-option-1").value,
          form.querySelector("#form-option-2").value,
          form.querySelector("#form-option-3").value,
        ],
        answer: parseInt(
          form.querySelector('input[name="answer"]:checked').value,
          10,
        ),
        explanation: form.querySelector("#form-explanation").value.trim(),
        year: null,
        examType: area,
      };
    }

    try {
      if (state.editingQuestionId) {
        await questionsCollection
          .doc(state.editingQuestionId)
          .update(newQuestionData);
      } else {
        await questionsCollection.add(newQuestionData);
      }
      setState({ showForm: false, editingQuestionId: null });
      handleFilterChange(); // Refresh list
    } catch (error) {
      console.error("Error saving question:", error);
      alert("儲存題目時發生錯誤。");
    }
  }

  async function handleSaveGrade(questionIndex, grade, showAlert = true) {
    if (!state.viewingAttempt) return;

    const statusEl = document.getElementById(`grade-status-${questionIndex}`);
    if (statusEl) {
      statusEl.textContent = "儲存中...";
      statusEl.style.display = "inline";
      statusEl.style.color = "var(--text-secondary)";
    }

    try {
      const attemptRef = examAttemptsCollection.doc(state.viewingAttempt.id);
      const attemptDoc = await attemptRef.get();
      if (!attemptDoc.exists) {
        if (showAlert) alert("找不到考試記錄。");
        return;
      }

      const attemptData = attemptDoc.data();
      const updatedQuestions = attemptData.questions.map((q, idx) => {
        if (idx === parseInt(questionIndex, 10)) {
          return { ...q, grade: grade };
        }
        return q;
      });

      // Recalculate total score
      let sum = 0;
      updatedQuestions.forEach((q) => {
        if (q.area === "手寫題目") {
          sum += (q.grade || 0);
        } else {
          sum += (q.userAnswer === q.answer ? 100 : 0);
        }
      });
      const totalScore = updatedQuestions.length > 0 ? Math.round(sum / updatedQuestions.length) : 0;

      await attemptRef.update({
        questions: updatedQuestions,
        score: totalScore
      });

      // Update local state without re-rendering everything to avoid jumping
      state.viewingAttempt.questions = updatedQuestions;
      state.viewingAttempt.score = totalScore;

      // Update UI manually to keep the DOM stable
      const scoreDisplayEl = document.querySelector(".analysis-score-card .score-value");
      if (scoreDisplayEl) {
        scoreDisplayEl.textContent = totalScore;
      }
      
      const scoreCardEl = document.querySelector(".analysis-score-card .simple-score-display");
      if (scoreCardEl) {
        scoreCardEl.className = `simple-score-display ${totalScore >= 60 ? "pass" : "fail"}`;
      }

      if (statusEl) {
        statusEl.textContent = "已儲存！";
        statusEl.style.color = "var(--success-color)";
        setTimeout(() => {
          if (statusEl) statusEl.style.display = "none";
        }, 2000);
      }

      // Flag that a reload is needed when the modal closes
      state.needsAttemptReload = true;

    } catch (error) {
      console.error("Error saving grade:", error);
      if (statusEl) {
        statusEl.textContent = "儲存失敗";
        statusEl.style.color = "var(--danger-color)";
      }
      if (showAlert) alert("儲存評分時發生錯誤。");
    }
  }
  async function handleSaveCountdown() {
    const date = document.getElementById("countdown-date-input")?.value;
    if (!date) {
      alert("請選擇一個日期。");
      return;
    }
    try {
      await settingsCollection
        .doc("mainConfig")
        .set({ examDate: date }, { merge: true });
      alert("倒數日期已更新。");
      setState({ examCountdownDate: date });
    } catch (error) {
      alert("儲存失敗：" + error.message);
    }
  }

  function cancelAnnouncementEdit() {
    setState({ editingAnnouncementId: null });
    document.getElementById("announcement-form").reset();
    document.getElementById("cancel-announcement-edit-btn").style.display =
      "none";
  }

  async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("announcement-title").value;
    const content = document.getElementById("announcement-content").value;
    if (!title || !content) {
      alert("標題和內容為必填項。");
      return;
    }

    const data = {
      title,
      content,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      if (state.editingAnnouncementId) {
        await announcementsCollection
          .doc(state.editingAnnouncementId)
          .update(data);
        alert("公告已更新。");
      } else {
        await announcementsCollection.add(data);
        alert("公告已發佈。");
      }
      cancelAnnouncementEdit();
      loadAnnouncements();
    } catch (error) {
      alert("操作失敗：" + error.message);
    }
  }

  function handleEditAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    const announcement = state.announcements.find((a) => a.id === id);
    if (announcement) {
      document.getElementById("announcement-title").value = announcement.title;
      document.getElementById("announcement-content").value =
        announcement.content;
      document.getElementById("cancel-announcement-edit-btn").style.display =
        "inline-flex";
      setState({ editingAnnouncementId: id });
      document
        .getElementById("announcement-form")
        .scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleDeleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm("確定要刪除此公告嗎？")) {
      try {
        await announcementsCollection.doc(id).delete();
        alert("公告已刪除。");
        loadAnnouncements();
      } catch (error) {
        alert("刪除失敗：" + error.message);
      }
    }
  }

  function formatTime(seconds) {
    if (seconds === undefined || seconds === null || isNaN(seconds))
      return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function renderAnalysisReport(attempt) {
    const { score, questions, area, year, subject, examType, completionTime } =
      attempt;

    const totalQuestions = questions.length;
    const correctCount = questions.filter(
      (q) => q.area !== "手寫題目" && q.userAnswer === q.answer,
    ).length;
    const completionTimeFormatted = formatTime(completionTime);
    let title = `英文 - ${examType}`;

    const summaryHTML = `
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
                        <div class="simple-score-display ${score >= 60 ? "pass" : "fail"}">
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
            </div>
        `;

    const reviewHTML = renderAnswerReview(questions);

    return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 1rem 1rem;">
                <h3 class="section-title" style="margin: 0; border: none; font-size: 1.25rem;">作答紀錄詳情</h3>
                <button id="print-attempt-btn" class="btn btn-secondary">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                   列印/匯出報告
                </button>
            </div>
            <div id="printable-attempt-report">
                ${summaryHTML}
                ${reviewHTML}
            </div>
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
      const itemClass = isCorrect ? "correct" : "incorrect";

      // Check if this is a handwritten question
      const isHandwritten = q.area === "手寫題目";

      if (isHandwritten) {
        // Handle handwritten questions
        reviewHtml += `
                <div class="review-question-item handwritten">
                    <div class="review-question-content">
                        <div class="question-number review-question-number">${index + 1}</div>
                        <div class="question-text">${q.content}</div>
                    </div>
                    <div class="handwritten-answer-section">
                        <h4>學生手寫答案：</h4>
                        <div class="handwritten-answer-display">
                            ${userAnswer || "未作答"}
                        </div>
                        <div class="grading-section">
                            <label for="grade-${index}">評分 (0-100分)：</label>
                            <input type="number" id="grade-${index}" min="0" max="100" value="${q.grade !== null && q.grade !== undefined ? q.grade : ''}" class="grade-input" data-question-index="${index}">
                            <button class="btn btn-primary save-grade-btn" data-question-index="${index}">儲存評分</button>
                            <span id="grade-status-${index}" style="margin-left: 0.5rem; font-size: 0.85rem; color: var(--success-color); display: none;">已儲存</span>
                        </div>
                    </div>
                    ${
                      q.explanation
                        ? `
                    <div class="explanation-box">
                        <strong>參考解答：</strong>
                        <p>${q.explanation.replace(/\n/g, "<br>")}</p>
                    </div>`
                        : ""
                    }
                </div>
            `;
      } else {
        // Handle multiple choice questions
        reviewHtml += `
                <div class="review-question-item ${itemClass}">
                    <div class="review-question-content">
                        <div class="question-number review-question-number">${index + 1}</div>
                        <div class="question-text">${q.content}</div>
                    </div>
                    <div class="review-options-list">
                        ${q.options
                          .map((opt, optIndex) => {
                            let optionClass = "";
                            let icon = "";
                            const isUserAnswer = optIndex === userAnswer;
                            const isCorrectAnswer = optIndex === q.answer;

                            if (isCorrectAnswer) {
                              optionClass = "correct-answer";
                              icon = `<span class="review-option-icon">✔</span>`;
                            } else if (isUserAnswer) {
                              optionClass = "user-selected";
                              icon = `<span class="review-option-icon">✖</span>`;
                            }

                            return `
                                <div class="review-option ${optionClass}">
                                    ${icon || '<div class="review-option-icon"></div>'}
                                    <span>${opt}</span>
                                </div>
                            `;
                          })
                          .join("")}
                    </div>
                    ${
                      q.explanation
                        ? `
                    <div class="explanation-box">
                        <strong>詳解：</strong>
                        <p>${q.explanation.replace(/\n/g, "<br>")}</p>
                    </div>`
                        : ""
                    }
                </div>
            `;
      }
    });

    reviewHtml += `</div>`;
    return reviewHtml;
  }

  function handlePrintQuestions() {
    const { filteredQuestions, initialQuestionLoad } = state;
    if (initialQuestionLoad || filteredQuestions.length === 0) {
      alert("請先從上方選單選擇測驗類型或輸入搜尋關鍵字，以載入可列印的考題。");
      return;
    }

    const btn = document.getElementById("print-questions-btn");
    const originalBtnHTML = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="loading"></div> 準備列印...'; }

    try {

    let printContainer = document.getElementById("print-only-container");
    if (!printContainer) {
      printContainer = document.createElement("div");
      printContainer.id = "print-only-container";
      document.body.appendChild(printContainer);
    }

    let title = "考題列表";
    const { filters } = state;
    if (filters.area) {
      title = [filters.area, filters.subject, filters.year, filters.examType]
        .filter(Boolean)
        .join(" - ");
    }

    let contentHtml = `<div style="padding: 20px; margin: 0;"><h1 style="font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px;">${title}</h1>`;

    filteredQuestions.forEach((q, index) => {
      const isHandwritten = !q.options || q.options.length === 0;
      contentHtml += `
                <div class="print-question-item" style="margin-bottom: 16px; page-break-inside: avoid;">
                    <p style="font-size: 14px; font-weight: 600; margin-bottom: 8px; line-height: 1.5;">${index + 1}. ${q.content}</p>
                    ${isHandwritten
                      ? `<p style="font-size: 13px; color: #6B7280; padding-left: 8px; font-style: italic;">（手寫題目）</p>`
                      : `<ol style="list-style-type: upper-alpha; padding-left: 20px; margin: 0; font-size: 13px;">
                        ${q.options.map((opt, i) => `<li style="margin-bottom: 4px; line-height: 1.5; ${q.answer === i ? "font-weight: bold; color: #10B981;" : ""}">${opt}</li>`).join("")}
                    </ol>`}
                    ${q.explanation ? `<div style="font-size: 13px; margin-top: 8px; padding: 8px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb; line-height: 1.6;"><strong>詳解：</strong> ${q.explanation.replace(/\n/g, "<br>")}</div>` : ""}
                </div>
            `;
    });
    contentHtml += `</div>`;
    printContainer.innerHTML = contentHtml;

    setTimeout(() => {
      window.print();
      if (btn) { btn.disabled = false; btn.innerHTML = originalBtnHTML; }
    }, 100);

    } catch (err) {
      console.error("Print preparation failed:", err);
      alert("準備列印時發生錯誤：" + err.message);
      if (btn) { btn.disabled = false; btn.innerHTML = originalBtnHTML; }
    }
  }

  function handlePrintAttempt(attempt) {
    if (!attempt) return;

    const printButton = document.getElementById("print-attempt-btn");
    const originalBtnHTML = printButton ? printButton.innerHTML : "";
    if (printButton) {
      printButton.disabled = true;
      printButton.innerHTML = '<div class="loading"></div> 準備列印...';
    }

    const sourceElement = document.getElementById("printable-attempt-report");
    if (!sourceElement) {
      if (printButton) {
        printButton.disabled = false;
        printButton.innerHTML = originalBtnHTML;
      }
      alert("找不到可列印的報告內容。");
      return;
    }

    let printContainer = document.getElementById("print-only-container");
    if (!printContainer) {
      printContainer = document.createElement("div");
      printContainer.id = "print-only-container";
      document.body.appendChild(printContainer);
    }

    printContainer.innerHTML = sourceElement.innerHTML;

    setTimeout(() => {
      window.print();
      if (printButton) {
        printButton.disabled = false;
        printButton.innerHTML = originalBtnHTML;
      }
    }, 100);
  }
});
