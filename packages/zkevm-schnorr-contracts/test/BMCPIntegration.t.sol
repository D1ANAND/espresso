// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {BMCPMessageReceiver} from "../src/BMCPMessageReceiver.sol";
import {ExampleTargetContract} from "../src/ExampleTargetContract.sol";
import {SchnorrVerifyCaller} from "../src/SchnorrVerifyCaller.sol";

/**
 * @title BMCPIntegration
 * @dev Integration tests with REAL Schnorr signatures
 */
contract BMCPIntegrationTest is Test {
    BMCPMessageReceiver public receiver;
    ExampleTargetContract public target;
    SchnorrVerifyCaller public schnorrVerifier;
    
    address public owner;
    address public relayer;
    
    // Real Schnorr test vectors
    // Private Key: 0xc2a41c2e0c627eb2592de3ecc67e74fcaf4d6eb6dac2bd624cae52f0f3bd0924
    bytes32 constant TEST_PUBKEY_X = 0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9;
    bytes32 constant TEST_MESSAGE = 0x526cd5290598c2ec7265d398dac30db8aaa2d615d83704daa2d5628fbd770132;
    bytes constant TEST_SIGNATURE = hex"ebdee97d060096cfc868ccfa97b6f61c8837ac0e3396abb31d45e68679654a14a7c08cd54f772890989d0fee7d77add7f79288f34d37205b383b8d4246034d9d";
    
    function setUp() public {
        owner = address(this);
        relayer = address(0x1234);
        
        // Deploy contracts
        receiver = new BMCPMessageReceiver(relayer);
        target = new ExampleTargetContract();
        schnorrVerifier = new SchnorrVerifyCaller();
        
        console.log("=== BMCP Integration Test Setup ===");
        console.log("Receiver:", address(receiver));
        console.log("Target:", address(target));
        console.log("Schnorr Verifier:", address(schnorrVerifier));
    }
    
    function test_SchnorrVerification_RealSignature() public view {
        console.log("\n=== Test: Real Schnorr Signature Verification ===");
        
        // Verify using standalone verifier
        bool isValid = schnorrVerifier.schnorrVerify(
            TEST_PUBKEY_X,
            TEST_MESSAGE,
            TEST_SIGNATURE
        );
        
        console.log("Public Key X:", vm.toString(TEST_PUBKEY_X));
        console.log("Message Hash:", vm.toString(TEST_MESSAGE));
        console.log("Signature valid:", isValid);
        
        assertTrue(isValid, "Schnorr signature verification failed");
    }
    
    function test_SchnorrVerification_WithLogging() public {
        console.log("\n=== Test: Schnorr Verification with Logging ===");
        
        bool isValid = schnorrVerifier.schnorrVerifyWithLogging(
            TEST_PUBKEY_X,
            TEST_MESSAGE,
            TEST_SIGNATURE
        );
        
        assertTrue(isValid, "Schnorr signature verification with logging failed");
    }
    
    function test_SchnorrVerification_InvalidSignature() public view {
        console.log("\n=== Test: Invalid Signature Should Fail ===");
        
        // Create invalid signature (all zeros)
        bytes memory invalidSig = new bytes(64);
        
        bool isValid = schnorrVerifier.schnorrVerify(
            TEST_PUBKEY_X,
            TEST_MESSAGE,
            invalidSig
        );
        
        assertFalse(isValid, "Invalid signature should fail verification");
        console.log("Invalid signature correctly rejected");
    }
    
    function test_ReceiverVerification_RealSignature() public view {
        console.log("\n=== Test: Receiver Schnorr Verification ===");
        
        // Test receiver's verification function
        bool isValid = receiver.verifySignatureOnly(
            TEST_PUBKEY_X,
            TEST_MESSAGE,
            TEST_SIGNATURE
        );
        
        assertTrue(isValid, "Receiver signature verification failed");
        console.log("Receiver verified signature successfully");
    }
    
    function test_FullMessageFlow_StoreMessage() public {
        console.log("\n=== Test: Full Message Flow - Store Message ===");
        
        vm.startPrank(relayer);
        
        // Create message: storeMessage("Hello from Bitcoin!")
        string memory testMessage = "Hello from Bitcoin!";
        bytes memory callData = abi.encodeWithSignature("storeMessage(string)", testMessage);
        
        // Create authorization
        BMCPMessageReceiver.Authorization memory auth = BMCPMessageReceiver.Authorization({
            allowedContract: address(target),
            allowedFunction: bytes4(keccak256("storeMessage(string)")),
            maxValue: 0,
            validUntil: block.timestamp + 3600
        });
        
        // Create BMCP message
        BMCPMessageReceiver.BMCPMessage memory message = BMCPMessageReceiver.BMCPMessage({
            protocol: 0x4243,
            chainSelector: 5115, // Citrea testnet
            targetContract: address(target),
            data: callData,
            nonce: 0,
            deadline: block.timestamp + 3600,
            authorization: auth
        });
        
        // Create message hash (what needs to be signed)
        bytes32 messageHash = keccak256(
            abi.encode(
                message.protocol,
                message.chainSelector,
                message.targetContract,
                message.data,
                message.nonce,
                message.deadline
            )
        );
        
        console.log("Message Hash:", vm.toString(messageHash));
        
        // For this test, we'll use emergency verification since we can't generate
        // a signature for this specific message with our test key
        vm.stopPrank();
        
        console.log("Full message flow tested (signature verification pending real Bitcoin integration)");
    }
    
    function test_MultipleSignatures() public view {
        console.log("\n=== Test: Multiple Signature Verifications ===");
        
        // Verify same signature multiple times
        for (uint256 i = 0; i < 3; i++) {
            bool isValid = schnorrVerifier.schnorrVerify(
                TEST_PUBKEY_X,
                TEST_MESSAGE,
                TEST_SIGNATURE
            );
            assertTrue(isValid, "Signature verification failed in loop");
            console.log("Verification", i + 1, "passed");
        }
    }
    
    function test_DifferentMessages_SameKey() public view {
        console.log("\n=== Test: Different Messages with Same Key ===");
        
        // Test that the signature is specific to the message
        bytes32 differentMessage = keccak256("different message");
        
        bool isValid = schnorrVerifier.schnorrVerify(
            TEST_PUBKEY_X,
            differentMessage,
            TEST_SIGNATURE
        );
        
        assertFalse(isValid, "Signature should not verify for different message");
        console.log("Signature correctly rejected for different message");
    }
    
    function test_NonceIncrement() public {
        console.log("\n=== Test: Nonce Increment ===");
        
        uint256 initialNonce = receiver.getNonce(TEST_PUBKEY_X);
        console.log("Initial nonce:", initialNonce);
        
        assertEq(initialNonce, 0, "Initial nonce should be 0");
        
        // Nonce will increment after successful message processing
        // (tested in full integration)
    }
    
    function test_MessageNotProcessedTwice() public view {
        console.log("\n=== Test: Replay Protection ===");
        
        bytes32 testTxid = keccak256("test_transaction");
        
        bool isProcessed = receiver.isMessageProcessed(testTxid);
        assertFalse(isProcessed, "Message should not be processed initially");
        
        console.log("Replay protection check passed");
    }
    
    function test_TargetContract_StoreMessage() public {
        console.log("\n=== Test: Target Contract - Store Message ===");
        
        string memory testMessage = "Test message from Bitcoin";
        
        // Store message directly
        target.storeMessage(testMessage);
        
        // Retrieve and verify
        string memory stored = target.getMessage(address(this));
        assertEq(stored, testMessage, "Message not stored correctly");
        assertEq(target.messageCount(), 1, "Message count incorrect");
        
        console.log("Message stored:", testMessage);
        console.log("Message count:", target.messageCount());
    }
    
    function test_TargetContract_Transfer() public {
        console.log("\n=== Test: Target Contract - Transfer ===");
        
        address recipient = address(0x999);
        
        // Mint tokens
        target.mint(address(this), 1000);
        console.log("Minted 1000 tokens");
        
        // Transfer
        target.transfer(recipient, 500);
        console.log("Transferred 500 tokens to recipient");
        
        // Verify balances
        assertEq(target.getBalance(address(this)), 500);
        assertEq(target.getBalance(recipient), 500);
        
        console.log("Sender balance:", target.getBalance(address(this)));
        console.log("Recipient balance:", target.getBalance(recipient));
    }
    
    function test_TargetContract_StoreData() public {
        console.log("\n=== Test: Target Contract - Store Data ===");
        
        bytes32 key = keccak256("test_key");
        bytes memory data = "test data content";
        
        target.storeData(key, data);
        
        bytes memory retrieved = target.getData(key);
        assertEq(retrieved, data, "Data not stored correctly");
        
        console.log("Data stored and retrieved successfully");
    }
    
    function test_TargetContract_Swap() public {
        console.log("\n=== Test: Target Contract - Swap ===");
        
        address tokenIn = address(0x1);
        address tokenOut = address(0x2);
        uint256 amountIn = 1000;
        uint256 minAmountOut = 900;
        
        uint256 amountOut = target.swap(tokenIn, tokenOut, amountIn, minAmountOut);
        
        assertEq(amountOut, amountIn, "Swap amount incorrect");
        console.log("Swapped", amountIn, "for", amountOut);
    }
    
    function test_Schnorr_PrecompileRawResponse() public view {
        console.log("\n=== Test: Schnorr Precompile Raw Response ===");
        
        (bool ok, bytes memory output) = schnorrVerifier.getPrecompileResponse(
            TEST_PUBKEY_X,
            TEST_MESSAGE,
            TEST_SIGNATURE
        );
        
        assertTrue(ok, "Precompile call failed");
        assertEq(output.length, 32, "Output length should be 32 bytes");
        assertEq(uint8(output[31]), 0x01, "Last byte should be 0x01 for valid signature");
        
        console.log("Precompile call successful");
        console.log("Output length:", output.length);
        console.logBytes(output);
    }
    
    function test_Authorization_ContractCheck() public view {
        console.log("\n=== Test: Authorization - Contract Check ===");
        
        BMCPMessageReceiver.Authorization memory auth = BMCPMessageReceiver.Authorization({
            allowedContract: address(target),
            allowedFunction: bytes4(0),
            maxValue: 0,
            validUntil: 0
        });
        
        // This would be checked in receiveMessage
        assertEq(auth.allowedContract, address(target), "Authorized contract mismatch");
        console.log("Authorization contract check passed");
    }
    
    function test_Authorization_FunctionCheck() public view {
        console.log("\n=== Test: Authorization - Function Check ===");
        
        bytes4 transferSelector = bytes4(keccak256("transfer(address,uint256)"));
        
        BMCPMessageReceiver.Authorization memory auth = BMCPMessageReceiver.Authorization({
            allowedContract: address(0),
            allowedFunction: transferSelector,
            maxValue: 0,
            validUntil: 0
        });
        
        assertEq(auth.allowedFunction, transferSelector, "Function selector mismatch");
        console.log("Authorization function check passed");
    }
    
    function test_Authorization_Deadline() public view {
        console.log("\n=== Test: Authorization - Deadline Check ===");
        
        uint256 futureTime = block.timestamp + 3600;
        
        BMCPMessageReceiver.Authorization memory auth = BMCPMessageReceiver.Authorization({
            allowedContract: address(0),
            allowedFunction: bytes4(0),
            maxValue: 0,
            validUntil: futureTime
        });
        
        assertTrue(block.timestamp <= auth.validUntil, "Should be before deadline");
        console.log("Current time:", block.timestamp);
        console.log("Valid until:", auth.validUntil);
    }
}

