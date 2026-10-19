# 拍搭 PAIDA · 产品官网

介绍拍搭 Android v0.3.0 的产品网站，包含一个可操作的动画相机演示。纯 HTML、CSS、JavaScript，无依赖、无后台，支持 GitHub Pages 和本地双击打开 `index.html`。

## 演示内容

- 校园墙边、公园漫步、窗边咖啡三个示例环境。
- 初始取景不显示人物轮廓；点击“人物入镜”后出现动画人物与推荐动作。
- 更换推荐、查看动画参考、隐藏轮廓、显示九宫格。
- 拖动取景距离，点击快门查看留白、人物贴边或取景合适等反馈。
- 拍后裁剪框可以开关，拍摄结果不包含轮廓与九宫格；原始示例画面保持不变。
- 完整 12 个动画姿势画廊，支持键盘、弹窗 Escape 关闭和减少动态效果偏好。
- 手机与桌面响应式布局。

网页是**示例交互**：不调用设备摄像头、不运行 AI 识别、不上传照片。其评估来自示例人物的几何大小，不能当作 Android 模型效果测试或物理距离测量。Android 产品功能介绍以 v0.3.0 已实现能力为依据，不承诺识别准确率或精确退后米数。

## GitHub Pages 发布

当前版本使用账号 `potatobander` 的 `parktrace` 仓库，源码保存在独立的 `paida/` 目录，复用 `main` 分支的 Pages 发布。后续更新本目录即可更新拍搭网页。

如需迁移到专用仓库，可使用以下步骤：

1. 把本文件夹内的文件上传到仓库根目录。根目录须能直接看到 `index.html`、`styles.css`、`app.js`、`demo-model.js` 和 `assets/`，不要再套一层文件夹。
2. 在仓库 **Settings → Pages** 中，Source 选择 **Deploy from a branch**。
3. Branch 选择 **main**，目录选择 **/(root)**，点击 **Save**。
4. 等待 GitHub 的 Pages 部署完成，从 Pages 设置页打开实际网站链接。只有部署成功后，链接才可访问。

后续直接更新 `main` 分支里的文件即可触发部署。本站全部使用相对资源路径，兼容 GitHub Pages 的项目子路径。

官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 文件

| 文件 | 用途 |
| --- | --- |
| `index.html` | 中文产品页及可访问性结构 |
| `styles.css` | 深松绿色与奶油白的响应式布局 |
| `app.js` | 相机交互、素材加载、参考弹窗和拍后视图 |
| `demo-model.js` | 纯几何取景与示例建议逻辑 |
| `assets/pose-data.js` | v0.3.0 的动作说明及人物轮廓 |
| `assets/poses/` | 拍搭开发包中的 12 张动画人物参考 |
| `assets/scenes/` | 三个原创矢量示例背景 |
| `.nojekyll` | 让 GitHub Pages 直接分发静态文件 |
| `tests/demo-model.test.cjs` | 取景与裁剪边界检查 |

## 检查

本机已安装 Node.js 时执行：

```sh
npm run check
npm test
```

无需执行 `npm install`。本次交付完成了 JavaScript 语法、引用资源、HTML 结构和几何逻辑检查；开发环境未提供所需的浏览器测试能力，因此尚未完成实际浏览器点击与视觉验收。

站点不包含账号凭据、APK 签名密钥、Android 源码或收费服务配置。未添加虚假下载入口或未经验证的产品指标。



## v0.4 手机摄影知识与现场拍法
- 15 个来源入口（6 视频、3 书籍、6 指南），20 条原创转译规则，24 个可组合动作种子。
- phone-coach 按场景、光线、意图、构图和已确认道具生成 3 个不同动作族，记住最近 9 个动作；静态网页不冒充真实 AI。
- Android 服务端和客户端已改为开放动作协议，动画图库仅为手选示例。真实云端需要视觉模型与密钥，本次不含密钥。
- 文献条目 scope 字段说明实际阅读范围，未完整观看/阅读的内容不作为全文研读证据。
- npm test 与 npm run check 检查规则和原有相机演示；移动端及桌面需浏览器验收。
