//SPDX-License-Identifier:MIT
pragma solidity >=0.8.0 <0.9.0;

contract PhotoCertification {
    struct Certification {
        uint256 id;
        address author;
        string title;
        string hash;
        string category;
        uint256 timestamp;
        bool certified;
    }

    struct User {
        uint256 id;
        string account;
        string nickname;
        address walletAddress;
        uint256 registerTime;
        bool registered;
        bool isAdmin;
    }

    mapping(uint256 => Certification) public certifications;
    mapping(address => uint256[]) public authorCertifications;
    mapping(address => User) public users;
    mapping(string => address) public accountToAddress;
    uint256 public nextCertId;
    uint256 public nextUserId;
    address public admin;

    event Certified(
        uint256 indexed id,
        address indexed author,
        string title,
        string hash,
        uint256 timestamp
    );

    event Registered(
        uint256 indexed id,
        string account,
        string nickname,
        address indexed walletAddress,
        uint256 timestamp
    );

    event Purchased(
        uint256 indexed id,
        uint256 indexed certId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 timestamp
    );

    struct Purchase {
        uint256 id;
        uint256 certId;
        address buyer;
        address seller;
        uint256 price;
        uint256 timestamp;
        bool completed;
    }

    mapping(uint256 => Purchase) public purchases;
    mapping(uint256 => uint256) public certificationToPurchase;
    uint256 public nextPurchaseId;

    modifier onlyAdmin() {
        require(users[msg.sender].isAdmin, "Only admin can certify");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function register(
        string memory account,
        string memory nickname
    ) public returns (uint256) {
        require(!users[msg.sender].registered, "User already registered");
        
        uint256 userId = nextUserId++;
        
        bool isAdminUser = keccak256(abi.encodePacked(account)) == keccak256(abi.encodePacked("admin")) ||
                          keccak256(abi.encodePacked(account)) == keccak256(abi.encodePacked("admin1"));
        
        users[msg.sender] = User({
            id: userId,
            account: account,
            nickname: nickname,
            walletAddress: msg.sender,
            registerTime: block.timestamp,
            registered: true,
            isAdmin: isAdminUser
        });
        
        accountToAddress[account] = msg.sender;

        emit Registered(userId, account, nickname, msg.sender, block.timestamp);
        
        return userId;
    }

    function certify(
        string memory title,
        string memory hash,
        string memory category,
        address author
    ) public onlyAdmin returns (uint256) {
        uint256 certId = nextCertId++;
        
        certifications[certId] = Certification({
            id: certId,
            author: author,
            title: title,
            hash: hash,
            category: category,
            timestamp: block.timestamp,
            certified: true
        });

        authorCertifications[author].push(certId);

        emit Certified(certId, author, title, hash, block.timestamp);
        
        return certId;
    }

    function getCertification(uint256 id) public view returns (Certification memory) {
        return certifications[id];
    }

    function getAuthorCertifications(address author) public view returns (uint256[] memory) {
        return authorCertifications[author];
    }

    function getCertificationCount() public view returns (uint256) {
        return nextCertId;
    }

    function getUser(address addr) public view returns (User memory) {
        return users[addr];
    }

    function getUserId() public view returns (uint256) {
        return nextUserId;
    }

    function purchase(uint256 certId) public payable returns (uint256) {
        require(certId < nextCertId, "Certification does not exist");
        
        Certification storage cert = certifications[certId];
        require(cert.certified, "Certification not certified");
        require(certificationToPurchase[certId] == 0, "Certification already purchased");
        
        address seller = cert.author;
        require(seller != address(0), "Invalid seller address");
        require(seller != msg.sender, "Cannot purchase your own certification");
        
        uint256 price = msg.value;
        require(price > 0, "Price must be greater than zero");
        
        (bool success, ) = seller.call{value: price}("");
        require(success, "Transfer to seller failed");
        
        uint256 purchaseId = nextPurchaseId++;
        
        purchases[purchaseId] = Purchase({
            id: purchaseId,
            certId: certId,
            buyer: msg.sender,
            seller: seller,
            price: price,
            timestamp: block.timestamp,
            completed: true
        });
        
        certificationToPurchase[certId] = purchaseId;
        
        emit Purchased(purchaseId, certId, msg.sender, seller, price, block.timestamp);
        
        return purchaseId;
    }
}