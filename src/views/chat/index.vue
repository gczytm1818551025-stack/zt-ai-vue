<template>
  <div class="chat-layout">
    <el-container class="h-full">
      <!-- 侧边栏 -->
      <ChatSidebar
        :list="sessionList"
        :current-id="currentSessionId"
        :loading="loading"
        :username="username"
        @create="onCreateSession"
        @select="onSelectSession"
        @rename="onRenameSession"
        @delete="onDeleteSession"
        @logout="onLogout"
      />

      <!-- 主聊天区 -->
      <el-main class="chat-main">
        <!-- 消息列表 -->
        <div class="messages-container" ref="scrollRef" @scroll="handleScroll">
          <EmptyState v-if="messages.length === 0" />

          <div v-else class="message-list">
            <ChatMessage
              v-for="(msg, index) in messages"
              :key="index"
              :message="msg"
              :is-last="index === messages.length - 1"
              :loading="generating && index === messages.length - 1"
              @regenerate="onRegenerate"
            />
          </div>
        </div>

        <!-- 底部输入区 -->
        <ChatInput
          :generating="generating"
          v-model:reactMode="reactMode"
          :can-switch-mode="canSwitchMode"
          :can-send="canSend"
          @send="onSendMessage"
          @stop="onStopGeneration"
        />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import EmptyState from '@/components/empty/EmptyState.vue'

import { useChatSession } from '@/api/composables/useChatSession'
import { useChatStream } from '@/api/composables/useChatStream'
import { stopReActChat } from '@/api/chat'
import { SessionTypeEnum } from '@/store/sessionTypeCache'

const store = useStore()
const router = useRouter()
const scrollRef = ref(null)
const isUserScrolling = ref(false)

const reactMode = ref(false)

const username = computed(() => store.state.userInfo?.nickName || '用户')

const canSwitchMode = computed(() => true)

const canSend = computed(() => true)

const {
  sessionList,
  currentSessionId,
  loading,
  loadSessionList,
  handleCreateSession,
  fetchSessionDetail,
  handleRenameSession,
  handleDeleteSession
} = useChatSession()

const {
  generating,
  startChat,
  stopGeneration,
  currentSessionId: streamSessionId
} = useChatStream()

const messages = ref([])

const handleScroll = () => {
  if (scrollRef.value) {
    isUserScrolling.value = true
    setTimeout(() => {
      isUserScrolling.value = false
    }, 3000)
  }
}

onMounted(async () => {
  await loadSessionList()

  currentSessionId.value = ''
  messages.value = []

  const handleBeforeUnload = () => {
    if (generating.value && reactMode.value && streamSessionId.value) {
      console.log('[Chat] 页面即将刷新/关闭，停止 ReAct 对话')
      const baseUrl = import.meta.env.VITE_APP_BASE_API || '/api'
      const url = `${baseUrl}/public/agent/react/stop?sessionId=${encodeURIComponent(streamSessionId.value)}`
      navigator.sendBeacon(url, new Blob([], { type: 'application/json' }))
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value && !isUserScrolling.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

onBeforeUnmount(async () => {
  if (generating.value && reactMode.value && streamSessionId.value) {
    console.log('[Chat] 组件卸载，停止当前 ReAct 对话')
    try {
      await stopReActChat(streamSessionId.value)
    } catch (error) {
      console.error('停止对话失败:', error)
    }
  }
})

const onCreateSession = async () => {
  if (generating.value) {
    await onStopGeneration()
  }

  if (!currentSessionId.value) {
    window.location.reload()
  } else {
    const sessionType = reactMode.value ? SessionTypeEnum.AGENT : SessionTypeEnum.CHAT
    const newSession = await handleCreateSession(sessionType)
    if (newSession) {
      currentSessionId.value = newSession.sessionId
      messages.value = []
      scrollToBottom()
    }
  }
}

const onSelectSession = async (session) => {
  if (currentSessionId.value === session.sessionId) return

  if (generating.value) {
    await stopGeneration()
  }

  currentSessionId.value = session.sessionId
  messages.value = await fetchSessionDetail(session.sessionId)

  if (session.isActive) {
    await resumeActiveSession(session)
  }

  scrollToBottom()
}

const resumeActiveSession = async (session) => {
  try {
    const lastMessage = messages.value[messages.value.length - 1]
    let aiMessageRef

    if (lastMessage && lastMessage.role === 'server' && !lastMessage.content) {
      aiMessageRef = lastMessage
      aiMessageRef.mode = 'task'
    } else {
      aiMessageRef = reactive({ role: 'server', content: '', steps: [], mode: 'task' })
      messages.value.push(aiMessageRef)
    }

    await startChat(
      session.sessionId,
      '',
      aiMessageRef,
      scrollToBottom,
      () => {},
      2,
      true
    )

    ElMessage.info('已恢复之前的对话')
  } catch (error) {
    console.error('恢复会话失败:', error)
    ElMessage.warning('恢复会话失败，请重试')
  }
}

const onRenameSession = async (sessionId, newTitle) => {
  await handleRenameSession(sessionId, newTitle)
}

const onDeleteSession = async (session) => {
  ElMessageBox.confirm('确定要删除这个会话吗？', '确认删除', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    confirmButtonClass: 'custom-confirm-btn'
  })
    .then(async () => {
      const success = await handleDeleteSession(session.sessionId)
      if (success) {
        if (currentSessionId.value === session.sessionId) {
          currentSessionId.value = ''
          messages.value = []
        }
      }
    })
    .catch(() => {})
}

const onSendMessage = async (text) => {
  if (!canSend.value) {
    return
  }

  const isTaskMode = reactMode.value

  if (!currentSessionId.value) {
    const sessionType = isTaskMode ? SessionTypeEnum.AGENT : SessionTypeEnum.CHAT
    const newSession = await handleCreateSession(sessionType)
    if (newSession) {
      currentSessionId.value = newSession.sessionId
    } else {
      return
    }
  }

  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  const aiMessage = reactive({
    role: 'server',
    content: '',
    steps: [],
    mode: isTaskMode ? 'task' : 'chat'
  })
  messages.value.push(aiMessage)

  await startChat(currentSessionId.value, text, aiMessage, scrollToBottom, async () => {
    setTimeout(async () => {
      await fetchSessionDetail(currentSessionId.value)
    }, 800)
  }, 0, isTaskMode)
}

const onStopGeneration = async () => {
  await stopGeneration(currentSessionId.value)
}

const onRegenerate = async () => {
  if (messages.value.length < 2) return

  const lastMsg = messages.value[messages.value.length - 1]
  const userMsg = messages.value[messages.value.length - 2]

  if (lastMsg.role === 'server' && userMsg.role === 'user') {
    messages.value.pop()
    const text = userMsg.content
    const isTaskMode = reactMode.value
    const aiMessage = reactive({
      role: 'server',
      content: '',
      steps: [],
      mode: isTaskMode ? 'task' : 'chat'
    })
    messages.value.push(aiMessage)
    await startChat(currentSessionId.value, text, aiMessage, scrollToBottom, async () => {
      setTimeout(async () => {
        await fetchSessionDetail(currentSessionId.value)
      }, 500)
    }, 1, isTaskMode)
  }
}

const onLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '确认退出', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    confirmButtonClass: 'custom-confirm-btn',
    buttonsPosition: 'right'
  })
    .then(() => {
      store.dispatch('logout')
      router.push('/login')
    })
    .catch(() => {})
}
</script>

<style scoped>
.chat-layout {
  height: 100vh;
  width: 100vw;
  background-color: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

@supports (-webkit-touch-callout: none) {
  .chat-layout {
    height: -webkit-fill-available;
  }
}

.chat-layout :deep(.el-container) {
  height: 100%;
}

.h-full {
  height: 100%;
}

.chat-main {
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--chat-main-bg);
  margin: 0;
  box-shadow: none;
  overflow: hidden;
  z-index: 1;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 32px 0 24px;
  scroll-behavior: smooth;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--color-text-tertiary);
  border-radius: 3px;
  transition: background 0.2s;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

.message-list {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px;
}

@media (max-width: 1024px) {
  .message-list {
    max-width: 90%;
    padding: 0 24px;
  }
}

@media (max-width: 768px) {
  .chat-layout {
    height: 100vh;
  }

  .messages-container {
    padding: var(--space-xl) 0 var(--space-lg);
  }

  .message-list {
    max-width: 95%;
    padding: 0 var(--space-md);
  }

  .chat-sidebar {
    width: 240px;
  }

  .chat-sidebar.collapsed {
    width: 70px;
  }
}

@media (max-width: 480px) {
  .message-list {
    padding: 0 var(--space-sm);
  }

  .messages-container {
    padding: var(--space-lg) 0 var(--space-md);
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
