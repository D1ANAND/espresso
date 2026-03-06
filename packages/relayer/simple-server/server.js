const http = require('http');

const PORT = 8000;

// Hardcoded response message - change manually as needed
// "hello from sepolia"
// "hello from citera" 
const message = "hello from mainnet"; 

const server = http.createServer((req, res) => {
  // Only handle GET requests to root path
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(message);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, 'localhost', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

