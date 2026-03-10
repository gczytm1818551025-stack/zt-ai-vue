<template>
  <div class="message-row" :class="[message.role, { 'loading-glow': loading && message.role === 'server' && isTaskMode }]">
    <div class="chat-content-wrapper" :class="{ 'full-width': message.role === 'server' && isTaskMode && (hasSteps || hasFinalContent) }">
      <template v-if="message.role === 'server' && isTaskMode">
        <div class="bubble server" :class="{ 'has-steps': hasSteps || isInitialLoading, 'initial-bubble': isInitialLoading }">
          <div
            v-if="showCollapseHeader"
            class="collapse-header"
            @click="toggleStepsCollapse"
          >
            <div class="collapse-left">
              <el-icon class="collapse-icon" :class="{ 'collapsed': stepsCollapsed }">
                <ArrowRight />
              </el-icon>
              <span class="collapse-title">执行过程</span>
              <span class="collapse-count">{{ message.stepCount || actionCount }} 步</span>
            </div>
          </div>

          <div v-if="isInitialLoading" class="initial-loading-container">
            <div class="initial-loading-content">
              <div class="loading-animation">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>
              <div class="loading-hint">{{ loadingHint }}</div>
            </div>
          </div>

          <template v-else>
            <AgentSteps
              v-show="!stepsCollapsed"
              :steps="message.steps"
              :step-count="message.stepCount"
              :loading="loading"
              :show-progress="false"
            />
            <div v-if="loading && hasSteps" class="loading-progress-bar">
              <div class="progress-glow"></div>
            </div>
            <div v-if="message.content && !(loading && isLast && isWaitingForData)" class="text markdown-body" v-html="renderContent"></div>
            <span v-else-if="message.content && loading && isLast && !isWaitingForData" class="cursor">|</span>
          </template>
        </div>

        <div class="actions" v-if="!loading">
          <el-tooltip content="复制" placement="bottom">
            <el-icon class="action-btn" @click="copyText(message.content)"><CopyDocument /></el-icon>
          </el-tooltip>
          <el-tooltip content="重新生成" placement="bottom" v-if="isLast">
            <el-icon class="action-btn" @click="$emit('regenerate')"><RefreshRight /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <ChatBubble
        v-else
        :role="message.role"
        :content="message.content"
        :loading="loading"
        :is-last="isLast"
        @regenerate="$emit('regenerate')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { CopyDocument, RefreshRight, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import hljs from 'highlight.js'
import AgentSteps from './AgentSteps.vue'
import ChatBubble from './ChatBubble.vue'

const props = defineProps({
  message: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false }
})

const emit = defineEmits(['regenerate'])

const isTaskMode = computed(() => {
  return props.message.mode === 'task'
})

const hasFinalContent = computed(() => {
  return props.message.content && props.message.content.length > 0
})

const isInitialLoading = computed(() => {
  if (!props.loading) return false
  if (props.message.role !== 'server') return false
  if (!isTaskMode.value) return false
  const hasNoSteps = !props.message.steps || props.message.steps.length === 0
  const hasNoContent = !props.message.content || props.message.content.length === 0
  return hasNoSteps && hasNoContent
})

const loadingHint = computed(() => {
  const hints = [
    '正在分析任务...',
    '规划执行步骤...',
    '准备调用工具...',
    '思考解决方案...'
  ]
  return hints[Math.floor(Date.now() / 2000) % hints.length]
})

const stepsCollapsed = ref(false)

const showCollapseHeader = computed(() => {
  return props.message.steps && props.message.steps.length > 0
})

const actionCount = computed(() => {
  if (!props.message.steps) return 0
  return props.message.steps.filter(s => s.type === 'action').length
})

const hasFinalSummary = computed(() => {
  if (!hasFinalContent.value) return false
  return !props.loading
})

watch(hasFinalSummary, (newVal) => {
  if (newVal) {
    stepsCollapsed.value = true
  }
}, { immediate: true })

const toggleStepsCollapse = () => {
  stepsCollapsed.value = !stepsCollapsed.value
}

marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  },
  langPrefix: 'hljs language-',
  breaks: true,
  gfm: true
})

const hasSteps = computed(() => {
  return props.message.role === 'server' &&
         props.message.steps &&
         props.message.steps.length > 0
})

const isWaitingForData = computed(() => {
  if (!props.loading) {
    return false
  }
  if (props.message.role !== 'server') {
    return false
  }
  if (props.message.content && props.message.content.length > 0) {
    return false
  }
  if (props.message.steps && props.message.steps.length > 0) {
    return true
  }
  return !props.message.content
})

const renderContent = computed(() => {
  if (!props.message.content) return ''
  try {
    return marked(props.message.content)
  } catch (e) {
    return props.message.content
  }
})

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('复制成功')
  } catch (err) {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.message-row {
  display: flex;
  margin-bottom: var(--space-lg);
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.message-row.user {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.message-row.server {
  justify-content: flex-start;
}

.chat-content-wrapper {
  max-width: 80%;
  min-width: 80px;
}

.chat-content-wrapper.full-width {
  max-width: 80%;
  width: 80%;
}

/* AI 消息气泡 */
.bubble {
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  position: relative;
  word-break: break-word;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
  background: linear-gradient(135deg, var(--bubble-start), var(--bubble-end));
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.bubble.has-steps {
  width: 100%;
  max-width: none;
}

.bubble.initial-bubble {
  width: auto;
  min-width: 120px;
  max-width: 200px;
}

.server .bubble {
  --bubble-start: var(--bubble-server-start);
  --bubble-end: var(--bubble-server-end);
  border-bottom-left-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
}

.bubble:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--color-border);
}

/* 折叠控制头部 */
.collapse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  margin-bottom: 8px;
  background: var(--color-background-soft);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
  user-select: none;
}

.collapse-header:hover {
  background: var(--color-background-mute);
}

.collapse-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: transform 0.3s ease;
}

.collapse-icon.collapsed {
  transform: rotate(0deg);
}

.collapse-icon:not(.collapsed) {
  transform: rotate(90deg);
}

.collapse-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.collapse-count {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-background);
  padding: 2px 8px;
  border-radius: 10px;
}

.collapse-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* Markdown 样式增强 */
.markdown-body :deep(p) {
  margin-bottom: 1em;
  line-height: 1.7;
  color: var(--color-text-primary);
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

/* 标题样式 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1.5em 0 1em;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
}
.markdown-body :deep(h1) {
  font-size: 1.5em;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.3em;
}
.markdown-body :deep(h2) {
  font-size: 1.3em;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.3em;
}
.markdown-body :deep(h3) {
  font-size: 1.1em;
}

/* 列表样式 */
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 1em 0;
  padding-left: 1.5em;
}
.markdown-body :deep(li) {
  margin-bottom: 0.5em;
  line-height: 1.6;
  color: var(--color-text-primary);
}

/* 代码块样式 */
.markdown-body :deep(pre) {
  background-color: var(--color-background-soft);
  padding: 16px;
  border-radius: 10px;
  overflow-x: auto;
  color: var(--color-text-primary);
  margin: 16px 0;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
  line-height: 1.5;
}
.markdown-body :deep(code) {
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  font-size: 0.9em;
}

/* 行内代码 */
.markdown-body :deep(code:not(pre code)) {
  background-color: var(--color-background-soft);
  color: var(--color-danger);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-weight: 500;
}

/* 表格样式 */
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 0.95em;
  display: block;
  overflow-x: auto;
  white-space: nowrap;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}
.markdown-body :deep(th) {
  background-color: var(--color-background-soft);
  font-weight: 600;
  color: var(--color-text-primary);
}
.markdown-body :deep(tr:nth-child(even)) {
  background-color: var(--color-background-soft);
}
.markdown-body :deep(tr:hover) {
  background-color: var(--color-background);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bubble {
    padding: 12px 16px;
    font-size: 14px;
  }
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 18px;
  background-color: #64748b;
  animation: blink 1.2s infinite;
  vertical-align: middle;
  margin-left: 4px;
}

.initial-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  min-height: 60px;
}

.initial-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.initial-loading-content .loading-animation {
  display: flex;
  align-items: center;
  gap: 4px;
}

.initial-loading-content .typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.initial-loading-content .typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.initial-loading-content .typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.initial-loading-content .typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.initial-loading-content .loading-hint {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  animation: fade-pulse 2s ease-in-out infinite;
}

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

@keyframes fade-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.loading-progress-bar {
  width: 100%;
  height: 3px;
  margin-top: 8px;
  background: linear-gradient(90deg, 
    rgba(59, 130, 246, 0.1) 0%, 
    rgba(59, 130, 246, 0.15) 50%, 
    rgba(59, 130, 246, 0.1) 100%
  );
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(59, 130, 246, 0.6) 30%, 
    rgba(96, 165, 250, 0.9) 50%, 
    rgba(59, 130, 246, 0.6) 70%, 
    transparent 100%
  );
  border-radius: 2px;
  animation: progress-slide 1.8s ease-in-out infinite, progress-breathe 1.8s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4), 0 0 4px rgba(96, 165, 250, 0.2);
}

@keyframes progress-slide {
  0% {
    left: -30%;
  }
  100% {
    left: 100%;
  }
}

@keyframes progress-breathe {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.loading-spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 12px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite, pulse 1.5s ease-in-out infinite;
}

.actions {
  display: flex;
  gap: 12px;
  opacity: 1;
  transition: opacity 0.3s ease, transform 0.2s ease;
  padding: 0 4px;
  transform: translateY(0);
}

.action-btn {
  cursor: pointer;
  color: #94a3b8;
  font-size: 28px;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
}

.action-btn:hover {
  background: var(--color-background-soft);
  color: var(--color-text-primary);
  transform: scale(1.1);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Agent 模式呼吸闪烁效果 */
@keyframes breathing-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.15);
  }
}

/* 加载中且有步骤的气泡呼吸闪烁效果 */
.message-row.loading-glow .server .bubble {
  animation: breathing-pulse 2s ease-in-out infinite;
}
</style>
