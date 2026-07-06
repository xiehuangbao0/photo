//SPDX-License-Identifier:MIT
pragma solidity >=0.8.0 <0.9.0;

contract Adoption{
    //存储宠物领养人的数组
    address[16] adopters;
    //返回所有领养人
    function getAdopters() public view returns(address[16] memory){
        return adopters;
    }

    //宠物领养事件
    //event adoptEvent(address,uint);
    //领养宠物
    function adopt(uint petId) public{
        require(petId>=0 && petId<adopters.length,unicode"宠物不存在");
        //一个地址只能领养一只宠物
        for(uint i=0;i<adopters.length;i++){
            //msg.sender是表示当前调用函数的账号地址
            //如果当前地址不等于领养人数组的任意一个地址
            //就说明当前地址尚未领养宠物
            require(adopters[i]!=msg.sender,unicode"你已经领养过宠物了！");
        }
        //将当前账号保存在对应的宠物编号所在的数组位置
        adopters[petId] = msg.sender;
        //触发领养事件，保存领养人和领养ID
        //emit adoptEvent(msg.sender, petId);
    }
}