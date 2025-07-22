document.addEventListener('DOMContentLoaded', () => {
    const uploaderContainer = document.getElementById('uploader-container');
    let generatedQuestions = []; // To hold the parsed questions

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
        const availableExamTypes = ['第一次藥師考試', '第二次藥師考試', '小考練習區'];


        uploaderContainer.innerHTML = `
            <header class="admin-header">
                <h2>試題批次上傳工具</h2>
                 <div>
                    <span style="color: var(--secondary-color); margin-right: 1rem;">${user.email}</span>
                    <button id="logout-btn" class="btn btn-secondary">登出</button>
                </div>
            </header>
            
            <div class="instructions-box">
                <h4>格式說明</h4>
                <p>請選擇年份、科目與考試類型，然後將題目以純文字格式貼入下方輸入框。每題之間請用至少一個空行隔開。解釋/詳解為選填項目。</p>
                <pre><code>1. 口服藥物時，鹼性藥物較酸性藥物易留在胃中，此現象的主要原因為何？
A. 鹼性藥物較耐酸性，不易分解
B. 鹼性藥物會抑制胃分解酶的分泌
C. 鹼性藥物易與脂溶性食物結合
D. 鹼性藥物在胃中帶正電荷不易吸收
答案:D
解釋: 帶電的藥物不容易穿過細胞膜</code></pre>
            </div>

            <div id="status-message" class="status-message" style="display:none;"></div>
            
             <section class="admin-controls">
                <select id="uploader-year" class="glass-select">
                    <option value="" disabled selected>-- 選擇年份 --</option>
                    ${availableYears.map(y => `<option value="${y}">${y}</option>`).join('')}
                </select>
                <select id="uploader-subject" class="glass-select">
                    <option value="" disabled selected>-- 選擇科目 --</option>
                    ${availableSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <select id="uploader-exam-type" class="glass-select">
                    <option value="" disabled selected>-- 選擇考試類型 --</option>
                    ${availableExamTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </section>

            <div class="uploader-grid">
                <div class="form-group full-width">
                    <label for="questions-input">題目文字輸入</label>
                    <textarea id="questions-input" rows="20" placeholder="請在此處貼上題目..."></textarea>
                </div>
                <div class="form-group full-width">
                    <label>JSON 預覽</label>
                    <pre id="json-preview"><code>請先點擊「轉換為 JSON」以產生預覽。</code></pre>
                </div>
            </div>
            
            <div class="form-actions">
                <button id="convert-btn" class="btn btn-secondary">轉換為 JSON</button>
                <button id="upload-btn" class="btn btn-primary" disabled>上傳至 Firebase</button>
            </div>
        `;
        attachUploaderListeners();
    }

    function attachLoginListeners() {
        const loginBtn = document.getElementById('login-btn');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorDiv = document.getElementById('login-error');

        loginBtn.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            errorDiv.style.display = 'none';

            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    console.error("Login failed:", error);
                    errorDiv.textContent = `登入失敗: ${error.message}`;
                    errorDiv.style.display = 'block';
                });
        });
    }
    
    function attachUploaderListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
        document.getElementById('convert-btn').addEventListener('click', handleConvert);
        document.getElementById('upload-btn').addEventListener('click', handleUpload);
    }
    
    function handleConvert() {
        const year = document.getElementById('uploader-year').value;
        const subject = document.getElementById('uploader-subject').value;
        const examType = document.getElementById('uploader-exam-type').value;
        const inputText = document.getElementById('questions-input').value;
        const jsonPreview = document.getElementById('json-preview');
        const uploadBtn = document.getElementById('upload-btn');

        generatedQuestions = []; // Reset
        uploadBtn.disabled = true;

        if (!year || !subject || !examType) {
            showStatus('請先選擇年份、科目和考試類型。', 'error');
            return;
        }

        if (!inputText.trim()) {
            jsonPreview.innerHTML = '<code>輸入框為空。</code>';
            return;
        }

        try {
            const questionBlocks = inputText.trim().split(/\n\s*\n/).filter(b => b.trim() !== '');
            
            generatedQuestions = questionBlocks.map((block, index) => {
                const lines = block.trim().split('\n');
                
                const findLine = (pattern) => lines.find(line => line.trim().match(pattern));

                const questionLine = findLine(/^\d+\.\s*/);
                if (!questionLine) throw new Error(`第 ${index + 1} 題：找不到題號 (例如 '1.')。`);
                const content = questionLine.trim().replace(/^\d+\.\s*/, '');

                const options = ['A', 'B', 'C', 'D'].map(char => {
                    const optLine = findLine(new RegExp(`^${char}\\.\\s*`));
                    if (!optLine) throw new Error(`第 ${index + 1} 題：找不到選項 ${char}。`);
                    return optLine.trim().replace(new RegExp(`^${char}\\.\\s*`), '');
                });

                const answerLine = findLine(/^(答案:?)/i);
                if (!answerLine) throw new Error(`第 ${index + 1} 題：找不到答案行 (例如 '答案:D')。`);
                const answerChar = answerLine.split(/答案:?/i)[1].trim().charAt(0).toUpperCase();
                const answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                if (answerMap[answerChar] === undefined) throw new Error(`第 ${index + 1} 題：答案 '${answerChar}' 無效。`);
                const answer = answerMap[answerChar];

                const explanationLine = findLine(/^(解釋:|詳解:)/i);
                const explanation = explanationLine ? explanationLine.split(/解釋:|詳解:/i)[1].trim() : '';

                return { year, subject, examType, content, options, answer, explanation };
            });

            jsonPreview.innerHTML = `<code>${JSON.stringify(generatedQuestions, null, 2)}</code>`;
            uploadBtn.disabled = false;
            showStatus(`成功解析 ${generatedQuestions.length} 題，可以上傳。`, 'success');

        } catch (error) {
            jsonPreview.innerHTML = `<code style="color: var(--danger-color);">${error.message}</code>`;
            showStatus(error.message, 'error');
        }
    }

    async function handleUpload() {
        if (generatedQuestions.length === 0) {
            alert('沒有可上傳的題目。');
            return;
        }

        if (!confirm(`確定要上傳 ${generatedQuestions.length} 筆新題目到 "${generatedQuestions[0].year} ${generatedQuestions[0].subject} (${generatedQuestions[0].examType})" 嗎？`)) {
            return;
        }

        const uploadBtn = document.getElementById('upload-btn');
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上傳中...';

        try {
            const batch = db.batch();
            const questionsRef = db.collection('questions');

            generatedQuestions.forEach(question => {
                const docRef = questionsRef.doc(); // Create a new doc with a random ID
                batch.set(docRef, question);
            });

            await batch.commit();
            showStatus(`成功上傳 ${generatedQuestions.length} 筆題目！`, 'success');
            document.getElementById('questions-input').value = '';
            document.getElementById('json-preview').innerHTML = '<code>請先點擊「轉換為 JSON」以產生預覽。</code>';
            generatedQuestions = [];

        } catch (error) {
            console.error("Error uploading questions: ", error);
            showStatus(`上傳失敗: ${error.message}`, 'error');
        } finally {
            uploadBtn.textContent = '上傳至 Firebase';
            // Keep it disabled until a new conversion happens
        }
    }

    function showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
    }
});