// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import {OwnedByBMCP} from './OwnedByBMCP.sol';

contract SimpleTransfersExample is OwnedByBMCP {
  constructor(address _bmcpReceiver) OwnedByBMCP(_bmcpReceiver) {}

  function transferETH(address to, uint256 amount) external onlyBMCP {
    payable(to).transfer(amount);
  }

  function transferERC20(
    address token,
    address to,
    uint256 amount
  ) external onlyBMCP {
    IERC20(token).transfer(to, amount);
  }

  receive() external payable {}
}
