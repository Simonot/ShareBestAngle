var static = require('node-static');
var http = require('http');
var file = new(static.Server)();

//var port = 2015;
var port = process.env.PORT;

var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port, function() {
	log_comment("server listening (port "+port+")");
});

/* to send the signaling message to the right client we use here the var currentConnection
   In deed we only have to deal with the signaling messages during the connection. After the server
   is not needed, we only use the P2P connection to exange the video. We then asume that the clients
   do not connect at the same time
*/
var isitAdmin = false;
var adminConnection;
var currentConnection;

//socket.io functions
var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	function log(){
		var array = [">>> Message from server: "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	socket.on('admin connected', function(){
		adminConnection = socket;
		isitAdmin = true;
		socket.broadcast.emit('is it admin', isitAdmin);
	});

	socket.on('is there admin', function(){
		socket.emit('is it admin', isitAdmin);
	});

	socket.on('you are share client number', function(number){
		currentConnection.emit('numberShareClient', number);
	});

	socket.on('you are best angle client number', function(number){
		currentConnection.emit('numberBestAngleClient', number);
	});

	socket.on('share client disconnected', function(number){
		adminConnection.emit('share client disconnected', number);
	});

	socket.on('best angle client disconnected', function(number){
		adminConnection.emit('best angle client disconnected', number);
	});

	socket.on('message', function (message) {
		log('Got message: ', message);

		if (message === 'got share client media') {
			currentConnection = socket;
			adminConnection.emit('message', message);
		} 
		else if (message === 'want best angle') {
			currentConnection = socket;
			adminConnection.emit('message', message);
		} 
		else if (message.type === 'change angle') {
			currentConnection = socket;
			adminConnection.emit('message', message);
		} 
		else if (message === 'no share client') {
			currentConnection.emit('message', message);
		} 
		else if (message === 'admin ready') {
			currentConnection.emit('message', message);
		} 
		else if (message.type === 'offer') {
			adminConnection.emit('message', message);
		} 
		else if (message.type === 'answer') {
			currentConnection.emit('message', message);
		} 
		else if (message.type === 'candidate') {
			if (message.origin === 'admin')
				currentConnection.emit('message', message);
			else adminConnection.emit('message', message);
		}
		else if (message === 'admin bye') {
			isitAdmin = false;
		}
		else
			socket.broadcast.emit('message', message);
	});
});

//utility function
function log_error(error) {
	if (error !== "Connection closed" && error !== undefined) {
		log_comment("ERROR: "+error);
	}
}

function log_comment(comment) {
	console.log((new Date())+" "+comment);
}