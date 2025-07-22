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

## 步驟 5：建立 Firestore Database (資料庫)

本專案使用 Firestore 來儲存試題和排行榜資料。

1.  在 Firebase 控制台的左側導覽列，前往「建構」>「Firestore Database」。
2.  點擊「建立資料庫」。
3.  選擇在**測試模式**下啟動。這會允許應用程式在初期開發階段自由讀寫資料。
    > **警告**：測試模式的安全性規則會在 30 天後到期。在正式部署前，請務必更新您的[安全性規則](https://firebase.google.com/docs/firestore/security/get-started)以保護您的資料。
4.  選擇離您最近的 Cloud Firestore 位置，然後點擊「啟用」。

## 資料庫結構

您的 Firestore 資料庫將會自動建立以下兩個集合 (Collections)：

### 1. `questions` 集合

此集合用於存放所有考試題目。每份文件 (Document) 代表一道題目。

-   **文件 ID**: 自動產生的唯一 ID
-   **欄位 (Fields)**:
    -   `year` (String): 題目年份，例如 `"2024"`。
    -   `subject` (String): 考試科目，例如 `"藥理藥化"`。
    -   `examType` (String): 考試類型，例如 `"第一次藥師考試"`、`"第二次藥師考試"` 或 `"小考練習區"`。
    -   `content` (String): 題目的完整內容。
    -   `options` (Array of Strings): 一個包含四個選項字串的陣列。
    -   `answer` (Number): 正確答案的索引值 (0-3 對應 A-D)。
    -   `explanation` (String): 題目的詳解文字 (可以為空字串)。

**文件範例:**
```json
{
  "year": "2024",
  "subject": "藥理藥化",
  "examType": "第一次藥師考試",
  "content": "下列何者為鴉片類止痛劑？",
  "options": [
    "Aspirin",
    "Ibuprofen",
    "Morphine",
    "Acetaminophen"
  ],
  "answer": 2,
  "explanation": "Morphine 是一種強效的鴉片類(opioid)止痛劑，常用於緩解中度至重度疼痛。"
}
```

### 2. `leaderboard` 集合

此集合用於儲存所有考生的成績，以建立排行榜。

-   **文件 ID**: 自動產生的唯一 ID
-   **欄位 (Fields)**:
    -   `nickname` (String): 考生的暱稱。
    -   `score` (Number): 考試成績 (0-100)。
    -   `subject` (String): 參加考試的科目。
    -   `year` (String): 參加考試的年份。
    -   `examType` (String): 參加考試的類型。
    -   `date` (Timestamp): 提交考試的伺服器時間戳。
    -   `examId` (String): 一個當次考試的唯一識別碼，用來定位使用者當次的排名。

**文件範例:**
```json
{
  "nickname": "藥學之星",
  "score": 95,
  "subject": "藥物治療",
  "year": "2024",
  "examType": "第二次藥師考試",
  "date": "May 20, 2024 at 10:30:00 AM UTC+8",
  "examId": "exam_1716172200000"
}
```
