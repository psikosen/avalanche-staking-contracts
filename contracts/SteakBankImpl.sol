pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "./interface/IMintBurnToken.sol";

import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract SteakBankImpl is Context, Initializable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint8 constant public BREATHE_PERIOD = 0;
    uint8 constant public NORMAL_PERIOD = 1;

    uint256 constant public MINIMUM_STAKE_AMOUNT = 1 * 1e18; // 1:AVAX
    uint256 constant public MINIMUM_UNSTAKE_AMOUNT = 8 * 1e17; // 0.8:AVAX
    uint256 constant public EXCHANGE_RATE_PRECISION = 1e9;
    uint256 constant public PRICE_TO_ACCELERATE_UNSTAKE_PRECISION = 1e9;
    uint256 constant public STAKE_FEE_DENOMINATOR = 10000;
    uint256 constant public UNSTAKE_FEE_DENOMINATOR = 10000;

    address public LAVAX;
    address public SBF;
    address payable public stakingTSSAddr;
    address payable public communityTaxVault;
    address payable public stakingRewardVault;
    address payable public unstakeVault;

    address public admin;
    address public pendingAdmin;

    bool private _paused;

    struct Unstake {
        address payable staker;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public lavaxMarketCapacityCountByAVAX;
    uint256 public lavaxToAVAXExchangeRate;

    mapping(uint256 => Unstake) public unstakesMap;
    mapping(address => uint256[]) public accountUnstakeSeqsMap;
    uint256 public headerIdx;
    uint256 public tailIdx;

    uint256 public priceToAccelerateUnstake;
    uint256 public stakeFeeMolecular;
    uint256 public unstakeFeeMolecular;

    event NewAdmin(address indexed newAdmin);
    event NewPendingAdmin(address indexed newPendingAdmin);
    event LogStake(address indexed staker, uint256 lavaxAmount, uint256 avaxAmount);
    event LogUnstake(address indexed staker, uint256 lavaxAmount, uint256 avaxAmount, uint256 index);
    event ClaimedUnstake(address indexed staker, uint256 amount, uint256 index);
    event LogUpdateLAVAXToAVAXExchangeRate(uint256 LAVAXTotalSupply, uint256 LAVAXMarketCapacityCountByAVAX, uint256 LAVAXToAVAXExchangeRate);
    event Paused(address account);
    event Unpaused(address account);
    event ReceiveDeposit(address from, uint256 amount);
    event AcceleratedUnstakedAVAX(address AcceleratedStaker, uint256 AcceleratedUnstakeIdx);
    event Deposit(address from, uint256 amount);

    constructor() public {}

    /* solium-disable-next-line */
    receive () external payable {
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin is allowed");
        _;
    }

    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    modifier mustInPeriod(uint8 expectedPeriod) {
        require(getPeriod() == expectedPeriod, "Wrong period");
        _;
    }

    modifier notContract() {
        require(!isContract(msg.sender), "contract is not allowed");
        require(msg.sender == tx.origin, "no proxy contract is allowed");
        _;
    }

    function isContract(address addr) internal view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    function getPeriod() public view returns (uint8) {
        uint256 UTCTime = block.timestamp%86400;
        if (UTCTime<=600 || UTCTime>85200) {
            return BREATHE_PERIOD;
        } else {
            return NORMAL_PERIOD;
        }
    }

    function initialize(
        address _admin,
        address _LAVAX,
        address _SBF,
        address payable _stakingTSSAddr,
        address payable _communityTaxVault,
        address payable _stakingRewardVault,
        address payable _unstakeVault,
        uint256 _priceToAccelerateUnstake
    ) external initializer{
        admin = _admin;

        lavaxToAVAXExchangeRate = EXCHANGE_RATE_PRECISION;
        LAVAX = _LAVAX;
        SBF = _SBF;

        stakingTSSAddr = _stakingTSSAddr;

        communityTaxVault = _communityTaxVault;
        stakingRewardVault = _stakingRewardVault;
        unstakeVault = _unstakeVault;

        priceToAccelerateUnstake = _priceToAccelerateUnstake;
        stakeFeeMolecular = 5;
        unstakeFeeMolecular = 5;
    }

    function paused() public view returns (bool) {
        return _paused;
    }

    function pause() external onlyAdmin whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function unpause() external onlyAdmin whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "acceptAdmin: Call must come from pendingAdmin.");
        admin = msg.sender;
        pendingAdmin = address(0);

        emit NewAdmin(admin);
    }

    function setPendingAdmin(address pendingAdmin_) external {
        require(msg.sender == admin, "setPendingAdmin: Call must come from admin.");
        pendingAdmin = pendingAdmin_;

        emit NewPendingAdmin(pendingAdmin);
    }

    function setCommunityTaxVault(address payable newCommunityTaxVault) onlyAdmin external {
        communityTaxVault = newCommunityTaxVault;
    }

    function setPriceToAccelerateUnstake(uint256 newPriceToAccelerateUnstake) onlyAdmin external {
        priceToAccelerateUnstake = newPriceToAccelerateUnstake;
    }

     function setStakeFeeRate(uint256 newStakeFeeMolecular) onlyAdmin external {
        if (newStakeFeeMolecular>0) {
            require(STAKE_FEE_DENOMINATOR.div(newStakeFeeMolecular)>200, "stake fee rate must be less than 0.5%");
        }
        stakeFeeMolecular = newStakeFeeMolecular;
    }

    function setUnstakeFeeRate(uint256 newUnstakeFeeMolecular) onlyAdmin external {
        if (newUnstakeFeeMolecular>0) {
            require(UNSTAKE_FEE_DENOMINATOR.div(newUnstakeFeeMolecular)>200, "unstake fee rate must be less than 0.5%");
        }
        unstakeFeeMolecular = newUnstakeFeeMolecular;
    }

    function stake() nonReentrant mustInPeriod(NORMAL_PERIOD) notContract whenNotPaused external payable returns (bool) {
        uint256 amount = msg.value;
        require(amount%1e10==0 && amount>=MINIMUM_STAKE_AMOUNT, "stake amount must be N * 1e10 and more than 1:AVAX");

        uint256 stakeFee = amount.mul(stakeFeeMolecular).div(STAKE_FEE_DENOMINATOR);
        communityTaxVault.transfer(stakeFee);
        uint256 stakeAmount = amount.sub(stakeFee);
        lavaxMarketCapacityCountByAVAX = lavaxMarketCapacityCountByAVAX.add(stakeAmount);
        uint256 lavaxAmount = stakeAmount.mul(EXCHANGE_RATE_PRECISION).div(lavaxToAVAXExchangeRate);

        uint256 stakeAmountDust = stakeAmount.mod(1e10);
        if (stakeAmountDust != 0) {
            unstakeVault.transfer(stakeAmountDust);
            stakeAmount = stakeAmount.sub(stakeAmountDust);
        }

        stakingTSSAddr.transfer(stakeAmount);

        IMintBurnToken(LAVAX).mintTo(msg.sender, lavaxAmount);
        emit LogStake(msg.sender, lavaxAmount, stakeAmount);

        return true;
    }

    function unstake(uint256 amount) nonReentrant mustInPeriod(NORMAL_PERIOD) notContract whenNotPaused external returns (bool) {
        require(amount>=MINIMUM_UNSTAKE_AMOUNT, "unstake amount must be more than 0.8:LAVAX");
        uint256 unstakeFee = amount.mul(unstakeFeeMolecular).div(UNSTAKE_FEE_DENOMINATOR);
        IERC20(LAVAX).safeTransferFrom(msg.sender, communityTaxVault, unstakeFee);

        uint256 unstakeAmount = amount.sub(unstakeFee);
        IERC20(LAVAX).safeTransferFrom(msg.sender, address(this), unstakeAmount);
        IMintBurnToken(LAVAX).burn(unstakeAmount);

        uint256 avaxAmount = unstakeAmount.mul(lavaxToAVAXExchangeRate).div(EXCHANGE_RATE_PRECISION);
        lavaxMarketCapacityCountByAVAX = lavaxMarketCapacityCountByAVAX.sub(avaxAmount);
        unstakesMap[tailIdx] = Unstake({
            staker: msg.sender,
            amount: avaxAmount,
            timestamp: block.timestamp
        });
        uint256[] storage unstakes = accountUnstakeSeqsMap[msg.sender];
        unstakes.push(tailIdx);

        emit LogUnstake(msg.sender, unstakeAmount, avaxAmount, tailIdx);
        tailIdx++;
        return true;
    }

    function estimateSBFCostForAccelerate(uint256 unstakeIndex, uint256 steps) external view returns (uint256, uint256) {
        if (steps == 0) return (0, 0);
        if (unstakeIndex<steps) return (0, 0);
        if ((unstakeIndex.sub(steps))<headerIdx || unstakeIndex>=tailIdx) return (0, 0);

        Unstake memory unstake = unstakesMap[unstakeIndex];
        uint256 timestampThreshold = unstake.timestamp.sub(unstake.timestamp.mod(86400));
        uint256 sbfBurnAmount = 0;
        uint256 actualSteps = 0;
        for (uint256 idx = unstakeIndex.sub(1) ; idx >= unstakeIndex.sub(steps); idx--) {
            Unstake memory priorUnstake = unstakesMap[idx];
            if (priorUnstake.timestamp<timestampThreshold) {
                break;
            }
            actualSteps++;
            sbfBurnAmount = sbfBurnAmount.add(priorUnstake.amount.mul(priceToAccelerateUnstake));
        }
        sbfBurnAmount = sbfBurnAmount.add(unstake.amount.mul(actualSteps).mul(priceToAccelerateUnstake));
        return (actualSteps, sbfBurnAmount.div(PRICE_TO_ACCELERATE_UNSTAKE_PRECISION));
    }

    function accelerateUnstakedMature(uint256 unstakeIndex, uint256 steps, uint256 sbfMaxCost) nonReentrant whenNotPaused external returns (bool) {
        require(steps > 0, "accelerate steps must be greater than zero");
        require(unstakeIndex.sub(steps)>=headerIdx && unstakeIndex<tailIdx, "unstakeIndex is out of valid accelerate range");

        Unstake memory unstake = unstakesMap[unstakeIndex];
        require(unstake.staker==msg.sender, "only staker can accelerate itself");
        uint256 timestampThreshold = unstake.timestamp.sub(unstake.timestamp.mod(86400));

        uint256 sbfBurnAmount = unstake.amount.mul(steps).mul(priceToAccelerateUnstake);
        for (uint256 idx = unstakeIndex.sub(1) ; idx >= unstakeIndex.sub(steps); idx--) {
            Unstake memory priorUnstake = unstakesMap[idx];
            require(priorUnstake.timestamp>=timestampThreshold, "forbid to exceed unstake in prior day");
            unstakesMap[idx+1] = priorUnstake;
            sbfBurnAmount = sbfBurnAmount.add(priorUnstake.amount.mul(priceToAccelerateUnstake));
            uint256[] storage priorUnstakeSeqs = accountUnstakeSeqsMap[priorUnstake.staker];
            bool found = false;
            for(uint256 i=0; i < priorUnstakeSeqs.length; i++) {
                if (priorUnstakeSeqs[i]==idx) {
                    priorUnstakeSeqs[i]=idx+1;
                    found = true;
                    break;
                }
            }
            require(found, "failed to find matched unstake sequence");
        }
        sbfBurnAmount = sbfBurnAmount.div(PRICE_TO_ACCELERATE_UNSTAKE_PRECISION);

        uint256[] storage unstakeSeqs = accountUnstakeSeqsMap[msg.sender];
        unstakesMap[unstakeIndex.sub(steps)] = unstake;
        bool found = false;
        for(uint256 idx=0; idx < unstakeSeqs.length; idx++) {
            if (unstakeSeqs[idx]==unstakeIndex) {
                unstakeSeqs[idx] = unstakeIndex.sub(steps);
                found = true;
                break;
            }
        }
        require(found, "failed to find matched unstake sequence");

        require(sbfBurnAmount<=sbfMaxCost, "cost too much SBF");
        IERC20(SBF).safeTransferFrom(msg.sender, address(this), sbfBurnAmount);
        IMintBurnToken(SBF).burn(sbfBurnAmount);

        emit AcceleratedUnstakedAVAX(msg.sender, unstakeIndex);

        return true;
    }

    function getUnstakeSeqsLength(address addr) external view returns (uint256) {
        return accountUnstakeSeqsMap[addr].length;
    }

    function getUnstakeSequence(address addr, uint256 idx) external view returns (uint256) {
        return accountUnstakeSeqsMap[addr][idx];
    }

    function isUnstakeClaimable(uint256 unstakeSeq) external view returns (bool) {
        if (unstakeSeq < headerIdx || unstakeSeq >= tailIdx) {
            return false;
        }
        uint256 totalUnstakeAmount = 0;
        for(uint256 idx=headerIdx; idx <= unstakeSeq; idx++) {
            Unstake memory unstake = unstakesMap[idx];
            totalUnstakeAmount=totalUnstakeAmount.add(unstake.amount);
        }
        return unstakeVault.balance >= totalUnstakeAmount;
    }

    function batchClaimPendingUnstake(uint256 batchSize) nonReentrant whenNotPaused external {
        for(uint256 idx=0; idx < batchSize && headerIdx < tailIdx; idx++) {
            Unstake memory unstake = unstakesMap[headerIdx];
            uint256 unstakeAVAXAmount = unstake.amount;
            if (unstakeVault.balance < unstakeAVAXAmount) {
                return;
            }
            delete unstakesMap[headerIdx];
            uint256 actualAmount = IVault(unstakeVault).claimAVAX(unstakeAVAXAmount, unstake.staker);
            require(actualAmount==unstakeAVAXAmount, "amount mismatch");
            emit ClaimedUnstake(unstake.staker, unstake.amount, headerIdx);

            uint256[] storage unstakeSeqs = accountUnstakeSeqsMap[unstake.staker];
            uint256 lastSeq = unstakeSeqs[unstakeSeqs.length-1];
            if (lastSeq != headerIdx) {
                bool found = false;
                for(uint256 index=0; index < unstakeSeqs.length; index++) {
                    if (unstakeSeqs[index]==headerIdx) {
                        unstakeSeqs[index] = lastSeq;
                        found = true;
                        break;
                    }
                }
                require(found, "failed to find matched unstake sequence");
            }
            unstakeSeqs.pop();

            headerIdx++;
        }
    }

    function rebaseLAVAXToAVAX() whenNotPaused external returns(bool) {
        uint256 rewardVaultBalance = stakingRewardVault.balance;
        require(rewardVaultBalance>0, "stakingRewardVault has no AVAX");
        uint256 actualAmount = IVault(stakingRewardVault).claimAVAX(rewardVaultBalance, unstakeVault);
        require(rewardVaultBalance==actualAmount, "reward amount mismatch");

        uint256 lavaxTotalSupply = IERC20(LAVAX).totalSupply();
        lavaxMarketCapacityCountByAVAX = lavaxMarketCapacityCountByAVAX.add(rewardVaultBalance);
        if (lavaxTotalSupply == 0) {
            lavaxToAVAXExchangeRate = EXCHANGE_RATE_PRECISION;
        } else {
            lavaxToAVAXExchangeRate = lavaxMarketCapacityCountByAVAX.mul(EXCHANGE_RATE_PRECISION).div(lavaxTotalSupply);
        }
        emit LogUpdateLAVAXToAVAXExchangeRate(lavaxTotalSupply, lavaxMarketCapacityCountByAVAX, lavaxToAVAXExchangeRate);
        return true;
    }

    function resendAVAXToBCStakingTSS(uint256 amount) mustInPeriod(NORMAL_PERIOD) whenNotPaused external returns(bool) {
        
        require(address(this).balance >= amount, "AVAX balance is not enough");
        require(amount%1e10==0, "amount must be N * 1e10");

        stakingTSSAddr.transfer(amount);
        return true;
    }
}
