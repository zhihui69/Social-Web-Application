const cpen400a = require('./cpen400a-tester.js');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const Database = require('./Database.js');
const crypto = require('crypto');
const broker = new ws.Server({port: 8000});
const messageBlockSize = 3;
var mongoUrl = "mongodb://localhost:27017";
var dbName = "cpen400a-messenger";
var db = new Database(mongoUrl, dbName);
var messages = {};
const SessionManager = require('./SessionManager.js');
var sessionManager = new SessionManager();




broker.clients = new Set();
broker.on('connection', function connection(wss,request) {
	var str = "";
	if(request.headers.cookie)
		str = request.headers.cookie.toString();
	var index = str.indexOf("cpen400a-session=")
	var cookie = index == -1 ? "" : str.substring(index + 17)	;
	var username = sessionManager.getUsername(cookie)
    if(!cookie || !username){
       wss.close()
	}
	else{
		broker.clients.add(wss);
		wss.on('message', function incoming(data) {
			var parsedData = JSON.parse(data);
			var message = parsedData.text;
			if(message.includes('img') || message.includes('button')){
				message = message.replace(/\<+([^]+)\>/,'')
			}
			parsedData.text = message
			parsedData.username = username;
			var msg = {
				username: username,
				text: message
			}
			var id = parsedData.roomId
			if(!messages[id]) messages[id] = []
			messages[id].push(msg);
			if(messages[id].length == messageBlockSize){
				var conversation = {
					"room_id" : id,
					"timestamp": Date.now() ,
					"messages": messages[id]
				}
				db.addConversation(conversation).catch((err)=>console.log(err));
				messages[id] = []

			}
			broker.clients.forEach(function each(client) {	
				if(client !== wss && client.readyState === ws.OPEN){
					client.send(JSON.stringify(parsedData));		
				}
			
		})
	

	})
}
})
function logRequest(req, res, next){
	//console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

function isCorrectPassword(password, saltedHash){
	var salt = saltedHash.substr(0,20);
	var hash = crypto.createHash("sha256").update(password + salt).digest("base64");
	return hash == saltedHash.substr(20)
}
const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug
app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});


//GET endpoint /chat/:room_id/messages
app.route('/chat/:room_id/messages')
.get(sessionManager.middleware,(req, res)=>{
	var str = req.url;
	var room_id = req.params.room_id;
	var	before = Number(str.substring(str.indexOf('=')+1))
    db.getLastConversation(room_id, before)
	.then((result)=>{
		res.statusCode = 200;
		res.send(result)
	},
	(err)=>{
		console.log(err.message)
	})
})

//GET endpoint /chat/:room_id
app.route('/chat/:room_id')
   .get(sessionManager.middleware,(req, res)=>{
	var Room = req.params;
	db.getRoom(Room.room_id).then((result)=>{
		if(result){
			res.statusCode = 200;
			res.send(result)
			
		} 
		else{
			res.statusCode = 404;
			res.send("Room " + Room.room_id + " was not found")
		
		}
	})
})

app.route('/chat')
	.get(sessionManager.middleware,(req, res)=>{
		db.getRooms().then((result)=>{
			var arr = JSON.parse(JSON.stringify(result));
			for(let i = 0; i < result.length; i++){
				let Room = result[i];
				if(!messages[Room._id]) messages[Room._id] = [];
				arr[i]["messages"] = messages[Room._id];
			}
			res.statusCode = 200;
			res.send(arr)
		}, (error)=>{
			throw new Error(error);
		})
		
	})
	.post(sessionManager.middleware,(req, res)=>{
		db.addRoom(req.body)
		.then((result)=>{
			messages[result._id] = [];
			res.statusCode = 200;
			res.send(result)
		})
		.catch((err)=>{
			res.statusCode = 400;
			res.send(JSON.stringify({"message": err}))
		})		
	})

app.route('/profile')
	.get(sessionManager.middleware,
		(req, res)=>{
			var obj ={
				username: req.username
			}
			res.status(200).json(obj)
		})
// serve static files (client-side)
app.use('/app.js', sessionManager.middleware, express.static(clientApp + '/app.js'));
app.use('/index.html', sessionManager.middleware, express.static(clientApp + '/index.html'));
app.use('/index', sessionManager.middleware, express.static(clientApp + '/index.html'));
app.use('/+', sessionManager.middleware, express.static(clientApp + '/index.html'));
app.use('/',  express.static(clientApp, { extensions: ['html'] }));
app.route('/login')
.post((req, res)=>{
	var form = req.body;
	var username = form.username;
	var password = form.password;
	db.getUser(username)
	.then((result)=>{
		
		if(result && isCorrectPassword(password,result.password)){
			sessionManager.createSession(res, username)
			res.redirect('/')
		}
		else{
			res.redirect('/login')
		}

	},
	(err)=>{
		console.log(err.message)
	})
})
app.route('/logout')
.get((req, res)=>{
	sessionManager.deleteSession(req);
	res.redirect('/login')
})

function errorHandler(err, req, res, next){
	if(err instanceof SessionManager.Error){
		if(req.headers.accept == 'application/json')
			res.status(401).send({error: "something failed"})
		else
			res.redirect('/login')
	}
	else{
		res.status(500).send()
	}
}
app.use(errorHandler)

cpen400a.connect('http://35.183.65.155/cpen400a/test-a5-server.js');
cpen400a.export(__filename, { app, messages, db, messageBlockSize, sessionManager, isCorrectPassword});