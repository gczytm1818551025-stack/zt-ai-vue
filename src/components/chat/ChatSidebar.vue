<template>
  <div class="chat-sidebar" :class="{ 'collapsed': isCollapsed }">
    <!-- 头部区域：Logo 与 新建按钮 -->
    <div class="sidebar-header">
      <div class="header-top">
        <div class="logo-section" v-if="!isCollapsed">
          <img src="@/assets/logo.png" alt="智瞳" class="logo-image" />
          <span class="logo-text">智瞳</span>
        </div>
        <!-- 主题切换按钮 -->
        <div class="header-actions">
          <el-button v-if="!isCollapsed" class="theme-toggle-btn" @click="handleThemeToggle" text>
            <el-icon v-if="currentTheme === 'light'">
              <Moon />
            </el-icon>
            <el-icon v-else>
              <Sunny />
            </el-icon>
          </el-button>
          <!-- 折叠按钮 (移至右上角) -->
          <div class="collapse-btn" @click="toggleCollapse" :title="isCollapsed ? '展开' : '收起'">
            <el-icon :class="{ 'is-collapsed': isCollapsed }"><Fold /></el-icon>
          </div>
        </div>
      </div>

      <!-- 新建对话按钮 -->
      <el-button
        v-if="!isCollapsed"
        class="new-chat-btn"
        @click="$emit('create')"
      >
        <el-icon><Plus /></el-icon>
        <span class="btn-text">新建对话</span>
      </el-button>
    </div>

    <!-- 会话列表区域 -->
    <div class="session-list" :class="{ 'collapsed': isCollapsed }" v-loading="loading">
      <SessionCard
        v-for="session in list"
        :key="session.sessionId"
        :session="session"
        :is-active="currentId === session.sessionId"
        :is-editing="editingId === session.sessionId"
        :is-collapsed="isCollapsed"
        @select="$emit('select', session)"
        @start-edit="startEdit(session)"
        @rename="confirmEdit(session, $event)"
        @finish-edit="finishEdit(session)"
        @delete="$emit('delete', session)"
        ref="sessionCardRefs"
      />
    </div>

    <!-- 底部区域：用户与折叠 -->
    <div class="sidebar-footer">
      <!-- 用户信息 -->
      <div class="user-info" :class="{ 'collapsed-mode': isCollapsed }">
        <el-avatar :size="32" icon="UserFilled" class="avatar" />
        <span v-if="!isCollapsed" class="username">{{ username }}</span>
        <el-button v-if="!isCollapsed" class="logout-btn" @click="$emit('logout')" text>
          <span class="lnr lnr-exit"></span>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Star, Plus, ChatDotRound, Fold, UserFilled, Sunny, Moon } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import SessionCard from './SessionCard.vue'

const props = defineProps({
  list: { type: Array, default: () => [] },
  currentId: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  username: { type: String, default: '用户' }
})

const emit = defineEmits(['create', 'select', 'rename', 'delete', 'logout'])
const store = useStore()

// 当前主题
const currentTheme = computed(() => store.getters.currentTheme)

// 折叠状态
const isCollapsed = ref(false)
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 主题切换
const handleThemeToggle = () => {
  store.dispatch('toggleTheme')
}

// 响应式自动收起侧边栏
const COLLAPSE_THRESHOLD = 768

const handleResize = () => {
  if (window.innerWidth < COLLAPSE_THRESHOLD) {
    isCollapsed.value = true
  } else {
    isCollapsed.value = false
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

// 重命名逻辑
const editingId = ref('')
const sessionCardRefs = ref([])

const startEdit = (session) => {
  editingId.value = session.sessionId
  // 通过 ref 聚焦到对应的输入框
  nextTick(() => {
    const index = list.value.findIndex(s => s.sessionId === session.sessionId)
    if (index !== -1 && sessionCardRefs.value[index]) {
      sessionCardRefs.value[index].focusEdit()
    }
  })
}

const confirmEdit = (session, newTitle) => {
  if (editingId.value === session.sessionId) {
    emit('rename', session.sessionId, newTitle)
    editingId.value = ''
  }
}

const finishEdit = (session) => {
  if (editingId.value === session.sessionId) {
    editingId.value = ''
  }
}


</script>

<style scoped>
.chat-sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--color-background);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  transition: all var(--transition-normal);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  position: relative;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.chat-sidebar::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.1), transparent);
  pointer-events: none;
  z-index: 1;
}

.chat-sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(to bottom, transparent, var(--color-border), transparent);
  pointer-events: none;
  z-index: 2;
}

.chat-sidebar.collapsed {
  width: 80px;
}

/* Header */
.sidebar-header {
  padding: var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  background: var(--sidebar-overlay-bg);
  backdrop-filter: blur(10px);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 32px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.chat-sidebar.collapsed .header-top {
  justify-content: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-xs);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
  transition: transform var(--transition-fast);
}

.logo-section:hover {
  transform: translateX(4px);
}

.logo-image {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.2));
  border: 1px solid var(--color-border);
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
  background: var(--color-background-soft);
}

.collapse-btn .el-icon {
  font-size: 18px;
}

.collapse-btn:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.is-collapsed {
  transform: rotate(180deg);
  transition: transform var(--transition-normal);
}

.new-chat-btn {
  width: 100%;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  justify-content: flex-start;
  padding: var(--space-md) var(--space-lg);
  transition: all var(--transition-normal);
  border-radius: var(--radius-md);
}

.new-chat-btn.icon-only {
  justify-content: center;
  padding: var(--space-md) 0;
}

.new-chat-btn:hover {
  background: var(--color-primary-soft);
  border-color: transparent;
  transform: translateY(1px);
  box-shadow: var(--shadow-sm);
}

.new-chat-btn .el-icon {
  font-size: 16px;
  margin-right: 8px;
  color: var(--color-primary);
}

/* List */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md) var(--space-sm);
}

.session-list.collapsed {
  padding: 0;
  overflow: hidden;
}

.session-list.collapsed .session-item {
  display: none;
}

.session-list::-webkit-scrollbar {
  width: 0;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: transparent;
}

/* Footer */
.sidebar-footer {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  background: var(--sidebar-overlay-bg);
  backdrop-filter: blur(10px);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--color-background);
  transition: all var(--transition-normal);
  border: 1px solid var(--color-border);
}

.user-info.collapsed-mode {
  justify-content: center;
  padding: var(--space-md) var(--space-sm);
}

.user-info:hover {
  background: var(--color-background);
  border-color: var(--color-border);
  box-shadow: none;
}

.user-info .avatar {
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  transition: transform var(--transition-fast);
  border: 1px solid var(--color-border);
}

.user-info:hover .avatar {
  transform: none;
}

.username {
  flex: 1;
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.theme-toggle-btn {
  padding: 8px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: none;
  width: 32px;
  height: 32px;
}

.theme-toggle-btn:hover {
  background: transparent;
  border: none;
  color: var(--color-primary);
  transform: scale(1.05);
}

/* 暗模式下的主题切换按钮样式 */
:root.dark .theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.theme-toggle-btn .el-icon {
  font-size: 18px;
}

.logout-btn {
  padding: 8px 6px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  background: var(--color-background-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-danger);
}

.logout-btn .lnr {
  font-size: 20px;
  line-height: 1;
}

.logout-btn:hover .lnr {
  color: var(--color-danger);
}

.logout-btn:active .lnr {
  transform: translateX(4px) translateY(1px);
}

/* 暗模式下的退出登录按钮样式 */
:root.dark .logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 动画 */
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

/* 响应式调整 */
@media (max-width: 768px) {
  .chat-sidebar {
    width: 240px;
  }

  .chat-sidebar.collapsed {
    width: 70px;
  }
}
</style>
