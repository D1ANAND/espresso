// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/BMCPMessageReceiver.sol";
import "../src/ExampleTargetContract.sol";

/**
 * @title TestReceiveMessage
 * @dev Script to test the receiveMessage function with real data
 */
contract TestReceiveMessage is Script {
    
    BMCPMessageReceiver public receiver;
    ExampleTargetContract public target;
    
    // Deployed contract addresses
    address constant RECEIVER_ADDRESS = 0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893;
    address constant TARGET_ADDRESS = 0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De;
    
    function run() external {
        receiver = BMCPMessageReceiver(RECEIVER_ADDRESS);
        target = ExampleTargetContract(TARGET_ADDRESS);
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("Testing BMCPMessageReceiver.receiveMessage()");
        console.log("==============================================");
        console.log("");
        console.log("Receiver:", RECEIVER_ADDRESS);
        console.log("Target:  ", TARGET_ADDRESS);
        console.log("Relayer: ", deployer);
        console.log("");
        
        // Prepare test data
        
        // 1. Bitcoin TXID (simulated)
        bytes32 txid = keccak256("test-bitcoin-tx-1");
        console.log("TXID:");
        console.logBytes32(txid);
        
        // 2. Schnorr test vectors (BIP340)
        bytes32 pubKeyX = 0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9;
        bytes memory signature = hex"ebdee97d060096cfc868ccfa97b6f61c8837ac0e3396abb31d45e68679654a14a7c08cd54f772890989d0fee7d77add7f79288f34d37205b383b8d4246034d9d";
        
        console.log("PubKey X:");
        console.logBytes32(pubKeyX);
        console.log("Signature (64 bytes)");
        
        // 3. Check current nonce
        uint256 currentNonce = receiver.bitcoinNonces(pubKeyX);
        console.log("Current nonce:", currentNonce);
        console.log("");
        
        // 4. Prepare function call: storeMessage("Hello from Bitcoin!")
        string memory testMessage = "Hello from Bitcoin via Foundry!";
        bytes memory functionData = abi.encodeWithSelector(
            target.storeMessage.selector,
            testMessage
        );
        
        console.log("Function: storeMessage(string)");
        console.log("Message:", testMessage);
        console.log("");
        
        // 5. Build BMCPMessage
        BMCPMessageReceiver.Authorization memory auth = BMCPMessageReceiver.Authorization({
            allowedContract: TARGET_ADDRESS,
            allowedFunction: target.storeMessage.selector,
            maxValue: 0,
            validUntil: block.timestamp + 1 hours
        });
        
        BMCPMessageReceiver.BMCPMessage memory message = BMCPMessageReceiver.BMCPMessage({
            protocol: 0x4243,  // "BC"
            chainSelector: 5115,  // Citrea Testnet
            targetContract: TARGET_ADDRESS,
            data: functionData,
            nonce: currentNonce,
            deadline: block.timestamp + 1 hours,
            authorization: auth
        });
        
        // 6. Build SchnorrProof
        BMCPMessageReceiver.SchnorrProof memory proof = BMCPMessageReceiver.SchnorrProof({
            pubKeyX: pubKeyX,
            signature: signature
        });
        
        console.log("==============================================");
        console.log("Calling receiveMessage()...");
        console.log("==============================================");
        console.log("");
        
        // Execute transaction
        vm.startBroadcast(deployerPrivateKey);
        
        try receiver.receiveMessage(txid, message, proof) returns (bool success) {
            console.log("Transaction successful!");
            console.log("Return value:", success);
        } catch Error(string memory reason) {
            console.log("Transaction failed!");
            console.log("Reason:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("Transaction failed with low-level error");
            console.logBytes(lowLevelData);
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("==============================================");
        console.log("Checking results...");
        console.log("==============================================");
        console.log("");
        
        // Check if message was stored
        string memory storedMessage = target.getMessage(RECEIVER_ADDRESS);
        console.log("Stored message:", storedMessage);
        
        // Check if nonce was incremented
        uint256 newNonce = receiver.bitcoinNonces(pubKeyX);
        console.log("New nonce:", newNonce);
        console.log("Previous nonce:", currentNonce);
        
        // Check if message was marked as processed
        bool isProcessed = receiver.processedMessages(txid);
        console.log("Message processed:", isProcessed);
        
        console.log("");
        console.log("==============================================");
        console.log("Test complete!");
        console.log("==============================================");
    }
}

