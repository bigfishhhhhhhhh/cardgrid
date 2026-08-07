# CardGrid

這是可部署到 Vercel 的 CardGrid 第一版互動原型。

## 部署到 Vercel

1. 把這個資料夾上傳到 GitHub。
2. 到 Vercel → Add New Project。
3. 選擇剛剛的 GitHub Repository。
4. Framework Preset 選 Vite。
5. Build Command 使用 `npm run build`。
6. Output Directory 使用 `dist`。
7. Deploy。

部署完成後會得到一個 `https://...vercel.app` 網址，可直接用 iPhone Safari 開啟。

## 目前功能

- 自訂每排格數，例如 4,4 / 4,1 / 5,5,5
- 加一格
- 5 種尺寸預設 + 自訂寬高
- 調整格子間距、畫布內距
- 點框選取
- 上傳照片
- 照片縮放、位置、旋轉、亮度
- 號碼、名稱、價格、自訂文字
- 雙擊或勾選售完灰白狀態

後續可再加入：
邊框樣式、背景圖片、字體、文字對齊、價格群組線、單格不同尺寸、色溫、傾斜校正、PNG 匯出。
