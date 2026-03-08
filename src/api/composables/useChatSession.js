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

export function useChatSession() {
  const sessionList = ref([])
  const currentSessionId = ref('')
  const loading = ref(false)

  const loadSessionList = async () => {
    loading.value = true
    try {
      const res = await getSessionHistory()
      if (res && res.code === 200) {
        sessionList.value = res.data || []
        const sessionIds = sessionList.value.map(s => s.sessionId)
        if (sessionIds.length > 0) {
          const results = await batchGetSessionTypes(sessionIds)
          results.forEach(({ sessionId, data }) => {
            if (data && data.sessionType !== undefined) {
              setSessionType(sessionId, data.sessionType)
              const sessionItem = sessionList.value.find(s => s.sessionId === sessionId)
              if (sessionItem) {
                sessionItem.sessionType = data.sessionType
              }
            }
          })
        }

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

  const handleCreateSession = async (type = 0) => {
    try {
      const res = await createSession(type)
      if (res && res.code === 200) {
        const newSession = res.data
        if (newSession.sessionType !== undefined) {
          setSessionType(newSession.sessionId, newSession.sessionType)
        }
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

  const fetchSessionDetail = async (sessionId, retryCount = 0) => {
    const MAX_RETRIES = 2

    if (!sessionId) {
      console.warn('会话ID为空，跳过获取详情')
      return []
    }

    try {
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

      if (sessionRes && sessionRes.code === 200 && sessionRes.data) {
        const latestSession = sessionRes.data
        const targetSession = sessionList.value.find(s => s.sessionId === sessionId)

        if (latestSession.sessionType !== undefined) {
          setSessionType(sessionId, latestSession.sessionType)
        }

        if (targetSession) {
          if (targetSession.title !== latestSession.title) {
            targetSession.title = latestSession.title
          }
          if (latestSession.sessionType !== undefined) {
            targetSession.sessionType = latestSession.sessionType
          }
        }
      }

      if (msgRes && msgRes.code === 200) {
        const messages = msgRes.data || []

        const ReActStepType = {
          TASK_PLAN: 0,
          STRATEGY_THINK: 1,
          ACTION_RESULT: 2,
          FINAL_SUMMARY: 3
        }

        const STEP_STYLE_CONFIG = {
          [ReActStepType.TASK_PLAN]: { title: '规划子任务', icon: 'List', type: 'plan' },
          [ReActStepType.STRATEGY_THINK]: { title: '思考策略', icon: 'Opportunity', type: 'thinking' },
          [ReActStepType.ACTION_RESULT]: { title: '执行行动', icon: 'VideoPlay', type: 'action' },
          [ReActStepType.FINAL_SUMMARY]: { title: '最终总结', icon: 'View', type: 'final' }
        }

        return messages.map(msg => {
          const baseMsg = {
            role: (msg.type === 1 || msg.role === 'user') ? 'user' : 'server',
            content: msg.content
          }

          const hasSteps = msg.steps && Array.isArray(msg.steps) && msg.steps.length > 0

          if (hasSteps) {
            const { steps, stepCount } = msg

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
              stepCount: stepCount || 0,
              mode: 'task'
            }
          }

          return {
            ...baseMsg,
            mode: 'chat'
          }
        })
      }

      return []
    } catch (error) {
      console.error('Failed to load detail:', error)

      if (retryCount < MAX_RETRIES && (error.message?.includes('Network') || error.message?.includes('timeout'))) {
        console.log(`重试获取会话详情 (${retryCount + 1}/${MAX_RETRIES})...`)
        const delay = 1000 * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchSessionDetail(sessionId, retryCount + 1)
      }

      return []
    }
  }

  const handleRenameSession = async (sessionId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return
    try {
      await updateSessionTitle(sessionId, newTitle)
      const session = sessionList.value.find(s => s.sessionId === sessionId)
      if (session) {
        session.title = newTitle
      }
    } catch (error) {
      ElMessage.error('重命名失败')
    }
  }

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId)
      sessionList.value = sessionList.value.filter(s => s.sessionId !== sessionId)
      deleteSessionType(sessionId)
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
