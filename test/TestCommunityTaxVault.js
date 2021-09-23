const LAVAX = artifacts.require("LAVAX");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const SteakBank = artifacts.require("SteakBankImpl");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));


contract('CommunityTaxVault Contract', (accounts) => {
    it('Test Claim AVAX', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();

        await web3.eth.sendTransaction({ from: initialGov, to: CommunityTaxVault.address, value: web3.utils.toBN(1e18), chainId: 666})

        try {
            await communityTaxInst.claimAVAX(web3.utils.toBN(1e18), player0, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }

        const beforeClaimAVAXPlayer0 = await web3.eth.getBalance(player0);
        let claimAVAXTx = await communityTaxInst.claimAVAX(web3.utils.toBN(1e16), player0, {from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(claimAVAXTx, "Withdraw",(ev) => {
            return ev.recipient.toLowerCase() === player0.toLowerCase() && ev.amount.toString() === "10000000000000000";
        });
        const afterClaimAVAXPlayer0 = await web3.eth.getBalance(player0);
        assert.equal(web3.utils.toBN(afterClaimAVAXPlayer0).sub(web3.utils.toBN(beforeClaimAVAXPlayer0)).eq(web3.utils.toBN("10000000000000000")), true, "wrong claimed AVAX amount");


        claimAVAXTx = await communityTaxInst.claimAVAX(web3.utils.toBN(1e18), player0, {from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(claimAVAXTx, "Withdraw",(ev) => {
            return ev.recipient.toLowerCase() === player0.toLowerCase() && ev.amount.toString() === "990000000000000000";
        });
    });
    it('Test Transfer governorship', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();

        try {
            await communityTaxInst.transferGovernorship("0x0000000000000000000000000000000000000000", {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("new governor is zero address"));
        }

        try {
            await communityTaxInst.transferGovernorship(player0, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }

        let transferGovernorshipTx = await communityTaxInst.transferGovernorship(player0, {from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(transferGovernorshipTx, "GovernorshipTransferred",(ev) => {
            return ev.oldGovernor.toLowerCase() === initialGov.toLowerCase() && ev.newGovernor.toLowerCase() === player0.toLowerCase();
        });
        let governor = await communityTaxInst.governor();
        assert.equal(governor, player0, "wrong governship owner");

        await communityTaxInst.transferGovernorship(initialGov, {from: player0, chainId: 666});
        governor = await communityTaxInst.governor();
        assert.equal(governor, initialGov, "wrong governship owner");
    });
    it('Test Claim LAVAX', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();
        const steakBankInst = await SteakBank.deployed();
        const lavaxInst = await LAVAX.deployed();
        await steakBankInst.stake({from: player4, value: 1e19});

        await lavaxInst.approve(SteakBank.address, "9990000000000000000", {from: player4});
        await steakBankInst.unstake("9990000000000000000", {from: player4});
        let communityTaxVaultLAVAXBalance = await lavaxInst.balanceOf(CommunityTaxVault.address);
        assert.equal(communityTaxVaultLAVAXBalance.toString(), "4995000000000000", "wrong LAVAX amount");

        await communityTaxInst.claimLAVAX("9990000000000000", initialGov, {from: initialGov});
        communityTaxVaultLAVAXBalance = await lavaxInst.balanceOf(CommunityTaxVault.address);
        assert.equal(communityTaxVaultLAVAXBalance.toString(), "0", "wrong LAVAX amount");
    });
});