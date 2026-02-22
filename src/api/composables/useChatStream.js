import { ref, nextTick } from 'vue'
import { stopChat, stopReActChat } from '@/api/chat'
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
  let currentReactMode = false  // 记录当前模式，用于停止时选择对应的 API

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
    currentReactMode = reactMode  // 记录当前模式

    abortController = new AbortController()
    const token = store.state.token

    // 构造请求 URL，通过 Vite 代理转发到后端
    const baseUrl = import.meta.env.VITE_APP_BASE_API || '/api'
    // 根据 reactMode 选择不同的 API 端点
    const url = reactMode
      ? `${baseUrl}/public/agent/task`    // ReAct 模式
      : `${baseUrl}/public/agent/chat`      // 普通模式

    // 恢复模式：如果是恢复连接（chatType === 2），发送 type: 0 并不发送 question
    // 后端 GenerateTypeEnum 只支持 0(NORMAL) 和 1(REGENERATE)，不支持 2
    const body = chatType === 2
      ? { sessionId, type: 0 }  // 恢复模式，使用 type: 0，不发送 question
      : { sessionId, question, type: chatType }  // 普通模式或重新生成

    // ReAct 模式下，仅在首次请求（chatType === 0）时重置消息状态
    // 恢复连接（chatType === 2）时保留已有的步骤和内容
    if (reactMode && chatType === 0) {
      console.log('[ReAct] 新对话：重置消息状态')
      aiMessageRef.content = ''
      aiMessageRef.steps = []
      aiMessageRef.stepCount = 0
    } else if (reactMode && chatType === 2) {
      console.log('[ReAct] 恢复连接：保留现有消息状态', {
        stepsCount: aiMessageRef.steps?.length || 0,
        stepCount: aiMessageRef.stepCount || 0
      })
    }

    try {
      await fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': 'Bearer ' + token })
        },
        body: JSON.stringify(body),  // chatType: 0-普通对话/恢复连接，1-重新生成
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

            // 兼容枚举值，转换为数字
            const eventType = getEventTypeValue(payload.type)
            const stage = getStageValue(payload.stage)
            const eventData = payload.data

            console.log('[SSE] 收到消息:', {
              rawType: payload.type,
              rawStage: payload.stage,
              eventType,
              stage,
              reactMode,
              eventData
            })

            if (reactMode) {
              // ReAct 模式：处理 stage 字段
              if (eventType === EventTypeEnum.DATA && eventData) {
                // 根据 stage 处理不同阶段的 ReAct 事件
                console.log('[ReAct] 处理事件:', { stage, eventData })
                handleReActEvent(stage, eventData, aiMessageRef, onScroll)
              } else if (eventType === EventTypeEnum.STOP) {
                // 停止事件 - 对话完成
                console.log('[ReAct] 对话完成')
                finishGeneration()
              }
            } else {
              // 普通模式：只处理文本增量
              if (eventType === EventTypeEnum.DATA && eventData) {
                // 【修复】后端推送的 eventData 直接是字符串（text），不是对象
                // 兼容处理：如果是字符串则直接使用，如果是对象则提取 thinkContent 属性
                let contentToAdd = ''
                if (typeof eventData === 'string') {
                  contentToAdd = eventData
                } else if (eventData && typeof eventData.thinkContent === 'string') {
                  contentToAdd = eventData.thinkContent
                }
                aiMessageRef.content += contentToAdd;
                nextTick(() => {
                  if (onScroll) onScroll()
                })
              } else if (eventType === EventTypeEnum.STOP) {
                // 停止事件 - 对话完成
                finishGeneration()
              } else if (eventType === EventTypeEnum.PARAM) {
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
   * 2. 后端调用对应的停止接口终止任务（根据模式选择）
   */
  const stopGeneration = async (sessionId) => {
    // 1. 前端断开
    closeConnection()
    generating.value = false
    connectionStatus.value = 'disconnected'

    // 2. 后端终止 - 根据模式选择对应的 API
    if (sessionId) {
      try {
        if (currentReactMode) {
          await stopReActChat(sessionId)
        } else {
          await stopChat(sessionId)
        }
      } catch (error) {
        console.error('Stop chat API failed:', error)
      }
    }
  }

  // 事件类型枚举映射
  const EventTypeEnum = {
    DATA: 1001,
    STOP: 1002,
    PARAM: 1003
  }

  // ReAct 阶段枚举映射
  const ReActStageEnum = {
    TASK_PLAN: 0,      // 子任务规划
    STRATEGY_THINK: 1,  // 策略思考
    ACTION_RESULT: 2,   // 行动结果
    REFLECT: 3,        // 反思内容
    FINAL_SUMMARY: 4    // 最终总结
  }

  // 获取事件类型的数字值（兼容枚举值）
  const getEventTypeValue = (type) => {
    if (typeof type === 'number') return type
    if (typeof type === 'string') {
      const upperType = type.toUpperCase()
      return EventTypeEnum[upperType] ?? null
    }
    return null
  }

  // 获取 stage 的数字值（兼容枚举值）
  const getStageValue = (stage) => {
    if (typeof stage === 'number') return stage
    if (typeof stage === 'string') {
      const upperStage = stage.toUpperCase()
      return ReActStageEnum[upperStage] ?? null
    }
    return null
  }

  // 类型码到字符串类型的映射（后端推送的是类型码：1=PLAN, 2=THINKING, 3=ACTION）
  const stepTypeMap = {
    1: 'plan',      // PLAN
    2: 'thinking',  // THINKING
    3: 'action',     // ACTION
    4: 'final'       // FINAL（最终总结时可能用到）
  }

  /**
   * 处理 ReAct 事件
   * 根据 stage 字段处理不同阶段的 ReAct 事件
   * @param {number} stage ReAct 阶段：0-子任务规划，1-策略思考，2-行动结果，4-最终总结
   * @param {Object} eventData 事件数据
   * @param {Object} aiMessageRef AI 消息对象
   * @param {Function} onScroll 滚动回调
   */
  const handleReActEvent = (stage, eventData, aiMessageRef, onScroll) => {
    console.log('[ReAct] handleReActEvent 开始:', { stage, eventData, aiMessageRef })

    if (!aiMessageRef.steps) aiMessageRef.steps = []
    console.log('[ReAct] steps 初始化后:', aiMessageRef.steps)

    // 创建新数组和步数以触发响应式更新
    const newSteps = [...aiMessageRef.steps]
    let newStepCount = aiMessageRef.stepCount || 0

    switch (stage) {
      case 0: // 子任务规划 (PlanData)
        console.log('[ReAct] 处理子任务规划:', eventData)
        newSteps.push({
          type: stepTypeMap[1], // 将类型码 1 映射为 'plan'
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
        console.log('[ReAct] 步骤添加后，steps 数量:', newSteps.length)
        break

      case 1: // 策略思考 (ThinkData)
        console.log('[ReAct] 处理策略思考:', eventData)
        newSteps.push({
          type: stepTypeMap[2], // 将类型码 2 映射为 'thinking'
          title: '思考策略',
          // Level 1: thinkContent
          thinkContent: eventData.thinkContent || '',
          icon: 'Opportunity',
          status: 'success'
        })
        console.log('[ReAct] 步骤添加后，steps 数量:', newSteps.length)
        break

      case 2: // 行动结果 (ActionData)
        console.log('[ReAct] 处理行动结果:', eventData)
        newSteps.push({
          type: stepTypeMap[3], // 将类型码 3 映射为 'action'
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
        console.log('[ReAct] 步骤添加后，steps 数量:', newSteps.length)
        newStepCount = newStepCount + 1  // action 事件增加步数
        break

      case 4: // 最终总结
        console.log('[ReAct] 处理最终总结:', eventData)
        // eventData是FinalData对象，结构为{finalResult: "markdown文本"}
        // 提取finalResult字段
        if (eventData && typeof eventData === 'object' && 'finalResult' in eventData) {
          aiMessageRef.content = eventData.finalResult
        } else if (typeof eventData === 'string') {
          aiMessageRef.content = eventData
        } else {
          aiMessageRef.content = JSON.stringify(eventData || {})
        }
        console.log('[ReAct] 最终总结内容设置完成:', aiMessageRef.content)
        break
    }

    // 重新赋值以触发响应式更新
    aiMessageRef.steps = newSteps
    aiMessageRef.stepCount = newStepCount

    nextTick(() => {
      if (onScroll) onScroll()
    })
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