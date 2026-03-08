// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ExampleTargetContract
 * @dev Example contract that can be called via BMCP messages from Bitcoin
 * @notice This demonstrates various function calls that can be triggered from Bitcoin
 */
contract ExampleTargetContract {
    
    // Events
    event MessageReceived(
        address indexed sender,
        string message,
        uint256 timestamp
    );
    
    event TokensTransferred(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    
    event DataStored(
        bytes32 indexed key,
        bytes data,
        address indexed storer
    );
    
    event BatchExecuted(
        address[] targets,
        bytes[] calls,
        bool[] successes
    );
    
    // State
    mapping(address => string) public userMessages;
    mapping(address => uint256) public balances;
    mapping(bytes32 => bytes) public dataStore;
    uint256 public messageCount;
    
    /**
     * @dev Store a message from Bitcoin user
     * @param message The message to store
     */
    function storeMessage(string calldata message) external {
        userMessages[msg.sender] = message;
        messageCount++;
        
        emit MessageReceived(msg.sender, message, block.timestamp);
    }
    
    /**
     * @dev Transfer tokens between addresses
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit TokensTransferred(msg.sender, to, amount);
    }
    
    /**
     * @dev Store arbitrary data
     * @param key Storage key
     * @param data Data to store
     */
    function storeData(bytes32 key, bytes calldata data) external {
        dataStore[key] = data;
        
        emit DataStored(key, data, msg.sender);
    }
    
    /**
     * @dev Mint tokens to address (for testing)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        
        balances[to] += amount;
        
        emit TokensTransferred(address(0), to, amount);
    }
    
    /**
     * @dev Execute batch of calls
     * @param targets Array of target contracts
     * @param calls Array of calldata
     */
    function batchExecute(
        address[] calldata targets,
        bytes[] calldata calls
    ) external {
        require(targets.length == calls.length, "Length mismatch");
        
        bool[] memory successes = new bool[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call(calls[i]);
            successes[i] = success;
        }
        
        emit BatchExecuted(targets, calls, successes);
    }
    
    /**
     * @dev Swap tokens (mock implementation)
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum output tokens
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid tokens");
        require(amountIn > 0, "Invalid amount");
        
        // Mock swap logic (1:1 for demonstration)
        amountOut = amountIn;
        require(amountOut >= minAmountOut, "Slippage too high");
        
        emit TokensTransferred(msg.sender, address(this), amountIn);
        emit TokensTransferred(address(this), msg.sender, amountOut);
        
        return amountOut;
    }
    
    /**
     * @dev Get user's message
     */
    function getMessage(address user) external view returns (string memory) {
        return userMessages[user];
    }
    
    /**
     * @dev Get user's balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get stored data
     */
    function getData(bytes32 key) external view returns (bytes memory) {
        return dataStore[key];
    }
}

