// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from 'forge-std/Test.sol';
import {BMCPCREReceiver} from '../src/BMCPCREReceiver.sol';
import {IReceiverTemplate} from '../src/IReceiverTemplate.sol';

contract MockTargetContract {
  uint256 public value;
  address public lastCaller;
  bytes public lastData;

  event FunctionCalled(uint256 newValue, address caller);

  function setValue(uint256 _value) external {
    value = _value;
    lastCaller = msg.sender;
    lastData = msg.data;
    emit FunctionCalled(_value, msg.sender);
  }

  function getValue() external view returns (uint256) {
    return value;
  }
}

contract BMCPCREReceiverTest is Test {
  BMCPCREReceiver public receiver;
  MockTargetContract public target;

  address public forwarder = address(0x1234);
  bytes32 public workflowId = keccak256('test-workflow');

  function setUp() public {
    receiver = new BMCPCREReceiver(forwarder, workflowId);
    target = new MockTargetContract();
  }

  function test_DeploymentSetsCorrectParameters() public view {
    assertEq(receiver.forwarderAddress(), forwarder);
    assertEq(receiver.expectedWorkflowId(), workflowId);
  }

  function test_BasicCommandExecution() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 42);

    BMCPCREReceiver.BMCPPayload memory payload = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1000,
      nonce: 0,
      deadline: 0,
      targetContract: address(target),
      data: callData
    });

    bytes memory report = abi.encode(payload);
    bytes memory metadata = _encodeMetadata(workflowId, bytes10('test'), address(this));

    vm.prank(forwarder);
    vm.expectEmit(true, false, false, true);
    emit BMCPCREReceiver.BMCPCommandReceived(address(target), callData);
    receiver.onReport(metadata, report);
  }

  function test_CommandWithNonce() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 100);

    BMCPCREReceiver.BMCPPayload memory payload = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1000,
      nonce: 5,
      deadline: 0,
      targetContract: address(target),
      data: callData
    });

    bytes memory report = abi.encode(payload);
    bytes memory metadata = _encodeMetadata(workflowId, bytes10('test'), address(this));

    vm.prank(forwarder);
    receiver.onReport(metadata, report);
  }

  function test_CommandWithDeadline() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 200);
    uint32 futureDeadline = uint32(block.timestamp + 1 hours);

    BMCPCREReceiver.BMCPPayload memory payload = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1000,
      nonce: 0,
      deadline: futureDeadline,
      targetContract: address(target),
      data: callData
    });

    bytes memory report = abi.encode(payload);
    bytes memory metadata = _encodeMetadata(workflowId, bytes10('test'), address(this));

    vm.prank(forwarder);
    receiver.onReport(metadata, report);
  }

  function test_CommandWithNonceAndDeadline() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 300);
    uint32 futureDeadline = uint32(block.timestamp + 2 hours);

    BMCPCREReceiver.BMCPPayload memory payload = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1000,
      nonce: 10,
      deadline: futureDeadline,
      targetContract: address(target),
      data: callData
    });

    bytes memory report = abi.encode(payload);
    bytes memory metadata = _encodeMetadata(workflowId, bytes10('test'), address(this));

    vm.prank(forwarder);
    receiver.onReport(metadata, report);
  }

  function test_MultipleChainSelectors() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 500);

    BMCPCREReceiver.BMCPPayload memory payload1 = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1, // Ethereum
      nonce: 0,
      deadline: 0,
      targetContract: address(target),
      data: callData
    });

    BMCPCREReceiver.BMCPPayload memory payload2 = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 10, // Optimism
      nonce: 0,
      deadline: 0,
      targetContract: address(target),
      data: callData
    });

    bytes memory metadata = _encodeMetadata(workflowId, bytes10('test'), address(this));

    vm.prank(forwarder);
    receiver.onReport(metadata, abi.encode(payload1));

    vm.prank(forwarder);
    receiver.onReport(metadata, abi.encode(payload2));
  }

  function test_InvalidSenderReverts() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 42);

    BMCPCREReceiver.BMCPPayload memory payload = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1000,
      nonce: 0,
      deadline: 0,
      targetContract: address(target),
      data: callData
    });

    bytes memory report = abi.encode(payload);
    bytes memory metadata = _encodeMetadata(workflowId, bytes10('test'), address(this));

    address wrongSender = address(0x9999);
    vm.prank(wrongSender);
    vm.expectRevert(abi.encodeWithSelector(IReceiverTemplate.InvalidSender.selector, wrongSender, forwarder));
    receiver.onReport(metadata, report);
  }

  function test_InvalidWorkflowIdReverts() public {
    bytes memory callData = abi.encodeWithSelector(MockTargetContract.setValue.selector, 42);

    BMCPCREReceiver.BMCPPayload memory payload = BMCPCREReceiver.BMCPPayload({
      version: 1,
      chainSelector: 1000,
      nonce: 0,
      deadline: 0,
      targetContract: address(target),
      data: callData
    });

    bytes memory report = abi.encode(payload);
    bytes32 wrongWorkflowId = keccak256('wrong-workflow');
    bytes memory metadata = _encodeMetadata(wrongWorkflowId, bytes10('test'), address(this));

    vm.prank(forwarder);
    vm.expectRevert(abi.encodeWithSelector(IReceiverTemplate.InvalidWorkflowId.selector, wrongWorkflowId, workflowId));
    receiver.onReport(metadata, report);
  }

  function _encodeMetadata(
    bytes32 _workflowId,
    bytes10 _workflowName,
    address _workflowOwner
  ) internal pure returns (bytes memory) {
    bytes memory metadata = new bytes(62);
    assembly {
      mstore(add(metadata, 32), _workflowId)
      mstore(add(metadata, 64), _workflowName)
      mstore(add(metadata, 74), shl(mul(12, 8), _workflowOwner))
    }
    return metadata;
  }
}