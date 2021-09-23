const LAVAX = artifacts.require("LAVAX");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const SteakBank = artifacts.require("SteakBankImpl");

module.exports = function (deployer, network, accounts) {
  deployerAccount = accounts[0];
  initialGov = accounts[1];
  govGuardian = accounts[3];
  bcStakingTSS = accounts[4];

  deployer.deploy(SteakBank).then(async () => {

    await deployer.deploy(LAVAX, SteakBank.address);
    await deployer.deploy(SBF, initialGov);

    await deployer.deploy(CommunityTaxVault, initialGov, LAVAX.address);
    await deployer.deploy(StakingRewardVault, SteakBank.address);
    await deployer.deploy(UnstakeVault, SteakBank.address);
    
    const steakBankInst = await SteakBank.deployed();
    const sbfInst = await SBF.deployed();

    await steakBankInst.initialize(initialGov, LAVAX.address, SBF.address, bcStakingTSS, CommunityTaxVault.address, StakingRewardVault.address, UnstakeVault.address, "10", {from: deployerAccount});
  });
};
