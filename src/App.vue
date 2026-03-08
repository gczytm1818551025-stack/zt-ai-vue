<template>
  <router-view />
</template>

<style>
/* 全局视窗和布局修复 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--font-family-sans);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

/* 修复iOS Safari视窗问题 */
@supports (-webkit-touch-callout: none) {
  html, body {
    height: -webkit-fill-available;
  }
  
  #app {
    height: -webkit-fill-available;
  }
}

/* 确保所有元素都使用正确的盒模型 */
* {
  box-sizing: border-box;
}

/* 修复滚动行为 */
html {
  scroll-behavior: smooth;
}

/* 防止文本选择干扰界面操作 */
.no-select {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>