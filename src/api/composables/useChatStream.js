import { ref, nextTick } from 'vue'
import { stopChat } from '@/api/chat'
import { useStore } from 'vuex'
import router from '@/router'
import { fetchEventSource } from '@microsoft/fetch-event-source'

/**
 * 封装 SSE 流式对话逻辑
 * 使用 @microsoft/fetch-event-source 库处理 SSE 连接
 */
export function useChatStream() {
  const store = useStore()

  // 连接状态: disconnected | connecting | connected | error | failed
  const connectionStatus = ref('disconnected')
  // 是否正在生成内容
  const generating = ref(false)

  // 内部控制变量
  let abortController = null
  let onCompleteCallback = null

  /**
   * 开始对话 (建立 SSE 连接)
   * 对应后端:
   * - 普通模式: POST /public/agent/chat (SSE Stream)
   * - ReAct模式: POST /public/agent/task (SSE Stream)
   * @param {string} sessionId 会话ID
   * @param {string} question 用户提问
   * @param {Object} aiMessageRef 响应式 AI 消息对象，用于实时追加内容
   * @param {Function} onScroll 滚动回调
   * @param {Function} onComplete 对话完成回调
   * @param {number} chatType 对话类型：0-普通对话，1-重新生成
   * @param {boolean} reactMode ReAct模式：false-普通模式，true-ReAct模式
   */
  const startChat = async (sessionId, question, aiMessageRef, onScroll, onComplete, chatType = 0, reactMode = false) => {
    // 重置状态
    closeConnection()
    onCompleteCallback = onComplete
    generating.value = true
    connectionStatus.value = 'connecting'
    
    abortController = new AbortController()
    const token = store.state.token

    // 构造请求 URL，通过 Vite 代理转发到后端
    const baseUrl = import.meta.env.VITE_APP_BASE_API || '/api'
    // 根据 reactMode 选择不同的 API 端点
    const url = reactMode
      ? `${baseUrl}/public/agent/task`    // ReAct 模式
      : `${baseUrl}/public/agent/chat`      // 普通模式

    // 初始化 ReAct 模式的 steps
    if (reactMode) {
      aiMessageRef.steps = []
    }

    try {
      await fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': 'Bearer ' + token })
        },
        body: JSON.stringify({ sessionId, question, type: chatType }), // 0-普通对话，1-重新生成
        signal: abortController.signal,
        openWhenHidden: true, // 切换标签页时连接不关闭

        async onopen(response) {
          connectionStatus.value = 'connected'
          // 处理登录失效
          if (response.status === 401) {
            store.dispatch('logout')
            router.push('/login')
            throw new Error('登录过期')
          }
          if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`)
          }
        },

        onmessage(msg) {
          try {
            const payload = JSON.parse(msg.data)
            const eventType = payload.type
            const eventData = payload.data

            if (reactMode) {
              // ReAct 模式：处理 stage 字段
              const stage = payload.stage
              if (eventType === 1001 && eventData) {
                // 根据 stage 处理不同阶段的 ReAct 事件
                handleReActEvent(stage, eventData, aiMessageRef, onScroll)
              } else if (eventType === 1002) {
                // 停止事件 - 对话完成
                finishGeneration()
              }
            } else {
              // 普通模式：只处理文本增量
              if (eventType === 1001 && eventData) {
                aiMessageRef.content += eventData
                nextTick(() => {
                  if (onScroll) onScroll()
                })
              } else if (eventType === 1002) {
                // 停止事件 - 对话完成
                finishGeneration()
              } else if (eventType === 1003) {
                // 参数事件 - 可能包含额外参数
                console.log('Param event:', eventData)
              }
            }
          } catch (e) {
            console.warn('JSON parse error:', e)
          }
        },

        onerror(err) {
    console.error('SSE connection error:', err)
    connectionStatus.value = 'error'
    finishGeneration() // 使用finishGeneration确保所有状态正确重置
  },

        onclose() {
          // 连接正常关闭
          finishGeneration()
        }
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        // 用户主动停止，不算错误
        console.log('Connection aborted by user')
      } else {
        console.error('SSE connection failed:', error)
        connectionStatus.value = 'failed'
        aiMessageRef.content += '\n[连接失败，请检查网络]'
        generating.value = false
      }
    }
  }

  /**
   * 停止生成 (双重停止)
   * 1. 前端 abort 断开连接
   * 2. 后端调用 /stop 接口终止任务
   */
  const stopGeneration = async (sessionId) => {
    // 1. 前端断开
    closeConnection()
    generating.value = false
    connectionStatus.value = 'disconnected'

    // 2. 后端终止
    if (sessionId) {
      try {
        await stopChat(sessionId)
      } catch (error) {
        console.error('Stop chat API failed:', error)
      }
    }
  }

  /**
   * 处理 ReAct 事件
   * 根据 stage 字段处理不同阶段的 ReAct 事件
   * @param {number} stage ReAct 阶段：0-子任务规划，1-策略思考，2-行动结果，3-反思内容，4-最终总结
   * @param {Object} eventData 事件数据
   * @param {Object} aiMessageRef AI 消息对象
   * @param {Function} onScroll 滚动回调
   */
  const handleReActEvent = (stage, eventData, aiMessageRef, onScroll) => {
    if (!aiMessageRef.steps) aiMessageRef.steps = []

    switch (stage) {
      case 0: // 子任务规划 (PlanData)
        console.log('子任务规划:', eventData)
        aiMessageRef.steps.push({
          type: 'plan',
          title: '规划子任务',
          // Level 1: index 和 taskContent
          index: eventData.index,
          taskContent: eventData.taskContent,
          // Level 2: 其他字段
          previousEvaluation: eventData.previousEvaluation,
          memory: eventData.memory,
          thinking: eventData.thinking,
          icon: 'List',
          status: 'success'
        })
        break

      case 1: // 策略思考 (ThinkData)
        console.log('策略思考:', eventData)
        aiMessageRef.steps.push({
          type: 'thinking',
          title: '思考策略',
          // Level 1: thinkContent
          thinkContent: eventData.thinkContent || '',
          icon: 'Opportunity',
          status: 'success'
        })
        break

      case 2: // 行动结果 (ActionData)
        console.log('行动结果:', eventData)
        aiMessageRef.steps.push({
          type: 'action',
          title: '执行行动',
          // Level 1: success
          success: eventData.success,
          // Level 2: result
          result: eventData.result || '',
          resultType: detectResultType(eventData.result), // 'json' | 'markdown' | 'text'
          // 移除 thinking 字段（后端不再推送）
          icon: 'VideoPlay',
          status: eventData.success ? 'success' : 'error'
        })
        // action事件标志着一个完整的 observe-think-act 循环完成，增加步数
        aiMessageRef.stepCount = (aiMessageRef.stepCount || 0) + 1
        break

      case 3: // 反思内容
        console.log('反思内容:', eventData)
        aiMessageRef.steps.push({
          type: 'reflection',
          title: '反思总结',
          content: formatReflectionContent(eventData),
          icon: 'View',
          status: 'success'
        })
        break

      case 4: // 最终总结
        console.log('最终总结:', eventData)
        // eventData是FinalData对象，结构为{finalResult: "markdown文本"}
        // 提取finalResult字段，确保是字符串类型
        aiMessageRef.content = (eventData && typeof eventData === 'object' && eventData.finalResult)
          ? eventData.finalResult
          : (typeof eventData === 'string' ? eventData : JSON.stringify(eventData))
        break
    }

    nextTick(() => {
      if (onScroll) onScroll()
    })
  }

  /**
   * 格式化反思内容
   * @param {Object|string} eventData 反思事件数据
   * @returns {string} 格式化后的反思内容
   */
  const formatReflectionContent = (eventData) => {
    if (typeof eventData === 'string') {
      try {
        const parsed = JSON.parse(eventData)
        // 提取关键信息
        if (parsed.thinking) return parsed.thinking
        if (parsed.reflection) return parsed.reflection
        if (parsed.evaluation) return parsed.evaluation
        if (parsed.previousEvaluation) return parsed.previousEvaluation
        return eventData
      } catch (e) {
        return eventData
      }
    }
    // 如果是对象，尝试提取有意义的内容
    if (typeof eventData === 'object' && eventData !== null) {
      if (eventData.thinking) return eventData.thinking
      if (eventData.reflection) return eventData.reflection
      if (eventData.evaluation) return eventData.evaluation
      return JSON.stringify(eventData, null, 2)
    }
    return eventData
  }

  /**
   * 检测 result 内容类型
   * @param {string} result - 待检测的结果字符串
   * @returns {string} 'json' | 'markdown' | 'text'
   */
  const detectResultType = (result) => {
    if (!result || typeof result !== 'string') return 'text'

    const trimmed = result.trim()
    // 以 `{` 或 `[` 开头，以 `}` 或 `]` 结尾，可能是 JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch {
        return 'markdown'
      }
    }

    return 'markdown'
  }

  // 内部：关闭资源
  const closeConnection = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  // 内部：生成结束清理
  const finishGeneration = () => {
    closeConnection()
    generating.value = false
    connectionStatus.value = 'disconnected'
    if (onCompleteCallback) {
      onCompleteCallback()
      onCompleteCallback = null
    }
  }

  return {
    connectionStatus,
    generating,
    startChat,
    stopGeneration
  }
}