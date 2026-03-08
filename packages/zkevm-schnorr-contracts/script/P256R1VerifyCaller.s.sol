// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {P256R1VerifyCaller} from "../src/P256R1VerifyCaller.sol";

contract P256R1VerifyCallerScript is Script {
    P256R1VerifyCaller public p256r1VerifyCaller;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        p256r1VerifyCaller = new P256R1VerifyCaller();

        vm.stopBroadcast();
    }
}
