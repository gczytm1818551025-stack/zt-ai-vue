<template>
  <div class="thinking-content" @click="toggle">
    <div class="thinking-header-row">
      <div :class="['thinking-text', { 'is-truncated': !expanded }]">{{ thinkContent }}</div>
      <el-icon v-if="thinkContent && thinkContent.length > 100" :class="['collapse-icon', { expanded: expanded }]" @click.stop="toggle">
        <ArrowDown />
      </el-icon>
    </div>
  </div>
</template>

<script setup>
import { ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  thinkContent: { type: String, default: '' },
  expanded: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

const toggle = () => {
  emit('toggle')
}
</script>

<style scoped>
.thinking-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  cursor: pointer;
}

.thinking-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  transition: background 0.2s ease;
  padding: 0;
  border-radius: 4px;
}

.thinking-header-row:hover {
  background: rgba(139, 92, 246, 0.05);
}

.thinking-text {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  flex: 1;
  min-width: 0;
}

.thinking-text.is-truncated {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
</style>
