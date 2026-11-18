# Firebase 设定教程

照着做大约 15 分钟。做完后，打开网站的每台设备都会自动同步，看到同一份队伍、阵型和对局，**不用登录**。

全部使用 Firebase 免费的 **Spark 方案**，不用绑信用卡。**不要升级到 Blaze 方案**，这个 app 用不到。

> ⚠️ 不用登录的代价：拿到网址的人都能看到、修改、删除资料（仓库是公开的，网址找得到）。资料只是球员名字和战术，风险不高，但请定期在主页「备份 / 还原」导出备份。Firebase 可能会寄信提醒「规则不安全」，那是预期中的提醒。

> Firebase 控制台的语言跟着浏览器设定，下面每个按钮都写了「中文 / English」两种名称。

---

## 第 1 步：建立 Firebase 项目

1. 打开 <https://console.firebase.google.com>，用你的 Google 账号登录。
2. 点 **「建立项目 / Create a project」**（或「新增项目 / Add project」）。
3. 项目名称随意，按继续。
4. **Google Analytics**：关掉，用不到。
5. 按「建立项目」，等它跑完，按「继续」。

## 第 2 步：新增网页应用，拿到设定值

1. 在项目首页，点 **`</>`（网页 / Web）** 图示。
2. 「应用昵称 / App nickname」填 `战术板`。**不要**勾 Firebase Hosting。
3. 按「注册应用 / Register app」，记下 `apiKey`、`authDomain`、`projectId`、`appId` 这 4 个值。

> 这 4 个值不是密码，放在网页里是正常的。
> 以后要再找：左上角齿轮 ⚙ →「项目设定 / Project settings」→ 往下拉到「你的应用 / Your apps」。

## 第 3、4 步

不需要。旧版要开 Authentication 和建教练账号，现在不用登录，可以跳过；已经建了也没关系，留着不影响。

## 第 5 步：建立 Firestore 数据库和安全规则

1. 左边选单：**「构建 / Build」→「Firestore Database」**，按「建立数据库 / Create database」。
2. 如果问版本（Edition），选 **「Standard」**。
3. 「位置 / Location」：选离你们近的。马来西亚或新加坡选 **`asia-southeast1 (Singapore)`**。
   **位置建立后不能改。**
4. 选 **「以正式版模式启动 / Start in production mode」**，按「建立 / Create」。
5. 建好后，切到 **「规则 / Rules」** 分页，把里面的内容**全部删掉**，贴上仓库里 [`firestore.rules`](../firestore.rules) 的全部内容。
   这份规则让所有人都能读写 `teams` 和 `matches`，其他东西一律拒绝，也会检查资料格式和大小。
6. 按 **「发布 / Publish」**。

## 第 6 步：把设定值放进 GitHub，重新部署

1. 打开 <https://github.com/HellooZC/volleyball-board>。
2. **Settings → Secrets and variables → Actions → 切到「Variables」分页 → New repository variable**。
3. 新增 4 个变量。名称必须一字不差，值就是第 2 步记下的：

   | Name | Value（例） |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | `AIza....` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `volleyball-board-xxxxx.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `volleyball-board-xxxxx` |
   | `VITE_FIREBASE_APP_ID` | `1:1234567890:web:abcdef...` |

   > 放在 **Variables** 就可以，不需要放 Secrets：这些值本来就会出现在网页里。
4. 到 **Actions** 分页 → 左边选「Deploy to GitHub Pages」→ 右边 **「Run workflow」→「Run workflow」**。
5. 等它变成绿色勾勾（约 1–2 分钟）。

## 第 7 步：测试

1. 打开 <https://helloozc.github.io/volleyball-board/>，记得重新整理。
2. 主页右上角会显示同步状态，绿点 **「已同步」** 就成功了。
   - 第一次打开时，这台设备上原有的资料会自动传上云端。
   - 新设备第一次打开、本机还是空白时，会直接用云端的资料。
3. 用第二台设备（或无痕视窗）打开，应该看到一样的队伍和对局。一边改，另一边几秒内就会更新。

---

## 日常管理

### 备份
主页「备份 / 还原」→「导出备份」，会下载一个 JSON 文件，建议每个赛季存一份。

### 免费额度够不够？
Spark 免费方案每天大约 5 万次读取、2 万次写入，储存 1 GB。5 位教练正常使用远远用不完。真的用到上限时，当天会暂时无法同步，但 app 仍会先存在设备上，第二天自动补上。

---

## 在自己电脑上开发时连 Firebase

```bash
cp .env.example .env.local   # .env.local 不会被上传到 GitHub
# 打开 .env.local，填入第 2 步的 4 个值
npm run dev
```

要在本机测试「忘记密码」，Authorized domains 里要有 `localhost`（Firebase 默认已经加了）。

## 常见问题

| 现象 | 原因 / 解决 |
|---|---|
| 主页右上角没有同步状态 | GitHub Variables 没设、名称打错，或改完没有重新跑 workflow（第 6 步） |
| 显示「没有权限」 | Firestore 规则没贴或没按 Publish（第 5 步） |
| 一直显示「离线，连网后自动同步」 | 设备没网络；改动都已存在设备上，连上网会自动送出 |
| 两个人同时改同一场对局 | 以最后改的那一份为准，建议比赛时由一个人记分 |
| 资料被误删 | 用「备份 / 还原」导入最近一次导出的备份 |
