


document.addEventListener('DOMContentLoaded', () => {
    const uploaderContainer = document.getElementById('uploader-container');
    let validatedQuestions = []; // To hold the parsed and validated questions
    let selectedConfig = { year: '', subject: '', examType: '' };
    
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
    const allExamTypesForPharmacognosy = [...commonExamTypes, ...pharmacognosyOnlyExamTypes];

    // Super-gatekeeper: Check for initialization errors first.
    if (window.firebaseInitializationError) {
        uploaderContainer.innerHTML = `
            <div class="login-container fade-in" style="max-width: 650px;">
                 <div class="login-header">
                    <svg class="login-icon" style="color: var(--danger-color);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 style="background: var(--danger-color); -webkit-background-clip: text;">Firebase 設定錯誤</h2>
                    <p>您的 Firebase 設定檔 (<code>js/firebase.js</code>) 存在格式錯誤，導致上傳工具無法啟動。請檢查您的設定是否從 Firebase 控制台完整複製。</p>
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

    if (!isFirebaseConfigured()) {
        uploaderContainer.innerHTML = `
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
                <div style="margin-top: 2rem; text-align: center;">
                    <a href="index.html" class="link">返回首頁</a>
                </div>
            </div>`;
        return;
    }

    const db = firebase.firestore();
    const auth = firebase.auth();

    auth.onAuthStateChanged(user => {
        if (user) {
            renderUploaderTool(user);
        } else {
            renderLoginForm();
        }
    });

    function renderLoginForm() {
        uploaderContainer.innerHTML = `
            <div class="login-container fade-in">
                <div class="login-header">
                     <svg class="login-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    <h2>工具需要授權</h2>
                    <p>請登入以使用批次上傳工具</p>
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
                <div style="margin-top: 2rem; text-align: center;">
                    <a href="index.html" class="link">返回首頁</a>
                </div>
            </div>
        `;
        attachLoginListeners();
    }

    function renderUploaderTool(user) {
        const availableYears = ['2025', '2024', '2023', '2022', '2021'];
        const availableSubjects = ['藥理藥化', '生物藥劑', '藥物分析', '藥事行政法規', '藥物治療', '藥劑學', '生藥學'];
        
        const jsonFormatExample = JSON.stringify([
            {
                "content": "這是範例問題一的題目內容。",
                "options": [
                    "選項 A",
                    "選項 B",
                    "選項 C",
                    "選項 D"
                ],
                "answer": 2,
                "explanation": "這是選填的詳解說明。"
            },
            {
                "content": "這是範例問題二，沒有詳解。",
                "options": [
                    "選項 1",
                    "選項 2",
                    "選項 3",
                    "選項 4"
                ],
                "answer": 0,
                "explanation": ""
            }
        ], null, 2);


        uploaderContainer.innerHTML = `
            <header class="admin-header">
                <h2>試題批次上傳工具</h2>
                <div>
                    <span style="color: var(--secondary-color); margin-right: 1rem;">${user.email}</span>
                    <button id="logout-btn" class="btn btn-secondary">登出</button>
                </div>
            </header>
            
            <div class="instructions-box">
                <h4>上傳步驟</h4>
                <ol style="padding-left: 20px; margin-bottom: 1rem;">
                    <li><strong>步驟一：</strong>選擇目標年份、科目與考試類型。</li>
                    <li><strong>步驟二：</strong>在下方的文字框中，依照預設的 JSON 範本格式貼上您的題目陣列。</li>
                    <li><strong>步驟三：</strong>點擊「驗證 JSON」按鈕，系統將檢查格式與內容是否正確。</li>
                    <li><strong>步驟四：</strong>確認無誤後，「上傳」按鈕將會啟用，點擊即可完成上傳。</li>
                </ol>
                <h4>JSON 格式說明</h4>
                <p>
                    - 請提供一個 JSON <strong>陣列</strong> (以 <code>[ ]</code> 包圍)。<br>
                    - 陣列中的每個 <strong>物件</strong> (以 <code>{ }</code> 包圍) 代表一筆題目。<br>
                    - <code>content</code> (string): 題目內容 (必填)。<br>
                    - <code>options</code> (array): 一個剛好包含 4 個選項字串的陣列 (必填)。<br>
                    - <code>answer</code> (number): 正確答案的索引值 (0-3，分別對應選項1-4) (必填)。<br>
                    - <code>explanation</code> (string): 詳解 (選填，若無請留空字串 <code>""</code>)。
                </p>
            </div>

            <div id="status-message" class="status-message" style="display:none;"></div>
            
            <section class="glass-card" style="margin-bottom: 2rem;">
                <h3>步驟一：選擇題目分類</h3>
                <div class="question-form-grid" id="config-selector">
                    <div class="form-group">
                        <label for="uploader-year">年份</label>
                        <select id="uploader-year" class="glass-select">
                            <option value="" disabled selected>-- 選擇年份 --</option>
                            ${availableYears.map(y => `<option value="${y}">${y}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="uploader-subject">科目</label>
                        <select id="uploader-subject" class="glass-select">
                            <option value="" disabled selected>-- 選擇科目 --</option>
                            ${availableSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                     <div class="form-group">
                        <label for="uploader-exam-type">考試類型</label>
                        <select id="uploader-exam-type" class="glass-select">
                            <option value="" disabled selected>-- 先選擇科目 --</option>
                        </select>
                    </div>
                </div>
            </section>
            
            <section id="data-input-section" class="glass-card fade-in" style="display: none;">
                <h3>步驟二：貼上題目 JSON</h3>
                <div class="form-group">
                    <label for="questions-input">題目 JSON 陣列</label>
                    <textarea id="questions-input" rows="15" placeholder="請在此處貼上您的題目 JSON...">${jsonFormatExample}</textarea>
                </div>
                
                <div class="uploader-grid">
                    <div>
                        <h3>步驟三：驗證</h3>
                        <div class="form-actions" style="justify-content: flex-start;">
                            <button id="validate-btn" class="btn btn-secondary">驗證 JSON</button>
                        </div>
                    </div>
                     <div>
                        <h3>步驟四：上傳</h3>
                         <div class="form-actions" style="justify-content: flex-start;">
                             <button id="upload-btn" class="btn btn-primary" disabled>上傳至 Firebase</button>
                        </div>
                    </div>
                </div>
                 <div class="form-group" style="margin-top: 2rem;">
                    <label>驗證結果預覽</label>
                    <pre id="json-preview"><code>點擊「驗證 JSON」以檢查您的資料。</code></pre>
                </div>
            </section>
        `;
        attachUploaderListeners();
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

    function updateUploaderExamTypes() {
        const subject = document.getElementById('uploader-subject').value;
        const examTypeSelect = document.getElementById('uploader-exam-type');
        if (!examTypeSelect) return;
    
        const examTypes = subject === '生藥學' 
            ? allExamTypesForPharmacognosy
            : commonExamTypes;
    
        let optionsHtml = `<option value="" disabled selected>-- 選擇考試類型 --</option>`;
        optionsHtml += examTypes.map(t => `<option value="${t}">${t}</option>`).join('');
    
        examTypeSelect.innerHTML = optionsHtml;
        examTypeSelect.value = ''; 
        checkConfigAndToggleDataSection();
    }

    function checkConfigAndToggleDataSection() {
        const year = document.getElementById('uploader-year').value;
        const subject = document.getElementById('uploader-subject').value;
        const examType = document.getElementById('uploader-exam-type').value;
        const dataSection = document.getElementById('data-input-section');
        
        if (year && subject && examType) {
            selectedConfig = { year, subject, examType };
            if (dataSection.style.display === 'none') {
                dataSection.style.display = 'block';
                dataSection.classList.add('fade-in');
            }
        } else {
            dataSection.style.display = 'none';
        }
    }

    function attachUploaderListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
        
        const configSelector = document.getElementById('config-selector');
        configSelector.addEventListener('change', checkConfigAndToggleDataSection);

        document.getElementById('uploader-subject')?.addEventListener('change', updateUploaderExamTypes);

        document.getElementById('validate-btn')?.addEventListener('click', handleValidateJson);
        document.getElementById('upload-btn')?.addEventListener('click', handleUpload);
    }
    
    function handleValidateJson() {
        const inputText = document.getElementById('questions-input').value;
        const jsonPreview = document.getElementById('json-preview');
        const uploadBtn = document.getElementById('upload-btn');

        validatedQuestions = [];
        uploadBtn.disabled = true;

        if (!inputText.trim()) {
            jsonPreview.innerHTML = `<code style="color: var(--danger-color);">錯誤：輸入框為空。</code>`;
            showStatus('錯誤：輸入框不可為空。', 'error');
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(inputText);
        } catch (e) {
            jsonPreview.innerHTML = `<code style="color: var(--danger-color);">JSON 語法錯誤：<br>${e.message}</code>`;
            showStatus('JSON 語法錯誤，請檢查您的格式。', 'error');
            return;
        }

        if (!Array.isArray(parsedData)) {
            jsonPreview.innerHTML = `<code style="color: var(--danger-color);">格式錯誤：最外層必須是一個陣列 ( [...] )。</code>`;
            showStatus('格式錯誤：最外層必須是一個陣列。', 'error');
            return;
        }
        
        const errors = [];
        parsedData.forEach((item, index) => {
            if (typeof item.content !== 'string' || !item.content) {
                errors.push(`第 ${index + 1} 筆資料：缺少有效的 "content" (字串) 欄位。`);
            }
            if (!Array.isArray(item.options) || item.options.length !== 4) {
                 errors.push(`第 ${index + 1} 筆資料："options" 必須是一個包含 4 個選項的陣列。`);
            }
            if (typeof item.answer !== 'number' || item.answer < 0 || item.answer > 3) {
                 errors.push(`第 ${index + 1} 筆資料："answer" 必須是 0-3 之間的數字。`);
            }
        });

        if (errors.length > 0) {
            const errorHtml = errors.map(e => `<li>${e}</li>`).join('');
            jsonPreview.innerHTML = `<code style="color: var(--danger-color);"><ul style="margin: 0; padding-left: 20px;">${errorHtml}</ul></code>`;
            showStatus(`發現 ${errors.length} 個內容格式錯誤，請修正後再試。`, 'error');
            return;
        }
        
        validatedQuestions = parsedData;

        jsonPreview.innerHTML = `<code>${JSON.stringify(validatedQuestions, null, 2)}</code>`;
        uploadBtn.disabled = false;
        showStatus(`成功驗證 ${validatedQuestions.length} 筆資料，可以上傳。`, 'success');
    }

    async function handleUpload() {
        if (validatedQuestions.length === 0) {
            alert('沒有可上傳的題目。請先驗證 JSON。');
            return;
        }

        if (!confirm(`確定要上傳 ${validatedQuestions.length} 筆新題目到資料庫嗎？\n\n年份: ${selectedConfig.year}\n科目: ${selectedConfig.subject}\n類型: ${selectedConfig.examType}`)) {
            return;
        }
        
        const uploadBtn = document.getElementById('upload-btn');
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上傳中...';

        try {
            const batch = db.batch();
            const questionsRef = db.collection('questions');

            validatedQuestions.forEach(question => {
                const docRef = questionsRef.doc();
                 const finalQuestion = {
                    ...selectedConfig, // year, subject, examType
                    content: question.content,
                    options: question.options,
                    answer: question.answer,
                    explanation: question.explanation || ''
                };
                batch.set(docRef, finalQuestion);
            });

            await batch.commit();
            showStatus(`成功上傳 ${validatedQuestions.length} 筆題目！`, 'success');
            document.getElementById('questions-input').value = '';
            document.getElementById('json-preview').innerHTML = '<code>點擊「驗證 JSON」以產生預覽。</code>';
            validatedQuestions = [];

        } catch (error) {
            console.error("Error uploading questions: ", error);
            showStatus(`上傳失敗: ${error.message}`, 'error');
        } finally {
            uploadBtn.textContent = '上傳至 Firebase';
            // Keep it disabled until a new validation happens
        }
    }
    
    function showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
    }
});