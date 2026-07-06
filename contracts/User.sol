//SPDX-License-Identifier:MIT
pragma solidity >=0.8.0 <0.9.0;

contract UserManager{
    //1、存放用户的基本信息，声明一个结构体
    struct User{
        address owner; //用户的唯一区块链上的账号地址
        string name;//用户的昵称，唯一值
        string pwd;//用户的密码
    }
    //2、根据账号返回用户的个人信息，声明一个映射
    mapping(address=>User) private myUser;
    //3、已注册的用户集合，声明一个数组
    User[] private registeredUsers;
    
    //4、声明函数，判断账号是否已经存在
    function isExistsAddress(address addr) private view returns(bool){
        //从映射中通过传入的参数地址返回用户
        User storage info = myUser[addr];
        return (info.owner == addr);
    }

    //5、声明函数，实现字符串的转换，因为solidity不支持字符串直接比较，要转成bytes32
    function convertStr(string memory str) private pure returns(bytes32){
        return keccak256(abi.encodePacked(str));
    }

    //6、声明函数，判断昵称是否是唯一值
    function isExistsName(string memory s) private view returns(bool){
        //遍历已注册数组，判断参数传入的用户名是否和已注册的昵称相同
        for(uint i = 0;i<registeredUsers.length;i++){
            //registeredUsers[i].name 数组下标所在的用户的昵称
            //s是传入进来的用户昵称
            //两个昵称进行比较，字符串先转换
            if(convertStr(registeredUsers[i].name)==convertStr(s)){
                return true;//昵称已经被注册
            }
        }
        return false;//for循环结束未返回，则肯定是传入的昵称不存在
    }

    //7、实现用户注册
    function register(address addr,string memory name,string memory pwd) public{
         //7.1 先判断地址是否已经被注册
         require(!isExistsAddress(addr),unicode"地址已经被注册！");
         //7.2 判断昵称是否已经被注册
         require(!isExistsName(name),unicode"昵称已经被注册！");
         //7.3 开始注册，首先通过参数得到一个新的用户对象
         User memory user = User(addr,name,pwd);
         //然后将对象存入到映射以及数组中
         myUser[addr] = user;
         registeredUsers.push(user); //用户添加到已注册的列表
    }

    //8、用户登录
    function login(address addr,
                   string memory name,
                   string memory pwd) public view returns(string memory){
        //8.1 判断账号是否存在
        if(!isExistsAddress(addr)){
            return unicode"账户不存在";
        }
        //8.2 判断昵称和密码是否正确
        //通过账号获得用户对象
        User memory info = myUser[addr];
        //比较用户对象中的昵称和传入的参数昵称
        if(convertStr(info.name)!=convertStr(name)){
            return unicode"昵称出错！";
        }
        if(convertStr(info.pwd)!=convertStr(pwd)){
            return unicode"密码出错！";
        }
        return unicode"登录成功！";  
    }
     
    //9、修改密码
    function updatePwd(address addr,string memory newPwd) public{
        require(isExistsAddress(addr),unicode"地址不存在！");
        User memory info = myUser[addr];//通过地址得到对象
        info.pwd = newPwd;//更新对象中的密码
        //将映射中的当前用户对象更新
        myUser[addr] = info;
        //将注册列表的当前用户去更新
        for(uint i = 0;i<registeredUsers.length;i++){
            //如果参数地址等于注册列表中下标为i的用户地址
            if(registeredUsers[i].owner == addr){
                //更新用户
                registeredUsers[i] = info;
                return;
            }
        }
    } 

     //10、修改昵称
    function updateName(address addr,string memory newName) public{
        require(isExistsAddress(addr),unicode"地址不存在！");
        require(!isExistsName(newName),unicode"此昵称已经存在！");
        User memory info = myUser[addr];//通过地址得到对象
        info.name = newName;//更新对象中的昵称
        //将映射中的当前用户对象更新
        myUser[addr] = info;
        //将注册列表的当前用户去更新
        for(uint i = 0;i<registeredUsers.length;i++){
            //如果参数地址等于注册列表中下标为i的用户地址
            if(registeredUsers[i].owner == addr){
                //更新用户
                registeredUsers[i] = info;
                return;
            }
        }
    }

    //11、根据账号返回用户信息对象
    function getUser(address addr) public view returns(User memory){
        return myUser[addr];
    } 
    //12、根据账号返回用户详细信息
    function getUserInfo(address addr) public view 
                                       returns(address,
                                               string memory,
                                               string memory){
         User memory info = myUser[addr];
         return (info.owner,info.name,info.pwd);
    }
    
    //12、返回已注册的用户列表
    function getUserList() view public returns(User[] memory){
        return registeredUsers;
    }
}