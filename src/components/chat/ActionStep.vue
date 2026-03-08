<template>
  <div class="action-content">
    <div class="action-header-row" @click="toggle">
      <span class="action-status-label">执行状态</span>
      <el-tag :type="success ? 'success' : 'danger'" effect="plain" size="default">
        {{ success ? '成功' : '失败' }}
      </el-tag>
      <el-icon v-if="result" :class="['collapse-icon', { expanded: expanded }]">
        <ArrowDown />
      </el-icon>
    </div>
    <div class="collapse-wrapper" :class="{ expanded: expanded && result }">
      <div class="level-2 action-result" :class="{ 'action-result-error': !success }">
        <div class="result-label">📋 执行结果</div>
        <div v-if="resultType === 'json'" class="result-json">
          <pre class="result-text">{{ formatJson(result) }}</pre>
        </div>
        <div v-else class="result-markdown" v-html="renderMarkdown(result)"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { marked } from 'marked'

const props = defineProps({
  success: { type: Boolean, default: true },
  result: { type: String, default: '' },
  resultType: { type: String, default: 'markdown' }, // 'json' | 'markdown'
  expanded: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

const toggle = () => {
  emit('toggle')
}

// 格式化 JSON
const formatJson = (jsonStr) => {
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonStr
  }
}

// 渲染 Markdown
const renderMarkdown = (markdown) => {
  try {
    return marked(markdown)
  } catch {
    return markdown
  }
}
</script>

<style scoped>
.action-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.action-status-label {
  display: inline-block;
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
  border-radius: 4px;
}

.action-header-row:hover {
  background: rgba(16, 185, 129, 0.05);
}

.collapse-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--color-text-tertiary);
  transition: transform 0.2s ease;
  cursor: pointer;
  margin-left: auto;
}

.collapse-icon:hover {
  color: var(--color-text-secondary);
}

.collapse-icon.expanded {
  transform: rotate(180deg);
}

.collapse-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.2s ease;
}

.collapse-wrapper.expanded {
  grid-template-rows: 1fr;
}

.collapse-wrapper > .level-2 {
  min-height: 0;
  overflow: hidden;
}

.level-2 {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 1.5;
}

.action-result {
  border-radius: 8px;
  padding: 0;
  margin-top: 0;
  border: 1px solid transparent;
  background: transparent;
  transition: padding 0.2s ease, margin 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.collapse-wrapper.expanded .action-result {
  padding: 12px;
  margin-top: 8px;
}

.collapse-wrapper.expanded .action-result:not(.action-result-error) {
  border-color: rgba(16, 185, 129, 0.15);
  background: rgba(16, 185, 129, 0.06);
}

.collapse-wrapper.expanded .action-result-error {
  border-color: rgba(239, 68, 68, 0.15);
  background: rgba(239, 68, 68, 0.06);
}

.action-result .result-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-json {
  background: var(--color-background);
  border-radius: 6px;
  padding: 10px;
  border: 1px solid var(--color-border);
}

.result-text {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  line-height: 1.5;
}

.result-markdown {
  background: var(--color-background);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid var(--color-border);
}

.result-markdown :deep(p) {
  margin-bottom: 0.5em;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.result-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.result-markdown :deep(h1),
.result-markdown :deep(h2),
.result-markdown :deep(h3) {
  margin: 0.8em 0 0.4em;
  font-weight: 500;
  font-size: 13px;
  color: var(--color-text-primary);
}

.result-markdown :deep(ul),
.result-markdown :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.result-markdown :deep(li) {
  margin-bottom: 0.3em;
  line-height: 1.5;
}

.result-markdown :deep(pre) {
  background: var(--color-background-soft);
  padding: 10px;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
}

.result-markdown :deep(code) {
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  font-size: 0.85em;
}

.result-markdown :deep(code:not(pre code)) {
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
}
</style>
