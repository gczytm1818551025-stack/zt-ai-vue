// 会话类型缓存
// key: sessionId, value: SessionTypeEnum (0: CHAT, 1: AGENT)
const sessionTypeCache = new Map()

export const SessionTypeEnum = {
  CHAT: 0,
  AGENT: 1
}

/**
 * 获取会话类型（从缓存）
 */
export function getSessionType(sessionId) {
  return sessionTypeCache.get(sessionId)
}

/**
 * 设置会话类型
 */
export function setSessionType(sessionId, type) {
  sessionTypeCache.set(sessionId, type)
}

/**
 * 删除会话类型
 */
export function deleteSessionType(sessionId) {
  sessionTypeCache.delete(sessionId)
}

/**
 * 清空所有缓存
 */
export function clearSessionTypeCache() {
  sessionTypeCache.clear()
}

/**
 * 根据 type 获取显示文本
 */
export function getSessionTypeLabel(type) {
  return type === SessionTypeEnum.AGENT ? 'Agent' : 'Chat'
}
