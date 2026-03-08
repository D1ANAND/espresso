// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Schnorr Precompile Example
/// @notice Calls the Schnorr precompile to verify BIP340 secp256k1 signatures
contract SchnorrVerifyCaller {
    address constant SCHNORR_VERIFY_PRECOMPILE = 0x0000000000000000000000000000000000000200;

    // Events for testing
    event SchnorrVerificationResult(
        bytes32 indexed messageHash,
        bytes32 indexed pubKeyX,
        bytes signature,
        bool isValid,
        bytes precompileOutput
    );

    /**
     * @notice Verifies a BIP340 Schnorr signature.
     * @dev All inputs must be big-endian byte sequences.
     * @param pubKeyX 32-byte public key X coordinate (big-endian, Y is implicitly even per BIP340)
     * @param messageHash 32-byte hash of the signed message
     * @param signature 64-byte Schnorr signature (r || s), both 32-byte values concatenated
     * @return isValid True if signature is valid, false otherwise.
     */
    function schnorrVerify(
        bytes32 pubKeyX,
        bytes32 messageHash,
        bytes calldata signature // must be 64 bytes
    ) external view returns (bool isValid) {
        require(signature.length == 64, "Invalid signature length");
        // Concatenate inputs in correct order: pubKeyX | messageHash | signature
        bytes memory input = abi.encodePacked(
            pubKeyX,
            messageHash,
            signature
        );
        (bool ok, bytes memory output) = SCHNORR_VERIFY_PRECOMPILE.staticcall(input);
        // 32-byte return, last byte == 0x01 means success
        return ok && output.length == 32 && output[31] == 0x01;
    }

    /**
     * @notice Verifies a BIP340 Schnorr signature with detailed logging.
     * @dev Same as schnorrVerify but emits events for debugging
     */
    function schnorrVerifyWithLogging(
        bytes32 pubKeyX,
        bytes32 messageHash,
        bytes calldata signature
    ) external returns (bool isValid) {
        require(signature.length == 64, "Invalid signature length");
        
        // Concatenate inputs in correct order: pubKeyX | messageHash | signature
        bytes memory input = abi.encodePacked(
            pubKeyX,
            messageHash,
            signature
        );
        
        (bool ok, bytes memory output) = SCHNORR_VERIFY_PRECOMPILE.staticcall(input);
        
        // Check if signature is valid
        bool valid = ok && output.length == 32 && output[31] == 0x01;
        
        // Emit event with all details for debugging
        emit SchnorrVerificationResult(
            messageHash,
            pubKeyX,
            signature,
            valid,
            output
        );
        
        return valid;
    }

    /**
     * @notice Test the precompile with known test vectors
     * @dev This function tests with hardcoded values to verify precompile functionality
     */
    function testPrecompile() external returns (bool) {
        // Test with all zeros (should fail)
        bytes32 testPubKeyX = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes32 testMessageHash = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes memory testSignature = new bytes(64);
        // testSignature is already all zeros
        
        return this.schnorrVerifyWithLogging(testPubKeyX, testMessageHash, testSignature);
    }

    /**
     * @notice Get precompile raw response for debugging
     */
    function getPrecompileResponse(
        bytes32 pubKeyX,
        bytes32 messageHash,
        bytes calldata signature
    ) external view returns (bool ok, bytes memory output) {
        require(signature.length == 64, "Invalid signature length");
        
        bytes memory input = abi.encodePacked(
            pubKeyX,
            messageHash,
            signature
        );
        
        return SCHNORR_VERIFY_PRECOMPILE.staticcall(input);
    }
}
