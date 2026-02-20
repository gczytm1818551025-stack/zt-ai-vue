import request from '@/utils/request'

/**
 * 创建新会话
 * 对应后端: POST /public/session
 * @returns {Promise}
 */
export function createSession() {
  return request({
    url: '/public/session',
    method: 'post'
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
