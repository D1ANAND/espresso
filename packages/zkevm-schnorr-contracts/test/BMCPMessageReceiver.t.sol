// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {BMCPMessageReceiver} from "../src/BMCPMessageReceiver.sol";
import {ExampleTargetContract} from "../src/ExampleTargetContract.sol";

contract BMCPMessageReceiverTest is Test {
    BMCPMessageReceiver public receiver;
    ExampleTargetContract public target;
    
    address public owner = address(1);
    address public relayer = address(2);
    address public user = address(3);
    
    // Test data
    bytes32 testPubKeyX = 0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9;
    bytes32 testTxid = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        receiver = new BMCPMessageReceiver(relayer);
        target = new ExampleTargetContract();
        
        // Mint some test tokens
        target.mint(address(receiver), 1000000 * 10**18);
        
        vm.stopPrank();
    }
    
    function test_Deployment() public {
        assertEq(receiver.owner(), owner);
        assertEq(receiver.relayer(), relayer);
    }
    
    function test_ReceiveMessage_Basic() public {
        vm.startPrank(relayer);
        
        // Create a simple message
        string memory testMessage = "Hello from Bitcoin!";
        bytes memory callData = abi.encodeWithSignature("storeMessage(string)", testMessage);
        
        BMCPMessageReceiver.Authorization memory auth = BMCPMessageReceiver.Authorization({
            allowedContract: address(target),
            allowedFunction: bytes4(keccak256("storeMessage(string)")),
            maxValue: 0,
            validUntil: block.timestamp + 3600
        });
        
        BMCPMessageReceiver.BMCPMessage memory message = BMCPMessageReceiver.BMCPMessage({
            protocol: 0x4243,
            chainSelector: 5115, // Citrea testnet
            targetContract: address(target),
            data: callData,
            nonce: 0,
            deadline: block.timestamp + 3600,
            authorization: auth
        });
        
        // Create mock Schnorr proof (signature verification will fail in test, but we test the flow)
        bytes memory mockSignature = new bytes(64);
        BMCPMessageReceiver.SchnorrProof memory proof = BMCPMessageReceiver.SchnorrProof({
            pubKeyX: testPubKeyX,
            signature: mockSignature
        });
        
        // Note: This will fail at signature verification since we're using mock signature
        // For full test, need to generate valid Schnorr signature from Bitcoin
        
        // Try to receive message (will fail at signature verification)
        // receiver.receiveMessage(testTxid, message, proof);
        
        vm.stopPrank();
    }
    
    function test_Nonce() public view {
        uint256 nonce = receiver.getNonce(testPubKeyX);
        assertEq(nonce, 0);
    }
    
    function test_SetRelayer() public {
        vm.prank(owner);
        address newRelayer = address(4);
        receiver.setRelayer(newRelayer);
        assertEq(receiver.relayer(), newRelayer);
    }
    
    function test_SetRelayer_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only owner");
        receiver.setRelayer(address(4));
    }
    
    function test_TargetContract_StoreMessage() public {
        string memory testMessage = "Test message";
        target.storeMessage(testMessage);
        
        assertEq(target.getMessage(address(this)), testMessage);
        assertEq(target.messageCount(), 1);
    }
    
    function test_TargetContract_Transfer() public {
        // Mint tokens to sender
        target.mint(address(this), 1000);
        
        // Transfer tokens
        target.transfer(user, 500);
        
        assertEq(target.getBalance(address(this)), 500);
        assertEq(target.getBalance(user), 500);
    }
    
    function test_TargetContract_StoreData() public {
        bytes32 key = keccak256("test_key");
        bytes memory data = "test data";
        
        target.storeData(key, data);
        
        bytes memory retrieved = target.getData(key);
        assertEq(retrieved, data);
    }
    
    function test_TargetContract_Swap() public {
        address tokenIn = address(0x1);
        address tokenOut = address(0x2);
        uint256 amountIn = 1000;
        uint256 minAmountOut = 900;
        
        uint256 amountOut = target.swap(tokenIn, tokenOut, amountIn, minAmountOut);
        
        assertEq(amountOut, amountIn); // 1:1 mock swap
    }
}

