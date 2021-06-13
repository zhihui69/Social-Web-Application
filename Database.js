const { MongoClient, ObjectID} = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v3.6+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.6/api/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen400a app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatrooms from `db`
			 * and resolve an array of chatrooms */
            const collection = db.collection("chatrooms");
            resolve(collection.find({}).toArray())   
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatroom from `db`
			 * and resolve the result */
            const collect = db.collection("chatrooms");
            try{resolve(collect.findOne({_id: ObjectID(room_id)}))}
            catch(e){
				try{resolve(collect.findOne({_id: room_id}))}
				catch(e){
				resolve(null)}
            }
            
            
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			/* TODO: insert a room in the "chatrooms" collection in `db`
			 * and resolve the newly added room */
            if(room.name){  
                if(!room._id) room._id = ObjectID()
                db.collection("chatrooms").insertOne(room);
                resolve(room);  

            }
            else reject(new Error("Name field is not provided"))
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read a conversation from `db` based on the given arguments
			 * and resolve if found */
			try{
				if(!before)
					before = Date.now();
				const query ={"room_id": room_id, "timestamp": {$lt:before}}
                const options = {
					sort:{"timestamp": -1}
				}
				var result = db.collection("conversations").findOne(query,options)
				//console.log(`getLastConversation result : ${result}`)
				resolve(result)
			}
			catch(e){
				resolve(null)
			}
		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: insert a conversation in the "conversations" collection in `db`
			 * and resolve the newly added conversation */
			if(conversation.room_id && conversation.timestamp && conversation.messages){
				 db.collection("conversations").insertOne(conversation);
				 resolve(conversation)
			}
			else{
				reject(new Error("conversation is wrong"))
			}
		})
	)
}

Database.prototype.getUser = function(username){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			var result = db.collection("users").findOne({"username": username})
			if(result){
				 resolve(result);
			}
			else
				resolve(null);
		})
	)
}
module.exports = Database;