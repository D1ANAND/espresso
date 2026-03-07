// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract OwnedByBMCP {
  address public immutable BMCP_RECEIVER;

  error NotBMCPReceiver();

  modifier onlyBMCP() {
    if (msg.sender != BMCP_RECEIVER) {
      revert NotBMCPReceiver();
    }
    _;
  }

  constructor(address _bmcpReceiver) {
    BMCP_RECEIVER = _bmcpReceiver;
  }
}
