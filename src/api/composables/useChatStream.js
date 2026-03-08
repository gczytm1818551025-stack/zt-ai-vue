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

  const stepTypeMap = {
    1: 'plan',
    2: 'thinking',
    3: 'action',
    4: 'final'
  }

  const handleReActEvent = (stage, eventData, aiMessageRef, onScroll, sessionId, seq) => {
    console.log('[ReAct] 收到事件:', { stage, seq, sessionId, eventData })

    const dedupKey = `${sessionId}-${seq}`
    const lastEvent = recentEvents.get(dedupKey)
    const now = Date.now()

    if (seq !== null && seq !== undefined && seq <= lastProcessedSeq) {
      console.log('[ReAct] 序列号已处理过，跳过:', { seq, lastProcessedSeq })
      return
    }

    if (lastEvent && (now - lastEvent.timestamp) < 30000) {
      console.log('[ReAct] 30秒内已收到此事件，跳过:', { seq, dedupKey })
      return
    }

    recentEvents.set(dedupKey, { seq, timestamp: now, stage })
    if (seq !== null && seq !== undefined) {
      lastProcessedSeq = Math.max(lastProcessedSeq, seq)
    }

    if (stage === 3) {
      nextTick(() => {
        processEvent(stage, eventData, aiMessageRef, seq)
        if (onScroll) onScroll()
      })
    } else {
      processEvent(stage, eventData, aiMessageRef, seq)
      nextTick(() => {
        if (onScroll) onScroll()
      })
    }
  }

  const processEvent = (stage, eventData, aiMessageRef, seq) => {
    console.log('[ReAct] 处理事件:', { stage, eventData, seq })

    if (!aiMessageRef.steps) aiMessageRef.steps = []

    let newStepCount = aiMessageRef.stepCount || 0
    let newSteps = [...aiMessageRef.steps]

    switch (stage) {
      case 0:
        console.log('[ReAct] 处理子任务规划:', eventData)
        newSteps.push({
          type: stepTypeMap[1],
          title: '规划子任务',
          index: eventData.index,
          taskContent: eventData.taskContent,
          previousEvaluation: eventData.previousEvaluation,
          memory: eventData.memory,
          thinking: eventData.thinking,
          icon: 'List',
          status: 'success',
          sequenceNumber: seq
        })
        console.log('[ReAct] 步骤添加后，steps 数量:', newSteps.length)
        break

      case 1:
        console.log('[ReAct] 处理策略思考:', eventData)
        newSteps.push({
          type: stepTypeMap[2],
          title: '思考策略',
          thinkContent: eventData.thinkContent || '',
          icon: 'Opportunity',
          status: 'success',
          sequenceNumber: seq
        })
        console.log('[ReAct] 步骤添加后，steps 数量:', newSteps.length)
        break

      case 2:
        console.log('[ReAct] 处理行动结果:', eventData)
        newSteps.push({
          type: stepTypeMap[3],
          title: '执行行动',
          success: eventData.success,
          result: eventData.result || '',
          resultType: detectResultType(eventData.result),
          icon: 'VideoPlay',
          status: eventData.success ? 'success' : 'error',
          sequenceNumber: seq
        })
        console.log('[ReAct] 步骤添加后，steps 数量:', newSteps.length)
        newStepCount = newStepCount + 1
        break

      case 3:
        console.log('[ReAct] 处理最终总结:', eventData)
        let finalContent = ''
        if (eventData && typeof eventData === 'object' && 'finalResult' in eventData) {
          finalContent = eventData.finalResult
        } else if (typeof eventData === 'string') {
          finalContent = eventData
        } else {
          finalContent = JSON.stringify(eventData || {})
        }
        aiMessageRef.content = finalContent
        console.log('[ReAct] 最终总结内容设置完成:', aiMessageRef.content)
        break
    }

    newSteps.sort((a, b) => {
      const seqA = a.sequenceNumber || 0
      const seqB = b.sequenceNumber || 0
      return seqA - seqB
    })

    aiMessageRef.steps = newSteps
    aiMessageRef.stepCount = newStepCount

    console.log('[ReAct] 事件处理完成，steps数量:', aiMessageRef.steps.length)
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
