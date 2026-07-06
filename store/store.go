package store

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"sync"
	"time"

	"photo-backend/models"
)

// 思考过程 (Chinese Thinking Process):
// Store 结构体充当了内存数据库，用来持久化存储数据并写入 JSON 文件。
// 我们的思考是：
// 1. 系统需要做到“开箱即用”，自动从原有项目的 `src/` 目录下读取 `photography.json`、`tournaments.json`、`announcements.json` 的初始数据，
//    并拷贝至 `data/` 数据文件夹下。这样能够 100% 还原之前的测试环境。
// 2. 自动生成默认测试用户（如 admin, admin1, 111, 222 等），保证以前能登陆的账号依然能无缝登录。
// 3. 实现一个本地“区块链”模拟器。若 Ganache 不可用，后端的 Store 将支持模拟挖矿（Block / Transaction 生成与哈希运算）。
// 4. 使用读写锁 (sync.RWMutex) 确保多用户并发读写 JSON 数据库时的安全性。

type Store struct {
	mu            sync.RWMutex
	dataDir       string
	Users         map[string]models.User
	Works         []models.Work
	Tournaments   []models.Tournament
	Announcements []models.Announcement
	Feedbacks     []models.Feedback
	Chain         []models.Block
	Votes         []models.VoteRecord
	Orders        []models.Order
}

var (
	Instance *Store
	once     sync.Once
)

func GetStore() *Store {
	once.Do(func() {
		Instance = &Store{
			dataDir:       "data",
			Users:         make(map[string]models.User),
			Works:         make([]models.Work, 0),
			Tournaments:   make([]models.Tournament, 0),
			Announcements: make([]models.Announcement, 0),
			Feedbacks:     make([]models.Feedback, 0),
			Chain:         make([]models.Block, 0),
			Votes:         make([]models.VoteRecord, 0),
			Orders:        make([]models.Order, 0),
		}
		if err := Instance.init(); err != nil {
			fmt.Printf("⚠️ 初始化存储失败: %v\n", err)
		}
	})
	return Instance
}

func (s *Store) init() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 创建数据目录与上传文件目录
	if err := os.MkdirAll(s.dataDir, 0755); err != nil {
		return err
	}
	if err := os.MkdirAll("uploads", 0755); err != nil {
		return err
	}

	// 1. 加载或复制赛事列表
	tournamentPath := filepath.Join(s.dataDir, "tournaments.json")
	if !fileExists(tournamentPath) {
		// 尝试从 src 复制
		srcPath := filepath.Join("src", "tournaments.json")
		if fileExists(srcPath) {
			copyFile(srcPath, tournamentPath)
		} else {
			// 写默认空数组
			os.WriteFile(tournamentPath, []byte("[]"), 0644)
		}
	}
	s.loadJSON(tournamentPath, &s.Tournaments)

	// 2. 加载或复制公告列表
	announcementsPath := filepath.Join(s.dataDir, "announcements.json")
	if !fileExists(announcementsPath) {
		srcPath := filepath.Join("src", "announcements.json")
		if fileExists(srcPath) {
			copyFile(srcPath, announcementsPath)
		} else {
			os.WriteFile(announcementsPath, []byte("[]"), 0644)
		}
	}
	s.loadJSON(announcementsPath, &s.Announcements)

	// 3. 加载或复制作品列表
	worksPath := filepath.Join(s.dataDir, "photography.json")
	if !fileExists(worksPath) {
		srcPath := filepath.Join("src", "photography.json")
		if fileExists(srcPath) {
			copyFile(srcPath, worksPath)
		} else {
			os.WriteFile(worksPath, []byte("[]"), 0644)
		}
	}
	s.loadJSON(worksPath, &s.Works)

	// 4. 加载反馈列表
	feedbackPath := filepath.Join(s.dataDir, "feedback.json")
	if !fileExists(feedbackPath) {
		os.WriteFile(feedbackPath, []byte("[]"), 0644)
	}
	s.loadJSON(feedbackPath, &s.Feedbacks)

	// 加载投票列表
	votesPath := filepath.Join(s.dataDir, "votes.json")
	if !fileExists(votesPath) {
		os.WriteFile(votesPath, []byte("[]"), 0644)
	}
	s.loadJSON(votesPath, &s.Votes)

	// 加载订单列表
	ordersPath := filepath.Join(s.dataDir, "orders.json")
	if !fileExists(ordersPath) {
		os.WriteFile(ordersPath, []byte("[]"), 0644)
	}
	s.loadJSON(ordersPath, &s.Orders)

	// 5. 加载用户列表
	usersPath := filepath.Join(s.dataDir, "users.json")
	if !fileExists(usersPath) {
		// 初始化默认用户
		defaultUsers := map[string]models.User{
			"admin": {
				Account:       "admin",
				Password:      "123456",
				NickName:      "平台系统管理员",
				Role:          "admin",
				Phone:         "13800000000",
				Bio:           "我是超级管理员，负责作品存证与赛事发布审核。",
				WalletAddress: "0xDE4622eD33DC1BE87f62A21821043C34eB6B7988",
				EthBalance:    100.0,
				CnyBalance:    100000.0,
				RegisterTime:  time.Now().Format("2006-01-02 15:04:05"),
				Status:        "normal",
			},
			"admin1": {
				Account:       "admin1",
				Password:      "123456",
				NickName:      "平台辅助管理员",
				Role:          "admin",
				Phone:         "13800000001",
				Bio:           "平台管理员，处理日常存证与公告发表。",
				WalletAddress: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
				EthBalance:    50.0,
				CnyBalance:    50000.0,
				RegisterTime:  time.Now().Format("2006-01-02 15:04:05"),
				Status:        "normal",
			},
			"111": {
				Account:       "111",
				Password:      "111111",
				NickName:      "资深摄影师-阿山",
				Role:          "photographer",
				Phone:         "13800000111",
				Bio:           "喜欢大自然，专注风光摄影 10 年。",
				WalletAddress: "0xFFcf8FDEE87062793c230d5225E01326c7104b7B",
				EthBalance:    10.0,
				CnyBalance:    5000.0,
				RegisterTime:  time.Now().Format("2006-01-02 15:04:05"),
				Status:        "normal",
			},
			"222": {
				Account:       "222",
				Password:      "222222",
				NickName:      "大众大众评审-小美",
				Role:          "user",
				Phone:         "13800000222",
				Bio:           "摄影爱好者，喜欢欣赏优秀摄影作品并为它们投票。",
				WalletAddress: "0x22d491B3A1637fd9C21153d6a2f8E1b31Ed816E8",
				EthBalance:    0.5,
				CnyBalance:    2000.0,
				RegisterTime:  time.Now().Format("2006-01-02 15:04:05"),
				Status:        "normal",
			},
			"333": {
				Account:       "333",
				Password:      "333333",
				NickName:      "人像大师-老李",
				Role:          "photographer",
				Phone:         "13800000333",
				Bio:           "定格美丽瞬间，欢迎约拍。",
				WalletAddress: "0x2287236A9D981f9b36C655F37a57aDF492576bE8",
				EthBalance:    8.0,
				CnyBalance:    8000.0,
				RegisterTime:  time.Now().Format("2006-01-02 15:04:05"),
				Status:        "normal",
			},
		}
		data, _ := json.MarshalIndent(defaultUsers, "", "    ")
		os.WriteFile(usersPath, data, 0644)
	}
	s.loadUsers(usersPath)

	// 6. 加载模拟区块链数据
	blockchainPath := filepath.Join(s.dataDir, "blockchain.json")
	if !fileExists(blockchainPath) {
		// 生成创世区块
		genesisBlock := models.Block{
			Index:        0,
			Timestamp:    time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC).Unix(),
			Transactions: []models.Transaction{},
			Nonce:        0,
			Hash:         "0000000000000000000000000000000000000000000000000000000000000000",
			PreviousHash: "0000000000000000000000000000000000000000000000000000000000000000",
			MerkleRoot:   "0000000000000000000000000000000000000000000000000000000000000000",
		}
		s.Chain = append(s.Chain, genesisBlock)
		data, _ := json.MarshalIndent(s.Chain, "", "    ")
		os.WriteFile(blockchainPath, data, 0644)
	} else {
		s.loadJSON(blockchainPath, &s.Chain)
	}

	return nil
}

// 辅助方法：判断文件是否存在
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// 辅助方法：复制文件
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func (s *Store) loadJSON(path string, target interface{}) {
	data, err := os.ReadFile(path)
	if err == nil {
		json.Unmarshal(data, target)
	}
}

func (s *Store) loadUsers(path string) {
	data, err := os.ReadFile(path)
	if err == nil {
		json.Unmarshal(data, &s.Users)
	}
}

func (s *Store) SaveUsers() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Users, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "users.json"), data, 0644)
}

func (s *Store) SaveWorks() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Works, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "photography.json"), data, 0644)
}

func (s *Store) SaveTournaments() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Tournaments, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "tournaments.json"), data, 0644)
}

func (s *Store) SaveAnnouncements() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Announcements, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "announcements.json"), data, 0644)
}

func (s *Store) SaveFeedback() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Feedbacks, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "feedback.json"), data, 0644)
}

func (s *Store) SaveBlockchain() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Chain, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "blockchain.json"), data, 0644)
}

func (s *Store) SaveVotes() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Votes, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "votes.json"), data, 0644)
}

func (s *Store) SaveOrders() {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.MarshalIndent(s.Orders, "", "    ")
	os.WriteFile(filepath.Join(s.dataDir, "orders.json"), data, 0644)
}

// 模拟上链挖矿方法
func (s *Store) SimulateMineBlock(tx models.Transaction) models.Block {
	s.mu.Lock()
	defer s.mu.Unlock()

	lastBlock := s.Chain[len(s.Chain)-1]
	newIndex := len(s.Chain)

	// 计算 MerkleRoot 与区块哈希
	txData, _ := json.Marshal(tx)
	txHash := fmt.Sprintf("%x", sha256.Sum256(txData))
	tx.Hash = txHash

	newBlock := models.Block{
		Index:        newIndex,
		Timestamp:    time.Now().Unix(),
		Transactions: []models.Transaction{tx},
		Nonce:        rand.Intn(100000),
		PreviousHash: lastBlock.Hash,
		MerkleRoot:   txHash,
	}

	blockData, _ := json.Marshal(newBlock)
	newBlock.Hash = fmt.Sprintf("%x", sha256.Sum256(blockData))

	s.Chain = append(s.Chain, newBlock)
	
	// 在后台异步写盘，防止同步卡顿
	go func() {
		data, _ := json.MarshalIndent(s.Chain, "", "    ")
		os.WriteFile(filepath.Join(s.dataDir, "blockchain.json"), data, 0644)
	}()

	return newBlock
}
