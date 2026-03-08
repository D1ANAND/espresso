// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BMCPMessageReceiver} from "../src/BMCPMessageReceiver.sol";
import {ExampleTargetContract} from "../src/ExampleTargetContract.sol";

/**
 * @title DeployBMCP
 * @dev Deployment script for BMCP Message Receiver and Example Target Contract
 */
contract DeployBMCP is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== BMCP Contracts Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Example Target Contract
        console.log("Deploying ExampleTargetContract...");
        ExampleTargetContract targetContract = new ExampleTargetContract();
        console.log("ExampleTargetContract deployed at:", address(targetContract));
        console.log("");
        
        // Deploy BMCP Message Receiver (relayer will be set by owner later)
        console.log("Deploying BMCPMessageReceiver...");
        address relayerAddress = deployer; // Initially set deployer as relayer
        BMCPMessageReceiver receiver = new BMCPMessageReceiver(relayerAddress);
        console.log("BMCPMessageReceiver deployed at:", address(receiver));
        console.log("Initial relayer:", relayerAddress);
        console.log("");
        
        // Mint some test tokens to deployer in target contract
        console.log("Minting test tokens...");
        targetContract.mint(deployer, 1000000 * 10**18);
        console.log("Minted 1,000,000 tokens to deployer");
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("ExampleTargetContract:", address(targetContract));
        console.log("BMCPMessageReceiver:", address(receiver));
        console.log("Owner:", deployer);
        console.log("Relayer:", relayerAddress);
        console.log("");
        
        console.log("=== Next Steps ===");
        console.log("1. Update relayer address: receiver.setRelayer(newRelayerAddress)");
        console.log("2. Configure relayer to forward messages to:", address(receiver));
        console.log("3. Test message flow from Bitcoin -> Relayer -> Citrea");
        console.log("");
        
        console.log("=== Example Usage ===");
        console.log("Target Contract Functions:");
        console.log("  - storeMessage(string message)");
        console.log("  - transfer(address to, uint256 amount)");
        console.log("  - storeData(bytes32 key, bytes data)");
        console.log("  - swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)");
    }
}

