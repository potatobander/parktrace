# AI 问答服务代码

`app/api/ai/route.ts` 为当前托管服务的接口实现，`db/schema.ts` 为限额数据表结构。请求来源限定为 GitHub Pages 域名，服务端保存 DeepSeek API 密钥。每天总请求上限为 100 次、每个访客每分钟上限为 3 次；额度以 UTC 时间计算。限额可减轻滥用，但无法完全防止他人消耗额度。

实际服务运行于独立的 ChatGPT Sites，配置密钥需要在该服务的环境变量中安全设置 `DEEPSEEK_API_KEY`。本目录仅存储代码，不存储密钥。
