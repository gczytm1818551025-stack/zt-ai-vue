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
  let currentRequestId = 0
  let lastProcessedSeq = -1

  const recentEvents = new Map()
  const processedEventCount = new Map()

  const startChat = async (sessionId, question, aiMessageRef, onScroll, onComplete, chatType = 0, reactMode = false) => {
    closeConnection()
    onCompleteCallback = onComplete
    generating.value = true
    currentReactMode = reactMode
    currentSessionId = sessionId
    currentRequestId = Date.now()
    lastProcessedSeq = -1
    recentEvents.clear()
    processedEventCount.clear()

    const requestId = currentRequestId
    abortController = new AbortController()
    const token = store.state.token

    const baseUrl = import.meta.env.VITE_APP_BASE_API || '/api'
    const url = reactMode
      ? `${baseUrl}/public/agent/task`
      : `${baseUrl}/public/agent/chat`

    const body = chatType === 2
      ? { sessionId, type: 0 }
      : { sessionId, question, type: chatType }

    if (reactMode) {
      if (chatType === 0) {
        console.log('[ReAct] 新对话：重置消息状态')
        aiMessageRef.content = ''
        if (aiMessageRef.steps) {
          aiMessageRef.steps.splice(0, aiMessageRef.steps.length)
        } else {
          aiMessageRef.steps = []
        }
        aiMessageRef.stepCount = 0
      } else if (chatType === 1) {
        console.log('[ReAct] 重新生成：重置消息状态')
        aiMessageRef.content = ''
        if (aiMessageRef.steps) {
          aiMessageRef.steps.splice(0, aiMessageRef.steps.length)
        } else {
          aiMessageRef.steps = []
        }
        aiMessageRef.stepCount = 0
      } else if (chatType === 2) {
        console.log('[ReAct] 恢复连接：保留现有消息状态', {
          stepsCount: aiMessageRef.steps?.length || 0,
          stepCount: aiMessageRef.stepCount || 0
        })
        if (!aiMessageRef.steps) {
          aiMessageRef.steps = []
        }
      }
    }

    try {
      await fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(token && { 'Authorization': 'Bearer ' + token })
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
        openWhenHidden: true,
        onopen(response) {
          console.log('[SSE] 连接已建立, status:', response.status)
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
        if (requestId !== currentRequestId) {
          console.log('[SSE] 忽略旧请求的消息:', { requestId, currentRequestId })
          return
        }
        
        let payload
        try {
          payload = JSON.parse(msg.data)
        } catch (e) {
          console.warn('[SSE] JSON parse error:', e, 'raw:', msg.data)
          return
        }
        
        const eventType = getEventTypeValue(payload.type)
        const stage = getStageValue(payload.stage)
        const eventData = payload.data
        const seq = payload.sequenceNumber

        console.log('[SSE] 收到消息:', {
          rawType: payload.type,
          eventType,
          stage,
          seq,
          timestamp: Date.now()
        })

        if (reactMode) {
          if (eventType === EventTypeEnum.DATA) {
            handleReActEvent(stage, eventData, aiMessageRef, onScroll, sessionId, seq)
          } else if (eventType === EventTypeEnum.STOP) {
            console.log('[ReAct] 收到STOP事件，结束生成')
            finishGeneration(requestId)
          }
        } else {
          if (eventType === EventTypeEnum.DATA && eventData !== null && eventData !== undefined) {
            let contentToAdd = ''
            if (typeof eventData === 'string') {
              contentToAdd = eventData
            } else if (typeof eventData === 'object') {
              if (eventData.thinkContent && typeof eventData.thinkContent === 'string') {
                contentToAdd = eventData.thinkContent
              } else if (eventData.content && typeof eventData.content === 'string') {
                contentToAdd = eventData.content
              } else if (eventData.text && typeof eventData.text === 'string') {
                contentToAdd = eventData.text
              } else if (eventData.result && typeof eventData.result === 'string') {
                contentToAdd = eventData.result
              }
            }
            if (contentToAdd) {
              aiMessageRef.content = aiMessageRef.content + contentToAdd
              nextTick(() => {
                if (onScroll) onScroll()
              })
            }
          } else if (eventType === EventTypeEnum.STOP) {
            console.log('[Chat] 收到STOP事件，结束生成')
            finishGeneration(requestId)
          }
        }
      },
      onerror(err) {
        console.error('[SSE] 连接错误:', err)
        if (requestId === currentRequestId) {
          finishGeneration(requestId)
        }
        throw err
      },
      onclose() {
        console.log('[SSE] 连接关闭, requestId:', requestId, 'currentRequestId:', currentRequestId, 'generating:', generating.value)
        if (requestId === currentRequestId && generating.value) {
          console.log('[SSE] 连接异常关闭，结束生成')
          finishGeneration(currentRequestId)
        }
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

  const finishGeneration = (requestId = null) => {
    if (requestId && requestId !== currentRequestId) {
      console.log('[ReAct] 忽略旧请求的 finishGeneration 调用:', { requestId, currentRequestId })
      return
    }
    console.log('[Stream] finishGeneration 被调用, requestId:', requestId)
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
    if (stage === null || stage === undefined) {
      return
    }

    const hasSeq = seq !== null && seq !== undefined
    if (hasSeq) {
      const dedupKey = `${sessionId}-${stage}-${seq}`
      if (recentEvents.has(dedupKey)) {
        return
      }
      recentEvents.set(dedupKey, Date.now())
      if (recentEvents.size > 1000) {
        const now = Date.now()
        for (const [key, time] of recentEvents) {
          if (now - time > 60000) recentEvents.delete(key)
        }
      }
    }

    processEvent(stage, eventData, aiMessageRef, seq)
    
    nextTick(() => {
      if (onScroll) onScroll()
    })
  }

  const processEvent = (stage, eventData, aiMessageRef, seq) => {
    if (!aiMessageRef.steps) {
      aiMessageRef.steps = []
    }
    if (!Array.isArray(aiMessageRef.steps)) {
      aiMessageRef.steps = []
    }

    if (stage === 3) {
      let finalContent = ''
      if (eventData && typeof eventData === 'object') {
        finalContent = eventData.finalResult || eventData.result || eventData.content || ''
      } else if (typeof eventData === 'string') {
        finalContent = eventData
      }
      aiMessageRef.content = finalContent
      return
    }

    const newStep = {
      sequenceNumber: seq !== null && seq !== undefined ? seq : Date.now(),
      timestamp: Date.now()
    }

    try {
      switch (stage) {
        case 0:
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
          newStep.type = 'thinking'
          newStep.title = '思考策略'
          newStep.thinkContent = eventData?.thinkContent ?? ''
          newStep.icon = 'Opportunity'
          newStep.status = 'success'
          break

        case 2:
          newStep.type = 'action'
          newStep.title = '执行行动'
          newStep.success = eventData?.success ?? false
          newStep.result = eventData?.result ?? ''
          newStep.resultType = detectResultType(eventData?.result)
          newStep.icon = 'VideoPlay'
          newStep.status = (eventData?.success ?? false) ? 'success' : 'error'
          break

        default:
          return
      }

      if (!newStep.type) {
        return
      }

      const existingIndex = aiMessageRef.steps.findIndex(s => 
        s.sequenceNumber === newStep.sequenceNumber && 
        s.type === newStep.type
      )

      if (existingIndex === -1) {
        aiMessageRef.steps.push(newStep)
        aiMessageRef.steps.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      }

      const actionCount = aiMessageRef.steps.filter(s => s.type === 'action').length
      aiMessageRef.stepCount = actionCount

    } catch (error) {
      console.error('[ReAct] 处理事件时出错:', error)
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
