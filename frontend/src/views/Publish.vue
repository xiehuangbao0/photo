<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <!-- 摄影师投稿卡片 -->
    <div v-if="store.user?.role === 'photographer'" class="panel panel-default" style="box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden;">
      <div class="panel-heading" style="font-size: 18px; font-weight: bold; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important; color: white; padding: 15px;">
        ✨ 作品投稿参赛
      </div>
      <div class="panel-body" style="padding: 30px;">
        <form @submit.prevent="handlePublish">
          <!-- 选择赛事 -->
          <div class="form-group">
            <label>选择参赛赛事 <span class="text-danger">*</span></label>
            <select class="form-control" v-model="selectedTournamentId" required>
              <option value="">-- 请选择要投稿的赛事 --</option>
              <option v-for="t in activeTournaments" :key="t.id" :value="t.id">
                🏆 {{ t.name }}
              </option>
            </select>
          </div>

          <!-- 作品名称 -->
          <div class="form-group">
            <label for="workName">作品名称 <span class="text-danger">*</span></label>
            <input 
              type="text" 
              class="form-control" 
              id="workName" 
              v-model="workName" 
              placeholder="请输入作品名称（如：雪山之巅）" 
              required
            />
          </div>

          <!-- 摄影分类 -->
          <div class="form-group">
            <label>摄影作品分类 <span class="text-danger">*</span></label>
            <select class="form-control" v-model="category" required>
              <option value="风光摄影">风光摄影</option>
              <option value="自然风光">自然风光</option>
              <option value="人像摄影">人像摄影</option>
              <option value="纪实人文">纪实人文</option>
              <option value="人文摄影">人文摄影</option>
              <option value="夜景摄影">夜景摄影</option>
              <option value="静物摄影">静物摄影</option>
            </select>
          </div>

          <!-- 拍摄器材 -->
          <div class="form-group">
            <label for="equipment">拍摄器材 (EXIF 信息)</label>
            <input 
              type="text" 
              class="form-control" 
              id="equipment" 
              v-model="equipment" 
              placeholder="例如：佳能EOS R6 + RF24-70mm F2.8 L (选填)"
            />
          </div>

          <!-- 版权价格 -->
          <div class="form-group">
            <label for="price">版权授权价格 (人民币元) <span class="text-danger">*</span></label>
            <input 
              type="number" 
              class="form-control" 
              id="price" 
              v-model.number="price" 
              min="0" 
              placeholder="请输入商用授权的售价（元）" 
              required
            />
          </div>

          <!-- 创作简介 -->
          <div class="form-group">
            <label for="desc">创作简介 <span class="text-danger">*</span></label>
            <textarea 
              class="form-control" 
              id="desc" 
              v-model="desc" 
              rows="4" 
              placeholder="描述您的创作灵感、构图想法、或者拍摄背后的精彩故事..." 
              required
            ></textarea>
          </div>

          <!-- 上传文件 -->
          <div class="form-group">
            <label>上传作品图片 <span class="text-danger">*</span></label>
            <input 
              type="file" 
              id="imgInput" 
              accept="image/*" 
              @change="handleFileChange" 
              ref="fileInput"
              style="display: block; margin-top: 5px;"
            />
            <div v-if="previewSrc" style="margin-top: 15px;">
              <p class="small text-muted">🎨 图片预览：</p>
              <img 
                :src="previewSrc" 
                class="img-responsive img-thumbnail" 
                style="max-width: 320px; max-height: 240px; object-fit: cover;"
              />
            </div>
          </div>

          <!-- 投稿按钮 -->
          <div style="margin-top: 30px;">
            <button 
              type="submit" 
              class="btn btn-primary" 
              style="font-weight: bold; padding: 10px 30px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none; border-radius: 4px;"
              :disabled="submitting"
            >
              {{ submitting ? '🚀 正在上传保存...' : '提交投稿申请' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 权限不足面板 -->
    <div v-else class="panel panel-default" style="box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden;">
      <div class="panel-heading bg-danger text-white">🚫 权限不足</div>
      <div class="panel-body text-center" style="padding: 50px;">
        <h3 class="text-danger" style="margin-bottom: 20px; font-weight: bold;">❌ 普通投票用户无法投稿参赛</h3>
        <p class="text-secondary" style="margin-bottom: 20px;">投稿作品并存证的权限仅开放给摄影师账号使用。</p>
        <p class="text-secondary" style="margin-bottom: 30px;">如果您拥有个人摄影作品需要参赛，请退出当前账号并注册为摄影师角色。</p>
        <router-link to="/register" class="btn btn-primary" style="padding: 10px 25px;">注册摄影师账号</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'Publish',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const activeTournaments = ref([])

    // 表单双向绑定
    const selectedTournamentId = ref('')
    const workName = ref('')
    const category = ref('风光摄影')
    const equipment = ref('')
    const price = ref('')
    const desc = ref('')
    const selectedFile = ref(null)
    const previewSrc = ref('')
    const submitting = ref(false)

    // 思考过程 (Chinese Thinking Process):
    // 1. 本页面只允许摄影师角色进行作品的参赛投稿。
    // 2. 加载所有的进行中 (active) 赛事。如果路由中传递了 `tournamentId` 参数（如点击了赛事卡片上的我要投稿），则默认进行选中。
    // 3. 用户选择图片时，利用 `FileReader` 做出响应式的本地图片预览 (`previewSrc`)，优化表单体验。
    // 4. 重构文件上传：以前是用 base64 强行塞入 `localStorage`，大图片会直接导致存盘溢出崩溃。
    //    现在，我们使用 `FormData` 封装成二进制 Multipart 请求，直接上传到 Go 后端物理写盘，图片最终会被保存在服务器的 `uploads/` 下，
    //    接口返回类似 `/uploads/xxxx.jpg`，安全、健壮且持久。

    const loadTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments')
        if (res.ok) {
          const list = await res.json()
          activeTournaments.value = list.filter(t => t.status === 'active')
          
          // 如果 URL 参数有赛事 ID，默认选中
          const tid = route.query.tournamentId
          if (tid) {
            selectedTournamentId.value = Number(tid)
          }
        }
      } catch (err) {
        console.error('加载进行中赛事失败:', err)
      }
    }

    const handleFileChange = (e) => {
      const file = e.target.files[0]
      if (file) {
        selectedFile.value = file
        const reader = new FileReader()
        reader.onload = (evt) => {
          previewSrc.value = evt.target.result
        }
        reader.readAsDataURL(file)
      }
    }

    const handlePublish = async () => {
      if (!selectedFile.value) {
        alert('请选择需要上传的摄影作品图片！')
        return
      }

      if (price.value === '' || isNaN(price.value) || price.value < 0) {
        alert('请输入有效的版权授权价格！')
        return
      }

      submitting.value = true
      try {
        // 使用 FormData 封装二进制流
        const formData = new FormData()
        formData.append('file', selectedFile.value)
        formData.append('workName', workName.value.trim())
        formData.append('category', category.value)
        formData.append('equipment', equipment.value.trim())
        formData.append('price', price.value.toString())
        formData.append('desc', desc.value.trim())
        formData.append('tournamentId', selectedTournamentId.value.toString())

        const res = await fetch('/api/works', {
          method: 'POST',
          headers: {
            'X-User-Account': store.user.account
          },
          body: formData
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '投稿失败')
          return
        }

        alert('投稿成功！作品已提交审核，待系统管理员后台存证审核通过后即可展示并参与投票。')
        router.push('/person-info')
      } catch (err) {
        alert('投稿异常: ' + err.message)
      } finally {
        submitting.value = false
      }
    }

    onMounted(() => {
      if (store.user?.role === 'photographer') {
        loadTournaments()
      }
    })

    return {
      store,
      activeTournaments,
      selectedTournamentId,
      workName,
      category,
      equipment,
      price,
      desc,
      previewSrc,
      submitting,
      handleFileChange,
      handlePublish
    }
  }
}
</script>
