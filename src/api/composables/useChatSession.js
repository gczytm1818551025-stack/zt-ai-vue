import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createSession,
  getSessionHistory,
  getSessionDetail,
  getCurrentSession,
  updateSessionTitle,
  deleteSession,
  batchGetSessionTypes,
  getReActStatus
} from '../chat.js'
import { setSessionType, deleteSessionType } from '@/store/sessionTypeCache'

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
        // 批量获取会话类型并缓存
        const sessionIds = sessionList.value.map(s => s.sessionId)
        if (sessionIds.length > 0) {
          const results = await batchGetSessionTypes(sessionIds)
          results.forEach(({ sessionId, data }) => {
            if (data && data.sessionType !== undefined) {
              setSessionType(sessionId, data.sessionType)
              // 更新列表项的类型字段
              const sessionItem = sessionList.value.find(s => s.sessionId === sessionId)
              if (sessionItem) {
                sessionItem.sessionType = data.sessionType
              }
            }
          })
        }

        // 查询 ReAct 会话状态（是否正在进行）
        const agentSessions = sessionList.value.filter(s => s.sessionType === 'AGENT')
        if (agentSessions.length > 0) {
          const statusPromises = agentSessions.map(async (session) => {
            try {
              const status = await getReActStatus(session.sessionId)
              return { sessionId: session.sessionId, isActive: status.isActive, activeSubscribers: status.activeSubscribers }
            } catch (e) {
              return { sessionId: session.sessionId, isActive: false, activeSubscribers: 0 }
            }
          })

          const statusResults = await Promise.all(statusPromises)
          statusResults.forEach(result => {
            const session = sessionList.value.find(s => s.sessionId === result.sessionId)
            if (session) {
              session.isActive = result.isActive
              session.activeSubscribers = result.activeSubscribers
            }
          })
        }
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
   * @param {number} type - 会话类型：0=Chat（默认），1=Agent
   */
  const handleCreateSession = async (type = 0) => {
    try {
      const res = await createSession(type)
      if (res && res.code === 200) {
        const newSession = res.data
        // 缓存会话类型
        if (newSession.sessionType !== undefined) {
          setSessionType(newSession.sessionId, newSession.sessionType)
        }
        // 将新会话添加到列表头部
        const sessionItem = {
          sessionId: newSession.sessionId,
          title: newSession.title || '新对话',
          updateTime: new Date().toISOString(),
          sessionType: newSession.sessionType
        }
        sessionList.value.unshift(sessionItem)
        return newSession
      }
      ElMessage.success('创建会话成功')
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

        // 缓存会话类型
        if (latestSession.sessionType !== undefined) {
          setSessionType(sessionId, latestSession.sessionType)
        }

        if (targetSession) {
          // 如果标题有变化，更新本地标题
          if (targetSession.title !== latestSession.title) {
            targetSession.title = latestSession.title
          }
          if (latestSession.sessionType !== undefined) {
            targetSession.sessionType = latestSession.sessionType
          }
        }
      }

      // 2. 处理消息记录
      if (msgRes && msgRes.code === 200) {
        const messages = msgRes.data || []

        // ReAct 步骤类型枚举（与后端 ReActStageEnum 对应）
        const ReActStepType = {
          TASK_PLAN: 0,        // 子任务规划内容
          STRATEGY_THINK: 1,   // 策略思考内容
          ACTION_RESULT: 2,     // 行动结果
          FINAL_SUMMARY: 3      // 最终总结
        }

        // 步骤类型映射到样式配置（为了保持向后兼容，也保留旧的键名）
        const STEP_STYLE_CONFIG = {
          [ReActStepType.TASK_PLAN]: { title: '规划子任务', icon: 'List', type: 'plan' },
          [ReActStepType.STRATEGY_THINK]: { title: '思考策略', icon: 'Opportunity', type: 'thinking' },
          [ReActStepType.ACTION_RESULT]: { title: '执行行动', icon: 'VideoPlay', type: 'action' },
          [ReActStepType.FINAL_SUMMARY]: { title: '最终总结', icon: 'View', type: 'final' }
        }

        // 转换后端消息为前端数据结构，支持 ReAct 模式
        return messages.map(msg => {
          const baseMsg = {
            role: (msg.type === 1 || msg.role === 'user') ? 'user' : 'server',
            content: msg.content
          }

          // ========== 优先使用专用字段 steps ==========
          // 检查是否为 ReAct 消息（通过专用 steps 字段判断）
          const hasSteps = msg.steps && Array.isArray(msg.steps) && msg.steps.length > 0

          if (hasSteps) {
            const { steps, stepCount } = msg

            // 将后端的 type code 潬换为前端的类型枚举，并添加样式配置
            const convertedSteps = steps.map((step) => {
              const styleConfig = STEP_STYLE_CONFIG[step.type]
              if (styleConfig) {
                return {
                  type: styleConfig.type,
                  title: styleConfig.title,
                  icon: styleConfig.icon,
                  index: step.index,
                  taskContent: step.taskContent,
                  previousEvaluation: step.previousEvaluation,
                  memory: step.memory,
                  thinking: step.thinking,
                  thinkContent: step.thinkContent,
                  success: step.success,
                  result: step.result,
                  resultType: step.resultType,
                  finalResult: step.finalResult,
                  status: step.success !== undefined ? (step.success ? 'success' : 'error') : 'success'
                }
              }
              return step
            })

            return {
              ...baseMsg,
              steps: convertedSteps,
              stepCount: stepCount || 0
            }
          }

          return baseMsg
        })
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
      // 删除类型缓存
      deleteSessionType(sessionId)
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
