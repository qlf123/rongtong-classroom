import type { ChatMessage, CompetencyItem, EnterpriseCase, KnowledgePoint } from '@/types'
import { cases, competencies, kpById, knowledgePoints, resources } from '@/lib/data'

const j = (v: unknown) => JSON.stringify(v, null, 2)

/* ── ① 生成候选映射（JSON） ───────────────────────────────── */

const SYS_CANDIDATES = `你是职业教育课程与岗位能力对齐领域的专家，熟悉文旅类专业的"岗课赛证"融通要求。你的任务是：判断给定的课程知识点，与给定的岗位能力项之间是否存在映射关系。

映射类型定义：
- 支撑映射：该知识点是掌握该能力项的必要理论/方法基础
- 场景映射：该知识点在该能力项对应的岗位任务中有直接应用场景
- 缺口映射：该能力项在给定知识点集合中找不到任何支撑（用于提示课程未覆盖）

严格约束：
1. 只能基于我提供的知识点列表和能力项列表判断，不得引入外部知识点或能力项。
2. 宁缺毋滥。语义相近但不构成教学支撑关系的，不要输出。
3. 每条映射必须给出 confidence（0-1）和一句话依据 evidence，依据必须指向具体的教学行为或带团岗位动作，不得是空泛表述。
4. 判断时要考虑能力项的四维标准来源（岗/课/赛/证）：若某能力项仅由"岗"和"证"覆盖而无"课"覆盖，应优先判断为缺口映射。
5. 输出严格的 JSON，不要任何解释文字。

输出格式：
{"mappings":[{"kpId":"","ciId":"","type":"支撑映射|场景映射|缺口映射","confidence":0.0,"evidence":""}]}`

export function buildCandidatePrompt(existing: { kpId: string; ciId: string }[]): ChatMessage[] {
  const mapped = new Set(existing.map((e) => e.kpId))
  const unmapped = knowledgePoints.filter((k) => !mapped.has(k.id))
  return [
    { role: 'system', content: SYS_CANDIDATES },
    {
      role: 'user',
      content: `专业：旅游管理/导游（高职）  课程：《导游业务》  岗位：地陪导游员（初级）
能力标准依据：全国导游资格考试大纲 / 世界职业院校技能大赛导游服务赛项规程 / 旅行社地陪岗位说明书

知识点列表：${j(
        (unmapped.length ? unmapped : knowledgePoints).map((k) => ({
          id: k.id,
          name: k.name,
          desc: k.desc,
          chapter: k.chapter,
        })),
      )}
能力项列表：${j(
        competencies.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          standardRefs: c.standardRefs,
          workTasks: c.workTasks,
        })),
      )}
已存在的映射（不要重复输出）：${j(existing)}`,
    },
  ]
}

/* ── ② 生成岗位化教案（流式 Markdown） ────────────────────── */

const SYS_LESSON = `你是一名同时具备高职旅游专业教学经验与旅行社带团一线经验的教研专家，熟悉全国导游资格考试与技能大赛导游服务赛项标准。你为高职教师生成"岗位化教案"。

核心要求：
1. 【严格限定内容源】你只能使用我在【已审核内容】中提供的教材内容、企业案例、能力标准、实训资源。不得引入任何我未提供的知识、案例、数据、景区名称或企业名称。若某部分缺少素材，直接写"【待补充：需教研提供XX素材】"，不要编造。
2. 【全文可溯源】每一处引用了【已审核内容】的地方，必须在该句末尾插入标记 [[src:ID]]，ID 使用我提供的素材 id（如 KP-04-03 / CASE-004 / CI-G-004 / RES-001）。全文标记数量不少于 8 处。
3. 【岗课赛证四维贯通】讲解要点要回应"课"，岗位应用要回应"岗"，评分量规要对齐"赛"的评分表条款，并注明该内容对应"证"的哪一考纲要点。
4. 【实训任务必须落到具体软件】分层实训任务的每一档，都要指明使用我提供的哪一套实训资源完成，并写清交付物与验收标准。
5. 【面向教师可直接使用】不写空话。评分量规必须是表格，每个维度对应一个能力项 id 和一条大赛评分表条款。
6. 【不做的事】不生成正式考试成绩判定标准；涉及景区讲解内容时不做历史、民族、宗教方面的引申发挥。

输出为 Markdown，严格按以下七段结构，不要增删章节：
## 一、岗位情境导入（3分钟）
## 二、知识点讲解要点
## 三、岗位应用说明
## 四、企业真实案例
## 五、分层实训任务（基础/进阶/挑战）
## 六、评分量规
## 七、常见错误提醒`

export function buildLessonPrompt(opts: {
  chapter: string
  hours: number
  kps: KnowledgePoint[]
  cis: CompetencyItem[]
  relatedCases: EnterpriseCase[]
  resourceIds: string[]
}): ChatMessage[] {
  const res = resources.filter((r) => opts.resourceIds.includes(r.id))
  return [
    { role: 'system', content: SYS_LESSON },
    {
      role: 'user',
      content: `课程：《导游业务》 章节：${opts.chapter} 课时：${opts.hours}
目标岗位：地陪导游员（初级）

【已审核内容 · 知识点】${j(opts.kps)}
【已审核内容 · 关联能力项（含岗课赛证四维标准条款、岗位任务、常见错误）】${j(opts.cis)}
【已审核内容 · 可用企业案例（已脱敏）】${j(opts.relatedCases)}
【已审核内容 · 可调用实训资源】${j(res)}`,
    },
  ]
}

/* ── ③ 企业案例 → 教学案例改写（流式 Markdown） ───────────── */

const SYS_CASE = `你是文旅职业教育教研专家。把旅行社/景区提交的真实业务案例，改写成可直接在课堂使用的教学案例。

要求：
1. 只使用我提供的案例内容，不得补充案例中没有的细节、数据或业务背景。
2. 全程保持脱敏：不得出现真实人名与真实游客信息；企业名称使用我提供的写法。
3. 必须把"企业语言"翻译成"教学语言"——企业写的是处置结果，你要还原成学生可操作的任务过程与决策点。
4. 结构固定：## 案例背景 / ## 学生任务 / ## 参考解法思路 / ## 考核点 / ## 对应能力项
5. "考核点"必须与我提供的能力项 id 一一对应，并标注其岗课赛证四维标准条款。
6. 涉及安全事故、投诉处置类案例，参考解法必须符合我提供的行业规范，不得给出规范之外的处置建议。`

export function buildCasePrompt(c: EnterpriseCase): ChatMessage[] {
  const cis = competencies.filter((x) => c.ciIds.includes(x.id))
  const kps = c.kpIds.map((id) => kpById.get(id)).filter(Boolean)
  return [
    { role: 'system', content: SYS_CASE },
    {
      role: 'user',
      content: `【企业原始案例】${j(c)}
【关联能力项】${j(cis)}
【关联知识点】${j(kps)}`,
    },
  ]
}

/* ── ④ 缺口能力项的补充教学建议（JSON） ───────────────────── */

const SYS_GAP = `你是高职旅游专业建设顾问。针对一个"现有课程未覆盖"的岗位能力项，给出最小成本的补齐建议。

要求：
1. 建议必须是可执行的教学动作，不是原则性表述。
2. 给出三种颗粒度的方案：嵌入现有课程（哪门课哪一章）/ 新增实训模块（几课时）/ 校企共建（需要企业或产业学院提供什么）。
3. 优先复用我提供的【已有实训资源】，明确指出用哪一套软件承载，而不是建议采购新系统。
4. 每个方案标注预估投入课时、所需资源与主要风险。
5. 输出 JSON：{"suggestions":[{"level":"嵌入现有课程|新增实训模块|校企共建","action":"","hours":0,"useResources":[""],"risk":""}]}`

export function buildGapPrompt(ci: CompetencyItem): ChatMessage[] {
  return [
    { role: 'system', content: SYS_GAP },
    {
      role: 'user',
      content: `未覆盖能力项：${j(ci)}
现有课程知识点清单：${j(knowledgePoints.map((k) => ({ id: k.id, name: k.name, chapter: k.chapter })))}
已有实训资源清单：${j(resources)}`,
    },
  ]
}

export { cases }
