import request from '@/utils/request'

/**
 * 创建新会话
 * 对应后端: POST /public/session
 * @param {number} type - 会话类型（可选）：0=Chat，1=Agent
 * @returns {Promise}
 */
export function createSession(type = 0) {
  return request({
    url: '/public/session',
    method: 'post',
    data: { type }  // SessionCreateDto 需要 type 字段
  })
}

/**
 * 获取会话历史列表
 * 对应后端: GET /public/session/history
 * @returns {Promise}
 */
export function getSessionHistory() {
  return request({
    url: '/public/session/history',
    method: 'get'
  })
}

/**
 * 获取单个会话详情（历史消息）
 * 对应后端: GET /public/session/{sessionId}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise}
 */
export function getSessionDetail(sessionId) {
  return request({
    url: `/public/session/${sessionId}`,
    method: 'get'
  })
}

/**
 * 获取当前会话元数据（标题等）
 * 对应后端: GET /public/session/current/{sessionId}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise}
 */
export function getCurrentSession(sessionId) {
  return request({
    url: `/public/session/current/${sessionId}`,
    method: 'get'
  })
}

/**
 * 更新会话标题
 * 对应后端: PUT /public/session/history
 * @param {string} sessionId - 会话 ID
 * @param {string} title - 新标题
 * @returns {Promise}
 */
export function updateSessionTitle(sessionId, title) {
  return request({
    url: '/public/session/history',
    method: 'put',
    params: { sessionId, title }
  })
}

/**
 * 删除会话
 * 对应后端: DELETE /public/session/history
 * @param {string} sessionId - 会话 ID
 * @returns {Promise}
 */
export function deleteSession(sessionId) {
  return request({
    url: '/public/session/history',
    method: 'delete',
    params: { sessionId }
  })
}

/**
 * 停止对话生成
 * 对应后端: POST /public/agent/stop
 * @param {string} sessionId - 会话 ID
 * @returns {Promise}
 */
export function stopChat(sessionId) {
  return request({
    url: '/public/agent/stop',
    method: 'post',
    params: { sessionId }
  })
}

/**
 * 停止 ReAct 模式对话生成
 * 对应后端: POST /public/agent/react/stop
 * @param {string} sessionId - 会话 ID
 * @returns {Promise}
 */
export function stopReActChat(sessionId) {
  return request({
    url: '/public/agent/react/stop',
    method: 'post',
    params: { sessionId }
  })
}

/**
 * 发送对话 (非流式接口定义，实际 SSE 使用 fetch)
 * 对应后端: POST /public/agent/chat
 * @param {Object} data - ChatDto
 * @param {string} data.sessionId - 会话 ID
 * @param {string} data.question - 问题内容
 * @returns {Promise}
 */
export function sendChat(data) {
  return request({
    url: '/public/agent/chat',
    method: 'post',
    data
  })
}

/**
 * 批量获取会话元数据（用于获取历史会话的类型）
 * 注意：后端暂无批量接口，前端需要逐个查询
 * @param {Array<string>} sessionIds - 会话ID数组
 * @returns {Promise<Array<{sessionId: string, data: SessionVo}>>}
 */
export function batchGetSessionTypes(sessionIds) {
  const promises = sessionIds.map(sessionId =>
    getCurrentSession(sessionId)
      .then(res => ({ sessionId, data: res?.data }))
      .catch(() => ({ sessionId, data: null }))
  )
  return Promise.all(promises)
}

/**
 * 查询会话是否正在进行（ReAct 模式）
 * 对应后端: GET /public/agent/status/{sessionId}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<{isActive: boolean, activeSubscribers: number}>}
 */
export function getReActStatus(sessionId) {
  return request({
    url: `/public/agent/status/${sessionId}`,
    method: 'get'
  })
}
