<template>
  <div class="chat-input-container">
    <div class="input-group">
      <el-input
        v-model="inputValue"
        type="textarea"
        :autosize="{ minRows: 1 }"
        placeholder="有什么我能帮您的？"
        resize="none"
        class="custom-textarea"
        :class="{ 'is-focused': isFocused }"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown.enter.prevent="handleEnter"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />

      <div class="action-bar">
        <!-- 左侧工具栏 (预留) -->
        <div class="left-tools">
          <el-button text circle class="tool-btn">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>

        <!-- 右侧操作栏 -->
        <div class="right-actions">
          <!-- ReAct 模式开关 -->
          <div class="react-switch-wrapper" :class="{ 'is-active': reactModeValue }">
            <span class="switch-label" @click="reactModeValue = false">Chat</span>
            <el-switch
              v-model="reactModeValue"
              class="react-mode-switch"
              size="small"
              :disabled="generating"
              style="--el-switch-on-color: var(--color-primary); --el-switch-off-color: var(--color-text-tertiary)"
            />
            <span class="switch-label" @click="reactModeValue = true">Agent</span>
          </div>

          <!-- 停止/发送按钮 -->
          <el-button
            v-if="generating"
            type="primary"
            circle
            class="stop-btn"
            @click="$emit('stop')"
          >
            <div class="stop-icon-square"></div>
          </el-button>

          <el-button
            v-else
            type="primary"
            :disabled="!inputValue.trim()"
            @click="handleSend"
            class="send-btn"
            circle
          >
            <el-icon><Position /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="footer-tip">
      内容由 AI 生成，请仔细甄别。
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Position, VideoPause, Plus } from '@element-plus/icons-vue'

const props = defineProps({
  generating: { type: Boolean, default: false },
  reactMode: { type: Boolean, default: false }
})

const emit = defineEmits(['send', 'stop', 'update:reactMode'])

const inputValue = ref('')
const isFocused = ref(false)
const isComposing = ref(false)
const reactModeValue = ref(props.reactMode)

// 监听 reactMode 变化，同步到父组件
watch(() => props.reactMode, (newVal) => {
  reactModeValue.value = newVal
})

// 监听 reactModeValue 变化，通知父组件
watch(reactModeValue, (newVal) => {
  emit('update:reactMode', newVal)
})

const handleSend = () => {
  const text = inputValue.value.trim()
  if (!text || props.generating) return

  emit('send', text)
  inputValue.value = ''
}

const handleEnter = (e) => {
  if (!e.shiftKey && !isComposing.value) {
    // 发送消息，清空输入框
    const text = inputValue.value.trim()
    if (text && !props.generating) {
      emit('send', text)
      inputValue.value = ''
    }
  } else if (!e.shiftKey && isComposing.value) {
    // 中文输入法状态下按回车，不发送消息，让输入法正常工作
    return
  } else {
    // Shift + Enter 换行
    inputValue.value += '\n'
  }
}

const onCompositionStart = () => {
  isComposing.value = true
}

const onCompositionEnd = () => {
  isComposing.value = false
}
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-lg) var(--space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  background: var(--chat-input-bg);
  padding: 12px;
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
}

.input-group:focus-within {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1), 0 8px 32px rgba(59, 130, 246, 0.12);
  border-color: var(--color-border);
  transform: translateY(-2px);
}

.custom-textarea {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  box-shadow: none !important;
}

.custom-textarea :deep(.el-textarea__inner) {
  box-shadow: none !important;
  border: none !important;
  padding: 8px 4px;
  background: transparent;
  resize: none;
  min-height: 24px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text-primary);
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.custom-textarea :deep(.el-textarea__inner):focus {
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* 滚动条隐藏 */
.custom-textarea :deep(.el-textarea__inner)::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.custom-textarea :deep(.el-textarea__inner) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-top: 4px;
}

.left-tools {
  display: flex;
  align-items: center;
}

.tool-btn {
  width: 32px;
  height: 32px;
  color: var(--color-text-tertiary);
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: var(--color-background-soft);
  color: var(--color-text-primary);
  transform: scale(1.1);
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.react-switch-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background-soft);
  padding: 4px 8px;
  border-radius: 20px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.react-switch-wrapper:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.react-switch-wrapper.is-active {
  background: var(--color-background-soft);
  border-color: transparent;
}

.switch-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color 0.3s ease;
  user-select: none;
  font-weight: 500;
}

.react-switch-wrapper.is-active .switch-label:last-child {
  color: var(--color-primary);
  font-weight: 600;
}

.react-switch-wrapper:not(.is-active) .switch-label:first-child {
  color: var(--color-primary);
  font-weight: 600;
}

/* 按钮基础样式 */
.action-bar .el-button.send-btn,
.action-bar .el-button.stop-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.action-bar .el-button .el-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

/* 发送按钮 */
.send-btn {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.send-btn:hover {
  background: var(--color-primary-dark);
  transform: scale(1.05) rotate(-10deg);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.send-btn:active {
  transform: scale(0.95);
}

/* 停止按钮 */
.stop-btn {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.stop-btn:hover {
  background: var(--color-primary-dark);
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.stop-btn .el-icon {
  animation: none;
}

.stop-icon-square {
  width: 10px;
  height: 10px;
  background-color: #fff;
  border-radius: 2px;
}

/* ReAct 开关 */
.react-mode-switch {
  margin-left: 4px;
  height: 24px;
}

.react-mode-switch :deep(.el-switch__core) {
  border-color: transparent;
}

.react-mode-switch :deep(.el-switch__label) {
  color: var(--color-text-tertiary);
  font-size: 12px;
  font-weight: 500;
}

.react-mode-switch.is-checked :deep(.el-switch__label--right) {
  color: var(--color-primary);
}

/* 底部提示 */
.footer-tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 12px;
  text-align: center;
  opacity: 0.8;
  letter-spacing: 0.5px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .chat-input-container {
    padding: 0 16px 20px;
  }

  .input-group {
    padding: 10px;
    border-radius: 20px;
  }

  .custom-textarea :deep(.el-textarea__inner) {
    font-size: 14px;
    padding: 6px 2px;
  }

  .action-bar .el-button.send-btn,
  .action-bar .el-button.stop-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }
}

@media (max-width: 480px) {
  .input-group {
    padding: 8px 10px;
  }

  .custom-textarea :deep(.el-textarea__inner) {
    font-size: 13px;
    line-height: 1.5;
    min-height: 24px;
    padding: 0;
  }

  .action-bar .el-button.send-btn,
  .action-bar .el-button.stop-btn {
    width: 28px;
    height: 28px;
  }

  .action-bar .el-button .el-icon {
    font-size: 14px;
  }

  .custom-textarea :deep(.el-textarea__inner)::placeholder {
    font-size: 13px;
  }
}
</style>
