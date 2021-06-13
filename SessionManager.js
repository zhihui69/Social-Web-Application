const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
		/* To be implemented */
		var token = crypto.randomBytes(100).toString("hex");
		const timestamp = Date.now();
		sessions[token] = {
					username: username,
					timestamp: timestamp,
					expires: timestamp + 24*3600000	
		};
		if(!maxAge)
			maxAge = CookieMaxAgeMs;
		response.cookie('cpen400a-session', token, {endcode: String, maxAge: maxAge})

		setTimeout(()=>{
			delete sessions[token]
		}, maxAge);
	};

	this.deleteSession = (request) => {
		/* To be implemented */
		var token = request.session;
        delete sessions[token]
		delete request.username;
		delete request.session;
	};

	this.middleware = (request, response, next) => {
		/* To be implemented */
		var str = "";
		if(request.headers.cookie){
			str = request.headers.cookie.toString();
			//console.log(str)
			var index = str.indexOf("cpen400a-session=")
			var cookie = "";
			if(index != -1){
				cookies = str.substring(index + 17, str.length)
				if(cookies){
					if(cookies.indexOf(';') != -1){
					  cookies = cookies.split(";")
					  for(var i = 0; i < cookies.length; i++){
						  cookie = cookies[i];
						  if(sessions[cookie]){
							  request.username = sessions[cookie].username;
							  request.session = cookie;
							  next();
							  break;
						  }
					  }
					}
					else if(sessions[cookies]){
					  request.username = sessions[cookies].username;
					  request.session = cookies;
					  next();
					}
					else {
					  next(new SessionError())	
					}		 
				}
			}
		}	
		else{
			next(new SessionError())		
		}
	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;