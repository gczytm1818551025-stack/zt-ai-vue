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
import { ref, reactive, onMounted, nextTick, computed, onBeforeUnmount, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import EmptyState from '@/components/empty/EmptyState.vue'

// 逻辑 Hooks
import { useChatSession } from '@/api/composables/useChatSession'
import { useChatStream } from '@/api/composables/useChatStream'
import { stopReActChat } from '@/api/chat'
import { SessionTypeEnum } from '@/store/sessionTypeCache'

const store = useStore()
const router = useRouter()
const scrollRef = ref(null)
const isUserScrolling = ref(false)
const lastScrollPosition = ref(0)

// ReAct 模式状态
const reactMode = ref(false)
// 当前会话类型
const currentSessionType = ref(null)

// 用户信息
const username = computed(() => store.state.userInfo?.nickName || '用户')

// 当前会话标题
const currentSessionTitle = computed(() => {
  if (!currentSessionId.value) return ''
  const session = sessionList.value.find(s => s.sessionId === currentSessionId.value)
  return session ? session.title : ''
})

// ===== 核心业务逻辑 =====

// 是否可以切换模式（始终允许切换）
const canSwitchMode = computed(() => true)

// 是否可以发送消息（始终允许）
const canSend = computed(() => {
  // 1. 如果没有会话，可以发送
  if (!currentSessionId.value) return true

  // 2. 统一逻辑：始终允许发送消息
  return true
})

// Agent会话是否已完成
const isAgentSessionCompleted = computed(() => {
  return currentSessionType.value === SessionTypeEnum.AGENT && hasMessages.value
})

// 引入逻辑 Hook
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

// 当前消息列表
const messages = ref([])

// 会话是否已开始（是否有消息）
const hasMessages = ref(false)

// 滚动事件处理
const handleScroll = () => {
  if (scrollRef.value) {
    isUserScrolling.value = true
    lastScrollPosition.value = scrollRef.value.scrollTop
    
    // 3秒后重置滚动状态，允许自动滚动
    setTimeout(() => {
      isUserScrolling.value = false
    }, 3000)
  }
}

// 初始化
onMounted(async () => {
  // 只加载会话列表，不自动选择或创建会话
  await loadSessionList()

  // 保持当前会话ID为空，显示空白对话界面
  currentSessionId.value = ''
  messages.value = []
  hasMessages.value = false

  // 重置 React 模式和会话类型状态（修复刷新后状态残留问题）
  reactMode.value = false
  currentSessionType.value = null

  // 监听页面刷新/关闭事件
  const handleBeforeUnload = (event) => {
    // 如果正在生成对话（ReAct 模式），通知后端停止
    if (generating.value && reactMode.value && streamSessionId.value) {
      console.log('[Chat] 页面即将刷新/关闭，停止 ReAct 对话')
      const token = store.state.token
      const baseUrl = import.meta.env.VITE_APP_BASE_API || '/api'
      const url = `${baseUrl}/public/agent/react/stop?sessionId=${encodeURIComponent(streamSessionId.value)}`
      // 使用 sendBeacon 确保在页面卸载前发送请求
      navigator.sendBeacon(url, new Blob([], { type: 'application/json' }))
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)

  // 返回清理函数
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value && !isUserScrolling.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

// 组件卸载时的清理
onBeforeUnmount(async () => {
  // 组件卸载时，如果正在生成对话（ReAct 模式），主动停止
  if (generating.value && reactMode.value && streamSessionId.value) {
    console.log('[Chat] 组件卸载，停止当前 ReAct 对话')
    try {
      await stopReActChat(streamSessionId.value)
    } catch (error) {
      console.error('停止对话失败:', error)
    }
  }
})

// --- 事件处理 ---

// 1. 创建会话
const onCreateSession = async () => {
  // 如果正在生成，先停止
  if (generating.value) {
    await onStopGeneration()
  }

  // 如果当前没有sessionId，刷新页面
  if (!currentSessionId.value) {
    // 刷新页面以实现重置效果
    window.location.reload()
  } else {
    // 如果持有sessionId，实际调用新建会话接口
    const type = reactMode.value ? SessionTypeEnum.AGENT : SessionTypeEnum.CHAT
    const newSession = await handleCreateSession(type)
    if (newSession) {
      currentSessionId.value = newSession.sessionId
      currentSessionType.value = newSession.sessionType
      reactMode.value = newSession.sessionType === SessionTypeEnum.AGENT
      messages.value = [] // 新会话初始为空
      hasMessages.value = false
      scrollToBottom()
    }
  }
}

// 2. 选中会话
const onSelectSession = async (session) => {
  if (currentSessionId.value === session.sessionId) return

  // 如果正在生成，先停止
  if (generating.value) {
    await onStopGeneration()
  }

  currentSessionId.value = session.sessionId
  currentSessionType.value = session.sessionType
  reactMode.value = session.sessionType === SessionTypeEnum.AGENT
  messages.value = await fetchSessionDetail(session.sessionId)
  hasMessages.value = messages.value.length > 0

  // 如果会话正在进行，尝试恢复连接
  if (session.isActive) {
    await resumeActiveSession(session)
  }

  scrollToBottom()
}

// 恢复正在进行的会话
const resumeActiveSession = async (session) => {
  try {
    // 检查是否已经有 AI 消息（正在进行的会话可能没有历史消息）
    const lastMessage = messages.value[messages.value.length - 1]
    let aiMessageRef

    if (lastMessage && lastMessage.role === 'server' && !lastMessage.content) {
      // 使用已有的空消息
      aiMessageRef = lastMessage
    } else {
      // 创建新的 AI 占位消息
      aiMessageRef = reactive({ role: 'server', content: '', steps: [] })
      messages.value.push(aiMessageRef)
    }

    // 重新建立连接（chatType=2 表示恢复模式）
    await startChat(
      session.sessionId,
      '', // question 为空，因为是恢复连接
      aiMessageRef,
      scrollToBottom,
      () => {}, // 完成回调
      2, // chatType: 2-恢复连接
      true // reactMode
    )

    ElMessage.info('已恢复之前的对话')
  } catch (error) {
    console.error('恢复会话失败:', error)
    ElMessage.warning('恢复会话失败，请重试')
  }
}

// 3. 重命名
const onRenameSession = async (sessionId, newTitle) => {
  await handleRenameSession(sessionId, newTitle)
}

// 4. 删除会话
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
            // 如果删除了当前会话，重置为空白默认对话界面
            currentSessionId.value = ''
            messages.value = []
            hasMessages.value = false
        }
      }
    })
    .catch(() => {})
}

// 5. 发送消息
const onSendMessage = async (text) => {
  // 检查是否可以发送
  if (!canSend.value) {
    return
  }

  // 懒创建：如果当前没有会话ID，说明是新会话，此时才调用后端创建
  if (!currentSessionId.value) {
    const type = reactMode.value ? SessionTypeEnum.AGENT : SessionTypeEnum.CHAT
    const newSession = await handleCreateSession(type)
    if (newSession) {
      currentSessionId.value = newSession.sessionId
      currentSessionType.value = newSession.sessionType
    } else {
      // 创建失败，停止发送
      return
    }
  }

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  // 添加 AI 占位消息
  const aiMessage = reactive({
    role: 'server',
    content: '',
    steps: []
  })
  messages.value.push(aiMessage)

  // 开始流式对话，对话完成后更新会话标题，传递 reactMode 参数
  await startChat(currentSessionId.value, text, aiMessage, scrollToBottom, async () => {
    // 延迟 800ms 确保后端异步处理完成
    setTimeout(async () => {
      await fetchSessionDetail(currentSessionId.value)
    }, 800)
  }, 0, reactMode.value)  // 传递 reactMode 参数
}

// 6. 停止生成
const onStopGeneration = async () => {
  await stopGeneration(currentSessionId.value)
}

// 7. 重新生成 (简单实现：删除最后一条 AI 消息，重发上一条用户消息)
const onRegenerate = async () => {
  // 支持普通模式和 Agent 模式的重新生成
  if (messages.value.length < 2) return

  const lastMsg = messages.value[messages.value.length - 1]
  const userMsg = messages.value[messages.value.length - 2]

  if (lastMsg.role === 'server' && userMsg.role === 'user') {
    messages.value.pop() // 移除 AI 消息
    const text = userMsg.content
    // 重发逻辑：不需要再添加用户消息，直接添加 AI 占位并请求
    const aiMessage = reactive({
      role: 'server',
      content: '',
      steps: []
    })
    messages.value.push(aiMessage)
    // 对话完成后更新会话标题
    await startChat(currentSessionId.value, text, aiMessage, scrollToBottom, async () => {
      setTimeout(async () => {
        await fetchSessionDetail(currentSessionId.value)
      }, 500)
    }, 1, reactMode.value) // 1-重新生成，传递 reactMode 参数
  }
}

// 8. 退出登录
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

/* 修复iOS Safari视窗问题 */
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

/* Agent 完成提示样式 */
.agent-completed-tip {
  max-width: 960px;
  margin: 0 auto;
  padding: 12px 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
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

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .message-list {
    max-width: 90%;
    padding: 0 16px;
  }
}

@media (max-width: 1024px) {
  .message-list {
    max-width: 90%;
    padding: 0 24px;
  }
  
  .empty-state {
    padding: 64px 20px;
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
  
  .empty-state {
    padding: var(--space-2xl) var(--space-lg);
    gap: var(--space-lg);
  }
  
  .empty-logo-image {
    width: 64px;
    height: 64px;
  }
  
  .empty-title {
    font-size: var(--font-size-xl);
  }
  
  .empty-subtitle {
    font-size: var(--font-size-sm);
  }
  
  .empty-features {
    gap: var(--space-md);
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .feature-item {
    min-width: 80px;
    padding: var(--space-md);
  }
  
  .feature-icon {
    font-size: 20px;
  }
  
  .feature-item span {
    font-size: var(--font-size-xs);
  }
  
  /* 侧边栏响应式调整 */
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
  
  .empty-features {
    gap: var(--space-sm);
  }
  
  .feature-item {
    min-width: 70px;
    padding: var(--space-sm);
  }
  
  .messages-container {
    padding: var(--space-lg) 0 var(--space-md);
  }
  
  .empty-state {
    padding: var(--space-xl) var(--space-md);
    gap: var(--space-md);
  }
  
  .empty-logo-image {
    width: 56px;
    height: 56px;
  }
  
  .empty-title {
    font-size: var(--font-size-lg);
  }
  
  .empty-subtitle {
    font-size: var(--font-size-xs);
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .session-item:hover {
    transform: none;
    box-shadow: var(--shadow-sm);
  }
  
  .action-btn:hover {
    transform: none;
  }
  
  .user-avatar:hover,
  .server-avatar:hover {
    transform: none;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  :root {
    --color-border: var(--vt-c-divider-light-1);
    --color-text-secondary: var(--vt-c-text-primary);
  }
  
  .bubble {
    border: 1px solid var(--color-border);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
