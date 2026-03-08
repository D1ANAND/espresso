// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BMCPMessageReceiver
 * @dev Receives and verifies Bitcoin OP_RETURN messages with Schnorr signature verification
 * @notice This contract integrates with BMCP protocol to:
 *   1. Receive messages from Bitcoin via relayer
 *   2. Verify Schnorr signatures from Bitcoin transaction inputs
 *   3. Check authorization constraints (allowed contracts, functions, limits)
 *   4. Execute authorized function calls
 */
contract BMCPMessageReceiver {
    
    // Citrea Schnorr precompile address
    address constant SCHNORR_VERIFY_PRECOMPILE = 0x0000000000000000000000000000000000000200;
    
    // Events
    event MessageReceived(
        bytes32 indexed txid,
        bytes32 indexed bitcoinPubKeyX,
        address targetContract,
        bytes4 functionSelector,
        uint256 nonce
    );
    
    event SignatureVerified(
        bytes32 indexed txid,
        bytes32 bitcoinPubKeyX,
        bytes32 messageHash,
        bool isValid
    );
    
    event FunctionExecuted(
        bytes32 indexed txid,
        address indexed targetContract,
        bytes4 indexed functionSelector,
        bool success,
        bytes returnData
    );
    
    event AuthorizationViolation(
        bytes32 indexed txid,
        string reason
    );
    
    // Structs
    struct Authorization {
        address allowedContract;     // Which contract can be called
        bytes4 allowedFunction;      // Which function can be called
        uint256 maxValue;            // Maximum value in wei
        uint256 validUntil;          // Expiry timestamp
    }
    
    struct BMCPMessage {
        bytes2 protocol;             // 0x4243 ("BC")
        uint64 chainSelector;        // Destination chain
        address targetContract;      // Contract to call
        bytes data;                  // Function calldata
        uint256 nonce;               // Replay protection
        uint256 deadline;            // Message deadline
        Authorization authorization; // Authorization constraints
    }
    
    struct SchnorrProof {
        bytes32 pubKeyX;             // Bitcoin public key X coordinate
        bytes signature;             // 64-byte Schnorr signature
    }
    
    // State
    address public owner;
    address public relayer;
    mapping(bytes32 => bool) public processedMessages;  // txid => processed
    mapping(bytes32 => uint256) public bitcoinNonces;   // pubKeyX => nonce
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer");
        _;
    }
    
    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }
    
    /**
     * @dev Main entry point for BMCP messages from Bitcoin
     * @param txid Bitcoin transaction ID
     * @param message The decoded BMCP message from OP_RETURN
     * @param proof Schnorr signature proof from Bitcoin transaction input
     */
    function receiveMessage(
        bytes32 txid,
        BMCPMessage calldata message,
        SchnorrProof calldata proof
    ) external onlyRelayer returns (bool) {
        
        // Check if message already processed
        require(!processedMessages[txid], "Message already processed");
        
        // Check message deadline
        require(block.timestamp <= message.deadline, "Message expired");
        
        // Check authorization deadline
        if (message.authorization.validUntil > 0) {
            require(
                block.timestamp <= message.authorization.validUntil,
                "Authorization expired"
            );
        }
        
        // Emit received event
        emit MessageReceived(
            txid,
            proof.pubKeyX,
            message.targetContract,
            bytes4(message.data),
            message.nonce
        );
        
        // Step 1: Verify Schnorr signature
        bool isValidSignature = _verifySchnorrSignature(
            txid,
            message,
            proof
        );
        
        if (!isValidSignature) {
            emit AuthorizationViolation(txid, "Invalid Schnorr signature");
            return false;
        }
        
        // Step 2: Verify authorization constraints
        bool isAuthorized = _verifyAuthorization(txid, message);
        
        if (!isAuthorized) {
            return false;
        }
        
        // Step 3: Check and update nonce
        uint256 expectedNonce = bitcoinNonces[proof.pubKeyX];
        require(message.nonce == expectedNonce, "Invalid nonce");
        bitcoinNonces[proof.pubKeyX] = expectedNonce + 1;
        
        // Step 4: Mark as processed
        processedMessages[txid] = true;
        
        // Step 5: Execute the function call
        bool success = _executeCall(txid, message);
        
        return success;
    }
    
    /**
     * @dev Verify Schnorr signature from Bitcoin transaction
     * @param txid Bitcoin transaction ID
     * @param message The BMCP message
     * @param proof Schnorr proof containing pubkey and signature
     */
    function _verifySchnorrSignature(
        bytes32 txid,
        BMCPMessage calldata message,
        SchnorrProof calldata proof
    ) internal returns (bool) {
        
        // Create message hash from the BMCP message data
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
        
        // Verify signature length
        require(proof.signature.length == 64, "Invalid signature length");
        
        // Call Citrea Schnorr precompile
        bytes memory input = abi.encodePacked(
            proof.pubKeyX,
            messageHash,
            proof.signature
        );
        
        (bool ok, bytes memory output) = SCHNORR_VERIFY_PRECOMPILE.staticcall(input);
        
        // Check result: 32-byte return, last byte == 0x01 means success
        bool isValid = ok && output.length == 32 && output[31] == 0x01;
        
        emit SignatureVerified(txid, proof.pubKeyX, messageHash, isValid);
        
        return isValid;
    }
    
    /**
     * @dev Verify authorization constraints
     * @param txid Bitcoin transaction ID
     * @param message The BMCP message
     */
    function _verifyAuthorization(
        bytes32 txid,
        BMCPMessage calldata message
    ) internal returns (bool) {
        
        Authorization calldata auth = message.authorization;
        
        // Check allowed contract
        if (auth.allowedContract != address(0)) {
            if (message.targetContract != auth.allowedContract) {
                emit AuthorizationViolation(txid, "Unauthorized contract");
                return false;
            }
        }
        
        // Check allowed function
        if (auth.allowedFunction != bytes4(0)) {
            bytes4 functionSelector = bytes4(message.data);
            if (functionSelector != auth.allowedFunction) {
                emit AuthorizationViolation(txid, "Unauthorized function");
                return false;
            }
        }
        
        // Check max value (if msg.value involved)
        if (auth.maxValue > 0 && msg.value > auth.maxValue) {
            emit AuthorizationViolation(txid, "Value exceeds maximum");
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Execute the authorized function call
     * @param txid Bitcoin transaction ID
     * @param message The BMCP message
     */
    function _executeCall(
        bytes32 txid,
        BMCPMessage calldata message
    ) internal returns (bool) {
        
        // Execute the call
        (bool success, bytes memory returnData) = message.targetContract.call{
            value: 0  // No ETH transfer for now
        }(message.data);
        
        emit FunctionExecuted(
            txid,
            message.targetContract,
            bytes4(message.data),
            success,
            returnData
        );
        
        return success;
    }
    
    /**
     * @dev Update relayer address (only owner)
     */
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer address");
        relayer = _relayer;
    }
    
    /**
     * @dev Check if message has been processed
     */
    function isMessageProcessed(bytes32 txid) external view returns (bool) {
        return processedMessages[txid];
    }
    
    /**
     * @dev Get current nonce for a Bitcoin public key
     */
    function getNonce(bytes32 pubKeyX) external view returns (uint256) {
        return bitcoinNonces[pubKeyX];
    }
    
    /**
     * @dev Verify a signature without processing (for testing)
     */
    function verifySignatureOnly(
        bytes32 pubKeyX,
        bytes32 messageHash,
        bytes calldata signature
    ) external view returns (bool) {
        require(signature.length == 64, "Invalid signature length");
        
        bytes memory input = abi.encodePacked(
            pubKeyX,
            messageHash,
            signature
        );
        
        (bool ok, bytes memory output) = SCHNORR_VERIFY_PRECOMPILE.staticcall(input);
        
        return ok && output.length == 32 && output[31] == 0x01;
    }
}

