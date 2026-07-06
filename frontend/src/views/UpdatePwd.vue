<template>
  <div class="container main-content" style="max-width: 450px; margin-top: 50px; margin-bottom: 80px;">
    <div class="panel panel-default">
      <div class="panel-heading text-center" style="font-size: 18px; font-weight: bold; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; color: white;">
        🔒 修改密码
      </div>
      <div class="panel-body">
        <form @submit.prevent="handleUpdatePwd">
          <!-- 原密码 -->
          <div class="form-group">
            <label for="oldPwd">输入原密码</label>
            <input 
              type="password" 
              class="form-control" 
              id="oldPwd" 
              v-model="oldPassword" 
              placeholder="请输入原登录密码" 
              required
            />
          </div>

          <!-- 新密码 -->
          <div class="form-group">
            <label for="newPwd">输入新密码</label>
            <input 
              type="password" 
              class="form-control" 
              id="newPwd" 
              v-model="newPassword" 
              placeholder="请输入新的登录密码" 
              required
            />
          </div>

          <!-- 确认密码 -->
          <div class="form-group">
            <label for="confirmNewPwd">确认新密码</label>
            <input 
              type="password" 
              class="form-control" 
              id="confirmNewPwd" 
              v-model="confirmNewPassword" 
              placeholder="请再次输入新密码" 
              required
            />
          </div>

          <!-- 提交 -->
          <button type="submit" class="btn btn-danger btn-block" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; padding: 10px; font-size: 16px;">
            确认提交修改
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'UpdatePwd',
  setup() {
    const router = useRouter()
    const oldPassword = ref('')
    const newPassword = ref('')
    const confirmNewPassword = ref('')

    // 思考过程 (Chinese Thinking Process):
    // 1. 密码修改页面同样采用响应式状态进行提交校验，对比新旧密码并判断一致性。
    // 2. 将 `oldPassword` 和 `newPassword` 拼入请求体发送到 `/api/user/password` 接口。
    // 3. 为支持后端鉴权，将当前已登录的 `store.user.account` 拼入请求头 `X-User-Account`。
    // 4. 成功后强制清空会话 (store.logout())，引导用户重新使用新密码登录。

    const handleUpdatePwd = async () => {
      const oldPwd = oldPassword.value.trim()
      const newPwd = newPassword.value.trim()
      const confPwd = confirmNewPassword.value.trim()

      if (newPwd.length < 6) {
        alert('新密码长度不能少于6个字符！')
        return
      }

      if (newPwd !== confPwd) {
        alert('两次输入的新密码不一致，请核对！')
        return
      }

      try {
        const res = await fetch('/api/user/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({
            oldPassword: oldPwd,
            newPassword: newPwd
          })
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '修改密码失败')
          return
        }

        alert('密码修改成功，请用新密码重新登录！')
        store.logout()
      } catch (err) {
        alert('修改发生异常: ' + err.message)
      }
    }

    return {
      oldPassword,
      newPassword,
      confirmNewPassword,
      handleUpdatePwd
    }
  }
}
</script>
