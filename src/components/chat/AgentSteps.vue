<template>
  <div class="agent-steps">
    <div class="steps-header">
      <div class="steps-title">收到任务！</div>
      <div class="steps-counter">{{ stepCount || actionCount }} 步</div>
    </div>

    <div class="steps-container">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step-item"
        :class="[
          `step-${step.type}`,
          { 'step-error': step.status === 'error' },
          { 'step-process': step.status === 'process' }
        ]"
      >
        <!-- 步骤内容 -->
        <div class="step-content-wrapper">
          <div class="step-header">
            <div class="step-icon">
              <el-icon v-if="iconMap[step.icon]">
                <component :is="iconMap[step.icon]" />
              </el-icon>
            </div>
            <div class="step-info">
              <div class="step-title">{{ stepTitleMap[step.type] || step.title }}</div>
              <el-tag v-if="step.skill" size="small" type="info" effect="plain" class="skill-tag">
                {{ step.skill }}
              </el-tag>
            </div>
            <div class="step-status">
              <el-icon v-if="step.status === 'success'" class="status-icon success">
                <CircleCheck />
              </el-icon>
              <el-icon v-else-if="step.status === 'error'" class="status-icon error">
                <CircleClose />
              </el-icon>
              <el-icon v-else-if="step.status === 'process'" class="status-icon process">
                <Loading />
              </el-icon>
            </div>
          </div>

          <!-- 步骤主体内容 -->
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

    <div class="steps-divider" v-if="hasFinalContent">
      <div class="divider-line"></div>
<!--      <span class="divider-text">最终回复</span>-->
      <div class="divider-line"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  List, Opportunity, VideoPlay, View,
  CircleCheck, CircleClose, Loading
} from '@element-plus/icons-vue'
import PlanStep from './PlanStep.vue'
import ThinkingStep from './ThinkingStep.vue'
import ActionStep from './ActionStep.vue'
import ReflectionStep from './ReflectionStep.vue'

const props = defineProps({
  steps: { type: Array, default: () => [] },
  stepCount: { type: Number, default: 0 }
})

const iconMap = {
  List,
  Opportunity,
  VideoPlay,
  View
}

const stepTitleMap = {
  plan: '规划子任务',
  thinking: '完成策略',
  action: '行动结果',
  reflection: '反思总结'
}

// 折叠状态管理
const expandedPlans = ref(new Set())
const expandedActions = ref(new Set())
const expandedThinkings = ref(new Set())

// 计算行动步骤数量
const actionCount = computed(() => {
  return props.steps.filter(s => s.type === 'action').length
})

// 计算是否有最终内容
const hasFinalContent = computed(() => {
  return props.steps.length > 0
})

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
  display: flex;
  align-items: center;
  gap: 8px;
}

.steps-title::before {
  content: '';
  display: block;
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
  border-radius: 2px;
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
  padding: 12px;
  background: var(--color-background-soft);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.step-item:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-light);
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
  border-color: rgba(239, 68, 68, 0.3);
}

.step-item.step-error::before {
  background: #ef4444;
}

/* 步骤内容包装器 */
.step-content-wrapper {
  flex: 1;
  min-width: 0;
}

/* 步骤头部 */
.step-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.step-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.step-info {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.skill-tag {
  font-size: 11px;
}

/* 步骤状态 */
.step-status {
  flex-shrink: 0;
}

.status-icon {
  font-size: 18px;
}

.status-icon.success {
  color: #10b981;
}

.status-icon.error {
  color: #ef4444;
}

.status-icon.process {
  color: var(--color-primary);
  animation: spin 1s linear infinite;
}

/* 步骤主体 */
.step-body {
  padding-left: 0;
}

/* 分隔线 */
.steps-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
  position: relative;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    var(--color-border) 20%,
    var(--color-border) 80%,
    transparent
  );
}

.divider-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  padding: 4px 12px;
  background: var(--color-background-soft);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
