package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"photo-backend/handlers"
	"photo-backend/store"
)

// 思考过程 (Chinese Thinking Process):
// 这是 Go 后端服务的核心入口文件 `main.go`。
// 我们在设计这个启动文件时，遵循以下几点：
// 1. 初始化存储 (store.GetStore())，它会自动加载 JSON 数据并做原有资源的平滑迁移。
// 2. 引入一个通用的 CORS (跨域资源共享) 中间件。在开发阶段，前端 Vue 运行在 Vite 的 5173 端口，
//    而后端运行在 8080 端口，开启 CORS 可以防止跨域报错，保证联调体验。
// 3. 配置核心静态资源代理：
//    - 将 `/uploads` 请求映射到本地物理上传路径 `uploads/`
//    - 将 `/build/contracts` 请求映射到智能合约输出路径 `build/contracts/`
// 4. 路由划分：
//    - `/api/register` 和 `/api/login` 无需鉴权
//    - 用户交互相关的 API 接口（用户、作品、赛事、公告、链上统计、意见反馈等）
// 5. 单页应用 (SPA) 路由支持：
//    使用 `r.NoRoute` 对所有非法路由（除了 `/api` 之外的页面刷新请求）做降级重定向，
//    统一返回 Vue 构建产物中的 `index.html`。这是支持 Vue Router HTML5 History 模式的必备操作。

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-User-Account")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func main() {
	// 初始化数据存储和迁移
	s := store.GetStore()
	fmt.Printf("📊 后端数据初始化成功！当前加载用户数: %d, 作品数: %d, 赛事数: %d, 公告数: %d\n",
		len(s.Users), len(s.Works), len(s.Tournaments), len(s.Announcements))

	// 设置启动模式为发布模式（如果想看详细日志可以注释这行）
	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	// 开启 CORS 跨域支持 (非常便于开发调试)
	r.Use(corsMiddleware())

	// 1. 静态文件夹代理：托管上传的图片以及系统预置图片
	r.Static("/uploads", "./uploads")
	r.Static("/images", "./images")

	// 2. 静态文件夹代理：托管 Truffle 合约 ABI 文件 (供 Web3 加载 PhotoCertification.json)
	r.Static("/build/contracts", "./build/contracts")

	// 3. 静态文件夹代理：托管打包后的前端 Vue 代码
	r.StaticFile("/", "./frontend/dist/index.html")
	r.Static("/assets", "./frontend/dist/assets")
	r.Static("/js", "./frontend/dist/js")
	r.StaticFile("/favicon.ico", "./frontend/dist/favicon.ico")
	r.StaticFile("/favicon.svg", "./frontend/dist/favicon.svg")
	r.StaticFile("/icons.svg", "./frontend/dist/icons.svg")

	// API 路由组定义
	api := r.Group("/api")
	{
		// 登录注册
		api.POST("/register", handlers.Register)
		api.POST("/login", handlers.Login)

		// 个人资料与钱包
		api.GET("/user/profile", handlers.GetProfile)
		api.PUT("/user/profile", handlers.UpdateProfile)
		api.PUT("/user/password", handlers.UpdatePassword)
		api.POST("/user/balance", handlers.UpdateBalance)

		// 管理员管理用户
		api.GET("/admin/users", handlers.AdminGetUsers)
		api.PUT("/admin/users/:account/status", handlers.AdminToggleUserStatus)

		// 作品相关
		api.GET("/works", handlers.ListWorks)
		api.GET("/works/:id", handlers.GetWork)
		api.POST("/works", handlers.CreateWork)
		api.POST("/works/:id/vote", handlers.VoteWork)
		api.POST("/works/:id/collect", handlers.CollectWork)
		api.POST("/works/:id/purchase", handlers.PurchaseWork)
		api.GET("/user/orders", handlers.GetMyOrders)

		// 评论与回复
		api.POST("/works/:id/comments", handlers.AddComment)
		api.DELETE("/works/:id/comments/:commentId", handlers.DeleteComment)
		api.POST("/works/:id/comments/:commentId/replies", handlers.AddReply)
		api.DELETE("/works/:id/comments/:commentId/replies/:replyId", handlers.DeleteReply)

		// 管理员管理作品审核/物理下架
		api.PUT("/admin/works/:id/status", handlers.AdminVerifyWork)
		api.DELETE("/admin/works/:id", handlers.AdminDeleteWork)

		// 赛事相关
		api.GET("/tournaments", handlers.ListTournaments)
		api.GET("/tournaments/:id", handlers.GetTournament)
		api.POST("/tournaments", handlers.CreateTournament)
		api.POST("/tournaments/:id/end", handlers.EndTournament)
		api.DELETE("/tournaments/:id", handlers.DeleteTournament)

		// 公告相关
		api.GET("/announcements", handlers.ListAnnouncements)
		api.POST("/announcements", handlers.CreateAnnouncement)
		api.DELETE("/announcements/:id", handlers.DeleteAnnouncement)

		// 模拟区块链查询
		api.GET("/blockchain/stats", handlers.GetBlockchainStats)
		api.GET("/blockchain/blocks", handlers.GetBlocks)
		api.GET("/blockchain/txs", handlers.GetTransactions)

		// 意见反馈相关
		api.GET("/feedback", handlers.ListFeedback)
		api.POST("/feedback", handlers.CreateFeedback)
		api.PUT("/feedback/:id/reply", handlers.ReplyFeedback)
	}

	// 历史路由兜底：使得 Vue Router 在 history 模式下刷新页面仍能正常加载前端视图
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "接口未找到"})
			return
		}
		// 其他网页请求一律返回 SPA 入口
		c.File("./frontend/dist/index.html")
	})

	port := ":8080"
	fmt.Printf("🚀 Go 服务正在启动，监听端口 %s ...\n", port)
	fmt.Printf("👉 本地接口访问: http://localhost:8080/api/works\n")
	fmt.Printf("👉 本地静态网页: http://localhost:8080/\n")

	if err := r.Run(port); err != nil {
		fmt.Printf("❌ Go 服务启动失败: %v\n", err)
	}
}
