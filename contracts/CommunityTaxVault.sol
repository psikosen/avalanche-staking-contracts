pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CommunityTaxVault is IVault, ReentrancyGuard {
    using SafeMath for uint256;

    address public governor;
    address public lavaxAddr;

    event Deposit(address from, uint256 amount);
    event Withdraw(address tokenAddr, address recipient, uint256 amount);
    event GovernorshipTransferred(address oldGovernor, address newGovernor);

    constructor(
        address _govAddr,
        address _lavaxAddr
    ) public {
        governor = _govAddr;
        lavaxAddr = _lavaxAddr;
    }

    receive () external payable {
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyGov() {
        require(msg.sender == governor, "only governance is allowed");
        _;
    }

    function transferGovernorship(address newGovernor) onlyGov external {
        require(newGovernor != address(0), "new governor is zero address");
        emit GovernorshipTransferred(governor, newGovernor);
        governor = newGovernor;
    }

    function claimAVAX(uint256 amount, address payable recipient) nonReentrant onlyGov override external returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        emit Withdraw(address(0x0), recipient, amount);
        return amount;
    }

    function claimLAVAX(uint256 amount, address recipient) nonReentrant onlyGov external returns(uint256) {
        uint256 lavaxBalance = ERC20(lavaxAddr).balanceOf(address(this));
        if (lavaxBalance < amount) {
            amount = lavaxBalance;
        }
        ERC20(lavaxAddr).transfer(recipient, amount);
        emit Withdraw(lavaxAddr, recipient, amount);
        return amount;
    }
}