<template>
  <div class="message-row" :class="role">
    <div class="chat-content-wrapper">
      <div class="bubble" :class="role">
        <div v-if="isLast && loading && !content" class="loading-placeholder">
          <div class="loading-animation">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          <div class="loading-hint">AI 正在思考</div>
        </div>
        <template v-else-if="content">
          <div class="text markdown-body" v-html="renderedContent"></div>
          <span v-if="isLast && loading" class="cursor"></span>
        </template>
      </div>

      <div class="actions" v-if="!loading && content">
        <el-tooltip content="复制" placement="bottom">
          <el-icon class="action-btn" @click="copyText(content)"><CopyDocument /></el-icon>
        </el-tooltip>
        <el-tooltip content="重新生成" placement="bottom" v-if="isLast && role === 'server'">
          <el-icon class="action-btn" @click="$emit('regenerate')"><RefreshRight /></el-icon>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CopyDocument, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import hljs from 'highlight.js'

const props = defineProps({
  role: { type: String, default: 'user' }, // 'user' | 'server'
  content: { type: String, default: '' },
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
  breaks: true,
  gfm: true
})

// 渲染 Markdown
const renderedContent = computed(() => {
  if (!props.content) return ''
  try {
    return marked(props.content)
  } catch (e) {
    return props.content
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
}

.user .bubble {
  --bubble-start: var(--bubble-user-start);
  --bubble-end: var(--bubble-user-end);
  color: var(--color-text-primary);
  border-bottom-right-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
}

.server .bubble {
  --bubble-start: var(--bubble-server-start);
  --bubble-end: var(--bubble-server-end);
  color: var(--color-text-primary);
  border-bottom-left-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
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
  border-bottom: 2px solid var(--color-border, #e2e8f0);
  padding-bottom: 0.3em;
}
.markdown-body :deep(h2) {
  font-size: 1.3em;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  padding-bottom: 0.3em;
}
.markdown-body :deep(h3) {
  font-size: 1.1em;
}
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 1em;
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
.markdown-body :deep(li ul),
.markdown-body :deep(li ol) {
  margin: 0.5em 0 0 1.5em;
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
  font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.9em;
}
.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  color: var(--color-text-primary);
}

/* 行内代码 */
.markdown-body :deep(code:not(pre code)) {
  background-color: var(--color-background-soft);
  color: var(--color-danger);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-weight: 500;
}

/* 链接样式 */
.markdown-body :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
}
.markdown-body :deep(a:hover) {
  color: var(--color-primary-dark);
  text-decoration: none;
  border-bottom-color: var(--color-primary-dark);
}

/* 块引用样式 */
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  margin: 16px 0;
  padding: 12px 16px;
  background-color: var(--color-background-soft);
  border-radius: 0 8px 8px 0;
  color: var(--color-text-secondary);
}
.markdown-body :deep(blockquote p) {
  margin-bottom: 0;
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

/* 水平分隔线 */
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border, #e2e8f0);
  margin: 24px 0;
}

/* 加粗和斜体 */
.markdown-body :deep(strong) {
  font-weight: 600;
  color: var(--color-text-primary);
}
.markdown-body :deep(em) {
  font-style: italic;
  color: var(--color-text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {

  .bubble {
    padding: 12px 16px;
    font-size: 14px;
  }

  .markdown-body :deep(h1) {
    font-size: 1.3em;
  }

  .markdown-body :deep(h2) {
    font-size: 1.2em;
  }

  .markdown-body :deep(h3) {
    font-size: 1.1em;
  }

  .markdown-body :deep(pre) {
    padding: 12px;
    font-size: 0.85em;
  }

  .markdown-body :deep(table) {
    font-size: 0.85em;
  }

  .markdown-body :deep(th),
  .markdown-body :deep(td) {
    padding: 8px 10px;
  }
}

@media (max-width: 480px) {

  .message-row {
    gap: 12px;
    margin-bottom: 20px;
  }

  .bubble {
    padding: 10px 14px;
    font-size: 13px;
  }

  .markdown-body :deep(ul),
  .markdown-body :deep(ol) {
    padding-left: 1.2em;
  }

  .markdown-body :deep(pre) {
    padding: 10px;
    border-radius: 8px;
  }
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

.cursor {
  display: inline-block;
  width: 2px;
  height: 18px;
  background-color: #64748b;
  animation: blink 1.2s infinite;
  vertical-align: middle;
  margin-left: 4px;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
}

.loading-animation {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

.loading-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  animation: fade-pulse 2s ease-in-out infinite;
}

@keyframes fade-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
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
