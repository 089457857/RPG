# 屁眼王國大冒險：架設到 Render 的教學

2D 像素橫向捲軸連線打怪遊戲，有自己的網址和帳號系統，跟牛牛完全分開。

流程和當初架牛牛幾乎一樣，但多了一步：**把牛牛的資料庫網址貼過來**（第三步會說明原因）。

---

## 第一步：建立新的 GitHub repository

1. 到 https://github.com ，按右上角「＋」→「New repository」。
2. Repository name 填 `pyan-rpg`，選 **Private**，其他選項都不要勾，按「Create repository」。
3. 點「uploading an existing file」，把這個資料夾裡的 **6 個檔案**一起拖進去：
   - `index.html`
   - `server.js`
   - `rpg.js`
   - `rpg-data.js`
   - `package.json`
   - `render.yaml`
4. 按「Commit changes」。

## 第二步：在 Render 建立 Blueprint

1. 到 Render，按「New」→「Blueprint」，選 `pyan-rpg` 這個 repository，按「Connect」。
2. **Blueprint Name** 填 `pyan-rpg`。
3. 往下捲會看到一欄 **DATABASE_URL**，先不要按 Deploy，照第三步取得網址。

## 第三步：填 DATABASE_URL（用牛牛的資料庫）

Render 免費方案**一個帳號只能有一個免費資料庫**，牛牛已經用掉了，所以 RPG 要借用同一個資料庫。兩邊的資料會分開存，不會互相影響（RPG 的資料存在 `pyan-rpg` 這一格，牛牛的存在另一格）。

1. 另開一個分頁回到 Render 主畫面，點進牛牛的資料庫 `niuniu-db`。
2. 往下找到「Connections」裡的 **Internal Database URL**，按複製。
3. 回到 Blueprint 頁面，把網址貼進 **DATABASE_URL**。
4. 按「**Deploy Blueprint**」，等 3～5 分鐘。

> 如果 DATABASE_URL 留空，遊戲還是能玩，但伺服器每次重啟或休眠後，帳號和角色都會消失。

## 第四步：開始玩

1. 點進 `pyan-rpg` 服務，打開上方的網址，例如 `https://pyan-rpg-xxxx.onrender.com`。
2. 第一次進來先註冊，暱稱和密碼跟牛牛是**分開**的。
3. 選職業就能開始；把網址傳給朋友，大家註冊後就會在同一張地圖相遇。

## 玩法重點

- **一起打比較划算**：怪物被多人一起打時，每個有出手的人都分得到經驗。
- **聊天**：按 Enter 開始打字，訊息會出現在角色頭上和聊天欄。
- **轉職**：15 級一轉、30 級二轉，在晨露村找轉職教官，滿等 40 級。
- **地圖**：蘑菇森林（1～15 級）→ 冰雪山谷（15 級以上）→ 熔岩深淵（30 級以上）。
- **排行榜**：「角色」按鈕裡可以看等級排行和線上人數。
- **存檔**：角色存在伺服器，換手機或電腦登入都能接著玩。

## 免費方案提醒

- **休眠**：15 分鐘沒人連線就會休眠，下次打開要等約 1 分鐘。
- **共用時數**：牛牛和 RPG 是兩個服務，共用每個月 750 小時的免費額度。只要不是兩個都 24 小時有人在玩，通常夠用。
- **資料庫到期**：免費資料庫建立 30 天後會到期，牛牛和 RPG 的資料會一起受影響。要長期經營，建議把資料庫升級成付費方案。

## 之後要修改遊戲

在 GitHub 的 `pyan-rpg` 上修改檔案並 Commit，Render 會自動重新部署。
