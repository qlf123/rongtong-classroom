# 融通课堂 · 岗课赛证融通 AI 教学平台

> 「融通」取自职业教育「岗课赛证融通」——岗位标准、课程标准、赛项标准、证书标准这四套长期各说各话的体系，
> 在这个平台里被统一到同一个能力坐标系上。产品做的就是「融通」这个动作本身。

面向 **旅游管理 / 导游（高职）** 专业的教师端教学中枢。试点课程《导游业务》（64 学时），
目标岗位「地陪导游员（初级）」。

## 产品的四条核心判断（界面上都能看见）

1. **产教脱节的本质是缺翻译机制。** 核心资产不是两侧的图谱，而是中间那层经过校验的映射关系。
2. **能力图谱是「岗课赛证」四维的**，不只是「岗」。每个能力项都显示它被哪几维覆盖，四维全覆盖的节点带金色外环。
3. **教师是成败关键。** 第一价值主张是帮教师减负，V1.0 主动不做学生端。
4. **AI 只出候选和初稿，人做终审。** 所有生成内容带溯源角标，可悬停查看出处；无来源的内容不出现在界面上。

此外：公司已有的 40 余款实训软件按知识点与能力项「挂载」上来，形成可诊断、可推荐、可评价的教学中枢
——看板里的「实训资源覆盖热力矩阵」直接算出两笔账：哪些能力项没有软件支撑（产品线机会）、
哪款软件没被任何能力项挂载（教学定位需重新梳理）。

## 快速开始

```bash
pnpm i && pnpm demo
```

`pnpm demo` 会同时启动前端（http://localhost:5180）与 LLM 代理（http://localhost:8787）。

**默认就是演示模式，断网可用。** 不配置任何密钥也能把五个页面完整走通。

| 命令 | 作用 |
| --- | --- |
| `pnpm demo` | 现场演示用：同时起前端 + 代理 |
| `pnpm dev` | 只起前端（演示模式完全可用；真实 API 模式需要代理） |
| `pnpm proxy` | 只起 LLM 代理 |
| `pnpm build` | 类型检查 + 生产构建 |

## 演示模式 / 真实 API 双模开关

右上角的开关，**默认演示模式**。

- **演示模式**：四个 AI 调用点都走 `src/mock/*.ts` 的预置内容，600ms 首字延迟 + 每 12ms 一个字符的打字机效果，
  观感与真实流式调用一致。断网、密钥失效、API 超时都不影响演示。
- **真实 API**：调用真实大模型。**失败或超过 15 秒会自动降级回演示模式**，右上角出现一行小提示，
  不弹窗、不报错、不阻断。

两条链路走同一套渲染组件，切换后 UI 表现完全一致。

## 如何配置 Key

密钥永远不写进源码。两种方式：

**方式一（推荐）：写进 `.env.local`，由代理注入，浏览器端不持有密钥**

```bash
cp .env.example .env.local
```

```dotenv
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxxxxxxx
PROXY_PORT=8787
```

然后 `pnpm demo`，把右上角开关切到「真实 API」即可。

> 开关不会在浏览器端校验密钥——密钥的推荐存放位置就是代理服务端，浏览器本就读不到。
> 若三处（代理 `.env.local` / 界面抽屉 / 环境变量）都没有密钥，切到真实 API 后首次调用会拿到上游 401，
> 然后**自动降级为演示模式**并在顶栏显示一行小提示，不阻断演示。

**方式二：界面临时覆盖**

右上角「AI 配置」抽屉里填写 Base URL / Model / API Key，存到本机 localStorage，
仅本机可见。适合现场临时换一个可用的密钥。

## 如何切换模型

接口统一走 **OpenAI Chat Completions 兼容格式**，DeepSeek / 通义千问 / 智谱 GLM / Kimi 均可直接接入。
改 `.env.local` 的 `LLM_BASE_URL` + `VITE_LLM_MODEL`，或在「AI 配置」抽屉里改：

| 厂商 | Base URL | 常用 model |
| --- | --- | --- |
| DeepSeek（默认） | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-plus` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

封装在 `src/lib/llm.ts` 的 `chat(messages, { stream, jsonMode, callPoint })`。
四个调用点的 Prompt 集中在 `src/lib/prompts.ts`，`temperature=0.3`，结构化输出强制 `response_format: {type:"json_object"}`。

## 如何改种子数据

所有假数据在 `src/data/*.json`，与组件完全分离，现场可直接改、热更新生效。

| 文件 | 内容 | 现有规模 |
| --- | --- | --- |
| `resources.json` | 实训资源（公司自有软件产品） | 12 款 |
| `knowledgePoints.json` | 知识点（含先修 / 包含 / 易混、资源挂载） | 29 个，覆盖 5 章 |
| `competencyItems.json` | 能力项（`standardRefs` 即岗课赛证四维条款） | 18 个 |
| `mappings.json` | 映射关系（产品核心资产） | 33 条 |
| `cases.json` | 企业案例（已脱敏） | 7 条 / 3 家企业 |
| `dashboard.json` | 看板指标 | — |
| `speakerNotes.json` | 讲解模式侧栏文案（Ctrl+D） | 5 页 |

改数据时的几条约束（界面逻辑依赖它们）：

- 能力项的四维覆盖由 `standardRefs[].dim` 决定；**覆盖满 4 维**的节点自动加金色外环。
- **缺口映射**写作 `kpId: ""`、`type: "缺口映射"`，画布上会归到左列底部的「课程未覆盖」节点，红色虚线。
- 映射状态分级：`≥0.85` 专家快审、`0.6–0.85` 双人确认、`<0.6` 自动转专家标注（`src/store/graphStore.ts`）。
- 热力矩阵的两条结论由 `competencyItems.json` 的 `linkedResources` 实时算出，不是写死的数字。

## 页面

| 页面 | 看点 |
| --- | --- |
| **双图谱映射** | 左蓝右橙固定分列；能力项节点带岗课赛证四色标签条；缺口为红色虚线；左下角「按四维筛选」切到「赛」即备赛场景入口 |
| **映射审核台** | 分级处理规则横幅、置信度分档配色、驳回沉淀负样本、只读 P/R/F1 评测卡 |
| **AI 备课助手** | Step 1 纯查图谱（四维条款号 + 可调用实训软件）；Step 2 七段式教案流式生成，溯源角标可悬停；右下角真实计时 |
| **岗位案例库** | 企业案例 → 教学案例改写，考核点与能力项 id 一一对应 |
| **教学效果看板** | 教师侧指标优先；岗课赛证四维覆盖度；实训资源覆盖热力矩阵；负向指标监控 |

## 现场演示保障

- `pnpm demo` 一条命令起全部服务。
- 演示模式为默认；检测不到密钥时静默运行，不弹任何错误。
- 「AI 配置」抽屉里有 **重置演示数据** 按钮，把审核状态、采纳记录、生成的候选映射恢复初始，方便讲第二遍。
- **`Ctrl+D`** 打开隐藏的讲解模式侧栏，按当前页面渲染讲解要点（`src/data/speakerNotes.json`）。
- 所有 AI 请求都有骨架屏与 loading 态，不会白屏或按钮无反馈。

## 技术栈

React 18 + TypeScript + Vite ｜ TailwindCSS 3 + shadcn/ui(Radix) ｜ Cytoscape.js（`preset` 手工分列，不用力导向）
｜ zustand ｜ lucide-react ｜ react-markdown + remark-gfm ｜ Express 代理 ｜ pnpm

仅适配 1440×900 桌面分辨率，不做移动端。
