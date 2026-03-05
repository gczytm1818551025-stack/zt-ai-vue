<template>
  <div class="login-container">
    <div class="login-bg"></div>
    <div class="theme-toggle-container">
      <el-button 
        class="theme-toggle-btn" 
        circle 
        @click="handleThemeToggle"
        :title="currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式'"
      >
        <el-icon v-if="currentTheme === 'light'">
          <Moon />
        </el-icon>
        <el-icon v-else>
          <Sunny />
        </el-icon>
      </el-button>
    </div>
    <div class="login-content">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-container">
            <img src="@/assets/logo.png" alt="智瞳" class="logo-image" />
          </div>
          <h2 class="login-title">智瞳</h2>
          <p class="login-subtitle">智慧之眼，洞察本质</p>
        </div>
        <el-form :model="loginForm" :rules="rules" ref="loginFormRef" label-width="0" class="login-form">
        <el-form-item prop="phone" class="form-item">
          <el-input 
            v-model="loginForm.phone" 
            placeholder="请输入手机号" 
            class="login-input"
            size="large"
          >
            <template #prefix>
              <el-icon><Iphone /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="code" class="form-item">
          <div class="code-input-wrapper">
            <el-input 
              v-model="loginForm.code" 
              placeholder="请输入验证码" 
              class="login-input"
              size="large"
            >
              <template #prefix>
                <el-icon><Key /></el-icon>
              </template>
            </el-input>
            <el-button 
              :type="isSending ? 'info' : 'primary'" 
              :disabled="isSending" 
              @click="handleSendCode"
              size="large"
              class="send-btn"
              :class="{ 'btn-sending': isSending }"
            >
              {{ isSending ? `${countdown}秒后重试` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item class="form-item">
          <el-button 
            type="primary" 
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
            size="large"
            round
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
        <div class="login-footer">
          <p class="footer-text">© 2026 智瞳. 保留所有权利</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { sendCode } from '@/api/user'
import { ElMessage } from 'element-plus'
import { Iphone, Key, Star, Sunny, Moon } from '@element-plus/icons-vue'

const store = useStore()
const router = useRouter()
const loginFormRef = ref(null)

const currentTheme = computed(() => store.getters.currentTheme)

const handleThemeToggle = () => {
  store.dispatch('toggleTheme')
}

const loginForm = reactive({
  phone: '',
  code: ''
})

const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度应为6位', trigger: 'blur' }
  ]
}

const loading = ref(false)
const isSending = ref(false)
const countdown = ref(60)
const phoneFocus = ref(false)
const codeFocus = ref(false)
let timer = null

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

const handleSendCode = async () => {
  // Validate phone only
  if (!loginFormRef.value) return
  
  loginFormRef.value.validateField('phone', async (valid) => {
    if (valid) {
      try {
        isSending.value = true
        await sendCode(loginForm.phone)
        ElMessage({
          message: '验证码发送成功'
        })
        startCountdown()
      } catch (error) {
        isSending.value = false
      }
    }
  })
}

const startCountdown = () => {
  countdown.value = 60
  if (timer) clearInterval(timer)
  
  timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(timer)
      timer = null
      isSending.value = false
    }
  }, 1000)
}

const handleLogin = () => {
  if (!loginFormRef.value) return

  loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await store.dispatch('login', loginForm)
        router.push('/')
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
/* 登录容器 */
.login-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: var(--login-bg-gradient);
  margin: 0;
  padding: 0;
  z-index: 1;
}

/* 修复iOS Safari视窗问题 */
@supports (-webkit-touch-callout: none) {
  .login-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}

/* 背景装饰 */
.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(148, 163, 184, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(34, 197, 94, 0.06) 0%, transparent 50%),
              radial-gradient(circle at 60% 20%, rgba(245, 158, 11, 0.05) 0%, transparent 50%);
}

/* 主题切换按钮 */
.theme-toggle-container {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 20;
}

.theme-toggle-btn.el-button {
  width: 40px;
  height: 40px;
  font-size: 20px;
  background-color: var(--color-background-soft);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.theme-toggle-btn.el-button:hover {
  background-color: var(--color-background);
  color: var(--color-primary);
  border-color: var(--color-border);
  transform: rotate(15deg);
  box-shadow: var(--shadow-md);
}

/* 登录内容 */
.login-content {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 20px;
}

/* 登录卡片 */
.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-2xl) var(--space-xl);
  transition: all var(--transition-normal);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.login-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.05), transparent);
  transform: rotate(45deg);
  pointer-events: none;
}

.login-card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
  border-color: var(--color-border-hover);
}

/* 登录头部 */
.login-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  height: 120px;
  margin: 0 auto var(--space-lg);
  position: relative;
}

.logo-container::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
}

.logo-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.2));
  position: relative;
  z-index: 1;
  border: 2px solid var(--color-background-soft);
}

.login-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
  letter-spacing: 0.5px;
}

.login-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  letter-spacing: 0.25px;
}

/* 登录表单 */
.login-form {
  width: 100%;
}

.form-item {
  margin-bottom: var(--space-xl);
}

/* 输入框包装 */
.input-wrapper {
  display: none;
}

/* 登录输入框 - 适配 Element Plus */
.login-input {
  flex: 1;
  height: 54px;
  line-height: 54px;
  --el-input-bg-color: var(--color-background-soft);
  --el-input-border-color: var(--color-border);
  --el-input-hover-border-color: var(--color-border-hover);
  --el-input-focus-border-color: var(--color-primary);
  --el-input-text-color: var(--color-text-primary);
  --el-input-placeholder-color: var(--color-text-tertiary);
}

.login-input :deep(.el-input__wrapper) {
  background-color: var(--color-background-soft) !important;
  box-shadow: 0 0 0 1px var(--color-border) inset !important;
  border-radius: var(--radius-lg) !important;
  padding: 0 16px !important;
  transition: all var(--transition-normal) !important;
  height: 54px !important;
  box-sizing: border-box !important;
}

.login-input :deep(.el-input__wrapper:hover:not(.is-focus)) {
  box-shadow: 0 0 0 1px var(--color-border-hover) inset !important;
  background-color: var(--color-background-soft) !important;
}

.login-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--color-primary) inset !important;
  background-color: var(--color-background-soft) !important;
  outline: none !important;
}

.login-input :deep(.el-input__wrapper.is-error) {
  box-shadow: 0 0 0 1px var(--color-danger) inset !important;
  background-color: var(--color-background-soft) !important;
}

.login-input :deep(.el-input__inner) {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: 54px;
  height: 54px;
  box-sizing: border-box;
  background-color: transparent !important;
}

.login-input :deep(.el-input__inner:focus) {
  outline: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
}

.login-input :deep(.el-input__prefix-inner) {
  font-size: 20px;
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.login-input :deep(.el-input__wrapper.is-focus .el-input__prefix-inner) {
  color: var(--color-primary);
}

/* 验证码输入包装 */
.code-input-wrapper {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  width: 100%;
}

/* 发送验证码按钮 */
.send-btn {
  flex-shrink: 0;
  width: 120px;
  height: 54px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-normal);
}

.send-btn:hover:not(:disabled) {
  background: var(--color-primary-soft);
  border-color: var(--color-border);
  color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: none;
}

.send-btn:disabled {
  background: var(--color-background-soft);
  border-color: var(--color-border);
  color: var(--color-text-tertiary);
  box-shadow: none;
}

.btn-sending {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 54px;
  border-radius: var(--radius-lg);
  border: none;
  background: #1e293b;
  color: white;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.5px;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-md);
}

.login-btn:hover:not(:disabled) {
  background: #0f172a;
  box-shadow: var(--shadow-lg);
  transform: none;
}

.login-btn:disabled {
  background: var(--color-background-soft);
  color: var(--color-text-tertiary);
  box-shadow: none;
}

/* 登录底部 */
.login-footer {
  margin-top: var(--space-xl);
  text-align: center;
}

.footer-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.25px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    padding: var(--space-xl) var(--space-lg);
    max-width: 90%;
  }
  
  .logo-container {
    width: 100px;
    height: 100px;
  }
  
  .logo-container::before {
    width: 100px;
    height: 100px;
  }
  
  .logo-image {
    width: 64px;
    height: 64px;
  }
  
  .login-title {
    font-size: var(--font-size-xl);
  }
  
  .login-input {
    font-size: var(--font-size-sm);
    height: 48px;
    line-height: 48px;
  }
  
  .login-input :deep(.el-input__wrapper) {
    height: 48px;
  }
  
  .login-input :deep(.el-input__inner) {
    line-height: 48px;
    height: 48px;
  }
  
  .send-btn {
    width: 100px;
    height: 48px;
    font-size: var(--font-size-xs);
  }
  
  .login-btn {
    height: 48px;
    font-size: var(--font-size-sm);
    background: #1e293b;
    color: white;
  }
  
  .login-btn:hover:not(:disabled) {
    background: #0f172a;
  }
  
  .form-item {
    margin-bottom: var(--space-lg);
  }
  
  .login-header {
    margin-bottom: var(--space-xl);
  }
  
  .code-input-wrapper {
    gap: var(--space-sm);
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: var(--space-lg) var(--space-md);
    max-width: 95%;
  }
  
  .logo-container {
    width: 80px;
    height: 80px;
  }
  
  .logo-container::before {
    width: 80px;
    height: 80px;
  }
  
  .logo-image {
    width: 56px;
    height: 56px;
  }
  
  .login-title {
    font-size: var(--font-size-lg);
  }
  
  .login-subtitle {
    font-size: var(--font-size-xs);
  }
  
  .login-input {
    font-size: var(--font-size-xs);
    height: 44px;
    line-height: 44px;
  }
  
  .login-input :deep(.el-input__wrapper) {
    height: 44px;
  }
  
  .login-input :deep(.el-input__inner) {
    line-height: 44px;
    height: 44px;
  }
  
  .send-btn {
    width: 90px;
    height: 44px;
    font-size: var(--font-size-xs);
  }
  
  .login-btn {
    height: 44px;
    font-size: var(--font-size-xs);
    background: #1e293b;
    color: white;
  }
  
  .login-btn:hover:not(:disabled) {
    background: #0f172a;
  }
  
  .form-item {
    margin-bottom: var(--space-md);
  }
  
  .login-header {
    margin-bottom: var(--space-lg);
  }
  
  .code-input-wrapper {
    gap: var(--space-xs);
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .login-card:hover {
    transform: none;
    box-shadow: var(--shadow-lg);
  }
  
  .send-btn:hover:not(:disabled) {
    transform: none;
    box-shadow: var(--shadow-md);
  }
  
  .login-btn:hover:not(:disabled) {
    transform: none;
    box-shadow: var(--shadow-lg);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .login-card {
    animation: none;
  }
  
  .login-card:hover {
    transform: none;
  }
  
  .send-btn:hover:not(:disabled) {
    transform: none;
  }
  
  .login-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>

<style>
.custom-success-message {
  background-color: #f0f0f0;
  border: none;
  color: #666;
}
</style>