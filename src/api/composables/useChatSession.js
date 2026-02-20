import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createSession,
  getSessionHistory,
  getSessionDetail,
  getCurrentSession, // 新增接口
  updateSessionTitle,
  deleteSession
} from '../chat.js'

/**
 * 封装会话管理逻辑
 * 包含会话的创建、查询、更新、删除及当前选中状态管理
 */
export function useChatSession() {
  // 会话列表数据
  const sessionList = ref([])
  // 当前选中的会话 ID
  const currentSessionId = ref('')
  // 加载状态
  const loading = ref(false)

  /**
   * 加载会话列表
   * 对应后端: GET /public/session/history
   */
  const loadSessionList = async () => {
    loading.value = true
    try {
      const res = await getSessionHistory()
      if (res && res.code === 200) {
        sessionList.value = res.data || []
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新会话
   * 对应后端: POST /public/session
   */
  const handleCreateSession = async () => {
    try {
      const res = await createSession()
      if (res && res.code === 200) {
        const newSession = res.data
        // 将新会话添加到列表头部
        // 后端返回 SessionVo，确保包含 sessionId, title 等字段
        const sessionItem = {
          sessionId: newSession.sessionId,
          title: newSession.title || '新对话',
          updateTime: new Date().toISOString()
        }
        sessionList.value.unshift(sessionItem)
        return newSession
      }
    } catch (error) {
      ElMessage.error('创建会话失败')
      return null
    }
  }

  /**
   * 获取会话详情（消息记录），并同步更新会话元数据（如标题）
   * 对应后端: GET /public/session/{sessionId} 和 /public/session/current/{sessionId}
   * @param {string} sessionId
   */
  const fetchSessionDetail = async (sessionId, retryCount = 0) => {
    const MAX_RETRIES = 2
    
    // 检查会话ID是否有效
    if (!sessionId) {
      console.warn('会话ID为空，跳过获取详情')
      return []
    }
    
    try {
      // 并行调用，但对每个请求单独捕获错误，防止一个失败导致整体失败
      const [msgRes, sessionRes] = await Promise.all([
        getSessionDetail(sessionId).catch(e => {
          console.warn('获取消息详情失败:', e)
          return null
        }),
        getCurrentSession(sessionId).catch(e => {
          console.warn('获取会话信息失败:', e)
          return null
        })
      ])
      
      // 1. 如果获取到了最新的会话信息，更新本地列表中的标题
      if (sessionRes && sessionRes.code === 200 && sessionRes.data) {
        const latestSession = sessionRes.data
        const targetSession = sessionList.value.find(s => s.sessionId === sessionId)
        if (targetSession) {
          // 如果标题有变化，更新本地标题
          if (targetSession.title !== latestSession.title) {
            targetSession.title = latestSession.title
          }
        }
      }

      // 2. 处理消息记录
      if (msgRes && msgRes.code === 200) {
        const messages = msgRes.data || []
        // 转换后端 MessageVo 为前端通用格式
        // 后端 type: 1 (User), 2 (Assistant)
        return messages.map(msg => ({
          role: (msg.type === 1 || msg.role === 'user') ? 'user' : 'server',
          content: msg.content
        }))
      }
      
      // 如果消息为空或不存在，返回空数组
      return []
    } catch (error) {
      console.error('Failed to load detail:', error)
      
      // 如果是网络错误或连接错误，且未达到最大重试次数，则重试
      if (retryCount < MAX_RETRIES && (error.message?.includes('Network') || error.message?.includes('timeout'))) {
        console.log(`重试获取会话详情 (${retryCount + 1}/${MAX_RETRIES})...`)
        // 指数退避：1秒、2秒
        const delay = 1000 * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchSessionDetail(sessionId, retryCount + 1)
      }
      
      // 其他错误情况也返回空数组，避免影响用户体验
      return []
    }
  }

  /**
   * 重命名会话
   * 对应后端: PUT /public/session/history
   * @param {string} sessionId
   * @param {string} newTitle
   */
  const handleRenameSession = async (sessionId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return
    try {
      await updateSessionTitle(sessionId, newTitle)
      // 乐观更新本地列表数据
      const session = sessionList.value.find(s => s.sessionId === sessionId)
      if (session) {
        session.title = newTitle
      }
      // ElMessage.success('重命名成功')
    } catch (error) {
      ElMessage.error('重命名失败')
    }
  }

  /**
   * 删除会话
   * 对应后端: DELETE /public/session/history
   * @param {string} sessionId
   */
  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId)
      sessionList.value = sessionList.value.filter(s => s.sessionId !== sessionId)
      
      // 如果删除的是当前选中会话，调用者需要在外部处理选中状态的变更
      // 这里仅返回 true 表示成功
      // ElMessage.success('删除成功')
      return true
    } catch (error) {
      ElMessage.error('删除失败')
      return false
    }
  }

  return {
    sessionList,
    currentSessionId,
    loading,
    loadSessionList,
    handleCreateSession,
    fetchSessionDetail,
    handleRenameSession,
    handleDeleteSession
  }
}
