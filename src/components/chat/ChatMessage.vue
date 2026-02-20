<template>
  <div class="message-row" :class="message.role">
    <!-- 消息内容区 -->
    <div class="chat-content-wrapper">
      <!-- AI 消息且包含 Agent Steps -->
      <template v-if="message.role === 'server' && hasSteps">
        <div class="bubble server">
          <AgentSteps
            :steps="message.steps"
            :step-count="message.stepCount"
          />
          <!-- 分隔线 -->
          <div class="steps-divider" v-if="message.content">
            <div class="divider-line"></div>
<!--            <span class="divider-text">最终回复</span>-->
            <div class="divider-line"></div>
          </div>
          <!-- 加载状态：Agent 模式下正在推送步骤或普通模式下等待内容时显示 -->
          <div
            v-if="loading && isWaitingForData"
            class="loading-spinner-container"
          >
            <div class="loading-spinner"></div>
          </div>
          <!-- 文本内容：有内容且不在等待状态时显示 -->
          <div v-else-if="message.content && !isWaitingForData" class="text markdown-body" v-html="renderContent"></div>
          <!-- 加载光标：有内容且正在等待时显示 -->
          <span v-else-if="message.content && loading && !isWaitingForData" class="cursor">|</span>
        </div>

        <!-- 操作栏 -->
        <div class="actions" v-if="!loading">
          <el-tooltip content="复制" placement="bottom">
            <el-icon class="action-btn" @click="copyText(message.content)"><CopyDocument /></el-icon>
          </el-tooltip>
          <el-tooltip content="重新生成" placement="bottom" v-if="isLast">
            <el-icon class="action-btn" @click="$emit('regenerate')"><RefreshRight /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <!-- 使用 ChatBubble 组件 (普通模式或用户消息) -->
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
import { computed } from 'vue'
import { CopyDocument, RefreshRight } from '@element-plus/icons-vue'
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

// 配置 marked
marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  },
  langPrefix: 'hljs language-',
  breaks: true
})

// 计算是否有 Agent Steps
const hasSteps = computed(() => {
  return props.message.role === 'server' &&
         props.message.steps &&
         props.message.steps.length > 0
})

// 计算是否正在等待数据（Agent 模式下正在推送步骤）
const isWaitingForData = computed(() => {
  // 如果正在加载且是 server 消息
  if (!props.loading || props.message.role !== 'server') {
    return false
  }
  // 如果有 steps 且步骤正在推送，则认为是等待状态
  if (props.message.steps && props.message.steps.length > 0) {
    // 如果有步骤但还没有最终内容，则在等待
    return !props.message.content
  }
  // 如果没有 steps，则在等待内容
  return !props.message.content
})

// 渲染 Markdown
const renderContent = computed(() => {
  if (!props.message.content) return ''
  try {
    return marked(props.message.content)
  } catch (e) {
    return props.message.content
  }
})

// 复制功能
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

/* 分隔线 */
.steps-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
  position: relative;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    var(--color-border) 20%,
    var(--color-border) 80%,
    transparent
  );
}

.divider-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  padding: 4px 12px;
  background: var(--color-background-soft);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
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
</style>
