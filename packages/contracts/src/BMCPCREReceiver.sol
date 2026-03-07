// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from '@openzeppelin/contracts/utils/introspection/IERC165.sol';
import {IReceiverTemplate} from './IReceiverTemplate.sol';

/**
 * @title BMCPCREReceiver
 * @notice Base contract for receiving cross-chain messages from Bitcoin via CRE
 * @dev Extends IReceiverTemplate and adds BMCP validation
 */
contract BMCPCREReceiver is IReceiverTemplate {
  // Protocol constants matching encoder
  uint32 public constant PROTOCOL_MAGIC = 0x424D4350; // "BMCP"
  uint8 public constant SUPPORTED_VERSION = 1;

  mapping(bytes32 => bool) public executedBtcTxs;
  mapping(address => mapping(uint32 => bool)) public usedNonces;
  mapping(address => bool) public authorizedContracts;

  struct BMCPPayload {
    uint8 version;
    uint64 chainSelector;
    uint32 nonce;
    uint32 deadline;
    address targetContract;
    bytes data;
  }

  /////////////////////////////////////////////////////////////////
  /// Events
  /////////////////////////////////////////////////////////////////

  event BMCPCommandReceived(
    /* bytes32 indexed btcTxHash, */
    address indexed targetContract,
    bytes data
  );

  event BMCPCommandExecuted(
    // bytes32 indexed btcTxHash,
    address indexed targetContract,
    bool success,
    bytes result
  );

  /////////////////////////////////////////////////////////////////
  /// Errors
  /////////////////////////////////////////////////////////////////

  error InvalidProtocolMagic(uint32 received, uint32 expected);
  error UnsupportedVersion(uint8 received);
  error UnauthorizedContract(address contract_);
  error CommandExpired(uint32 deadline, uint256 currentTime);
  error NonceAlreadyUsed(address sender, uint32 nonce);
  error AlreadyExecuted(bytes32 btcTxHash);
  error InvalidDataLength();

  constructor(address _forwarder, bytes32 _workflowId) IReceiverTemplate() {
    forwarderAddress = _forwarder;
    expectedWorkflowId = _workflowId;
  }

  function authorizeContract(
    address contract_,
    bool authorized
  ) external onlyOwner {
    // authorizedContracts[contract_] = authorized;
  }

  function _processReport(bytes calldata report) internal override {
    // require(report.length >= 64, 'Invalid report length');
    // bytes32 btcTxHash = bytes32(report[0:32]);

    // Check not already executed
    // if (executedBtcTxs[btcTxHash]) {
    //   revert AlreadyExecuted(btcTxHash);
    // }

    // Decode BMCP command
    BMCPPayload memory payload = abi.decode(report, (BMCPPayload));
    // BMCPCommand memory cmd = _decodeBMCP(report);

    // cmd.btcTxHash = btcTxHash;

    // Validate command
    _validateCommand(payload);

    // Mark as executed
    // executedBtcTxs[btcTxHash] = true;

    // Mark nonce as used if present
    if (payload.nonce > 0) {
      usedNonces[payload.targetContract][payload.nonce] = true;
    }

    // Emit received event
    // bytes4 functionSelector = bytes4(cmd.callData);
    // emit BMCPCommandReceived(cmd.targetContract, functionSelector);
    emit BMCPCommandReceived(payload.targetContract, payload.data);

    _executeCommand(payload);
  }

  function _validateCommand(BMCPPayload memory cmd) internal view {
    // Verify protocol magic
    // if (cmd.protocolMagic != PROTOCOL_MAGIC) {
    //   revert InvalidProtocolMagic(cmd.protocolMagic, PROTOCOL_MAGIC);
    // }

    // Verify version
    if (cmd.version != SUPPORTED_VERSION) {
      revert UnsupportedVersion(cmd.version);
    }

    // Verify authorized contract
    // if (!authorizedContracts[cmd.targetContract]) {
    //   revert UnauthorizedContract(cmd.targetContract);
    // }

    // Check deadline if present
    if (cmd.deadline > 0 && block.timestamp > cmd.deadline) {
      revert CommandExpired(cmd.deadline, block.timestamp);
    }

    // Check nonce if present
    if (cmd.nonce > 0 && usedNonces[cmd.targetContract][cmd.nonce]) {
      revert NonceAlreadyUsed(cmd.targetContract, cmd.nonce);
    }
  }

  function _executeCommand(BMCPPayload memory cmd) internal {
    (bool success, bytes memory result) = cmd.targetContract.call(cmd.data);

    emit BMCPCommandExecuted(
      // cmd.btcTxHash,
      cmd.targetContract,
      success,
      result
    );

    if (!success) {
      _handleExecutionFailure(cmd.targetContract, result);
    }
  }

  function _handleExecutionFailure(address, bytes memory result) internal pure {
    // Try to decode revert reason
    if (result.length > 0) {
      // Check if it's a standard Error(string)
      if (result.length >= 68) {
        assembly {
          result := add(result, 0x04)
        }
        revert(abi.decode(result, (string)));
      } else {
        assembly {
          revert(add(32, result), mload(result))
        }
      }
    } else {
      revert('Execution failed without reason');
    }
  }
}
