<template>
  <div class="plan-content">
    <!-- Level 1: "子任务[index]" + 换行 + taskContent -->
    <div class="plan-header-row" @click="toggle">
      <div class="plan-index">子任务{{ index }}</div>
      <div class="task-content">{{ taskContent }}</div>
      <!-- 折叠按钮 -->
      <el-icon v-if="previousEvaluation || memory || thinking" :class="['collapse-icon', { expanded: expanded }]">
        <ArrowDown />
      </el-icon>
    </div>
    <!-- Level 2: 可折叠的状态详情 -->
    <transition name="collapse">
      <div v-if="expanded && (previousEvaluation || memory || thinking)" class="level-2 plan-state">
        <div v-if="previousEvaluation" class="state-item">
          <span class="state-label">📊 评估:</span>
          <span class="state-value">{{ previousEvaluation }}</span>
        </div>
        <div v-if="memory" class="state-item">
          <span class="state-label">📝 回忆:</span>
          <span class="state-value">{{ memory }}</span>
        </div>
        <div v-if="thinking" class="state-item">
          <span class="state-label">💭 思考:</span>
          <span class="state-value">{{ thinking }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  index: { type: Number, default: 0 },
  taskContent: { type: String, default: '' },
  previousEvaluation: { type: String, default: '' },
  memory: { type: String, default: '' },
  thinking: { type: String, default: '' },
  expanded: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

const toggle = () => {
  emit('toggle')
}
</script>

<style scoped>
.plan-content .plan-index {
  display: inline-block;
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
}

.plan-content .task-content {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
}

.plan-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 0;
  margin: -4px 0 4px 0;
  border-radius: 4px;
}

.plan-header-row:hover {
  background: rgba(59, 130, 246, 0.05);
}

.plan-content .plan-index {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.plan-content .task-content {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
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

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* Level 2 - 第二层次（次要信息） */
.level-2 {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 1.5;
  opacity: 0.9;
  margin-top: 8px;
}

.plan-state {
  padding: 10px 0;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.state-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.state-label {
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
  opacity: 0.7;
}

.state-value {
  flex: 1;
  word-break: break-word;
}
</style>
