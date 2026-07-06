import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 思考过程 (Chinese Thinking Process):
// 这里是 Vue 3 SPA 的主入口程序。
// 我们在 main.js 中执行以下重要初始化步骤：
// 1. 引入原项目中的 Bootstrap 和我们特制的光影存证 CSS 样式。这可以确保打包后，
//    页面外观没有任何样式塌陷，100% 还原 JQuery 版本的外观。
// 2. 将路由对象 (router) 注册注入到 Vue App 实例中，启动单页面哈希路由跳转功能。

// 引入原项目的 CSS 基础样式库
import './assets/css/bootstrap.min.css'
import './assets/css/photo-style.css'

const app = createApp(App)

app.use(router)

app.mount('#app')
