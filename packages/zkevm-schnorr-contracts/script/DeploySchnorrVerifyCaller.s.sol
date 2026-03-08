// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SchnorrVerifyCaller.sol";

contract DeploySchnorrVerifyCaller is Script {
    function run() external {
        // Try to get private key, handle both hex and uint formats
        uint256 deployerPrivateKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // If envUint fails, try envString and add 0x prefix
            string memory keyStr = vm.envString("PRIVATE_KEY");
            string memory keyWithPrefix = string(abi.encodePacked("0x", keyStr));
            deployerPrivateKey = vm.parseUint(keyWithPrefix);
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SchnorrVerifyCaller
        SchnorrVerifyCaller schnorrCaller = new SchnorrVerifyCaller();
        
        console.log("SchnorrVerifyCaller deployed to:", address(schnorrCaller));
        
        // Test the precompile immediately after deployment
        console.log("Testing precompile with all zeros...");
        bool testResult = schnorrCaller.testPrecompile();
        console.log("Test result (should be false):", testResult);
        
        vm.stopBroadcast();
        
        console.log("\nDeployment Summary:");
        console.log("==================");
        console.log("SchnorrVerifyCaller:", address(schnorrCaller));
        console.log("Test result:", testResult);
        console.log("\nNext steps:");
        console.log("1. Test with various signature inputs");
        console.log("2. Generate proper BIP-340 Schnorr signatures");
        console.log("3. Verify the precompile is working correctly");
    }
}
