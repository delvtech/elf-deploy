// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./Address.sol";
import "./ERC20Permit.sol";
import "./SafeERC20.sol";
import "../interfaces/IERC20.sol";

contract USDC is ERC20Permit {
    using SafeERC20 for IERC20;
    using Address for address;

    constructor(address sender)
      ERC20("USD Coin", "USDC")
      ERC20Permit("USD Coin")
    {
        _setupDecimals(6);
        mint(sender, 1000000000000000000000000000000000000000);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
