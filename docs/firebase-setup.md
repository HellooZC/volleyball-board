# Firebase 设定教程

照着做大约 20 分钟。做完后，教练团（最多约 5 人）用自己的账号登录，所有设备看到同一份队伍、队形和对局。

全部使用 Firebase 免费的 **Spark 方案**，不用绑信用卡。**不要升级到 Blaze 方案**，这个 app 用不到。

> Firebase 控制台的语言跟着浏览器设定，下面每个按钮都写了「中文 / English」两种名称。

---

## 第 1 步：建立 Firebase 项目

1. 打开 <https://console.firebase.google.com>，用你的 Google 账号登录。
2. 点 **「建立项目 / Create a project」**（或「新增项目 / Add project」）。
3. 项目名称填 `volleyball-board`（随意），按继续。
4. **Google Analytics**：关掉，用不到。
5. 按「建立项目」，等它跑完，按「继续」。

## 第 2 步：新增网页应用，拿到设定值

1. 在项目首页，点 **`</>`（网页 / Web）** 图示。
2. 「应用昵称 / App nickname」填 `战术板`。
3. **不要**勾「同时为此应用设定 Firebase Hosting」：我们用 GitHub Pages。
4. 按「注册应用 / Register app」。
5. 画面会出现一段程序码，里面有：

   ```js
   const firebaseConfig = {
     apiKey: "AIza....",
     authDomain: "volleyball-board-xxxxx.firebaseapp.com",
     projectId: "volleyball-board-xxxxx",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "1:1234567890:web:abcdef..."
   };
   ```

   **只需要记下 4 个值：`apiKey`、`authDomain`、`projectId`、`appId`。** 其他的用不到。
6. 按「前往控制台 / Continue to console」。

> 这 4 个值不是密码，放在网页里是正常的。资料安全靠第 5 步的「规则」保护。
> 以后要再找：左上角齿轮 ⚙ →「项目设定 / Project settings」→ 往下拉到「你的应用 / Your apps」。

## 第 3 步：开启「邮箱 + 密码」登录

1. 左边选单：**「构建 / Build」→「Authentication」**，按「开始使用 / Get started」。
2. 「登录方法 / Sign-in method」分页 → 选 **「电子邮件/密码 / Email/Password」**。
3. 打开第一个开关 **「启用 / Enable」**。下面的「电子邮件链接（无密码登录）」**不用开**。按「储存 / Save」。
4. **关掉自行注册**（很重要，避免陌生人自己注册账号）：
   - 「设定 / Settings」分页 →「用户操作 / User actions」
   - **取消勾选「启用建立（注册）/ Enable create (sign-up)」**
   - 按「储存」。
5. 同样在「设定 / Settings」分页 →「已授权的网域 / Authorized domains」→「新增网域 / Add domain」→ 填 `helloozc.github.io` → 新增。
   这样「忘记密码」的邮件才能正常连回网站。

## 第 4 步：建立教练账号

1. Authentication →「用户 / Users」分页 →「新增用户 / Add user」。
2. 填教练的邮箱和一个密码（至少 6 个字），按「新增用户」。
3. 每位教练重复一次，最多约 5 位。
4. 把邮箱和密码私下告诉对方。他们之后可以在 app 的登录画面按「忘记密码」，自己改成新密码。

> 邮箱请用 **小写**。

## 第 5 步：建立 Firestore 数据库和安全规则

1. 左边选单：**「构建 / Build」→「Firestore Database」**，按「建立数据库 / Create database」。
2. 如果问版本（Edition），选 **「Standard」**。
3. 「位置 / Location」：选离你们近的。马来西亚或新加坡选 **`asia-southeast1 (Singapore)`**。
   **位置建立后不能改。**
4. 选 **「以正式版模式启动 / Start in production mode」**，按「建立 / Create」。
5. 建好后，切到 **「规则 / Rules」** 分页，把里面的内容**全部删掉**，贴上下面这段，并把名单换成第 4 步那些教练的邮箱：

   ```
   rules_version = '2';

   service cloud.firestore {
     match /databases/{database}/documents {
       function allowed() {
         return request.auth != null && request.auth.token.email in [
           'coach1@example.com',
           'coach2@example.com'
         ];
       }

       match /teams/{id} {
         allow read, write: if allowed();
       }
       match /matches/{id} {
         allow read, write: if allowed();
       }
     }
   }
   ```

   - 每个邮箱用单引号 `'...'` 包起来，邮箱之间用逗号 `,` 隔开，最后一个后面不要逗号。
   - 这段规则也存在仓库里的 [`firestore.rules`](../firestore.rules)。
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
2. 主页右上角应该出现蓝色的 **「登录同步」**。没有出现的话，表示第 6 步的变量没有设好，或部署还没跑完。
3. 用第 4 步的账号登录。按钮变成绿点 **「已同步」** 就成功了。
   - 第一次登录时，这台设备上原有的资料会自动传上云端。
   - 新设备第一次登录、本机还是空白时，会直接用云端的资料。
4. 用第二台设备（或无痕视窗）登录同一个或另一个教练账号，应该看到一样的队伍和对局。在一边改，另一边几秒内就会更新。

---

## 日常管理

### 新增一位教练
1. Authentication → Users → **Add user**（邮箱 + 密码）。
2. Firestore Database → Rules → 在名单里**加上他的邮箱** →「发布」。

**两步都要做**，只做第 1 步的话，他能登录，但会看到「没有权限」。

### 移除一位教练
1. Firestore Database → Rules → 从名单删掉他的邮箱 →「发布」（马上生效）。
2. Authentication → Users → 那一行最右边 ⋮ →「停用账号」或「删除账号」。

### 有人忘记密码
- 请他在 app 登录画面填邮箱，按 **「忘记密码」**，收信重设。
- 或由你在 Authentication → Users → ⋮ →「重设密码」。

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
| 主页没有「登录同步」按钮 | GitHub Variables 没设、名称打错，或改完没有重新跑 workflow（第 6 步） |
| 登录时显示「邮箱或密码不对」 | Authentication → Users 里没有这个账号，或密码错了 |
| 登录后显示「没有权限」 | 邮箱不在 Firestore 规则的名单里，或大小写不同（第 5 步），改完记得按「发布」 |
| 一直显示「离线，连网后自动同步」 | 设备没网络；改动都已存在设备上，连上网会自动送出 |
| 两个人同时改同一场对局 | 以最后改的那一份为准，建议比赛时由一个人记分 |
| 换了浏览器或清了浏览器资料 | 重新登录就会从云端拿回来 |
