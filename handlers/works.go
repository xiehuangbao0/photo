package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"photo-backend/models"
	"photo-backend/store"
)

// 思考过程 (Chinese Thinking Process):
// Works 模块管理摄影作品的生命周期与互动逻辑。
// 1. 获取作品列表 (ListWorks)：支持各种查询条件过滤，如分类、赛事ID、作者账号、收藏用户、已购买用户等。
//    如果当前用户不是管理员，默认只筛选通过审核 (online) 的作品，而摄影师本人可以在个人中心查看到自己待审核 (pending) 的作品。
// 2. 上传投稿 (CreateWork)：支持 multipart/form-data 文件上传。后端接收图片文件后，将其保存在本地 `uploads/` 目录，
//    并生成文件的相对 URL 路径返回给前端展示，解决了以前 base64 保存导致的 LocalStorage 空间满问题。
// 3. 作品详情 (GetWorkDetail)：获取对应 ID 作品的详细数据和最新评论。
// 4. 投票 (VoteWork)：每天只允许用户投一次票。我们在后端通过记录的 `VoteRecord`（包含用户账号、作品ID、投票日期）来进行严格比对。
// 5. 评论与回复：支持在作品下添加评论、删除评论、对某条评论进行回复、删除回复。全部进行实时同步和数据写盘持久化。
// 6. 收藏与取消收藏 (CollectWork)：在 CollectedBy 列表中添加/移除用户账号，并在后端持久化。
// 7. 版权购买 (PurchaseWork)：支持前端在 Ganache 交易成功后，或者本地模拟区块链交易成功后，同步该作品版权的购买状态，生成一条 Order 记录。

// ListWorks 获取作品列表
func ListWorks(c *gin.Context) {
	category := c.Query("category")
	tournamentIDStr := c.Query("tournamentId")
	authorAccount := c.Query("authorAccount")
	collectedBy := c.Query("collectedBy")
	purchasedBy := c.Query("purchasedBy")
	status := c.Query("status")

	currentUser, isLoggedIn := GetCurrentUser(c)

	s := store.GetStore()
	s.SaveWorks()

	filtered := make([]models.Work, 0)

	for _, w := range s.Works {
		// 1. 按状态过滤
		// 默认只对普通用户显示审核通过的 "online" 作品，除非：
		// - 显式指定状态 (如管理员在后台查 pending)
		// - 作者本人在查看自己的投稿记录
		if status != "" {
			if w.Status != status {
				continue
			}
		} else {
			// 未指定状态时，如果是作者本人，或者管理员，或者作品是 online
			isAuthor := isLoggedIn && currentUser.Account == w.AuthorAccount
			isAdmin := isLoggedIn && currentUser.Role == "admin"
			if !isAuthor && !isAdmin && w.Status != "online" {
				continue
			}
		}

		// 2. 按分类过滤
		if category != "" && category != "all" {
			if w.Category != category {
				continue
			}
		}

		// 3. 按赛事ID过滤
		if tournamentIDStr != "" {
			tID, err := strconv.Atoi(tournamentIDStr)
			if err == nil && w.TournamentID != tID {
				continue
			}
		}

		// 4. 按作者账号过滤
		if authorAccount != "" {
			if w.AuthorAccount != authorAccount {
				continue
			}
		}

		// 5. 按收藏过滤
		if collectedBy != "" {
			isCol := false
			for _, account := range w.CollectedBy {
				if account == collectedBy {
					isCol = true
					break
				}
			}
			if !isCol {
				continue
			}
		}

		// 6. 按已购买过滤
		if purchasedBy != "" {
			if !w.IsPurchased || w.BuyerAccount != purchasedBy {
				continue
			}
		}

		filtered = append(filtered, w)
	}

	c.JSON(http.StatusOK, filtered)
}

// GetWork 获取单个作品详情
func GetWork(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	s := store.GetStore()
	for _, w := range s.Works {
		if w.ID == id {
			c.JSON(http.StatusOK, w)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
}

// CreateWork 摄影作品投稿
func CreateWork(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "photographer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权投稿，仅限摄影师账号"})
		return
	}

	workName := c.PostForm("workName")
	category := c.PostForm("category")
	equipment := c.PostForm("equipment")
	desc := c.PostForm("desc")
	priceStr := c.PostForm("price")
	tournamentIDStr := c.PostForm("tournamentId")

	if workName == "" || category == "" || priceStr == "" || tournamentIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请填写必填项(作品名称、分类、价格、赛事)"})
		return
	}

	price, err := strconv.ParseFloat(priceStr, 64)
	if err != nil || price < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "版权价格格式不正确"})
		return
	}

	tournamentID, err := strconv.Atoi(tournamentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "赛事ID格式不正确"})
		return
	}

	// 处理图片文件上传
	file, err := c.FormFile("file")
	var imgPath string
	if err == nil {
		// 校验文件格式 (简单判断后缀)
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的图片格式，仅限 JPG/JPEG/PNG/WEBP"})
			return
		}

		// 创建唯一文件名
		fileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
		savePath := filepath.Join("uploads", fileName)
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存图片失败"})
			return
		}
		// 设为相对路径以方便托管访问
		imgPath = "/uploads/" + fileName
	} else {
		// 兼容原本Base64直接投稿的测试用例 (如果没有传file，允许传 img 参数)
		base64Img := c.PostForm("img")
		if base64Img == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请上传作品图片"})
			return
		}
		imgPath = base64Img
	}

	s := store.GetStore()

	// 生成随机的存证哈希和交易哈希 (待审核状态，待链上调用时由合约或模拟系统真正上链)
	// 在上传时为了兼容性，预先在前端/后端生成一个初始凭证哈希
	dummyHash := fmt.Sprintf("0x%x", time.Now().UnixNano())
	dummyTxHash := fmt.Sprintf("0x%x", time.Now().UnixNano()+1)

	newWork := models.Work{
		ID:            time.Now().UnixNano() / 1e6, // 毫秒级时间戳ID
		WorkName:      workName,
		Img:           imgPath,
		AuthorAccount: user.Account,
		AuthorNick:    user.NickName,
		Category:      category,
		Desc:          desc,
		VoteCount:     0,
		Status:        "pending", // 初始状态为待审核
		Equipment:     equipment,
		Price:         price,
		WalletAddress: user.WalletAddress,
		CreateTime:    time.Now().Format("2006-01-02"),
		Hash:          dummyHash,
		TxHash:        dummyTxHash,
		TournamentID:  tournamentID,
		Comments:      make([]models.Comment, 0),
		CollectedBy:   make([]string, 0),
		IsPurchased:   false,
	}

	s.Works = append(s.Works, newWork)
	s.SaveWorks()

	c.JSON(http.StatusOK, gin.H{
		"message": "投稿成功，等待管理员审核",
		"work":    newWork,
	})
}

// VoteWork 投票
func VoteWork(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请登录后再进行投票"})
		return
	}

	idStr := c.Param("id")
	workID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	s := store.GetStore()
	today := time.Now().Format("2006-01-02")

	// 每天每个用户限投一票 (针对当天该作品或者当天所有作品? 原逻辑是: 每日限投一票)
	// 原逻辑: '每天每人可投 1 票'。我们对此进行校验：
	for _, rec := range s.Votes {
		if rec.UserAccount == user.Account && rec.VoteDate == today {
			c.JSON(http.StatusForbidden, gin.H{"error": "您今天已经投过票了，明天再来吧！"})
			return
		}
	}

	// 找到作品并增加票数
	var found bool
	for i, w := range s.Works {
		if w.ID == workID {
			if w.Status != "online" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "该作品当前不可投票"})
				return
			}
			s.Works[i].VoteCount++
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
		return
	}

	// 记录投票历史
	s.Votes = append(s.Votes, models.VoteRecord{
		UserAccount: user.Account,
		WorkID:      workID,
		VoteDate:    today,
	})
	s.SaveVotes()
	s.SaveWorks()

	c.JSON(http.StatusOK, gin.H{"message": "投票成功！"})
}

// CollectWork 收藏作品
func CollectWork(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	idStr := c.Param("id")
	workID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	s := store.GetStore()
	var updatedWork models.Work
	var found bool
	var isCollect bool

	for i, w := range s.Works {
		if w.ID == workID {
			// 判断是否已收藏
			idx := -1
			for j, acc := range w.CollectedBy {
				if acc == user.Account {
					idx = j
					break
				}
			}

			if idx == -1 {
				// 收藏
				s.Works[i].CollectedBy = append(s.Works[i].CollectedBy, user.Account)
				isCollect = true
			} else {
				// 取消收藏
				s.Works[i].CollectedBy = append(s.Works[i].CollectedBy[:idx], s.Works[i].CollectedBy[idx+1:]...)
				isCollect = false
			}
			updatedWork = s.Works[i]
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
		return
	}

	s.SaveWorks()
	c.JSON(http.StatusOK, gin.H{
		"message":   "操作成功",
		"collected": isCollect,
		"work":      updatedWork,
	})
}

// AddComment 添加评论
func AddComment(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	idStr := c.Param("id")
	workID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "评论内容不能为空"})
		return
	}

	s := store.GetStore()
	var updatedWork models.Work
	var found bool

	for i, w := range s.Works {
		if w.ID == workID {
			newComment := models.Comment{
				ID:       time.Now().UnixNano(),
				UserID:   user.Account,
				UserNick: user.NickName,
				Content:  req.Content,
				Time:     time.Now().Format("2006-01-02 15:04:05"),
				Replies:  make([]models.Reply, 0),
			}
			s.Works[i].Comments = append(s.Works[i].Comments, newComment)
			updatedWork = s.Works[i]
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
		return
	}

	s.SaveWorks()
	c.JSON(http.StatusOK, gin.H{
		"message": "评论发表成功",
		"work":    updatedWork,
	})
}

// DeleteComment 删除评论
func DeleteComment(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	workID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	commentID, _ := strconv.ParseInt(c.Param("commentId"), 10, 64)

	s := store.GetStore()
	var found bool
	var updatedWork models.Work

	for i, w := range s.Works {
		if w.ID == workID {
			idx := -1
			for j, comm := range w.Comments {
				if comm.ID == commentID {
					// 仅作者本人或管理员可删除
					if comm.UserID != user.Account && user.Role != "admin" {
						c.JSON(http.StatusForbidden, gin.H{"error": "无权删除他人的评论"})
						return
					}
					idx = j
					break
				}
			}

			if idx != -1 {
				s.Works[i].Comments = append(s.Works[i].Comments[:idx], s.Works[i].Comments[idx+1:]...)
				updatedWork = s.Works[i]
				found = true
			}
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品或评论不存在"})
		return
	}

	s.SaveWorks()
	c.JSON(http.StatusOK, gin.H{
		"message": "评论已删除",
		"work":    updatedWork,
	})
}

// AddReply 对评论进行回复
func AddReply(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	workID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	commentID, _ := strconv.ParseInt(c.Param("commentId"), 10, 64)

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "回复内容不能为空"})
		return
	}

	s := store.GetStore()
	var updatedWork models.Work
	var found bool

	for i, w := range s.Works {
		if w.ID == workID {
			for k, comm := range w.Comments {
				if comm.ID == commentID {
					newReply := models.Reply{
						ID:       time.Now().UnixNano(),
						UserID:   user.Account,
						UserNick: user.NickName,
						Content:  req.Content,
						Time:     time.Now().Format("2006-01-02 15:04:05"),
					}
					s.Works[i].Comments[k].Replies = append(s.Works[i].Comments[k].Replies, newReply)
					updatedWork = s.Works[i]
					found = true
					break
				}
			}
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品或评论不存在"})
		return
	}

	s.SaveWorks()
	c.JSON(http.StatusOK, gin.H{
		"message": "回复发表成功",
		"work":    updatedWork,
	})
}

// DeleteReply 删除回复
func DeleteReply(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	workID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	commentID, _ := strconv.ParseInt(c.Param("commentId"), 10, 64)
	replyID, _ := strconv.ParseInt(c.Param("replyId"), 10, 64)

	s := store.GetStore()
	var found bool
	var updatedWork models.Work

	for i, w := range s.Works {
		if w.ID == workID {
			for k, comm := range w.Comments {
				if comm.ID == commentID {
					rIdx := -1
					for j, rep := range comm.Replies {
						if rep.ID == replyID {
							if rep.UserID != user.Account && user.Role != "admin" {
								c.JSON(http.StatusForbidden, gin.H{"error": "无权删除他人的回复"})
								return
							}
							rIdx = j
							break
						}
					}

					if rIdx != -1 {
						s.Works[i].Comments[k].Replies = append(s.Works[i].Comments[k].Replies[:rIdx], s.Works[i].Comments[k].Replies[rIdx+1:]...)
						updatedWork = s.Works[i]
						found = true
					}
					break
				}
			}
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品或评论回复不存在"})
		return
	}

	s.SaveWorks()
	c.JSON(http.StatusOK, gin.H{
		"message": "回复已删除",
		"work":    updatedWork,
	})
}

// PurchaseWork 版权交易同步与保存
func PurchaseWork(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请登录后再交易"})
		return
	}

	idStr := c.Param("id")
	workID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	var req struct {
		TxHash string `json:"txHash" binding:"required"`
		Price  string `json:"price"` // 可选，若传入则用此价格，否则使用作品默认价格
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺失交易哈希 txHash"})
		return
	}

	s := store.GetStore()
	var targetWork *models.Work
	var workIdx int

	for i, w := range s.Works {
		if w.ID == workID {
			targetWork = &s.Works[i]
			workIdx = i
			break
		}
	}

	if targetWork == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
		return
	}

	if targetWork.IsPurchased {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该作品版权已售罄，无法重复购买"})
		return
	}

	if targetWork.AuthorAccount == user.Account {
		c.JSON(http.StatusBadRequest, gin.H{"error": "您不能购买自己作品的版权"})
		return
	}

	// 资金划转 (如果使用的是降级模拟，我们可以在后端扣款/加款；如果是Ganache真实扣除，前端已经交易了，这里同步账号余额)
	// 即使是Ganache，我们在后端也扣减买家的人民币，并将人民币加到卖家，使模拟账户余额表现一致
	buyer := s.Users[user.Account]
	seller := s.Users[targetWork.AuthorAccount]

	var finalPrice = targetWork.Price
	if req.Price != "" {
		p, err := strconv.ParseFloat(req.Price, 64)
		if err == nil {
			finalPrice = p
		}
	}

	// 减少买家CNY余额，增加卖家CNY余额 (原逻辑里钱包充值也是同步的，为了体验我们在后端做一次结算)
	buyer.CnyBalance -= finalPrice
	seller.CnyBalance += finalPrice
	s.Users[user.Account] = buyer
	s.Users[targetWork.AuthorAccount] = seller

	// 更新作品版权状态
	targetWork.IsPurchased = true
	targetWork.BuyerAccount = user.Account
	targetWork.PurchaseTime = time.Now().Format("2006-01-02 15:04:05")

	// 生成交易单
	orderID := time.Now().UnixNano()
	newOrder := models.Order{
		ID:            orderID,
		WorkID:        workID,
		WorkName:      targetWork.WorkName,
		Img:           targetWork.Img,
		BuyerAccount:  user.Account,
		SellerAccount: targetWork.AuthorAccount,
		Price:         finalPrice,
		TxHash:        req.TxHash,
		Time:          time.Now().Format("2006-01-02 15:04:05"),
	}

	// 写入模拟区块链 (如果是本地模拟)
	if strings.HasPrefix(req.TxHash, "0x_mock") || req.TxHash == "" {
		// 生成模拟交易
		mockTx := models.Transaction{
			Hash:      req.TxHash,
			Sender:    buyer.WalletAddress,
			Recipient: seller.WalletAddress,
			Type:      "purchase",
			Data: gin.H{
				"workId":   workID,
				"workName": targetWork.WorkName,
				"price":    finalPrice,
			},
			Timestamp: time.Now().UnixNano() / 1e6,
			Value:     fmt.Sprintf("%.3f", finalPrice/2000.0), // CNY 换算为 ETH
		}
		s.SimulateMineBlock(mockTx)
	}

	s.Orders = append(s.Orders, newOrder)
	s.Works[workIdx] = *targetWork

	s.SaveUsers()
	s.SaveWorks()
	s.SaveOrders()

	c.JSON(http.StatusOK, gin.H{
		"message": "版权交易同步成功！",
		"work":    targetWork,
		"order":   newOrder,
	})
}

// GetMyOrders 获取已购买订单
func GetMyOrders(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	s := store.GetStore()
	myOrders := make([]models.Order, 0)
	for _, o := range s.Orders {
		if o.BuyerAccount == user.Account || o.SellerAccount == user.Account {
			myOrders = append(myOrders, o)
		}
	}
	c.JSON(http.StatusOK, myOrders)
}

// AdminVerifyWork 作品审核 (管理员)
func AdminVerifyWork(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权访问，仅限管理员"})
		return
	}

	idStr := c.Param("id")
	workID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	var req struct {
		Action      string `json:"action" binding:"required"` // "approve" 或 "reject"
		TxHash      string `json:"txHash"`
		BlockHeight int    `json:"blockHeight"`
		CertID      int    `json:"certId"`
		ChainTime   string `json:"chainTime"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()
	var found bool
	var updatedWork models.Work

	for i, w := range s.Works {
		if w.ID == workID {
			if req.Action == "approve" {
				s.Works[i].Status = "online" // 审核通过即上架

				// 绑定存证信息 (若有前端真实上链信息，直接同步)
				if req.TxHash != "" {
					s.Works[i].OnChain = true
					s.Works[i].TxHash = req.TxHash
					s.Works[i].BlockHeight = req.BlockHeight
					s.Works[i].CertID = req.CertID
					s.Works[i].ChainTime = req.ChainTime
				} else {
					// 否则使用后端进行降级本地挖矿存证
					s.Works[i].OnChain = true
					s.Works[i].CertID = len(s.Chain) // 模拟一个证书ID
					s.Works[i].ChainTime = time.Now().Format("2006-01-02 15:04:05")

					// 挖矿记录
					mockTx := models.Transaction{
						Hash:      fmt.Sprintf("0x_mock_cert_%d", time.Now().UnixNano()),
						Sender:    user.WalletAddress,
						Recipient: "0x0000000000000000000000000000000000000000",
						Type:      "certify",
						Data: gin.H{
							"workName": w.WorkName,
							"hash":     w.Hash,
							"category": w.Category,
							"author":   w.WalletAddress,
						},
						Timestamp: time.Now().UnixNano() / 1e6,
						Value:     "0",
					}
					block := s.SimulateMineBlock(mockTx)
					s.Works[i].TxHash = mockTx.Hash
					s.Works[i].BlockHeight = block.Index
				}
			} else {
				s.Works[i].Status = "rejected"
			}
			updatedWork = s.Works[i]
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
		return
	}

	s.SaveWorks()
	c.JSON(http.StatusOK, gin.H{
		"message": "审核操作成功",
		"work":    updatedWork,
	})
}

// AdminDeleteWork 管理员直接删除或下架作品
func AdminDeleteWork(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权访问，仅限管理员"})
		return
	}

	idStr := c.Param("id")
	workID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的作品ID"})
		return
	}

	s := store.GetStore()
	idx := -1
	for i, w := range s.Works {
		if w.ID == workID {
			idx = i
			break
		}
	}

	if idx == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "作品不存在"})
		return
	}

	// 删除作品包含的文件 (如果保存在 uploads 下，进行物理删除释放空间)
	workImg := s.Works[idx].Img
	if strings.HasPrefix(workImg, "/uploads/") {
		localPath := filepath.Join(".", workImg)
		os.Remove(localPath)
	}

	s.Works = append(s.Works[:idx], s.Works[idx+1:]...)
	s.SaveWorks()

	c.JSON(http.StatusOK, gin.H{"message": "作品已成功下架并从数据库物理删除！"})
}
