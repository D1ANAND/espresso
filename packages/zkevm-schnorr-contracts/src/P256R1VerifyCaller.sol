// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title secp256r1 Precompile Example
/// @notice Calls the secp256r1 precompile to verify secp256r1 ECDSA signatures
contract P256R1VerifyCaller {
    address constant P256R1_VERIFY_PRECOMPILE = 0x0000000000000000000000000000000000000100;

    /**
     * @notice Verifies a secp256r1 (RIP-7212) ECDSA signature.
     * @dev All inputs must be 32-byte big-endian values.
     * @param messageHash 32-byte message hash
     * @param r 32-byte signature r value
     * @param s 32-byte signature s value
     * @param pubKeyX 32-byte public key X coordinate
     * @param pubKeyY 32-byte public key Y coordinate 
     * @return isValid True if signature is valid, false otherwise.
     */
    function callP256R1Verify(
        bytes32 messageHash,
        bytes32 r,
        bytes32 s,
        bytes32 pubKeyX,
        bytes32 pubKeyY
    ) external view returns (bool isValid) {
        // Concatenate inputs in correct order: hash | r | s | pubKeyX | pubKeyY
        bytes memory input = abi.encodePacked(
            messageHash,
            r,
            s,
            pubKeyX,
            pubKeyY
        );
        (bool ok, bytes memory output) = P256R1_VERIFY_PRECOMPILE.staticcall(input);
        // 32-byte return, last byte == 0x01 means success
        return ok && output.length == 32 && output[31] == 0x01;
    }
}