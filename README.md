# 拍档 · Render 托管版

该工程提供 Android 安装包下载和需要用户口令的 DeepSeek 代理。普通用户下载安装包即可离线拍照。启用 AI 需要运营者提供模型服务权限。

## 发布

1. 解压后，把包含 `render.yaml` 的目录内容放在单独的 GitHub 仓库根目录。保留 `public/` 里的 APK、`shared/` 中的拍摄知识，以及其余源码；一起提交到 Git。仓库可以设置为私有。
2. 登录 [Render 控制台](https://dashboard.render.com/)，选择 **New → Blueprint**，授权读取该仓库。检查配置为单实例 Free、新加坡区域，然后创建。构建命令会校验 APK、测试下载与鉴权。实例启动且健康检查通过后，到服务页面复制实际的 HTTPS 地址。
3. 手机访问该地址会下载 0.7.1 预览安装包。`/healthz` 返回 200 表示进程正常；`/v1/models` 需要有效口令。

## 开启 AI 指导

在 **Render → 当前服务 → Environment** 中设置以下机密环境变量，然后保存并部署。模型服务使用运营者的余额。

| 环境变量 | 设置 |
| --- | --- |
| `DEEPSEEK_API_KEY` | 从自己的 DeepSeek 开放平台账号创建的 API 密钥。 |
| `PAIDA_TOKEN_HASHES` | 每位用户领取独立的随机激活码（32 字节随机数的 64 位小写十六进制文本）。对该 UTF-8 文本计算 SHA-256，不含换行，将 64 位小写十六进制摘要填在这里。多个摘要用英文逗号分隔。删除某人的摘要可以在重新部署后撤销其权限。 |
| `PAIDA_TOKENS` | 兼容旧版明文口令列表。若采用上面的摘要配置，可留空。 |
| `PAIDA_DAILY_LIMIT` | 每个进程每日可发起的模型调用上限，默认 100。 |

0.7.1 预览版在 **拍摄设置 → AI 连接** 填入服务的 HTTPS 根地址和自己领到的口令。「找姿势 → AI 看现场」在确认后发送本次图片。撤销某位用户权限时，删除对应口令并重新部署。请将模型密钥仅存放在 Render 的环境变量中。

配额按 UTC 日计算，每五分钟最多接受 30 个分析请求，最多两项并发。单进程的计数会在服务重启或休眠后清零，账户预算可在模型供应商一侧控制。Render Free 适合首轮试用，空闲 15 分钟后会休眠，再次启动约需一分钟；唤醒后可重新连接。正式运行可在确认预算后选常驻实例。[Render 免费实例](https://render.com/docs/free) · [DeepSeek 计费](https://api-docs.deepseek.com/quick_start/pricing/)

## 更换安装包

把新的已签名正式版或预览 APK 放进 `public/`，同步更新 `artifact.json` 的文件名和 SHA-256（64 位小写十六进制），提交并重新部署。当前包与 0.7.0 预览版具有相同包名和签名。面向正式用户的分发请换为运营者长期发布密钥签署的正式版本。

## 本机测试

使用 Node.js 24，在本目录运行 `npm test`。测试只使用本机 HTTP 流量，不会请求真实模型。可用 `npm start` 启动下载服务；监听端口取自 `PORT`，默认 10000。Render 托管 HTTPS。[Render Web Service](https://render.com/docs/web-services) · [Render Blueprint](https://render.com/docs/blueprint-spec)
