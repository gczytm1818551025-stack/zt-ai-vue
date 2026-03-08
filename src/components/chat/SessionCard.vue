<template>
  <div
    class="session-item"
    :class="{
      'active': isActive,
      'editing': isEditing,
      'collapsed': isCollapsed,
      'pulse-active': isActive && isAgent
    }"
    @click="$emit('select')"
  >
    <!-- 展开状态下显示内容 -->
    <div class="item-content" v-if="!isCollapsed">
      <!-- 编辑模式 -->
      <div v-if="isEditing" class="edit-wrapper" @click.stop ref="editWrapperRef">
        <el-input
          v-model="editTitle"
          size="small"
          ref="editInputRef"
          @blur="confirmEdit"
          @keyup.enter="confirmEdit"
        />
      </div>
      <!-- 展示模式 -->
      <div v-else class="info-wrapper">
        <span class="title" :title="sessionTitle">{{ sessionTitle || '新对话' }}</span>
      </div>
    </div>

    <!-- 操作按钮 (仅在展开且hover或激活时显示) -->
    <div class="item-actions" v-if="!isCollapsed && !isEditing">
      <el-icon class="action-icon edit-icon" @click.stop="$emit('start-edit')"><Edit /></el-icon>
      <el-icon class="action-icon delete-icon" @click.stop="$emit('delete')"><Delete /></el-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, onUnmounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  session: { type: Object, default: () => ({}) },
  isActive: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  isCollapsed: { type: Boolean, default: false }
})

const isAgent = computed(() => props.session?.sessionType === 'AGENT')

const emit = defineEmits(['select', 'start-edit', 'rename', 'delete', 'finish-edit'])

const editTitle = ref('')
const editInputRef = ref(null)
const editWrapperRef = ref(null)

// 监听 session 变化，同步 editTitle
watch(() => props.session, (newSession) => {
  if (newSession && newSession.title) {
    editTitle.value = newSession.title
  }
}, { immediate: true })

const sessionTitle = computed(() => props.session?.title || '')

const confirmEdit = () => {
  if (props.isEditing) {
    if (editTitle.value !== props.session.title) {
      emit('rename', editTitle.value)
    } else {
      emit('finish-edit')
    }
  }
}

const handleClickOutside = (event) => {
  if (editWrapperRef.value && !editWrapperRef.value.contains(event.target)) {
    confirmEdit()
  }
}

watch(() => props.isEditing, (newValue) => {
  if (newValue) {
    nextTick(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
    })
  } else {
    document.removeEventListener('mousedown', handleClickOutside, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside, true)
})

// 暴露方法供父组件调用
defineExpose({
  focusEdit: () => {
    nextTick(() => {
      editInputRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  padding: var(--space-sm) var(--space-lg);
  margin-bottom: var(--space-xs);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-primary);
  position: relative;
  transition: all var(--transition-normal);
  background: var(--color-background-soft);
  border: 1px solid transparent;
}

.session-item:hover {
  background: var(--color-background);
  border-color: transparent;
  transform: translateX(4px);
  box-shadow: var(--shadow-lg);
}

.session-item.active {
  background: var(--color-background);
  border-color: transparent;
  transform: translateX(4px);
  box-shadow: var(--shadow-lg);
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.info-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  font-weight: 400;
  color: var(--color-text-primary);
}

.item-actions {
  display: none;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to right, transparent 0%, var(--color-background-soft) 30%, var(--color-background) 100%);
  padding: 0 var(--space-md) 0 var(--space-lg);
  gap: var(--space-sm);
  align-items: center;
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}

.session-item.active .item-actions {
  display: flex;
  animation: fadeIn 0.3s ease;
}

.session-item:hover .item-actions {
  display: flex;
  animation: fadeIn 0.3s ease;
}

.action-icon {
  padding: 8px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  background: var(--color-background-soft);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 26px;
}

.action-icon:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  transform: scale(1.15);
}

.edit-wrapper {
  width: 100%;
  padding: 0 4px;
  box-sizing: border-box;
}

.edit-wrapper :deep(.el-input) {
  width: 100%;
}

.edit-wrapper :deep(.el-input__wrapper) {
  background: var(--color-background);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  box-shadow: none !important;
  padding: 0 8px;
  transition: all var(--transition-fast);
}

.edit-wrapper :deep(.el-input__wrapper:hover) {
  background: var(--color-background);
  border-color: transparent;
}

.edit-wrapper :deep(.el-input__wrapper.is-focus) {
  border-color: transparent !important;
  box-shadow: none !important;
}

.edit-wrapper :deep(.el-input__inner) {
  background: transparent;
  border: none;
  box-shadow: none !important;
  padding: 0;
  min-height: 24px;
  line-height: 24px;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  outline: none !important;
}

/* 编辑模式高亮样式 - 移除高亮 */
.session-item.editing .edit-wrapper :deep(.el-input__wrapper.is-focus),
.session-item.editing .edit-wrapper :deep(.el-input__wrapper:focus) {
  background: var(--color-background);
  border-color: transparent !important;
  box-shadow: none !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Agent 会话呼吸闪烁效果 */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.6);
  }
}

.session-item.pulse-active {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* 响应式调整 */
@media (hover: none) and (pointer: coarse) {
  .session-item:hover {
    transform: none;
    box-shadow: var(--shadow-sm);
  }
  .action-btn:hover {
    transform: none;
  }
}
</style>
