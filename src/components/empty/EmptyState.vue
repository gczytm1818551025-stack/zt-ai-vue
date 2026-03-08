<template>
  <div class="empty-state">
    <div class="empty-icon-wrapper">
      <div class="brain-icon-large">
        <img src="@/assets/logo.png" alt="智瞳" class="empty-logo-image" />
      </div>
    </div>
    <h2 class="empty-title">你好，我是智瞳</h2>
    <p class="empty-subtitle">智慧之眼，洞察本质</p>
  </div>
</template>

<script setup>
// 空状态组件，无需额外逻辑
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  gap: 24px;
  padding: 64px 24px;
  text-align: center;
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-logo-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
  animation: pulse 2s ease-in-out infinite;
}

.empty-icon-wrapper::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
  animation: pulse-ring 3s ease-in-out infinite;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
  animation: slideInUp 0.6s ease 0.2s both;
}

.empty-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
  max-width: 400px;
  animation: slideInUp 0.6s ease 0.4s both;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes pulse-ring {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .empty-state {
    padding: 64px 20px;
  }
}

@media (max-width: 768px) {
  .empty-state {
    padding: var(--space-2xl) var(--space-lg);
    gap: var(--space-lg);
  }

  .empty-logo-image {
    width: 64px;
    height: 64px;
  }

  .empty-title {
    font-size: var(--font-size-xl);
  }

  .empty-subtitle {
    font-size: var(--font-size-sm);
  }
}

@media (max-width: 480px) {
  .empty-state {
    padding: var(--space-xl) var(--space-md);
    gap: var(--space-md);
  }

  .empty-logo-image {
    width: 56px;
    height: 56px;
  }

  .empty-title {
    font-size: var(--font-size-lg);
  }

  .empty-subtitle {
    font-size: var(--font-size-xs);
  }
}
</style>
