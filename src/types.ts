/**
 * 融通课堂 · 数据模型
 * 「岗课赛证融通」的核心资产是中间那层经过校验的映射关系（Mapping），
 * 而不是两侧的图谱本身 —— 类型定义按这个判断组织。
 */

/** 岗课赛证 四维标准维度 */
export type StandardDim = '岗' | '课' | '赛' | '证'

/** 实训资源 —— 挂载的是公司已有的实训软件产品 */
export interface TrainingResource {
  id: string
  name: string
  kind: '虚拟仿真' | 'AI工具' | '实训系统' | '教学平台' | '大数据平台'
  vendorOwned: true
}

/** 知识点（来源：教材、课程大纲、专业教学标准）—— 学科知识体系一侧 */
export interface KnowledgePoint {
  id: string
  name: string
  chapter: string
  /** 颗粒度层级，3 级 = 可被单独考核的最小教学单元 */
  level: 1 | 2 | 3
  hours: number
  desc: string
  prereq: string[]
  contains: string[]
  confusable: string[]
  resources: {
    type: '教材' | '课件' | '微课' | '习题' | '实训软件'
    title: string
    ref: string
    resourceId?: string
  }[]
}

/** 能力项 —— 岗位能力体系一侧；standardRefs 的四维覆盖是本产品的差异化核心 */
export interface CompetencyItem {
  id: string
  name: string
  kind: '知识型' | '技能型' | '素养型'
  level: '初级' | '中级' | '高级'
  post: string
  /** 四维覆盖，界面用四色标签条显示；覆盖满四维 = 专业建设核心能力 */
  standardRefs: { dim: StandardDim; ref: string }[]
  workTasks: string[]
  commonErrors: string[]
  /** 挂载的实训软件 id */
  linkedResources: string[]
}

export type MappingType = '支撑映射' | '缺口映射' | '场景映射'
export type MappingStatus = '待审' | '已确认' | '已驳回' | '转专家标注' | '复审中'

/** 映射关系 —— 产品核心资产：两套语言之间经过校验的翻译 */
export interface Mapping {
  id: string
  kpId: string
  ciId: string
  type: MappingType
  /** 0-1，界面上线宽 = 置信度 */
  confidence: number
  status: MappingStatus
  source: 'AI候选' | '专家标注'
  evidence: string
  reviewer?: string
  reviewedAt?: string
  rejectReason?: string
  teacherAdoptRate?: number
}

/** 企业案例（合作旅行社/景区提交 → 教研审核入库 → 方可被 AI 调用） */
export interface EnterpriseCase {
  id: string
  title: string
  company: string
  post: string
  kpIds: string[]
  ciIds: string[]
  background: string
  task: string
  solution: string
  desensitized: boolean
  updatedAt: string
}

/* ─────────────── LLM 调用层 ─────────────── */

export type ChatRole = 'system' | 'user' | 'assistant'
export interface ChatMessage {
  role: ChatRole
  content: string
}

/** 四个 LLM 调用点。演示模式下按此 key 取 src/mock 的预置返回 */
export type LlmCallPoint =
  | 'candidateMappings' // ① 生成候选映射（JSON）
  | 'lessonPlan' // ② 生成岗位化教案（流式 Markdown）
  | 'caseRewrite' // ③ 企业案例 → 教学案例改写（流式 Markdown）
  | 'gapSuggestions' // ④ 缺口能力项补充教学建议（JSON）

export interface ChatOptions {
  /** 流式输出；演示模式下用打字机效果模拟 */
  stream?: boolean
  /** 强制 response_format: json_object */
  jsonMode?: boolean
  /** 命中的调用点，决定演示模式取哪一份预置返回 */
  callPoint: LlmCallPoint
  temperature?: number
  onToken?: (chunk: string, full: string) => void
  signal?: AbortSignal
}

export interface ChatResult {
  content: string
  /** 本次实际走的链路：演示预置 / 真实 API / 真实失败后降级 */
  via: 'demo' | 'live' | 'fallback'
}

/* ─────────────── 运行时配置 ─────────────── */

export type RunMode = 'demo' | 'live'

export interface AiConfig {
  baseURL: string
  apiKey: string
  model: string
}

/** ④ 缺口补充教学建议的结构化返回 */
export interface GapSuggestion {
  level: '嵌入现有课程' | '新增实训模块' | '校企共建'
  action: string
  hours: number
  useResources: string[]
  risk: string
}

/** ① 候选映射的结构化返回 */
export interface MappingCandidate {
  kpId: string
  ciId: string
  type: MappingType
  confidence: number
  evidence: string
}
