<template>
  <div class="thinking-content level-1" @click="toggle">
    <div class="thinking-header-row">
      <div :class="['thinking-text', { 'is-truncated': !expanded }]">{{ thinkContent }}</div>
      <!-- 折叠按钮 -->
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
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  position: relative;
}

/* Level 1 - 第一层次（主要信息） */
.level-1 {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 1.6;
}

/* 思考文本样式 */
.thinking-text {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
}

.thinking-text.is-truncated {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thinking-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 0;
  margin: -4px 0 4px 0;
  border-radius: 4px;
}

.thinking-header-row:hover {
  background: rgba(59, 130, 246, 0.05);
}

/* 折叠图标 - 统一定位在右侧 */
.collapse-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--color-text-tertiary);
  transition: transform 0.3s ease;
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
