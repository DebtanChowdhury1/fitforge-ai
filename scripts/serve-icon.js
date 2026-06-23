const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const file = path.join(__dirname, 'generate-icon.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(file).pipe(res);
});

server.listen(7788, () => console.log('Icon server running on http://localhost:7788'));
