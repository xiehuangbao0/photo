package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"photo-backend/models"
	"photo-backend/store"
)

// 思考过程 (Chinese Thinking Process):
// Tournaments 模块负责赛事的展示与后台管理。
// 1. 获取赛事列表 (ListTournaments)：拉取当前存储中的所有摄影赛事。前端可以根据赛事起止时间、投票起止时间等在页面上过滤，
//    后端也提供基本的赛事列表读取。
// 2. 创建赛事 (CreateTournament)：管理员可以通过后台直接创建新赛事。赛事包含奖金、奖品、起止时间等必要约束字段。
// 3. 更新赛事状态或结束赛事 (UpdateTournament / CompleteTournament)：支持赛事信息的编辑与手动结束赛事。
//    赛事结束后，管理员可以从投稿作品中指定获奖者名单 (Winners)。

// ListTournaments 获取赛事列表
func ListTournaments(c *gin.Context) {
	s := store.GetStore()
	s.SaveTournaments()
	c.JSON(http.StatusOK, s.Tournaments)
}

// GetTournament 获取单个赛事详情
func GetTournament(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事ID"})
		return
	}

	s := store.GetStore()
	for _, t := range s.Tournaments {
		if t.ID == id {
			c.JSON(http.StatusOK, t)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "赛事不存在"})
}

// CreateTournament 创建赛事
func CreateTournament(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权操作，仅限管理员"})
		return
	}

	var req struct {
		Name        string         `json:"name" binding:"required"`
		Description string         `json:"description" binding:"required"`
		StartTime   string         `json:"startTime" binding:"required"`
		EndTime     string         `json:"endTime" binding:"required"`
		VoteStart   string         `json:"voteStart" binding:"required"`
		VoteEnd     string         `json:"voteEnd" binding:"required"`
		Categories  []string       `json:"categories" binding:"required"`
		Prizes      []models.Prize `json:"prizes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式不正确或缺失必填项"})
		return
	}

	s := store.GetStore()

	// 生成新的赛事 ID
	newID := 1
	if len(s.Tournaments) > 0 {
		maxID := s.Tournaments[0].ID
		for _, t := range s.Tournaments {
			if t.ID > maxID {
				maxID = t.ID
			}
		}
		newID = maxID + 1
	}

	newTournament := models.Tournament{
		ID:          newID,
		Name:        req.Name,
		Description: req.Description,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		VoteStart:   req.VoteStart,
		VoteEnd:     req.VoteEnd,
		Status:      "active",
		Categories:  req.Categories,
		Prizes:      req.Prizes,
		Winners:     make([]models.WinnerInfo, 0),
	}

	s.Tournaments = append(s.Tournaments, newTournament)
	s.SaveTournaments()

	c.JSON(http.StatusOK, gin.H{
		"message":    "赛事发布成功！",
		"tournament": newTournament,
	})
}

// EndTournament 结算并结束赛事 (评选获奖作品)
func EndTournament(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权操作，仅限管理员"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事ID"})
		return
	}

	var req struct {
		Winners []models.WinnerInfo `json:"winners" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "获奖名单参数不正确"})
		return
	}

	s := store.GetStore()
	idx := -1
	for i, t := range s.Tournaments {
		if t.ID == id {
			idx = i
			break
		}
	}

	if idx == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "赛事不存在"})
		return
	}

	s.Tournaments[idx].Winners = req.Winners
	s.Tournaments[idx].Status = "ended"
	s.SaveTournaments()

	// 赛事结束时，发布一条获奖结果公告
	annID := 1
	if len(s.Announcements) > 0 {
		annID = s.Announcements[len(s.Announcements)-1].ID + 1
	}

	newAnn := models.Announcement{
		ID:      annID,
		Title:   "🏆 " + s.Tournaments[idx].Name + " 获奖名单正式揭晓！",
		Time:    time.Now().Format("2006-01-02"),
		Type:    "winner",
		Content: "本次大赛已圆满结束，在各路摄影师的激烈比拼中，优秀作品脱颖而出。欢迎前往获奖展厅赏析精品！",
	}
	s.Announcements = append(s.Announcements, newAnn)
	s.SaveAnnouncements()

	c.JSON(http.StatusOK, gin.H{
		"message":    "赛事结算成功，已公布获奖名单！",
		"tournament": s.Tournaments[idx],
	})
}

// DeleteTournament 删除赛事
func DeleteTournament(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权操作"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事ID"})
		return
	}

	s := store.GetStore()
	idx := -1
	for i, t := range s.Tournaments {
		if t.ID == id {
			idx = i
			break
		}
	}

	if idx == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "赛事不存在"})
		return
	}

	s.Tournaments = append(s.Tournaments[:idx], s.Tournaments[idx+1:]...)
	s.SaveTournaments()

	c.JSON(http.StatusOK, gin.H{"message": "赛事删除成功"})
}
