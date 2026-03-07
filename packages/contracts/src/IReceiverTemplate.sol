// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from '@openzeppelin/contracts/utils/introspection/IERC165.sol';
import {IReceiver} from './interfaces/IReceiver.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

/// @title IReceiverTemplate - Abstract receiver with optional permission controls
/// @notice Provides flexible, updatable security checks for receiving workflow reports
/// @dev All permission fields default to zero (disabled). Use setter functions to enable checks.
abstract contract IReceiverTemplate is IReceiver, Ownable {
  // Optional permission fields (all default to zero = disabled)
  address public forwarderAddress; // If set, only this address can call onReport
  bytes32 public expectedWorkflowId; // If set, only reports from this specific workflow ID are accepted

  // Custom errors
  error InvalidSender(address sender, address expected);
  error InvalidAuthor(address received, address expected);
  error InvalidWorkflowName(bytes10 received, bytes10 expected);
  error InvalidWorkflowId(bytes32 received, bytes32 expected);

  /// @notice Constructor sets msg.sender as the owner
  /// @dev All permission fields are initialized to zero (disabled by default)
  constructor() Ownable(msg.sender) {}

  /// @inheritdoc IReceiver
  /// @dev Performs optional validation checks based on which permission fields are set
  function onReport(
    bytes calldata metadata,
    bytes calldata report
  ) external override {
    // Security Check 1: Verify caller is the trusted Chainlink Forwarder (if configured)
    if (forwarderAddress != address(0) && msg.sender != forwarderAddress) {
      revert InvalidSender(msg.sender, forwarderAddress);
    }

    // Security Checks 2-4: Verify workflow identity - ID, owner, and/or name (if any are configured)
    if (expectedWorkflowId != bytes32(0)) {
      (bytes32 workflowId, , ) = _decodeMetadata(metadata);

      if (workflowId != expectedWorkflowId) {
        revert InvalidWorkflowId(workflowId, expectedWorkflowId);
      }
    }

    _processReport(report);
  }

  /// @notice Updates the forwarder address that is allowed to call onReport
  /// @param _forwarder The new forwarder address (use address(0) to disable this check)
  function setForwarderAddress(address _forwarder) external onlyOwner {
    forwarderAddress = _forwarder;
  }

  /// @notice Updates the expected workflow ID
  /// @param _id The new expected workflow ID (use bytes32(0) to disable this check)
  function setExpectedWorkflowId(bytes32 _id) external onlyOwner {
    expectedWorkflowId = _id;
  }

  /// @notice Helper function to convert bytes to hex string
  /// @param data The bytes to convert
  /// @return The hex string representation
  function _bytesToHexString(
    bytes memory data
  ) private pure returns (bytes memory) {
    bytes memory hexChars = '0123456789abcdef';
    bytes memory hexString = new bytes(data.length * 2);

    for (uint256 i = 0; i < data.length; i++) {
      hexString[i * 2] = hexChars[uint8(data[i] >> 4)];
      hexString[i * 2 + 1] = hexChars[uint8(data[i] & 0x0f)];
    }

    return hexString;
  }

  /// @notice Extracts all metadata fields from the onReport metadata parameter
  /// @param metadata The metadata in bytes format
  /// @return workflowId The unique identifier of the workflow (bytes32)
  /// @return workflowName The name of the workflow (bytes10)
  /// @return workflowOwner The owner address of the workflow
  function _decodeMetadata(
    bytes memory metadata
  )
    internal
    pure
    returns (bytes32 workflowId, bytes10 workflowName, address workflowOwner)
  {
    // Metadata structure:
    // - First 32 bytes: length of the byte array (standard for dynamic bytes)
    // - Offset 32, size 32: workflow_id (bytes32)
    // - Offset 64, size 10: workflow_name (bytes10)
    // - Offset 74, size 20: workflow_owner (address)
    assembly {
      workflowId := mload(add(metadata, 32))
      workflowName := mload(add(metadata, 64))
      workflowOwner := shr(mul(12, 8), mload(add(metadata, 74)))
    }
  }

  /// @notice Abstract function to process the report data
  /// @param report The report calldata containing your workflow's encoded data
  /// @dev Implement this function with your contract's business logic
  function _processReport(bytes calldata report) internal virtual;

  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public pure virtual override returns (bool) {
    return
      interfaceId == type(IReceiver).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }
}
