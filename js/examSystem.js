document.addEventListener("DOMContentLoaded", () => {
  const examContainer = document.getElementById("exam-container");
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
  const questionsCollection = usePreviewMode
    ? null
    : db.collection("questions");
  const leaderboardCollection = usePreviewMode
    ? null
    : db.collection("leaderboard");
  const examAttemptsCollection = usePreviewMode
    ? null
    : db.collection("examAttempts");

  // SPA Navigation Setup
  const openExamBtn = document.getElementById("open-exam-btn");
  const closeExamBtn = document.getElementById("close-exam-btn");
  const heroSection = document.querySelector(".hero");
  const landingMain = document.querySelector(".landing-main");

  function openExam() {
    if (heroSection) heroSection.style.display = "none";
    if (landingMain) landingMain.style.display = "none";
    examContainer.style.display = "block";
    setState({ view: "NICKNAME", nickname: "" });
    const nameInput = document.getElementById("nickname-input");
    if (nameInput) nameInput.value = "";
  }

  function closeExam() {
    // Simple reload to ensure leaderboard is updated with new scores
    location.reload();
  }

  openExamBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    openExam();
  });

  closeExamBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeExam();
  });

  // Data Definitions
  const examAreas = {
    單字測驗: "練習您的英文字彙能力",
    文法練習: "加強基礎與進階文法概念",
    閱讀測驗: "提升文章理解與語感",
    手寫題目: "手寫英文題目練習",
  };
  const allSubjects = ["英文"]; // simplified to single logic tree
  const availableYears = [];
  const nationalExamTypes = [];
  const quizExamType = "綜合測驗";
  const practiceChapters = {
    英文: ["單字", "文法", "閱讀測驗", "手寫題目"],
  };

  let allQuestions = [];

  // State Management
  let state = {
    view: "NICKNAME", // NICKNAME, AREA, SELECTION_1, SELECTION_2, SELECTION_3, EXAM, RESULT
    nickname: "",
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
    NICKNAME: document.getElementById("nickname-step"),
    AREA: document.getElementById("area-step"),
    SELECTION_1: document.getElementById("dynamic-step-1"),
    SELECTION_2: document.getElementById("dynamic-step-2"),
    SELECTION_3: document.getElementById("dynamic-step-3"),
    EXAM: document.getElementById("exam-step"),
    RESULT: document.getElementById("result-step"),
  };

  function showPreviewWarning() {
    const warningDiv = document.createElement("div");
    warningDiv.className = "demo-info";
    warningDiv.style.margin = "1rem auto 0 auto";
    warningDiv.style.textAlign = "center";
    warningDiv.style.maxWidth = "800px";
    warningDiv.innerHTML =
      "<p><strong>預覽模式</strong>：目前正在使用預設題目。您的成績將不會被記錄。請設定 <code>js/firebase.js</code> 以啟用完整功能。</p>";
    document
      .querySelector(".container > header")
      .insertAdjacentElement("afterend", warningDiv);
  }

  async function loadAllQuestions() {
    if (usePreviewMode) {
      allQuestions = MOCK_QUESTIONS;
      showPreviewWarning();
      return;
    }
    try {
      const snapshot = await questionsCollection.get();
      allQuestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error loading questions from Firestore:", error);
      alert("無法從資料庫載入試題，請檢查 Firebase 設定或網路連線。");
    }
  }

  function render() {
    Object.values(stepDivs).forEach((div) => {
      if (div) div.style.display = "none";
    });
    const currentViewDiv = stepDivs[state.view];
    if (currentViewDiv) {
      currentViewDiv.style.display = "block";
      // Render content for the current view
      switch (state.view) {
        case "AREA":
          renderAreaStep();
          break;
        case "EXAM":
          renderExamStep();
          break;
        case "RESULT":
          renderResultStep();
          break;
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
    stepDivs.AREA.querySelectorAll(".selection-card").forEach((card) => {
      card.addEventListener("click", () => {
        const area = card.dataset.area;
        state.selectedArea = area;
        state.selectedSubject = "英文";
        state.selectedExamType = area;
        startExam();
      });
    });
  }

  function renderSubmitQuestionStep() {
    let html = `
            <h2 class="step-title">提交題目建議</h2>
            <p class="step-description">歡迎您提交英文題目建議！我們的管理員會審核並可能將您的題目加入題庫。</p>
            <div class="card" style="max-width: 600px; margin: 2rem auto;">
                <form id="submit-question-form">
                    <div class="form-group">
                        <label for="submitter-name">您的姓名</label>
                        <input type="text" id="submitter-name" required placeholder="請輸入您的姓名">
                    </div>
                    <div class="form-group">
                        <label for="question-content">題目內容</label>
                        <textarea id="question-content" rows="3" required placeholder="請描述題目內容..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="question-type">題目類型</label>
                        <select id="question-type" required>
                            <option value="" disabled selected>-- 請選擇題目類型 --</option>
                            <option value="手寫題目">手寫題目</option>
                            <option value="單字測驗">單字測驗</option>
                            <option value="文法練習">文法練習</option>
                            <option value="閱讀測驗">閱讀測驗</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="question-notes">補充說明 (選填)</label>
                        <textarea id="question-notes" rows="3" placeholder="任何相關的說明或建議..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-submit-btn" class="btn btn-secondary">取消</button>
                        <button type="submit" class="btn btn-primary">提交題目</button>
                    </div>
                </form>
            </div>
        `;
    stepDivs.SUBMIT_QUESTION.innerHTML = html;

    // Add event listeners
    document
      .getElementById("cancel-submit-btn")
      .addEventListener("click", () => {
        setState({ view: "NICKNAME" });
      });

    document
      .getElementById("submit-question-form")
      .addEventListener("submit", handleSubmitQuestion);
  }

  // Exam Logic
  function startExam() {
    const { selectedArea, selectedSubject, selectedExamType } = state;
    const currentQuestions = allQuestions.filter(
      (q) => q.examType === selectedExamType,
    );

    if (currentQuestions.length === 0) {
      alert("找不到符合條件的試題。");
      setState({ view: "AREA" });
      return;
    }

    const answers = {};
    currentQuestions.forEach((q) => {
      answers[q.id] = null;
    });

    // Check if this is a handwritten exam and calculate total time
    let totalTimeLimit = state.timeLimit; // Default 60 minutes
    if (selectedExamType === "手寫題目") {
      // For handwritten questions, sum up individual time limits
      totalTimeLimit = currentQuestions.reduce((total, q) => {
        return total + (q.timeLimit || 10); // Default 10 minutes per question
      }, 0);
    }

    setState({
      answers,
      currentQuestions,
      timeLimit: totalTimeLimit,
      timeLeft: totalTimeLimit * 60,
      startTime: Date.now(),
      latestExamId: `exam_${Date.now()}`,
      view: "EXAM",
    });
    startTimer();
  }

  async function handleSubmitQuestion(e) {
    e.preventDefault();
    const form = e.target;

    const questionData = {
      submitterName: form.querySelector("#submitter-name").value,
      content: form.querySelector("#question-content").value,
      type: form.querySelector("#question-type").value,
      notes: form.querySelector("#question-notes").value,
      submittedAt: new Date(),
      status: "pending", // pending, approved, rejected
    };

    try {
      if (usePreviewMode) {
        alert("預覽模式：題目建議已模擬提交。");
        setState({ view: "NICKNAME" });
        return;
      }

      await db.collection("questionSuggestions").add(questionData);
      alert("題目建議已成功提交！管理員將會審核您的建議。");
      setState({ view: "NICKNAME" });
    } catch (error) {
      console.error("Error submitting question:", error);
      alert("提交失敗，請稍後再試。");
    }
  }

  function startTimer() {
    clearInterval(state.timer);
    const timer = setInterval(() => {
      state.timeLeft -= 1; // Directly mutate state to avoid re-render
      const timeDisplay = document.getElementById("time-display");
      if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeLeft);
      }
      if (state.timeLeft <= 0) {
        clearInterval(state.timer);
        alert("時間到！將自動提交答案。");
        submitExam();
      }
    }, 1000);
    setState({ timer });
  }

  function renderExamStep() {
    const {
      selectedArea,
      selectedExamType,
      nickname,
      timeLeft,
      currentQuestions,
    } = state;
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
            `;

      if (question.area === "手寫題目") {
        // For handwritten questions, show a text input
        html += `
                    <div class="handwritten-input-container">
                        <label for="handwritten-answer-${question.id}">請手寫您的答案：</label>
                        <textarea 
                            id="handwritten-answer-${question.id}" 
                            class="handwritten-input" 
                            rows="4" 
                            placeholder="請在此手寫您的英文答案..."
                            data-question="${question.id}"
                        >${state.answers[question.id] || ""}</textarea>
                    </div>
                `;
      } else {
        // For multiple choice questions, show options
        html += `<div class="options-list">`;
        question.options.forEach((option, optIndex) => {
          html += `
                        <div class="option-item" data-question="${question.id}" data-option="${optIndex}">
                            <div class="option-radio"></div>
                            <span>${option}</span>
                        </div>
                    `;
        });
        html += `</div>`;
      }

      html += `</div>`;
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

    stepDivs.EXAM.querySelectorAll(".option-item").forEach((item) => {
      item.addEventListener("click", () => {
        const questionId = item.getAttribute("data-question");
        const optionIndex = parseInt(item.getAttribute("data-option"));

        document
          .querySelectorAll(`.option-item[data-question="${questionId}"]`)
          .forEach((opt) => opt.classList.remove("selected"));
        item.classList.add("selected");
        state.answers[questionId] = optionIndex;
        updateProgressBar();
      });
    });

    // Add event listeners for handwritten inputs
    stepDivs.EXAM.querySelectorAll(".handwritten-input").forEach((input) => {
      input.addEventListener("input", () => {
        const questionId = input.getAttribute("data-question");
        const answer = input.value.trim();
        state.answers[questionId] = answer;
        updateProgressBar();
      });
    });

    stepDivs.EXAM.querySelector("#submit-exam").addEventListener(
      "click",
      submitExam,
    );
  }

  function updateProgressBar() {
    const answeredCount = Object.values(state.answers).filter(
      (a) =>
        a !== null &&
        a !== undefined &&
        (typeof a === "string" ? a.trim() !== "" : true),
    ).length;
    const percentage = (answeredCount / state.currentQuestions.length) * 100;
    document.getElementById("progress-fill").style.width = `${percentage}%`;
  }

  function formatTime(seconds) {
    if (seconds === undefined || seconds === null || isNaN(seconds))
      return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  async function submitExam() {
    clearInterval(state.timer);
    let correctCount = 0;
    let hasHandwrittenQuestions = false;

    state.currentQuestions.forEach((q) => {
      if (q.area === "手寫題目") {
        hasHandwrittenQuestions = true;
        // For handwritten questions, we can't auto-grade, so we'll give them a placeholder score
        // The actual grading will be done by administrators later
      } else if (state.answers[q.id] === q.answer) {
        correctCount++;
      }
    });

    const score = hasHandwrittenQuestions
      ? 0 // Initial score, will be updated after admin grading
      : state.currentQuestions.length > 0
        ? Math.round((correctCount / state.currentQuestions.length) * 100)
        : 0;

    setState({ score });

    if (usePreviewMode) {
      setState({ view: "RESULT" });
      return;
    }

    let attemptSaved = false;
    try {
      await saveExamAttempt();
      attemptSaved = true;
    } catch (error) {
      console.error("CRITICAL: Failed to save exam attempt.", error);
      alert(
        `發生嚴重錯誤，無法儲存您的作答紀錄。您的分數是 ${score} 分，但詳細紀錄遺失。\n\n錯誤: ${error.message}`,
      );
    }

    if (attemptSaved) {
      try {
        await updateLeaderboard();
      } catch (error) {
        console.error("NON-CRITICAL: Failed to update leaderboard.", error);
        alert(
          `您的作答紀錄已儲存，但更新排行榜時失敗了！\n\n這通常是缺少資料庫索引造成，請檢查瀏覽器主控台中的錯誤連結。\n\n錯誤: ${error.message}`,
        );
      }
    }
    setState({ view: "RESULT" });
  }

  async function saveExamAttempt() {
    const detailedQuestions = state.currentQuestions.map((q) => {
      const questionData = {
        id: q.id || "",
        content: q.content || "",
        options: q.options || [],
        answer: q.answer !== undefined ? q.answer : null,
        explanation: q.explanation || "",
        area: q.area || "",
        userAnswer: state.answers[q.id] !== undefined && state.answers[q.id] !== null ? state.answers[q.id] : (q.area === "手寫題目" ? "" : -1),
      };
      // Only add grade field for handwritten questions
      if (q.area === "手寫題目") {
        questionData.grade = null;
      }
      return questionData;
    });

    const leaderboardCategory =
      state.selectedExamType === "單字測驗"
        ? "vocab"
        : state.selectedExamType === "文法練習"
          ? "grammar"
          : state.selectedExamType === "手寫題目"
            ? "handwritten"
            : "reading";

    const completionTimeInSeconds = Math.floor(
      (Date.now() - state.startTime) / 1000,
    );

    const attemptData = {
      examId: state.latestExamId,
      nickname: state.nickname,
      nickname_lowercase: state.nickname.toLowerCase(),
      area: state.selectedArea,
      year: null,
      subject: "英文",
      examType: state.selectedExamType,
      score: state.score,
      date: firebase.firestore.FieldValue.serverTimestamp(),
      questions: detailedQuestions,
      leaderboardCategory: leaderboardCategory,
      completionTime: completionTimeInSeconds,
    };
    await examAttemptsCollection.add(attemptData);
  }

  async function updateLeaderboard() {
    const {
      latestExamId,
      nickname,
      selectedSubject,
      selectedYear,
      selectedExamType,
      score,
      selectedArea,
      startTime,
    } = state;
    const leaderboardCategory =
      selectedExamType === "單字測驗"
        ? "vocab"
        : selectedExamType === "文法練習"
          ? "grammar"
          : "reading";
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
      .where("subject", "==", leaderboardCategory)
      .where("nickname_lowercase", "==", nickname.toLowerCase())
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

    await new Promise((resolve) => setTimeout(resolve, 500));

    const {
      score,
      currentQuestions,
      selectedArea,
      selectedYear,
      selectedSubject,
      selectedExamType,
      startTime,
    } = state;

    const hasHandwrittenQuestions = currentQuestions.some((q) => q.area === "手寫題目");

    const totalQuestions = currentQuestions.length;
    const correctCount = currentQuestions.filter(
      (q) => q.area !== "手寫題目" && state.answers[q.id] === q.answer,
    ).length;
    const completionTime = Math.floor((Date.now() - startTime) / 1000);
    const completionTimeFormatted = formatTime(completionTime);

    let title = `英文 - ${selectedExamType}`;

    const scoreDisplay = hasHandwrittenQuestions ? "待批改" : score;
    const scoreUnit = hasHandwrittenQuestions ? "" : "分";
    const scoreClass = hasHandwrittenQuestions
      ? "pending"
      : score >= 60
        ? "pass"
        : "fail";

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
                        <div class="simple-score-display ${scoreClass}">
                            <div class="score-value">${scoreDisplay}</div>
                            <div class="score-unit">${scoreUnit}</div>
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
                                <span class="stat-value">${hasHandwrittenQuestions ? "待批改" : "+" + score}</span>
                                <span class="stat-label">獲得分數</span>
                            </div>
                        </div>
                        ${
                          hasHandwrittenQuestions
                            ? `
                        <div class="handwritten-notice">
                            <p>📝 此測驗包含手寫題目，您的最終分數將在教師評分後更新。</p>
                        </div>`
                            : ""
                        }
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

    const detailedQuestions = state.currentQuestions.map((q) => ({
      ...q,
      userAnswer: state.answers[q.id],
    }));
    const reviewHTML = renderAnswerReview(detailedQuestions);

    stepDivs.RESULT.innerHTML = reportHTML + reviewHTML;

    // Add action buttons below the report
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-group";
    buttonContainer.style.marginTop = "2rem";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.innerHTML = `
            <button id="return-home-btn" class="btn btn-secondary">返回首頁</button>
            <button id="restart-exam-btn" class="btn btn-primary">再測一次</button>
        `;
    stepDivs.RESULT.querySelector(".analysis-container").appendChild(
      buttonContainer,
    );
    stepDivs.RESULT.querySelector("#restart-exam-btn").addEventListener(
      "click",
      () => {
        setState({ view: "AREA", currentQuestions: [], answers: {}, score: 0 });
      },
    );
    stepDivs.RESULT.querySelector("#return-home-btn").addEventListener(
      "click",
      () => {
        closeExam();
      },
    );
  }

  function renderAnswerReview(questions) {
    let reviewHtml = `
            <div class="analysis-details-section">
                <h3 class="answer-review-title">逐題詳細分析</h3>`;
    questions.forEach((q, index) => {
      const userAnswer = q.userAnswer;
      const isHandwritten = q.area === "手寫題目";

      let statusClass = "incorrect";
      if (isHandwritten) {
        statusClass = "pending";
      } else if (userAnswer === q.answer) {
        statusClass = "correct";
      }

      reviewHtml += `<div class="review-question-item ${statusClass}">
                    <div class="review-question-content"><div class="question-number review-question-number">${index + 1}</div><div class="question-text">${q.content}</div></div>
                    <div class="review-options-list">
                        ${
                          isHandwritten
                            ? `<div class="handwritten-review-answer">
                                <strong>您的答案：</strong>
                                <p>${userAnswer ? userAnswer : "<em>（未作答）</em>"}</p>
                                <p class="pending-grade-notice">⏳ 此題目待教師評分</p>
                               </div>`
                            : (q.options || [])
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
                                  return `<div class="review-option ${optionClass}">${icon || '<div class="review-option-icon"></div>'}<span>${opt}</span></div>`;
                                })
                                .join("")
                        }
                    </div>
                    ${q.explanation ? `<div class="explanation-box"><strong>詳解：</strong><p>${q.explanation.replace(/\n/g, "<br>")}</p></div>` : ""}
                </div>`;
    });

    reviewHtml += `</div>`;
    return reviewHtml;
  }

  // Initializer
  document.getElementById("start-btn").addEventListener("click", () => {
    const nickname = document.getElementById("nickname-input").value.trim();
    if (nickname === "") {
      alert("請輸入暱稱");
      return;
    }
    setState({ nickname: nickname, view: "AREA" });
  });

  async function initialize() {
    await loadAllQuestions();
    render(); // Initial render for nickname screen
  }

  initialize();
});
