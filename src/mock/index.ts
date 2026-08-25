import type { LlmCallPoint } from '@/types'
import { candidateMappingsMock } from './candidateMappings'
import { lessonPlanMock } from './lessonPlan'
import { caseRewriteMock } from './caseRewrite'
import { gapSuggestionsMock } from './gapSuggestions'

/** 四个 LLM 调用点各有一份预置返回；演示模式与真实模式共用同一套渲染组件 */
export const MOCKS: Record<LlmCallPoint, string> = {
  candidateMappings: candidateMappingsMock,
  lessonPlan: lessonPlanMock,
  caseRewrite: caseRewriteMock,
  gapSuggestions: gapSuggestionsMock,
}

export { typewrite, sleep, CHAR_INTERVAL_MS, FIRST_TOKEN_DELAY_MS } from './typewriter'
