<template>
  <div class="agent-steps">
    <div class="steps-header">
      <div class="steps-title">收到任务！现在我将为您规划并完成。</div>
      <div class="steps-counter">{{ stepCount || actionCount }} 步</div>
    </div>

    <div class="steps-container">
      <!-- 加载动画：没有步骤时显示 -->
      <div v-if="steps.length === 0" class="loading-placeholder">
        <div class="loading-spinner-container">
          <div class="loading-spinner"></div>
        </div>
        <div class="loading-text">思考中...</div>
      </div>

      <div
        v-for="(step, index) in steps"
        :key="step.sequenceNumber || `step-${index}-${step.type}`"
        class="step-item"
        :class="[
          `step-${step.type}`,
          { 'step-error': step.status === 'error' },
          { 'step-process': step.status === 'process' }
        ]"
      >
        <!-- 步骤内容 -->
        <div class="step-content-wrapper">
          <div v-if="step.skill" class="step-skill-tag">
            <el-tag size="small" type="info" effect="plain">
              {{ step.skill }}
            </el-tag>
          </div>

          <div class="step-body">
            <!-- 规划步骤 -->
            <PlanStep
              v-if="step.type === 'plan'"
              :index="step.index"
              :task-content="step.taskContent"
              :previous-evaluation="step.previousEvaluation"
              :memory="step.memory"
              :thinking="step.thinking"
              :expanded="expandedPlans.has(index)"
              @toggle="togglePlan(index)"
            />

            <!-- 思考步骤 -->
            <ThinkingStep
              v-if="step.type === 'thinking'"
              :think-content="step.thinkContent"
              :expanded="expandedThinkings.has(index)"
              @toggle="toggleThinking(index)"
            />

            <!-- 行动结果步骤 -->
            <ActionStep
              v-if="step.type === 'action'"
              :success="step.success"
              :result="step.result"
              :result-type="step.resultType"
              :expanded="expandedActions.has(index)"
              @toggle="toggleAction(index)"
            />

            <!-- 反思内容 -->
            <ReflectionStep
              v-if="step.type === 'reflection'"
              :content="step.content"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PlanStep from './PlanStep.vue'
import ThinkingStep from './ThinkingStep.vue'
import ActionStep from './ActionStep.vue'
import ReflectionStep from './ReflectionStep.vue'

const props = defineProps({
  steps: { type: Array, default: () => [] },
  stepCount: { type: Number, default: 0 }
})

// 折叠状态管理
const expandedPlans = ref(new Set())
const expandedActions = ref(new Set())
const expandedThinkings = ref(new Set())

// 计算行动步骤数量
const actionCount = computed(() => {
  return props.steps.filter(s => s.type === 'action').length
})

// hasFinalContent 改为由父组件传入的 prop 控制

// 切换 Plan 步骤折叠状态
const togglePlan = (index) => {
  if (expandedPlans.value.has(index)) {
    expandedPlans.value.delete(index)
  } else {
    expandedPlans.value.add(index)
  }
}

// 切换 Thinking 步骤折叠状态
const toggleThinking = (index) => {
  if (expandedThinkings.value.has(index)) {
    expandedThinkings.value.delete(index)
  } else {
    expandedThinkings.value.add(index)
  }
}

// 切换 Action 步骤折叠状态
const toggleAction = (index) => {
  if (expandedActions.value.has(index)) {
    expandedActions.value.delete(index)
  } else {
    expandedActions.value.add(index)
  }
}
</script>

<style scoped>
.agent-steps {
  margin-bottom: 20px;
  width: 100%;
}

/* 步骤头部 */
.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.steps-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.steps-counter {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-background-soft);
  padding: 2px 8px;
  border-radius: 10px;
}

/* 步骤容器 */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 步骤项 */
.step-item {
  display: flex;
  gap: 12px;
  padding: 6px 10px;
  background: var(--color-background-soft);
  border-radius: 8px;
  transition: background 0.2s ease;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.step-item:hover {
  background: var(--color-background-soft);
}

.step-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-border);
}

.step-item.step-plan::before {
  background: linear-gradient(180deg, #3b82f6, #60a5fa);
}

.step-item.step-thinking::before {
  background: linear-gradient(180deg, #8b5cf6, #a78bfa);
}

.step-item.step-action::before {
  background: linear-gradient(180deg, #10b981, #34d399);
}

.step-item.step-reflection::before {
  background: linear-gradient(180deg, #f59e0b, #fbbf24);
}

.step-item.step-error {
  background: rgba(239, 68, 68, 0.05);
}

.step-item.step-error::before {
  background: #ef4444;
}

/* 步骤内容包装器 */
.step-content-wrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.step-skill-tag {
  margin-bottom: 4px;
  flex-shrink: 0;
}

/* 步骤主体 */
.step-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  overflow: hidden;
}

/* 加载占位符 */
.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 12px;
}

.loading-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite, pulse 1.5s ease-in-out infinite;
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
</style>
