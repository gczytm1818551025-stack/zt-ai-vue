<template>
  <div class="reflection-content">
    <div class="reflection-label">🔍 反思</div>
    <div class="reflection-text">{{ formattedContent }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: [String, Object], default: '' }
})

// 格式化反思内容
const formattedContent = computed(() => {
  const content = props.content
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      // 尝试提取关键信息
      if (parsed.thinking) return parsed.thinking
      if (parsed.reflection) return parsed.reflection
      if (parsed.evaluation) return parsed.evaluation
      return content
    } catch {
      return content
    }
  }
  return JSON.stringify(content, null, 2)
})
</script>

<style scoped>
.reflection-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.reflection-label {
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 10px;
}

.reflection-text {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  flex: 1;
  min-width: 0;
}
</style>
