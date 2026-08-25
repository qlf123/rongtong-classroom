/**
 * ① 生成候选映射 —— 演示模式预置返回（JSON 字符串，与真实 API 的 content 同构）
 * 这些 kpId/ciId 组合在种子数据中均不存在，生成后会进入「待审」队列；
 * 最后一条与已确认的缺口映射重复，用于演示去重（界面提示"已存在 · 跳过"）。
 */
export const candidateMappingsMock = JSON.stringify(
  {
    mappings: [
      {
        kpId: 'KP-04-01',
        ciId: 'CI-G-004',
        type: '支撑映射',
        confidence: 0.91,
        evidence:
          '分段讲解法提供讲解点选取与停留时长控制，虚实结合讲解在现场须依托分段结构落位，构成方法层面的先修支撑。',
      },
      {
        kpId: 'KP-04-04',
        ciId: 'CI-G-004',
        type: '场景映射',
        confidence: 0.78,
        evidence:
          '实景被遮挡时常以悬念设置替代视觉锚点维持注意力，是该能力项在带团现场的常见配合手法。',
      },
      {
        kpId: 'KP-02-06',
        ciId: 'CI-G-010',
        type: '场景映射',
        confidence: 0.86,
        evidence:
          '参观游览服务组织中的入园清点与自由活动管理，是走失事件预防动作的实际发生场景。',
      },
      {
        kpId: 'KP-05-02',
        ciId: 'CI-G-011',
        type: '支撑映射',
        confidence: 0.89,
        evidence:
          '突发疾病的初步判断依据、人群分流与送医决策分界，逐项对应该能力项的岗位处置动作。',
      },
      {
        kpId: 'KP-01-03',
        ciId: 'CI-G-006',
        type: '支撑映射',
        confidence: 0.74,
        evidence:
          '服务质量标准中的语言与仪态条款给出可核查的评价维度，为现场讲解表达提供判断依据。',
      },
      {
        kpId: '',
        ciId: 'CI-G-017',
        type: '缺口映射',
        confidence: 0.92,
        evidence:
          '该能力项仅由「岗」「证」覆盖，在给定知识点集合中找不到任何可构成教学支撑的知识点，判定为课程未覆盖。',
      },
    ],
  },
  null,
  2,
)
