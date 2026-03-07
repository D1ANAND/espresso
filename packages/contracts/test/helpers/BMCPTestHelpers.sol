// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title BMCPTestHelpers
 * @notice Test helper library for encoding BMCP (Bitcoin Message Cross-chain Protocol) payloads
 * @dev Provides functions to construct valid BMCP commands matching the BitcoinCREReceiver schema
 */
library BMCPTestHelpers {
  uint8 public constant SUPPORTED_VERSION = 1;

  /**
   * @notice Encodes a BMCP command with target address and callData
   * @param targetContract The address of the contract to call on the EVM chain
   * @param callData The encoded function call data
   * @return bytes The encoded BMCP opReturnData
   */
  function encodeBMCPCommand(
    address targetContract,
    bytes memory callData
  ) internal pure returns (bytes memory) {
    return encodeBMCPCommand(targetContract, callData, 0, 0);
  }

  /**
   * @notice Encodes a BMCP command with optional nonce and deadline
   * @param targetContract The address of the contract to call
   * @param callData The encoded function call data
   * @param nonce Optional nonce for replay protection (0 = not used)
   * @param deadline Optional deadline timestamp (0 = not used)
   * @return bytes The encoded BMCP opReturnData
   */
  function encodeBMCPCommand(
    address targetContract,
    bytes memory callData,
    uint32 nonce,
    uint32 deadline
  ) internal pure returns (bytes memory) {
    uint16 dataLength = uint16(callData.length);

    // Calculate total size: version (1) + contract (20) + length (2) + data + nonce (4) + deadline (4)
    uint256 totalSize = 1 + 20 + 2 + callData.length;
    if (nonce > 0) totalSize += 4;
    if (deadline > 0) totalSize += 4;

    bytes memory encoded = new bytes(totalSize);
    uint256 offset = 0;

    // Version (1 byte)
    encoded[offset++] = bytes1(SUPPORTED_VERSION);

    // Target Contract (20 bytes)
    bytes20 contractBytes = bytes20(targetContract);
    for (uint256 i = 0; i < 20; i++) {
      encoded[offset++] = contractBytes[i];
    }

    // Data Length (2 bytes)
    encoded[offset++] = bytes1(uint8(dataLength >> 8));
    encoded[offset++] = bytes1(uint8(dataLength));

    // Call Data (variable)
    for (uint256 i = 0; i < callData.length; i++) {
      encoded[offset++] = callData[i];
    }

    // Optional Nonce (4 bytes)
    if (nonce > 0) {
      bytes4 nonceBytes = bytes4(nonce);
      for (uint256 i = 0; i < 4; i++) {
        encoded[offset++] = nonceBytes[i];
      }
    }

    // Optional Deadline (4 bytes)
    if (deadline > 0) {
      bytes4 deadlineBytes = bytes4(deadline);
      for (uint256 i = 0; i < 4; i++) {
        encoded[offset++] = deadlineBytes[i];
      }
    }

    return encoded;
  }

  /**
   * @notice Wraps BMCP command with Bitcoin transaction metadata to create complete report data
   * @param btcTxHash The Bitcoin transaction hash (32 bytes)
   * @param btcBlockHeight The Bitcoin block height
   * @param opReturnData The encoded BMCP command from encodeBMCPCommand()
   * @return bytes The complete report data for passing to onReport()
   */
  function encodeReportData(
    bytes32 btcTxHash,
    uint256 btcBlockHeight,
    bytes memory opReturnData
  ) internal pure returns (bytes memory) {
    // Format: btcTxHash (32 bytes) + btcBlockHeight (32 bytes) + opReturnData (variable)
    bytes memory report = new bytes(64 + opReturnData.length);
    uint256 offset = 0;

    // BTC Transaction Hash (32 bytes)
    bytes32 txHashBytes = btcTxHash;
    for (uint256 i = 0; i < 32; i++) {
      report[offset++] = txHashBytes[i];
    }

    // BTC Block Height (32 bytes)
    bytes32 blockHeightBytes = bytes32(btcBlockHeight);
    for (uint256 i = 0; i < 32; i++) {
      report[offset++] = blockHeightBytes[i];
    }

    // OP_RETURN Data (variable)
    for (uint256 i = 0; i < opReturnData.length; i++) {
      report[offset++] = opReturnData[i];
    }

    return report;
  }

  /**
   * @notice Generates a unique Bitcoin transaction hash for testing
   * @param seed A unique value to ensure different hashes
   * @return bytes32 A pseudo-random transaction hash
   */
  function generateUniqueTxHash(uint256 seed) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked('btcTxHash', seed));
  }

  /**
   * @notice Returns a timestamp safely in the future
   * @param duration Seconds from current block timestamp
   * @return uint32 Future timestamp
   */
  function getFutureDeadline(
    uint256 duration
  ) internal view returns (uint32) {
    return uint32(block.timestamp + duration);
  }
}