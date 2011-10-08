var http = require('http');

function requestHandler(pRequest, pResponse) {
	pResponse.writeHead(200, {'Content-Type': 'text/plain'});
	pResponse.end('Hello World\n');
}

http.createServer(requestHandler).listen(1337, '127.0.0.1');
console.log('NoPlan server up and running at http://127.0.0.1:1337/');
