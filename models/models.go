package models

// 思考过程 (Chinese Thinking Process):
// 这里定义了项目所需的所有核心数据模型，它们与前端展示以及原 JSON 文件的数据格式完美对应。
// 为了支持在本地没有 Ganache 连接时的区块链交易模拟，我们还专门设计了 Block 和 Transaction 结构体，
// 以便在 Go 后端模拟出一个共享的本地“虚拟区块链”。

// User 代表注册用户的信息
type User struct {
	Account          string  `json:"account"`          // 账号唯一标识
	Password         string  `json:"password"`         // 密码
	NickName         string  `json:"nickName"`         // 昵称
	Role             string  `json:"role"`             // 角色: admin (管理员), photographer (摄影师), user (普通用户)
	Phone            string  `json:"phone"`            // 手机号
	Bio              string  `json:"bio"`              // 个人简介
	WalletAddress    string  `json:"walletAddress"`    // ETH钱包地址
	WalletPrivateKey string  `json:"walletPrivateKey"` // ETH钱包私钥 (仅本地模拟使用)
	EthBalance       float64 `json:"ethBalance"`       // ETH余额
	CnyBalance       float64 `json:"cnyBalance"`       // 人民币余额
	RegisterTime     string  `json:"registerTime"`     // 注册时间
	Status           string  `json:"status"`           // 状态: normal (正常), disabled (禁用)
}

// Reply 代表评论的回复
type Reply struct {
	ID       int64  `json:"id"`
	UserID   string `json:"userId"`
	UserNick string `json:"userNick"`
	Content  string `json:"content"`
	Time     string `json:"time"`
}

// Comment 代表作品的评论
type Comment struct {
	ID       int64   `json:"id"`
	UserID   string  `json:"userId"`
	UserNick string  `json:"userNick"`
	Content  string  `json:"content"`
	Time     string  `json:"time"`
	Replies  []Reply `json:"replies"`
}

// Work 代表摄影作品信息
type Work struct {
	ID            int64     `json:"id"`            // 作品唯一ID
	WorkName      string    `json:"workName"`      // 作品名称
	Img           string    `json:"img"`           // 作品图片路径或base64 (后端改为保存文件路径，如 /uploads/xxx.jpg)
	AuthorAccount string    `json:"authorAccount"` // 作者账号
	AuthorNick    string    `json:"authorNick"`    // 作者昵称
	Category      string    `json:"category"`      // 分类: 风光摄影、自然风光、人像摄影等
	Desc          string    `json:"desc"`          // 作品简介
	VoteCount     int       `json:"voteCount"`     // 得票数
	Status        string    `json:"status"`        // 状态: pending (待审核), online (已上架审核通过), offline (下架)
	Equipment     string    `json:"equipment"`     // 拍摄器材
	Price         float64   `json:"price"`         // 版权价格 (人民币元)
	WalletAddress string    `json:"walletAddress"` // 作者钱包地址
	CreateTime    string    `json:"createTime"`    // 上传日期 (YYYY-MM-DD)
	Hash          string    `json:"hash"`          // 原创作品内容哈希 (链上对应)
	TxHash        string    `json:"txHash"`        // 存证交易哈希
	BlockHeight   int       `json:"blockHeight"`   // 存证区块高度
	CertID        int       `json:"certId"`        // 存证证书ID (合约内nextCertId)
	ChainTime     string    `json:"chainTime"`     // 上链存证时间
	OnChain       bool      `json:"onChain"`       // 是否已完成区块链存证上链
	TournamentID  int       `json:"tournamentId"`  // 投稿赛事ID
	Comments      []Comment `json:"comments"`      // 评论列表
	CollectedBy   []string  `json:"collectedBy"`   // 收藏该作品的用户账号列表
	IsPurchased   bool      `json:"isPurchased"`   // 是否已被购买版权 (前端兼容字段)
	PurchaseTime  string    `json:"purchaseTime"`  // 购买时间
	BuyerAccount  string    `json:"buyerAccount"`  // 购买者账号
}

// Prize 代表赛事奖项配置
type Prize struct {
	Rank  string `json:"rank"`  // 奖项级别，如一等奖
	Prize string `json:"prize"` // 奖品内容
}

// WinnerInfo 代表赛事中获奖作品信息
type WinnerInfo struct {
	Rank     string `json:"rank"`
	WorkID   int64  `json:"workId"`
	WorkName string `json:"workName"`
	Author   string `json:"author"`
	Img      string `json:"img"`
}

// Tournament 代表摄影赛事
type Tournament struct {
	ID          int          `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	StartTime   string       `json:"startTime"`
	EndTime     string       `json:"endTime"`
	VoteStart   string       `json:"voteStart"`
	VoteEnd     string       `json:"voteEnd"`
	Status      string       `json:"status"` // ongoing (投稿/投票中，合并为active或通过日期计算), ended (已结束)
	Categories  []string     `json:"categories"`
	Prizes      []Prize      `json:"prizes"`
	Winners     []WinnerInfo `json:"winners"`
}

// Announcement 代表平台公告
type Announcement struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Time    string `json:"time"`
	Type    string `json:"type"` // winner, tournament, system, feature
	Content string `json:"content"`
}

// Feedback 代表意见反馈
type Feedback struct {
	ID         int64  `json:"id"`
	UserID     string `json:"userId"`
	UserNick   string `json:"userNick"`
	Title      string `json:"title"`
	Type       string `json:"type"` // tournament, certify, market, bug, other
	Content    string `json:"content"`
	Contact    string `json:"contact"`
	Status     string `json:"status"` // pending (未处理), processed (已处理)
	Reply      string `json:"reply"`  // 管理员回复
	CreateTime string `json:"createTime"`
}

// Transaction 代表模拟区块链的交易
type Transaction struct {
	Hash      string      `json:"hash"`
	Sender    string      `json:"sender"`
	Recipient string      `json:"recipient"`
	Type      string      `json:"type"`      // certify (存证), purchase (购买)
	Data      interface{} `json:"data"`      // 交易关联业务数据
	Timestamp int64       `json:"timestamp"` // 毫秒时间戳
	Value     string      `json:"value"`     // 交易价值 (以ETH为单位)
}

// Block 代表模拟区块链的区块
type Block struct {
	Index        int           `json:"index"`
	Timestamp    int64         `json:"timestamp"`
	Transactions []Transaction `json:"transactions"`
	Nonce        int           `json:"nonce"`
	Hash         string        `json:"hash"`
	PreviousHash string        `json:"previousHash"`
	MerkleRoot   string        `json:"merkleRoot"`
}

// VoteRecord 代表投票记录
type VoteRecord struct {
	UserAccount string `json:"userAccount"`
	WorkID      int64  `json:"workId"`
	VoteDate    string `json:"voteDate"` // YYYY-MM-DD
}

// Order 代表版权购买订单记录
type Order struct {
	ID            int64   `json:"id"`
	WorkID        int64   `json:"workId"`
	WorkName      string  `json:"workName"`
	Img           string  `json:"img"`
	BuyerAccount  string  `json:"buyerAccount"`
	SellerAccount string  `json:"sellerAccount"`
	Price         float64 `json:"price"`
	TxHash        string  `json:"txHash"`
	Time          string  `json:"time"`
}

