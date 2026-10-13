# 巡位·归途 · GitHub Pages 版

地下停车场人机交互课程演示网页：3D体素与粒子封面、分栏目方案介绍，以及搜索车位、停车记忆卡和地标返程演示。

这是可直接部署的静态网站，不需要安装依赖、编译或配置服务器。

## 最简单的部署方式

1. 在自己的 GitHub 账号下创建一个公开仓库，建议名为 `parktrace`。GitHub Free 可使用公开仓库发布 Pages。
2. 解压部署包，将 `parktrace` 文件夹里面的全部文件和 `assets` 文件夹上传到仓库根目录。让 `index.html` 与 `README.md` 出现在仓库根目录，不要多套一层 `parktrace` 文件夹，也不要只上传ZIP压缩包。
3. 提交到 `main` 分支。
4. 打开仓库的 **Settings → Pages**。
5. 在 **Build and deployment → Source** 中选择 **Deploy from a branch**。
6. 选择 **main** 与 **/(root)**，点击 **Save**。
7. 等待部署完成。Pages 设置页显示的网站地址，就是可以发给其他人的链接。部署情况也可以在 **Actions** 中查看。

项目网站通常使用以下地址结构（请替换用户名和仓库名）：

```text
https://你的用户名.github.io/parktrace/
```

如果仓库的默认分支不是 `main`，请选择实际的发布分支。

## 网页结构

- `index.html`：3D像素动画封面。
- `home.css`、`home.mjs`、`scene.mjs`、`journey.mjs`：封面样式、动画控制与3D投影绘制。
- `details.html`：按需显示的方案与原型介绍。
- `styles.css`、`details.css`、`details.mjs`：详细页面样式与栏目切换。
- `app.mjs`、`core.mjs`：交互演示、路线算法与停车记忆卡。
- `assets/`：可下载的方案PDF。
- `.nojekyll`：让GitHub Pages直接发布静态文件。
- `verify.mjs`：可选的资源、路径和核心逻辑检查。

## 后续修改

修改仓库中的网页文件并提交到发布分支后，Pages会重新发布。修改后可查看Actions确认结果，再刷新网站。

资源链接均使用相对路径，可以同时用于项目网站子路径和账号首页。首页复制链接功能会复制当前部署位置，不依赖原Sites域名。

## 演示边界

地图、空位线索和识别候选均为模拟数据。照片仅留在本次页面会话，不上传；停车记忆卡文字保存在访问者自己的浏览器中。此版不运行OCR，不接入真实车位数据、自动定位或实物设备。

## 本地预览与检查（可选）

安装Python后，在此文件夹运行：

```bash
python -m http.server 8000
```

随后打开 `http://localhost:8000/`。由于使用JavaScript模块，请通过HTTP预览，不要直接双击HTML文件。

安装Node.js后，可以运行：

```bash
node verify.mjs
```

## 官方参考

- [GitHub Pages 发布源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages 创建网站](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
