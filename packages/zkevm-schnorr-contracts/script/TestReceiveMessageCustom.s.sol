// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/BMCPMessageReceiver.sol";
import "../src/ExampleTargetContract.sol";

/**
 * @title TestReceiveMessageCustom
 * @dev Script to test receiveMessage with custom Schnorr signature data
 */
contract TestReceiveMessageCustom is Script {
    
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
        console.log("Testing with Custom Schnorr Signature");
        console.log("==============================================");
        console.log("");
        console.log("Receiver:", RECEIVER_ADDRESS);
        console.log("Target:  ", TARGET_ADDRESS);
        console.log("Relayer: ", deployer);
        console.log("");
        
        // Custom test data from user
        
        // Bitcoin TXID (using the message hash as txid)
        bytes32 txid = 0x5e12ccf87b87be7309c632d60d2a42e5406714e1a2b4166d0d7e07f5eeb4268a;
        console.log("TXID:");
        console.logBytes32(txid);
        
        // Public Key X
        bytes32 pubKeyX = 0x687a19159f505b04628614e3d85d2bf15a43f90a402b71411848de65eb9f602c;
        console.log("PubKey X:");
        console.logBytes32(pubKeyX);
        
        // Schnorr Signature (64 bytes)
        bytes memory signature = hex"fb7b064097a6711b8757717d2b6fef04c34d5e42bd008c048843e9bf67e7154d853ec373e15956b85dcf23a2cebd2cba212696af89fc0539791e65b7239a88e8";
        console.log("Signature (64 bytes):");
        console.logBytes(signature);
        console.log("");
        
        // Check current nonce
        uint256 currentNonce = receiver.bitcoinNonces(pubKeyX);
        console.log("Current nonce:", currentNonce);
        console.log("");
        
        // Prepare function call: storeMessage("Test with custom signature!")
        string memory testMessage = "Hello from Bitcoin with custom signature!";
        bytes memory functionData = abi.encodeWithSelector(
            target.storeMessage.selector,
            testMessage
        );
        
        console.log("Function: storeMessage(string)");
        console.log("Message:", testMessage);
        console.log("");
        
        // Build BMCPMessage
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
        
        // Build SchnorrProof
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
            
            if (success) {
                console.log("*** MESSAGE EXECUTED SUCCESSFULLY! ***");
            } else {
                console.log("*** Message received but execution failed (expected if precompile not available) ***");
            }
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
        if (newNonce > currentNonce) {
            console.log("SUCCESS! Nonce incremented - signature verified!");
        } else {
            console.log("Signature verification pending precompile deployment");
        }
        console.log("==============================================");
    }
}

