# Firebase 設定指南

本指南將引導您完成此線上考試系統所需的 Firebase 專案設定。

## 步驟 1：建立 Firebase 專案

1.  前往 [Firebase 控制台](https://console.firebase.google.com/)。
2.  點擊「新增專案」，然後依照畫面指示建立一個新專案。

## 步驟 2：設定您的 Web 應用程式

1.  在您的專案主控台中，點擊「網頁」圖示 (`</>`) 來新增一個網頁應用程式。
2.  為您的應用程式命名（例如：「線上考試系統」），然後點擊「註冊應用程式」。
3.  Firebase 會提供一組 `firebaseConfig` 物件。**請完整複製這段程式碼**。

## 步驟 3：將 Firebase 設定貼到專案中

1.  在您的專案中，找到並打開 `js/firebase.js` 檔案。
2.  將您剛剛複製的 `firebaseConfig` 物件，完整地貼上來取代檔案中原有的預設 `firebaseConfig` 內容。

    ```javascript
    // js/firebase.js

    const firebaseConfig = {
      // 在此貼上您從 Firebase 複製的設定
      apiKey: "...",
      authDomain: "...",
      projectId: "...",
      storageBucket: "...",
      messagingSenderId: "...",
      appId: "..."
    };
    ```

## 步驟 4：啟用 Authentication (驗證)

為了讓管理員能夠登入，您需要啟用電子郵件/密碼登入方式。

1.  在 Firebase 控制台的左側導覽列，前往「建構」>「Authentication」。
2.  點擊「開始設定」，然後選擇「電子郵件/密碼」作為登入方式。
3.  啟用它，然後點擊「儲存」。
4.  切換到「使用者」分頁，點擊「新增使用者」。
5.  建立一個管理員帳號。您可以使用 `admin@example.com` 和一個您自訂的密碼。這個帳號將用來登入管理後台和題目上傳工具。

## 步驟 5：設定 Firestore Database (資料庫) 與安全性規則

這是最關鍵也最容易出錯的步驟。請務必仔細操作。

1.  在 Firebase 控制台的左側導覽列，前往「建構」>「Firestore Database」。
2.  點擊「建立資料庫」。
3.  選擇在**測試模式**下啟動，然後選擇離您最近的 Cloud Firestore 位置，點擊「啟用」。
4.  建立後，系統會自動將您導向「資料」分頁。請點擊頂部的「**規則 (Rules)**」分頁。
5.  將編輯器中的內容**全部刪除**，並貼上以下這段 **更完整且安全的規則**，然後點擊「**發佈 (Publish)**」：
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
    
        // 題庫 (questions) 集合的規則
        match /questions/{questionId} {
          // 允許任何人讀取題目 (讓考生可以看到題目)
          allow read: if true;
          // 只允許已登入的使用者(管理者)寫入、修改、刪除題目
          allow write: if request.auth != null;
        }
    
        // 排行榜 (leaderboard) 集合的規則
        match /leaderboard/{scoreId} {
          // 允許任何人讀取排行榜
          allow read: if true;
          // 允許任何人寫入成績 (讓考生可以提交分數)
          allow write: if true;
        }
    
        // 作答紀錄 (examAttempts) 集合的規則
        match /examAttempts/{attemptId} {
          // 允許任何人讀寫。
          // 寫入是為了讓考生能儲存作答紀錄。
          // 讀取是為了讓考生能查詢自己的歷史紀錄。
          allow read, write: if true;
        }
        
        // 公告 (announcements) 集合的規則
        match /announcements/{announcementId} {
          // 允許任何人讀取公告
          allow read: if true;
          // 只允許已登入的使用者(管理者)寫入
          allow write: if request.auth != null;
        }

        // 系統設定 (settings) 集合的規則
        match /settings/{settingId} {
          // 允許任何人讀取設定 (例如倒數日期)
          allow read: if true;
          // 只允許已登入的使用者(管理者)寫入
          allow write: if request.auth != null;
        }
      }
    }
    ```
    > **⚠️ 安全性警告**: 這組規則在開發和初期使用上是安全的，但若要對外正式營運，建議您研究更嚴謹的[安全性規則](https://firebase.google.com/docs/firestore/security/get-started)，例如只允許使用者讀取自己的作答紀錄。


## 步驟 6：建立 Firestore 索引 (重要)

Firestore 需要索引才能支援特定的複雜查詢。**如果沒有建立必要的索引，相關功能 (如更新排行榜) 將會失敗**。

**如何建立索引？**
最簡單的方式是透過 Firebase 自動提供的連結：

1.  在本機執行您的應用程式。
2.  **以普通使用者的身分，完整地進行一次考試，直到最後提交答案。**
3.  提交答案後，如果缺少索引，畫面上**應該會跳出一個關於「更新排行榜失敗」的提示視窗**。同時，請打開瀏覽器的**開發者工具 (Developer Tools)** (通常按 F12)，並切換到**主控台 (Console)** 標籤。
4.  您應該會看到一條紅色的錯誤訊息，內容類似 `FAILED_PRECONDITION: The query requires an index...`。這條錯誤訊息中會包含一個**很長的藍色連結**。
5.  **點擊該連結**。它會開啟一個新的瀏覽器分頁，直接帶您到 Firebase 控制台，並自動填好建立索引所需的所有設定。
6.  檢查設定無誤後，點擊「建立索引」。索引建立需要幾分鐘時間，請耐心等候。建立完成後，重新整理頁面再試一次即可。

### 目前必要的索引
-   **集合**: `leaderboard`
-   **欄位索引**: `subject` (遞增), `nickname_lowercase` (遞增)
-   **查詢範圍**: 集合
-   **集合**: `examAttempts`
-   **欄位索引**: `nickname_lowercase` (遞增)
-   **查詢範圍**: 集合

---

## 疑難排解 (Troubleshooting)

### 錯誤：`Missing or insufficient permissions` (遺失或權限不足)

如果您在提交考試後，看到這個錯誤訊息，這**100%** 是您的 **Firestore 安全性規則** 設定有問題。

**解決方法：**

請直接回到本文件的【步驟 5】，檢查您的 Firestore「規則 (Rules)」是否**完整包含**所有必要的集合規則。最常見的錯誤是**缺少 `examAttempts` 的存取規則**。

---

## 資料庫結構

您的 Firestore 資料庫將會自動建立以下幾個集合 (Collections)：

### 1. `questions`
此集合用於存放所有考試題目。

### 2. `leaderboard`
此集合用於儲存所有考生的成績，以建立排行榜。

### 3. `examAttempts`
此集合用於儲存每一次完整的作答紀錄，供使用者查詢。

### 4. `announcements`
此集合用於存放由管理員發佈的系統公告。

### 5. `settings`
此集合用於存放全站性的設定，例如國考倒數日期。預計只會有一個 ID 為 `mainConfig` 的文件。
