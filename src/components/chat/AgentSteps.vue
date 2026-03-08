<template>
  <div class="agent-steps">
    <div class="steps-header">
      <div class="steps-title">收到任务！现在我将为您规划并完成。</div>
      <div class="steps-counter">{{ stepCount || actionCount }} 步</div>
    </div>

    <div class="steps-container">
      <div v-if="steps.length === 0" class="loading-placeholder">
        <div class="loading-animation">
          <div class="pulse-ring"></div>
          <div class="pulse-ring delay-1"></div>
          <div class="pulse-ring delay-2"></div>
        </div>
        <div class="loading-content">
          <div class="loading-text">{{ currentTip }}</div>
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
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
        <div class="step-content-wrapper">
          <div v-if="step.skill" class="step-skill-tag">
            <el-tag size="small" type="info" effect="plain">
              {{ step.skill }}
            </el-tag>
          </div>

          <div class="step-body">
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

            <ThinkingStep
              v-if="step.type === 'thinking'"
              :think-content="step.thinkContent"
              :expanded="expandedThinkings.has(index)"
              @toggle="toggleThinking(index)"
            />

            <ActionStep
              v-if="step.type === 'action'"
              :success="step.success"
              :result="step.result"
              :result-type="step.resultType"
              :expanded="expandedActions.has(index)"
              @toggle="toggleAction(index)"
            />

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PlanStep from './PlanStep.vue'
import ThinkingStep from './ThinkingStep.vue'
import ActionStep from './ActionStep.vue'
import ReflectionStep from './ReflectionStep.vue'

const props = defineProps({
  steps: { type: Array, default: () => [] },
  stepCount: { type: Number, default: 0 }
})

const expandedPlans = ref(new Set())
const expandedActions = ref(new Set())
const expandedThinkings = ref(new Set())

const actionCount = computed(() => {
  return props.steps.filter(s => s.type === 'action').length
})

const tips = [
  '正在分析您的问题',
  '思考解决方案中',
  '规划执行步骤',
  '准备调用工具',
  '正在深度思考'
]

const currentTipIndex = ref(0)
const currentTip = computed(() => tips[currentTipIndex.value])

let tipInterval = null

onMounted(() => {
  tipInterval = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % tips.length
  }, 2000)
})

onUnmounted(() => {
  if (tipInterval) {
    clearInterval(tipInterval)
  }
})

const togglePlan = (index) => {
  if (expandedPlans.value.has(index)) {
    expandedPlans.value.delete(index)
  } else {
    expandedPlans.value.add(index)
  }
}

const toggleThinking = (index) => {
  if (expandedThinkings.value.has(index)) {
    expandedThinkings.value.delete(index)
  } else {
    expandedThinkings.value.add(index)
  }
}

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

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

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

.step-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  overflow: hidden;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  gap: 12px;
  background: linear-gradient(135deg, var(--color-background-soft) 0%, var(--color-background) 100%);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.loading-animation {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  opacity: 0;
  animation: pulse-ring 2s ease-out infinite;
}

.pulse-ring.delay-1 {
  animation-delay: 0.4s;
}

.pulse-ring.delay-2 {
  animation-delay: 0.8s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.loading-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  transition: opacity 0.3s ease;
}

.loading-dots {
  display: flex;
  gap: 3px;
}

.loading-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(1) {
  animation-delay: 0s;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
