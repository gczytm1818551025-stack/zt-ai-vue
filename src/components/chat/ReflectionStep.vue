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
  background: rgba(245, 158, 11, 0.05);
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.reflection-label {
  font-size: 11px;
  font-weight: 500;
  color: #f59e0b;
  margin-bottom: 6px;
}

.reflection-text {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.6;
}
</style>
