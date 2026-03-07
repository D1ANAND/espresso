// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ISwapRouter} from '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import {OwnedByBMCP} from './OwnedByBMCP.sol';

contract UniswapV3Example is OwnedByBMCP {
  using SafeERC20 for IERC20;

  ISwapRouter public immutable swapRouter;

  address public immutable usdc;
  address public immutable weth;

  constructor(
    address _bmcpReceiver,
    ISwapRouter _swapRouter,
    address _usdc,
    address _weth
  ) OwnedByBMCP(_bmcpReceiver) {
    swapRouter = _swapRouter;
    usdc = _usdc;
    weth = _weth;

    IERC20(usdc).approve(address(swapRouter), type(uint256).max);
    IERC20(weth).approve(address(swapRouter), type(uint256).max);
  }

  function swapUSDCforWETH(
    uint256 amountIn
  ) external returns (uint256 amountOut) {
    return _swapSingle(usdc, weth, 3000, amountIn);
  }

  function swapWETHforUSDC(
    uint256 amountIn
  ) external onlyBMCP returns (uint256 amountOut) {
    return _swapSingle(weth, usdc, 3000, amountIn);
  }

  function _swapSingle(
    address tokenIn,
    address tokenOut,
    uint24 fee,
    uint256 amountIn
  ) internal onlyBMCP returns (uint256 amountOut) {
    uint256 minOut = /* Calculate min output */ 0;
    uint160 priceLimit = /* Calculate price limit */ 0;

    amountOut = swapRouter.exactInputSingle(
      ISwapRouter.ExactInputSingleParams({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: address(this),
        deadline: block.timestamp,
        amountIn: amountIn,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: priceLimit
      })
    );
  }

  receive() external payable {}
}
