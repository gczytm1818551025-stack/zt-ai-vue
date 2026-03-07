<template>
  <div class="plan-content">
    <div class="plan-header-row" @click="toggle">
      <div class="plan-index">子任务{{ index }}</div>
      <div class="task-content">{{ taskContent }}</div>
      <el-icon v-if="previousEvaluation || memory || thinking" :class="['collapse-icon', { expanded: expanded }]">
        <ArrowDown />
      </el-icon>
    </div>
    <div class="collapse-wrapper" :class="{ expanded: expanded && (previousEvaluation || memory || thinking) }">
      <div class="level-2 plan-state">
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
    </div>
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
.plan-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.plan-header-row {
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

.plan-header-row:hover {
  background: rgba(59, 130, 246, 0.05);
}

.plan-index {
  display: inline-block;
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.task-content {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  min-width: 0;
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

.plan-state {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.collapse-wrapper.expanded .plan-state {
  padding: 10px 0;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
  margin-top: 8px;
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
