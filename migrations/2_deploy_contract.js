let adopt = artifacts.require("Adoption");
let user = artifacts.require("UserManager");
let photoCert = artifacts.require("PhotoCertification");

module.exports = function(deployer) {
  deployer.deploy(adopt);
  deployer.deploy(user);
  deployer.deploy(photoCert);
};
