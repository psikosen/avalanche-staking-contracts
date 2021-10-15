const LAVAX = artifacts.require("LAVAX");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const SteakBank = artifacts.require("SteakBankImpl");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract('SteakBank Contract', (accounts) => {
    it('Test Stake', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lavaxInst = await LAVAX.deployed();

        const lavaxName = await lavaxInst.name();
        assert.equal(lavaxName, "Liquidity Staked AVAX", "wrong name");
        const lavaxSymbol = await lavaxInst.symbol();
        assert.equal(lavaxSymbol, "LAVAX", "wrong symbol");
        const lavaxDecimals = await lavaxInst.decimals();
        assert.equal(lavaxDecimals, "18", "wrong decimals");
        const totalSupply = await lavaxInst.totalSupply();
        assert.equal(totalSupply.toString(), "0", "wrong total supply");
        const lavaxOwner = await lavaxInst.owner();
        assert.equal(lavaxOwner.toString(), SteakBank.address, "wrong owner");

        const tssInitialBalance = await web3.eth.getBalance(bcStakingTSS);

        let stakeTx0 = await steakBankInst.stake({from: player0, value: 1e18});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.avaxAmount.toString() === "999500000000000000";
        });
        const player0LAVAXBalance = await lavaxInst.balanceOf(player0);
        assert.equal(player0LAVAXBalance.toString(), "999500000000000000", "wrong lavax balance");
        const tssBalance0 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN(tssInitialBalance).add(web3.utils.toBN("999500000000000000")).toString(), tssBalance0.toString(), "wrong avax balance");
        const communityTaxVaultBalance0 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(communityTaxVaultBalance0.toString(), "500000000000000", "wrong avax balance");

        let stakeTx1 = await steakBankInst.stake({from: player1, value: 2e18});
        truffleAssert.eventEmitted(stakeTx1, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player1.toLowerCase() && ev.avaxAmount.toString() === "1999000000000000000";
        });
        const tssBalance1 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("1999000000000000000").add(web3.utils.toBN(tssBalance0)).toString(), tssBalance1.toString(), "wrong avax balance");
        const communityTaxVaultBalance1 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(communityTaxVaultBalance1.toString(), "1500000000000000","wrong avax balance");

        const player1LAVAXBalance = await lavaxInst.balanceOf(player1);
        assert.equal(player1LAVAXBalance.toString(), "1999000000000000000", "wrong lavax balance");

        let lavaxTotalSupply = await lavaxInst.totalSupply();
        assert.equal(lavaxTotalSupply.toString(), "2998500000000000000", "wrong lavax balance");

        let stakeTx2 = await steakBankInst.stake({from: player2, value: 25e17});
        truffleAssert.eventEmitted(stakeTx2, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.avaxAmount.toString() === "2498750000000000000";
        });
        const tssBalance2 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2498750000000000000").add(web3.utils.toBN(tssBalance1)).toString(), tssBalance2.toString(), "wrong avax balance");
        const communityTaxVaultBalance2 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(communityTaxVaultBalance2.toString(), "2750000000000000","wrong avax balance");

        let stakeTx3 = await steakBankInst.stake({from: player3, value: 3e18});
        truffleAssert.eventEmitted(stakeTx3, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player3.toLowerCase() && ev.avaxAmount.toString() === "2998500000000000000";
        });
        const tssBalance3 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2998500000000000000").add(web3.utils.toBN(tssBalance2)).toString(), tssBalance3.toString(), "wrong avax balance");
        const communityTaxVaultBalance3 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("4250000000000000").toString(), communityTaxVaultBalance3.toString(), "wrong avax balance");

        let stakeTx4 = await steakBankInst.stake({from: player4, value: 35e17});
        truffleAssert.eventEmitted(stakeTx4, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player4.toLowerCase() && ev.avaxAmount.toString() === "3498250000000000000";
        });
        const tssBalance4 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("3498250000000000000").add(web3.utils.toBN(tssBalance3)).toString(), tssBalance4.toString(), "wrong avax balance");
        const communityTaxVaultBalance4 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("6000000000000000").toString(), communityTaxVaultBalance4.toString(), "wrong avax balance");

        const lavaxMarketCapacityCountByAVAX = await steakBankInst.lavaxMarketCapacityCountByAVAX();
        assert.equal(web3.utils.toBN("11994000000000000000").toString(), lavaxMarketCapacityCountByAVAX.toString(), "wrong lavaxMarketCapacityCountByAVAX");

        const lavaxToAVAXExchangeRate = await steakBankInst.lavaxToAVAXExchangeRate();
        assert.equal(web3.utils.toBN(1e9).toString(), lavaxToAVAXExchangeRate.toString(), "wrong lavaxToAVAXExchangeRate");

        lavaxTotalSupply = await lavaxInst.totalSupply();
        assert.equal(web3.utils.toBN("11994000000000000000").toString(), lavaxTotalSupply.toString(), "wrong lavax totalSupply");
    });

    it('Test Unstake', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lavaxInst = await LAVAX.deployed();

        await lavaxInst.approve(SteakBank.address, web3.utils.toBN("999500000000000000"), {from: player0})
        const allowance = await lavaxInst.allowance(player0, SteakBank.address);
        assert.equal(web3.utils.toBN("999500000000000000").eq(web3.utils.toBN(allowance)), true, "wrong allowance");

        let unstakeTx0 = await steakBankInst.unstake(web3.utils.toBN("999500000000000000"), {from: player0});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.avaxAmount.toString() === "999000250000000000" && ev.index.toNumber() === 0;
        });

        const lavaxTotalSupply = await lavaxInst.totalSupply();
        assert.equal(lavaxTotalSupply.toString(), "10994999750000000000", "wrong lavax totalSupply");

        const lavaxMarketCapacityCountByAVAX = await steakBankInst.lavaxMarketCapacityCountByAVAX();
        assert.equal(lavaxMarketCapacityCountByAVAX.toString(), "10994999750000000000", "wrong lavaxMarketCapacityCountByAVAX");
        const lavaxToAVAXExchangeRate = await steakBankInst.lavaxToAVAXExchangeRate();
        assert.equal(lavaxToAVAXExchangeRate.toString(), "1000000000", "wrong lavaxToAVAXExchangeRate");

        const communityTaxVaultLAVAXBalance0 = await lavaxInst.balanceOf(CommunityTaxVault.address);
        assert.equal(communityTaxVaultLAVAXBalance0.toString(), "499750000000000", "wrong lavax balance");

        const balanceOfPlayer0 = await lavaxInst.balanceOf(player0);
        assert.equal(balanceOfPlayer0.toString(), "0", "wrong lavax balance");

        const tailIdx = await steakBankInst.tailIdx();
        assert.equal(tailIdx.toString(), "1", "wrong tailIdx");

        const headerIdx = await steakBankInst.headerIdx();
        assert.equal(headerIdx.toString(), "0", "wrong headerIdx");

        let isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        const transferToUnstakeVaultTx = await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN(999000250000000000), chainId: 666})
        // truffleAssert.eventEmitted(transferToUnstakeVaultTx, "Deposit", (ev) => {
        //     return ev.from.toLowerCase() === bcStakingTSS.toLowerCase() && ev.amount.toNumber() === 1e18;
        // });
        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(unstakeVaultBalance.toString(), "999000250000000000", "wrong unstakeVaultBalance");

        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");

        const beforeClaimUnstake = await web3.eth.getBalance(player0);
        await steakBankInst.batchClaimPendingUnstake(1, { from: bcStakingTSS});
        const afterClaimUnstake = await web3.eth.getBalance(player0);
        assert.equal(web3.utils.toBN(afterClaimUnstake).sub(web3.utils.toBN(beforeClaimUnstake)).toString(), "999000250000000000", "wrong claimed unstake amount");
    });
    it('Test rebaseLAVAXToAVAX', async () => {
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lavaxInst = await LAVAX.deployed();

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: StakingRewardVault.address, value: web3.utils.toBN(1e18), chainId: 666})

        const lavaxMarketCapacityCountByAVAX = await steakBankInst.lavaxMarketCapacityCountByAVAX();
        assert.equal(lavaxMarketCapacityCountByAVAX.toString(), "10994999750000000000", "wrong lavaxMarketCapacityCountByAVAX");
        const lavaxToAVAXExchangeRate = await steakBankInst.lavaxToAVAXExchangeRate();
        assert.equal(lavaxToAVAXExchangeRate.toString(), "1000000000", "wrong lavaxToAVAXExchangeRate");

        const rebaseLAVAXToAVAXTx = await steakBankInst.rebaseLAVAXToAVAX({from: bcStakingTSS})
        truffleAssert.eventEmitted(rebaseLAVAXToAVAXTx, "LogUpdateLAVAXToAVAXExchangeRate", (ev) => {
            return ev.LAVAXTotalSupply.toString() === "10994999750000000000" && ev.LAVAXMarketCapacityCountByAVAX.toString() === "11994999750000000000" && ev.LAVAXToAVAXExchangeRate.toString() === "1090950434";
        });

        let stakeTx0 = await steakBankInst.stake({from: player0, value: 1e18});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.lavaxAmount.toString() === "916173612338468532" && ev.avaxAmount.toString() === "999500000000000000";
        });
        const player0LAVAXBalance = await lavaxInst.balanceOf(player0);
        assert.equal(player0LAVAXBalance.toString(), "916173612338468532", "wrong lavax balance");

        await lavaxInst.approve(SteakBank.address, web3.utils.toBN("1998000000000000000"), {from: player1})
        let unstakeTx0 = await steakBankInst.unstake(web3.utils.toBN("1998000000000000000"), {from: player1});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player1.toLowerCase() && ev.lavaxAmount.toString() === "1997001000000000000" && ev.avaxAmount.toString() === "2178629107648434000" && ev.index.toNumber() === 1;
        });

        await lavaxInst.approve(SteakBank.address, web3.utils.toBN("2497500000000000000"), {from: player2})
        let unstakeTx1 = await steakBankInst.unstake(web3.utils.toBN("2497500000000000000"), {from: player2});
        truffleAssert.eventEmitted(unstakeTx1, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.lavaxAmount.toString() === "2496251250000000000" && ev.avaxAmount.toString() === "2723286384560542500" && ev.index.toNumber() === 2;
        });

        await lavaxInst.approve(SteakBank.address, web3.utils.toBN("2997000000000000000"), {from: player3})
        let unstakeTx2 = await steakBankInst.unstake(web3.utils.toBN("2997000000000000000"), {from: player3});
        truffleAssert.eventEmitted(unstakeTx2, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player3.toLowerCase() && ev.lavaxAmount.toString() === "2995501500000000000" && ev.avaxAmount.toString() === "3267943661472651000" && ev.index.toNumber() === 3;
        });

        const headerIdx = await steakBankInst.headerIdx();
        assert.equal(headerIdx.toNumber(), 1, "wrong headerIdx");
        const tailIdx = await steakBankInst.tailIdx();
        assert.equal(tailIdx.toNumber(), 4, "wrong tailIdx");

        let isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(1)));
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(2)));
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN("5166081930000000000"), chainId: 666})

        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(web3.utils.toBN("6166081930000000000").eq(web3.utils.toBN(unstakeVaultBalance)), true, "wrong unstakeVaultBalance");

        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(1)));
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(2)));
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        let unstakeLength = await steakBankInst.getUnstakeSeqsLength(player1);
        assert.equal(unstakeLength.toString(), "1", "wrong unstake length");
        unstakeLength = await steakBankInst.getUnstakeSeqsLength(player2);
        assert.equal(unstakeLength.toString(), "1", "wrong unstake length");
        unstakeLength = await steakBankInst.getUnstakeSeqsLength(player3);
        assert.equal(unstakeLength.toString(), "1", "wrong unstake length");

        let priceToAccelerateUnstake = await steakBankInst.priceToAccelerateUnstake();
        assert.equal(priceToAccelerateUnstake.toString(), "10", "wrong priceToAccelerateUnstake");

        await steakBankInst.setPriceToAccelerateUnstake(100, {from: initialGov})
        priceToAccelerateUnstake = await steakBankInst.priceToAccelerateUnstake();
        assert.equal(priceToAccelerateUnstake.toString(), "100", "wrong priceToAccelerateUnstake");
        const estimateResult = await steakBankInst.estimateSBFCostForAccelerate(3, 2);
        const costSBFAmount = estimateResult[1];

        await steakBankInst.setPriceToAccelerateUnstake(10, {from: initialGov});
        const newEstimateResult = await steakBankInst.estimateSBFCostForAccelerate(3, 2);
        const requiredSBFAmount = newEstimateResult[1];
        assert.equal(web3.utils.toBN(requiredSBFAmount).toString(), costSBFAmount.div(web3.utils.toBN(10)).toString(), "wrong priceToAccelerateUnstake");

        const sbfInst = await SBF.deployed();
        await sbfInst.transfer(player3, requiredSBFAmount, {from: initialGov});
        const player3SBFBal = await sbfInst.balanceOf(player3);
        assert.equal(web3.utils.toBN(player3SBFBal).eq(web3.utils.toBN(requiredSBFAmount)), true, "wrong sbf balance");
        await sbfInst.approve(SteakBank.address, requiredSBFAmount, {from: player3});

        let firstPlayer3UnstakeIdx = await steakBankInst.getUnstakeSequence(player3, 0)
        assert.equal(firstPlayer3UnstakeIdx.toString(), "3", "wrong player3 first unstake index");

        try {
            await steakBankInst.accelerateUnstakedMature(3, 2, web3.utils.toBN(requiredSBFAmount).sub(web3.utils.toBN(1)), {from: player3});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("cost too much SBF"));
        }

        await steakBankInst.accelerateUnstakedMature(3, 2, requiredSBFAmount, {from: player3});
        firstPlayer3UnstakeIdx = await steakBankInst.getUnstakeSequence(player3, 0)
        assert.equal(firstPlayer3UnstakeIdx.toString(), "1", "wrong player3 first unstake index");

        let firstPlayer2UnstakeIdx = await steakBankInst.getUnstakeSequence(player2, 0);
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(firstPlayer2UnstakeIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN(3e18), chainId: 666})

        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(firstPlayer2UnstakeIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");

        const beforeClaimUnstakePlayer1 = await web3.eth.getBalance(player1);
        const beforeClaimUnstakePlayer2 = await web3.eth.getBalance(player2);
        const beforeClaimUnstakePlayer3 = await web3.eth.getBalance(player3);
        await steakBankInst.batchClaimPendingUnstake(3, { from: bcStakingTSS});
        const afterClaimUnstakePlayer1 = await web3.eth.getBalance(player1);
        const afterClaimUnstakePlayer2 = await web3.eth.getBalance(player2);
        const afterClaimUnstakePlayer3 = await web3.eth.getBalance(player3);
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer1).sub(web3.utils.toBN(beforeClaimUnstakePlayer1)).toString(), "2178629107648434000", "wrong claimed unstake amount");
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer2).sub(web3.utils.toBN(beforeClaimUnstakePlayer2)).toString(), "2723286384560542500", "wrong claimed unstake amount");
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer3).sub(web3.utils.toBN(beforeClaimUnstakePlayer3)).toString(), "3267943661472651000", "wrong claimed unstake amount");
    });
    it('Test resendAVAXToBCStakingTSS', async () => {
        deployerAccount = accounts[0];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];

        const steakBankInst = await SteakBank.deployed();

        await web3.eth.sendTransaction({ from: deployerAccount, to: SteakBank.address, value: web3.utils.toBN(1e18), chainId: 666})

        const beforeResendBCStakingTSS = await web3.eth.getBalance(bcStakingTSS);
        await steakBankInst.resendAVAXToBCStakingTSS(web3.utils.toBN(1e18), {from: player0});
        const afterResendBCStakingTSS = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN(afterResendBCStakingTSS).sub(web3.utils.toBN(beforeResendBCStakingTSS)).toString(), "1000000000000000000", "wrong resend result");
    });

    it('Test transfer admin', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        wrongAdmin = accounts[2];

        const steakBankInst = await SteakBank.deployed();

        try {
            await steakBankInst.setPendingAdmin(deployerAccount, {from: wrongAdmin});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Call must come from admin"));
        }

        let admin = await steakBankInst.admin();
        assert.equal(admin, initialGov,"wrong admin");

        await steakBankInst.setPendingAdmin(deployerAccount, {from: initialGov});

        admin = await steakBankInst.admin();
        assert.equal(admin, initialGov,"wrong admin");

        let pendingAdmin = await steakBankInst.pendingAdmin();
        assert.equal(pendingAdmin, deployerAccount,"wrong pendingAdmin");

        try {
            await steakBankInst.acceptAdmin({from: wrongAdmin});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Call must come from pendingAdmin"));
        }

        await steakBankInst.acceptAdmin({from: deployerAccount});
        admin = await steakBankInst.admin();
        assert.equal(admin, deployerAccount,"wrong admin");
        pendingAdmin = await steakBankInst.pendingAdmin();
        assert.equal(pendingAdmin, "0x0000000000000000000000000000000000000000","wrong pendingAdmin");

        await steakBankInst.setPendingAdmin(initialGov, {from: deployerAccount});
        await steakBankInst.acceptAdmin({from: initialGov});
    });

    it('Test pause', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        player0 = accounts[5];

        const steakBankInst = await SteakBank.deployed();

        let paused = await steakBankInst.paused();
        assert.equal(paused, false,"wrong paused");

        await steakBankInst.pause({from: initialGov});
        paused = await steakBankInst.paused();
        assert.equal(paused, true,"wrong paused");

        try {
            await steakBankInst.stake({from: player0, value: 1e18});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Pausable: paused"));
        }

        try {
            await steakBankInst.unstake(web3.utils.toBN("999000000000000000"), {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Pausable: paused"));
        }

        await steakBankInst.unpause({from: initialGov});
        paused = await steakBankInst.paused();
        assert.equal(paused, false,"wrong paused");

        const stakeTx0 = await steakBankInst.stake({from: player0, value: 1e18});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase();
        });
    });
    it('Test setStakeFeeRate and setUnstakeFeeRate', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        player0 = accounts[5];

        const steakBankInst = await SteakBank.deployed();

        await steakBankInst.setStakeFeeRate(0, {from: initialGov});

        try {
            await steakBankInst.setStakeFeeRate(60, {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("stake fee rate must be less than 0.5%"));
        }


        await steakBankInst.setUnstakeFeeRate(0, {from: initialGov});

        try {
            await steakBankInst.setUnstakeFeeRate(60, {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("unstake fee rate must be less than 0.5%"));
        }

        await steakBankInst.setStakeFeeRate(5, {from: initialGov});
        await steakBankInst.setUnstakeFeeRate(5, {from: initialGov});

        const stakeFeeMolecular = await steakBankInst.stakeFeeMolecular();
        assert.equal(stakeFeeMolecular, "5","wrong stakeFeeMolecular");

        const unstakeFeeMolecular = await steakBankInst.unstakeFeeMolecular();
        assert.equal(unstakeFeeMolecular, "5","wrong unstakeFeeMolecular");
    });
});