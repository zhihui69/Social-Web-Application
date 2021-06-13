var profile = {
    username : "Alice"
}
const Service = {
	origin : window.location.origin,
	getAllRooms: ()=>{     
       return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", Service.origin + "/chat");
            xhr.send(null);
            xhr.onload = () => {
                if (xhr.status == 200) {
                    var arr = JSON.parse(xhr.response);
                    resolve(arr);
                }
                else
                    reject(new Error(xhr.response))
            };
            xhr.onerror = () => {
                reject(new Error("network issue"));
            };
            
        })
    },
    addRoom: (data)=>{
        return new Promise((resolve, reject)=>{
            var xhr = new XMLHttpRequest();
            xhr.open("POST", Service.origin + '/chat');
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
            xhr.onload = () => {
                if (xhr.status == 200) {
                    resolve(JSON.parse(xhr.response))
                }
                else
                    reject(new Error(xhr.response))
            };
            xhr.onerror = () => {
                reject(new Error("network issue"));
            };
        })
    },
    getLastConversation: (roomId,before)=>{
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            var url = Service.origin + `/chat/${roomId}/messages?before=` + encodeURI(before);
            xhr.open("GET", url);
            xhr.send();
            xhr.onload = () => {
                if (xhr.status == 200) {
                    var conversation = xhr.response;
                    resolve(JSON.parse(conversation));
                }
            };
            xhr.onerror = () => {
                reject(new Error("network issue"));
            };
            
        })
    },
    getProfile: ()=>{
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", Service.origin + "/profile");
            xhr.send();
            xhr.onload = () => {
                if (xhr.status == 200) {
                    console.log(xhr.response)
                    resolve(JSON.parse(xhr.response));
                }
            };
            xhr.onerror = () => {
                reject(new Error("network issue"));
            };
            
        })
    }
}

function main() {
    Service.getProfile().then((result)=>{
        profile.username = result.username;
    },
    (err)=>{
       console.log(err.message)
    })
    var socket = new WebSocket("ws://localhost:8000");
    var lobby = new Lobby();
    var lobbyView = new LobbyView(lobby);
    var chatView  = new ChatView(socket);
    var profileView = new ProfileView();
   

    socket.addEventListener('message', (event)=>{
        var msg = JSON.parse(event.data);
        var room = lobby.getRoom(msg.roomId);
        var message = msg.text;
        if(message.includes('img') || message.includes('button')){
            message = message.replace(/\<+([^]+)\>/,'')
        }
        msg.text = message
        room.addMessage(msg.username, message);
    })
    var renderRoute = function(){
        var route = window.location.hash;
        var pageView = document.getElementById("page-view");

        if(route == "#/" || route == ""){
            emptyDOM(pageView);
            pageView.appendChild(lobbyView.elem);
        }
        else if(route.indexOf("#/chat/") != -1 ){
            var roomId = route.substring(7);
            var room = lobby.getRoom(roomId);
            if(room){
                chatView.setRoom(room);
                emptyDOM(pageView);
                pageView.appendChild(chatView.elem);
            }      
            
        }
        else if(route == "#/profile"){
            emptyDOM(pageView);
            pageView.appendChild(profileView.elem);
        }
    }
    renderRoute();
    window.addEventListener("popstate", renderRoute);
    var refreshLobby = ()=>{
        Service.getAllRooms().then((arr)=>{
            for(var i = 0; i < arr.length; i++){
                var id = arr[i]._id;
                if(lobby.rooms.hasOwnProperty(id)){
                    lobby.rooms[id].name = arr[i].name;
                    lobby.rooms[id].image = arr[i].image;
                }
                else{
                    lobby.addRoom(id, arr[i].name, arr[i].image, arr[i].messages);
                }
            }
        },
        (error)=>{
            console.log(error.message)
        })
        
    }
    refreshLobby();
    setInterval(refreshLobby, 5000);
    cpen400a.export(arguments.callee, {lobby,chatView});
    
}
window.addEventListener("load", main);



var LobbyView = function(lobby) {
    var that = this;
    this.lobby = lobby;
    var htmlString = `<div class = "content">
    <ul class = "room-list">
      <li>
        <img src = "assets/bibimbap.jpg" class = "room-image"/>
        <a href = "#/chat/room-1"> chat room 1
        </a>
      </li>
      <li>
        <img src = "assets/minecraft.jpg" class = "room-image"/>
        <a href = "#/chat/room-2"> chat room 2
        </a>
      </li>
      <li>
        <img src = "assets/canucks.png" class = "room-image"/>
        <a href = "#/chat/room-3"> chat room 3
        </a>
      </li>
    </ul>
    <div class="page-control">
      <form>
        <input type = "text" value = "room name"> 
        <button type = "button">Create Room</button>
      </form>
    </div>
    </div>
    `
    this.elem = createDOM(htmlString);
    this.listElem = this.elem.querySelector("ul.room-list");
    this.inputElem = this.elem.querySelector("input");
    this.buttonElem = this.elem.querySelector("button");
    this.redrawList();
    this.buttonElem.addEventListener("click",()=>{
        var textValue = this.inputElem.value; 
        var data = {
            name: textValue.toString(),
            image: "assets/everyone-icon.png"     
        }
        this.inputElem.value = "";
        var newRoom = Service.addRoom(data);
        newRoom.then(
            (result)=>{
                this.lobby.addRoom(result._id, result.name, result.image, result.messages)
            },
            (error)=>console.log(error.message)
        );
        
        
    });
    this.lobby.onNewRoom = function(room){
        var htmlStr = `<li>
        <img src = "${room.image}" class = "room-image"/>
        <a href = "#/chat/${room.id}"> ${room.name}
        </a>
       </li>`
        that.listElem.appendChild(createDOM(htmlStr));
    };
}
LobbyView.prototype.redrawList = function(){
    emptyDOM(this.listElem);
    for(var key in this.lobby.rooms) {
        var room = this.lobby.rooms[key];
        var htmlStr = `<li>
        <img src = "${room.image}" class = "room-image"/>
        <a href = "#/chat/${room.id}"> ${room.name}
        </a>
       </li>`
       this.listElem.appendChild(createDOM(htmlStr));
    }
}

var ChatView = function(socket) {
    var that = this;
    var htmlString = `<div class = "content">
    <h4 class = "room-name">
        Everyone in CPEN400A
    </h4>
    <div class = "message-list">
        <div class = "message">
            <p><span class = "message-user">Alice</span></p>
            <p><span class = "message-text">Hi guys!</span></p>
            
        </div>
        <div class = "message my-message">
            <p><span class = "message-user">Bob</span></p>
            <p><span class = "message-text">How is everyone doing today?</span></p>
        </div>
    </div>
    <div class = "page-control">
        <form>
            <textarea name="textarea" id="textarea"></textarea>
            <button type = "button">Send</button>
        </form>
        
    </div>
</div>`;
    this.elem = createDOM(htmlString);
    this.titleElem = this.elem.querySelector("h4");
    this.chatElem = this.elem.querySelector("div.message-list");
    this.inputElem = this.elem.querySelector("textarea");
    this.buttonElem = this.elem.querySelector("button");
    this.room = null;
    this.socket = socket;
   
    this.buttonElem.addEventListener("click", function(e){
        that.sendMessage();
    })
    this.inputElem.addEventListener("keyup", function(e){
        if(e.key == "Enter" && !e.shiftKey){
            that.sendMessage();
        }
    })
    this.chatElem.style.overflowY = "scroll";
    this.chatElem.style.minHeight = "600px";
    this.chatElem.style.maxHeight = "1000px";

    this.chatElem.addEventListener("wheel", (e)=>{ 
          if(this.room.canLoadConversation && e.deltaY < 0 && this.chatElem.scrollTop == 0){
              console.log(this.chatElem.scrollTop)
              this.room.getLastConversation.next();
              console.log()
          }
    })
}
ChatView.prototype.setRoom = function(room) {
    var that = this;
    this.room = room;
    this.titleElem.innerHTML = room.name;
    emptyDOM(this.chatElem);
    this.room.onNewMessage = function(message) {
        if(message.text.includes('img') || message.text.includes('button')){
            message.text = message.text.replace(/\<+([^]+)\>/,'')
        }
        if(message.username == profile.username){
            var htmlStr = `<div class = "message my-message">
        <p><span class = message-user >${message.username}</span></p>
        <p><span class = message-text >${message.text}</span></p>       
        </div>`;
            
        }
        else{
            var htmlStr = `<div class = "message">
            <p><span class = message-user >${message.username}</span></p>
            <p><span class = message-text >${message.text}</span></p>  
        </div>`;        
        }
        that.chatElem.appendChild(createDOM(htmlStr));

    }
    for(var key in this.room.messages){
        this.room.onNewMessage(this.room.messages[key]);            
    }
    this.room.onFetchConversation= function(conversation){
        var prePos = that.chatElem.scrollHeight;
        for(var i = conversation.messages.length - 1; i >= 0; i--){
            var message = conversation.messages[i];
            if(message.username == profile.username){
                var htmlStr = `<div class = "message my-message">
            <p><span class = message-user >${message.username}</span></p>
            <p><span class = message-text >${message.text}</span></p>       
            </div>`;
                
            }
            else{
                var htmlStr = `<div class = "message">
                <p><span class = message-user >${message.username}</span></p>
                <p><span class = message-text >${message.text}</span></p>  
            </div>`;        
            }
            that.chatElem.prepend(createDOM(htmlStr))        
        }
        that.chatElem.scrollTop = that.chatElem.scrollHeight - prePos;    
    }
}





ChatView.prototype.sendMessage = function() {
    var message = this.inputElem.value;
    if(message.includes('img') || message.includes('button')){
        message = message.replace(/\<+([^]+)\>/,'')
    }
    this.room.addMessage(profile.username,message);
    this.inputElem.value = "";
    
    this.socket.send(JSON.stringify({roomId:this.room.id ,text: message}))
}
var ProfileView = function() {
    var htmlString = `            <div class = "content">
    <div class = "profile-form">
        <div class = "form-field">
            <label for="username">Username: </label> 
            <input type = "text" value = "Alice">
        </div>
        <div class = "form-field">
            <label for="password">Possword: </label> 
            <input type = "password" value = "passwrod">
        </div>
        <div class = "form-field">
            <label for="image">Avatar Image: </label> 
            <input type = "file">
        </div>
        <div class = "form-field">
            <label for="image">About: </label> 
            <textarea>I am a student in UBC</textarea>
        </div>
    </div>
    <div class = "page-control">
        <form>
            <button type = "button">Save</button>
        </form>
    </div>
</div>`;
    this.elem =  createDOM(htmlString);
}
// Room class
var Room = function(id, name, image="assets/everyone-icon.png", messages=[]){
    this.id = id;
    this.name = name;
    this.image = image;
    this.messages = messages;
    this.timestamp = Date.now();
    this.getLastConversation = makeConversationLoader(this);
    this.canLoadConversation = true;
}
//Method of addMessage in Room
Room.prototype.addMessage = function(username, text) {
    if(text == "" || text.trim() == ""){
        return;
    }
    if(text.includes('img') || text.includes('button')){
        text = text.replace(/\<+([^]+)\>/,'')
    }
    var obj = {
        username: username,
        text: text
    }
    this.messages.push(obj);
    if(typeof this.onNewMessage === "function"){
        this.onNewMessage(obj);
    }
}
// Method of addConversation in Room
Room.prototype.addConversation = function(conversation){
    console.log(conversation.messages)
    conversation.messages.forEach((ele)=>{
        this.messages.push(ele)
    });
    console.log(this.messages)
    if(typeof this.onFetchConversation === "function")
        this.onFetchConversation(conversation)
}
var Lobby = function(){
    var message = [
        {
          username: "Bob",
          text: "Hi????"
        },
        {
           username: profile.username,
           text: "Hi,there"

        }
    ];
    this.rooms = {};
}
Lobby.prototype.getRoom = function(roomId) {
    
    for(var id in this.rooms){
        if(id == roomId)
            return this.rooms[id];
    }
}
Lobby.prototype.addRoom = function() {
     var newRoom = Object.create(Room.prototype); 
     Room.apply(newRoom, arguments)
     this.rooms[arguments[0]] = newRoom;
     if(typeof this.onNewRoom === "function") {
         this.onNewRoom(newRoom);
     }
}
function emptyDOM (elem){
	while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
	let template = document.createElement('template');
	template.innerHTML = htmlString.trim();
	return template.content.firstChild;
}


 // generator function
function *makeConversationLoader(room){
    var before = room.timestamp;
    while(before > 0){   
        yield new Promise((resolve, reject)=>{
            room.canLoadConversation = false;
            Service.getLastConversation(room.id, before)
            .then((result)=>{
                if(result){
                    before = result.timestamp;
                    room.canLoadConversation = true;
                    room.addConversation(result);
                    resolve(result);
                }
                else{
                    before = 0;
                    resolve(null);
                }
                    
            })  
          
        })
              
            
    }
   
}

