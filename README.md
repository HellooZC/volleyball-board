# 排球战术板

排球教练用的战术板：计分（自动轮转，含对方轮转）、画跑位线、换人、每球记录、多局对局记录。每支队存 6 个轮转的接发球阵型，对局里对方发球时自动摆出当前轮转的阵型。

网址：<https://helloozc.github.io/volleyball-board/>

## 资料存在哪里

- 默认存在每台设备的浏览器（localStorage）里。
- 设定 Firebase 后，登录的教练共用同一份云端资料，离线时会先存在设备上。设定步骤见 [docs/firebase-setup.md](docs/firebase-setup.md)。

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 输出到 dist/
npm run lint
```

技术：React 19 + TypeScript + Tailwind CSS 4 + Vite，可选 Firebase（Auth + Firestore）。

推送到 `main` 后，GitHub Actions（`.github/workflows/deploy.yml`）会自动建置并部署到 GitHub Pages。

## 结构

- `src/pages/`：主页、对局页、队伍（队形模板）页
- `src/components/`：球场、计分板、侧边面板等
- `src/lib/model.ts`：资料结构与规则（轮转、局分、旧资料转换）
- `src/lib/store.ts`：本机存储
- `src/lib/cloud.ts`：Firebase 同步（没设定时不会载入）
