import { ref, nextTick } from 'vue'
import { stopChat, stopReActChat } from '@/api/chat'
import { useStore } from 'vuex'
import router from '@/router'
import { fetchEventSource } from '@microsoft/fetch-event-source'

export function useChatStream() {
  const store = useStore()

  const generating = ref(false)

  let abortController = null
  let onCompleteCallback = null
  let currentReactMode = false
  let currentSessionId = null

  const recentEvents = new Map()
  let lastProcessedSeq = -1

  const startChat = async (sessionId, question, aiMessageRef, onScroll, onComplete, chatType = 0, reactMode = false) => {
    closeConnection()
    onCompleteCallback = onComplete
    generating.value = true
    currentReactMode = reactMode
    currentSessionId = sessionId
    lastProcessedSeq = -1
    recentEvents.clear()

    abortController = new AbortController()
    const token = store.state.token

    const baseUrl = import.meta.env.VITE_APP_BASE_API || '/api'
    const url = reactMode
      ? `${baseUrl}/public/agent/task`
      : `${baseUrl}/public/agent/chat`

    const body = chatType === 2
      ? { sessionId, type: 0 }
      : { sessionId, question, type: chatType }

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
        body: JSON.stringify(body),
        signal: abortController.signal,
        openWhenHidden: true,
        async onopen(response) {
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
          const eventType = getEventTypeValue(payload.type)
          const stage = getStageValue(payload.stage)
          const eventData = payload.data
          const seq = payload.sequenceNumber

          console.log('[SSE] 收到消息:', {
            rawType: payload.type,
            rawStage: payload.stage,
            eventType,
            stage,
            reactMode,
            eventData,
            sequenceNumber: seq
          })

          if (reactMode) {
            if (eventType === EventTypeEnum.DATA && eventData) {
              console.log('[ReAct] 处理事件:', { stage, eventData, seq, sessionId })
              handleReActEvent(stage, eventData, aiMessageRef, onScroll, sessionId, seq)
            } else if (eventType === EventTypeEnum.STOP) {
              console.log('[ReAct] 对话完成')
              finishGeneration()
            }
          } else {
            if (eventType === EventTypeEnum.DATA && eventData) {
              let contentToAdd = ''
              if (typeof eventData === 'string') {
                contentToAdd = eventData
              } else if (eventData && typeof eventData.thinkContent === 'string') {
                contentToAdd = eventData.thinkContent
              }
              aiMessageRef.content = aiMessageRef.content + contentToAdd
              nextTick(() => {
                if (onScroll) onScroll()
              })
            } else if (eventType === EventTypeEnum.STOP) {
              finishGeneration()
            } else if (eventType === EventTypeEnum.PARAM) {
              console.log('Param event:', eventData)
            }
          }
        } catch (e) {
          console.warn('JSON parse error:', e)
        }
      },
      onerror(err) {
        console.error('SSE connection error:', err)
        finishGeneration()
        throw err
      },
      onclose() {
        if (generating.value) {
          console.log('[SSE] 连接意外关闭，可能是服务器端问题')
        }
        finishGeneration()
      }
    })
  } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Connection aborted by user')
      } else {
        console.error('SSE connection failed:', error)
        aiMessageRef.content += '\n[连接失败，请检查网络]'
        generating.value = false
      }
    }
  }

  const stopGeneration = async (sessionId) => {
    closeConnection()
    generating.value = false
    currentSessionId = null

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

  const closeConnection = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const finishGeneration = () => {
    generating.value = false
    if (onCompleteCallback) {
      onCompleteCallback()
      onCompleteCallback = null
    }
  }

  const EventTypeEnum = {
    DATA: 1001,
    STOP: 1002,
    PARAM: 1003
  }

  const ReActStageEnum = {
    TASK_PLAN: 0,
    STRATEGY_THINK: 1,
    ACTION_RESULT: 2,
    FINAL_SUMMARY: 3
  }

  const getEventTypeValue = (type) => {
    if (typeof type === 'number') return type
    if (typeof type === 'string') {
      const upperType = type.toUpperCase()
      return EventTypeEnum[upperType] ?? null
    }
    return null
  }

  const getStageValue = (stage) => {
    if (typeof stage === 'number') return stage
    if (typeof stage === 'string') {
      const upperStage = stage.toUpperCase()
      return ReActStageEnum[upperStage] ?? null
    }
    return null
  }

  const handleReActEvent = (stage, eventData, aiMessageRef, onScroll, sessionId, seq) => {
    console.log('[ReAct] 收到事件:', { stage, seq, sessionId, eventData })

    // 只对相同事件进行严格去重
    const dedupKey = `${sessionId}-${stage}-${seq}`
    if (recentEvents.has(dedupKey)) {
      console.log('[ReAct] 事件已处理过，跳过:', { seq, dedupKey })
      return
    }

    recentEvents.set(dedupKey, Date.now())

    // 更新最后处理的序列号
    if (seq !== null && seq !== undefined) {
      lastProcessedSeq = Math.max(lastProcessedSeq, seq)
    }

    // 确保所有 stage 都触发滚动和视图更新
    processEvent(stage, eventData, aiMessageRef, seq)
    // 强制触发 DOM 更新
    nextTick(() => {
      console.log('[ReAct] DOM 更新后，steps 长度:', aiMessageRef.steps?.length)
      if (onScroll) onScroll()
    })
  }

  const processEvent = (stage, eventData, aiMessageRef, seq) => {
    console.log('[ReAct] processEvent 开始:', {
      stage,
      seq,
      eventDataKeys: eventData ? Object.keys(eventData) : 'null',
      eventData,
      currentStepsLength: aiMessageRef.steps?.length || 0
    })

    // 确保 aiMessageRef.steps 是响应式的
    if (!aiMessageRef.steps || !Array.isArray(aiMessageRef.steps)) {
      console.log('[ReAct] 初始化 steps 数组')
      aiMessageRef.steps = []
    }

    // 处理 finalResult（case 3）
    if (stage === 3) {
      console.log('[ReAct] 处理最终总结（stage 3）:', eventData)
      let finalContent = ''
      if (eventData && typeof eventData === 'object') {
        // 尝试多种可能的字段名
        finalContent = eventData.finalResult || eventData.result || eventData.content || ''
      } else if (typeof eventData === 'string') {
        finalContent = eventData
      } else {
        finalContent = JSON.stringify(eventData || {})
      }
      console.log('[ReAct] 最终总结内容:', { finalContent, length: finalContent.length })
      aiMessageRef.content = finalContent
      console.log('[ReAct] 最终总结设置后 content:', aiMessageRef.content)
      return
    }

    const newStep = {
      sequenceNumber: seq,
      timestamp: Date.now()
    }

    try {
      switch (stage) {
        case 0:
          console.log('[ReAct] 处理子任务规划（stage 0）:', eventData)
          newStep.type = 'plan'
          newStep.title = '规划子任务'
          newStep.index = eventData?.index ?? 0
          newStep.taskContent = eventData?.taskContent ?? ''
          newStep.previousEvaluation = eventData?.previousEvaluation ?? ''
          newStep.memory = eventData?.memory ?? ''
          newStep.thinking = eventData?.thinking ?? ''
          newStep.icon = 'List'
          newStep.status = 'success'
          break

        case 1:
          console.log('[ReAct] 处理策略思考（stage 1）:', eventData)
          newStep.type = 'thinking'
          newStep.title = '思考策略'
          newStep.thinkContent = eventData?.thinkContent ?? ''
          newStep.icon = 'Opportunity'
          newStep.status = 'success'
          break

        case 2:
          console.log('[ReAct] 处理行动结果（stage 2）:', eventData)
          newStep.type = 'action'
          newStep.title = '执行行动'
          newStep.success = eventData?.success ?? false
          newStep.result = eventData?.result ?? ''
          newStep.resultType = detectResultType(eventData?.result)
          newStep.icon = 'VideoPlay'
          newStep.status = (eventData?.success ?? false) ? 'success' : 'error'
          break
      }

      // 检查 step 是否有效
      if (!newStep.type) {
        console.warn('[ReAct] 步骤类型未设置，跳过添加:', { stage, newStep })
        return
      }

      const currentSteps = aiMessageRef.steps || []
      const existingIndex = currentSteps.findIndex(s => s.sequenceNumber === seq)

      if (existingIndex === -1) {
        // 使用 push 添加新步骤
        currentSteps.push(newStep)
        console.log('[ReAct] push 后 steps 长度:', currentSteps.length)
        // 排序（原地排序）
        currentSteps.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
        console.log('[ReAct] sort 后 steps 长度:', currentSteps.length)
        // 强制触发响应式更新
        aiMessageRef.steps = [...currentSteps]
        console.log('[ReAct] 强制更新后 steps:', aiMessageRef.steps.length)
      } else {
        console.log('[ReAct] 步骤已存在，跳过添加:', seq)
      }

      const actionCount = (aiMessageRef.steps || []).filter(s => s.type === 'action').length
      aiMessageRef.stepCount = actionCount

      console.log('[ReAct] processEvent 完成:', {
        stepsCount: aiMessageRef.steps.length,
        stepCount: aiMessageRef.stepCount,
        contentLength: aiMessageRef.content?.length || 0
      })

    } catch (error) {
      console.error('[ReAct] 处理事件时出错:', { stage, eventData, seq, error, errorStack: error.stack })
    }
  }

  const detectResultType = (result) => {
    if (!result || typeof result !== 'string') return 'text'
    const trimmed = result.trim()
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

  return {
    generating,
    startChat,
    stopGeneration,
    currentSessionId
  }
}
