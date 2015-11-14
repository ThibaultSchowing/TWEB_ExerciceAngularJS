

var express = require('express');


var app = express();

// Listening port. Is the same for the Web server and the Socket.IO server
var appListenOnPortConfig = process.env.PORT || 8080;


// Binding the listening socket
var server = app.listen(appListenOnPortConfig, function () {
  console.log('Express server listening on port ' + appListenOnPortConfig);
});

// Socket.IO will listen on the same port as our Web server
var sio = require('socket.io').listen(server);

// Static pages (such as angularjs, css and client-side js) are statically served
app.use('/', express.static(__dirname + '/app'));

var tabVotes = [
{
	'name': 'yes',
	'count': 0
},
{
	'name': 'no',
	'count': 0
},
{
	'name': 'dont know',
	'count': 0
}
];

sio.sockets.on('connection', function (socket){
	socket.on('registerResult', function(index){
		tabVotes[index].count++;
		sio.sockets.emit('sendResult', tabVotes);
	});
});