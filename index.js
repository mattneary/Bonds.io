var http = require('http'),
	mime = require('mime');

exports.module = http.createServer(function(req, res) {
	var path = req.url=='/'?'/index.html':req.url;	
	fs.stat(__dirname + path, function(err, stat) {
	    if (!err) {
	        res.writeHead(200, { 'Content-Type': mime.lookup(__dirname + path) });
	        fs.createReadStream(__dirname + path).pipe(res);
	    } else {
			res.writeHead(404, { 'Content-Type': 'text/html' });
			res.end("<body>404 Not Found</body>");
	    }
	});
});