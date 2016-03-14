var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var async = require('async');
var randomstring = require("randomstring");
var QRS = require('qrs');
var path = require('path');
//var express = require("express");
//var app     = express();
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var bodyParser = require('body-parser');
var timeout = require('connect-timeout'); //express v4
var port = 8080;
var host = 'kn2-sns-p0001.systems.private';
var hostShort = 'kn2-sns-p0001';
var certPath = 'C:\\Users\\adm-s7729841\\Desktop\\webfiles\\kn2-sns-p0001\\';
var userDirectory = 'SYSTEMS';
var userId = 'adm-s7729841';

//app.use(app.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(timeout(600000));

var config = {
    authentication: 'certificates',
    host: host,
    useSSL: true,
    cert: certPath + 'client.pem',
    key: certPath + 'client_key.pem',
    ca: certPath + 'root.pem',
    port: 4242,
    headerKey: 'X-Qlik-User',
    headerValue: 'UserDirectory= '+ userDirectory +'; UserId= '+ userId +' '
};

var qrs = new QRS( config );

app.get('/',function(req,res){
  res.sendfile(__dirname+'/public/index1.html');
});

function WriteLog(logMsg) {
	fs.appendFile("C:\\Users\\adm-s7729841\\Desktop\\webfiles\\OnDemand.log", JSON.stringify(logMsg) + '\r\n', function(err) {
		if(err) {
			return console.log(err);
		}
	});
}

io.on('connection', function(socket) {
	var clientId = socket.id;
	console.log('client connected: ' + socket.id)

  socket.on('start', function(msg){
	  var sessionId = randomstring.generate(10);
    //console.log('message: ' + msg);
	//io.to(clientId).emit('chat message', 'started!');




// POST /login gets urlencoded bodies
//app.post('/test', function (req, resp) {
	//console.log(req.body)
	//var data = req.body;
	var data = JSON.parse(msg)
	var strategy = data.strategy;
	var secondaryStrategy = data.secondaryStrategy;
	//console.log(strategy);
	//console.log(secondaryStrategy);
	var description = '';


	var field = strategy[0].field;
	var values = strategy[0].values;
	values = values.replace(/, /g, '\n');
	description = description + 'field: ' + field + '; values: ' + values + '\n';
	//console.log(field)
	//console.log(values)

	var whereClause = '';
	var counter = 0;

	if( secondaryStrategy.length > 0 ) {
		async.each(secondaryStrategy, function(secondaryFeid, callback) {
			var miniWhere = '';
			if(counter != 0) {
				miniWhere = miniWhere + 'and ';
			}
			var f = secondaryFeid.field;
			miniWhere = miniWhere + 'match(' + f + ',' ;

			var v = secondaryFeid.values;

			v = v.replace(/, /g, "','");
			miniWhere = miniWhere + "'" + v.trim() + "') > 0 ";
			whereClause = whereClause + '' + miniWhere;
			description = description + 'field: ' + f + '; values: ' + secondaryFeid.values + '\n';
			counter++;
			callback()
		}, function(err){
			//console.log(whereClause)
		});
	} else {
		whereClause = '1 = 1';
	}

	var today = new Date();
	var mm = today.getMonth() + 1;
	var dd = today.getDate();
	var yy = today.getFullYear();

	currentHours = today.getHours();
	currentHours = ("0" + currentHours).slice(-2);
	currentMins = today.getMinutes();
	currentSec = today.getSeconds();
	currentMiliSec = today.getMilliseconds();

	var todayDate = yy+'-'+mm+'-'+dd + ' ' + currentHours + ':' + currentMins + ':' + currentSec + '.' + currentMiliSec;

	description = description + 'Created at:' + todayDate;
	//console.log(description)
//	res.send('done')
//})
//app.get('/generate/:channel',function(req,resp){
//  var channel = req.params.channel;

var r = request.defaults({
  rejectUnauthorized: false,
  host: host,
   key: fs.readFileSync(  certPath + "client_key.pem"),
   cert: fs.readFileSync( certPath + "client.pem"),
   ca: fs.readFileSync(   certPath + "root.pem")
})

var b = JSON.stringify({
  "UserDirectory": userDirectory,
  "UserId": userId,
  "Attributes": []
});


r.post({
  uri: 'https://'+ host +':4243/qps/ticket?xrfkey=abcdefghijklmnop',
  body: b,
  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'content-type': 'application/json'
  }
},
function(err, res, body) {


  var ticket = JSON.parse(body)['Ticket'];
  //console.log(ticket)
  r.get('https://'+ host +'/hub/?qlikTicket=' + ticket, function(error, response, body) {
    var cookies = response.headers['set-cookie'];
    var config = {
      host: host,
      isSecure: true,
      //origin: 'http://localhost',
      rejectUnauthorized: false,
	  //ticket: ticket,
	  identity: clientId,
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookies[0]
      }
    }

	var newDocId;
	var newDocName;

    var templateAppName = 'TiVo_Top_Programmes_Template';
    var scriptMarkerField = '§field§';
	var scriptMarkerValues = '§values§';
	var scriptSecondaryReduction = '§SecondaryReduction§'
    //var scriptReplace = channel; //req.query.q;
    var streamId = 'd3b3ebd4-4726-4bb9-9732-016da5624f4e';

    qsocks.Connect(config).then(function(global) {
		global.getDocList().then(function(reply) {
		var docId = '';
		var t = async.each(reply, function(doc, callback) {
			if( doc.qDocName == templateAppName) {
				docId = doc.qDocId;
				callback();
			} else {
				callback()
			}
		}, function(err){

		});
		return docId;

  }).then(function(docId) {
        console.log(clientId + ' --> ' + 'old app: ' + docId);
		WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'old app', value: docId, date: new Date() } );
		//io.to(clientId).emit('chat message', 'old app: ' + docId);



		newDocName = templateAppName.replace('(1)','') + '_' + randomstring.generate(7);
	return  qrs.post( 'qrs/app/' + docId + '/copy',[{"key" :"name", "value": newDocName}])

	}).then(function(results) {
        console.log(clientId + ' --> ' + 'new app: ' + results.id);
		WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'new app', value: results.id, date: new Date() } );
		io.to(clientId).emit('chat message', 'New empty app created');
        newDocId = results.id;
        return global.openDoc(newDocId)
    }).then(function(doc) {
        console.log(clientId + ' --> ' + 'Doc opened');
		WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'doc open', value: true, date: new Date() } );
		io.to(clientId).emit('chat message', 'New app opened');
        return doc.getScript().then(function(result) {
			result = result.replace(scriptMarkerValues, values);
			result = result.replace(/§field§/g, field);
			result = result.replace(scriptSecondaryReduction, whereClause);
			//console.log(result)
            return doc.setScript(result).then(function(result) {
				//console.log(scriptReplace)
                console.log(clientId + ' --> ' + 'Script replaced');
				WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'script replaced', value: true, date: new Date() } );
				io.to(clientId).emit('chat message', 'Script replaced');
                return doc;
            });
        });
	}).then(function(doc) { //"description": "test123"
		description = { "description": description };
		return doc.setAppProperties( description ).then( function(result) {
			console.log(clientId + ' --> ' + 'Doc description added');
			WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'doc description added', value: true, date: new Date() } );
			io.to(clientId).emit('chat message', 'App description added');
			return doc.doReload().then(function(result) {
				console.log(clientId + ' --> ' + 'Reload : ' + result);
				WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'reload', value: result, date: new Date() } );
				io.to(clientId).emit('chat message', 'App reloaded');
				return doc.doSave().then(function(result) {
					console.log(clientId + ' --> ' + 'Save : ' + JSON.stringify(result));
					WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'saved', value: true, date: new Date() } );
					io.to(clientId).emit('chat message', 'App saved');
					return doc;
				});
            });
        });
    }).then(function(doc) {
        return doc.publish(streamId, newDocName).then(function(result) {
			io.to(clientId).emit('chat message', 'App published');
			WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'published', value: true, date: new Date() } );
            return doc;
        }, function(err) {
			console.log(err)
		});
    }).then(function(doc) {
		//console.log('https://'+ host +'/sense/app/' + newDocId)
		//console.log('all done!');
		//io.to(clientId).emit('chat message', 'all done!');
		console.log(clientId + ' --> ' + 'https://'+ hostShort +'/sense/app/' + newDocId);
		io.to(clientId).emit('chat message', '<a target="_blank"  href="https://'+ hostShort +'/sense/app/' + newDocId + '">Open app</a>');
		WriteLog( {sessionId: sessionId, clientId: clientId, operation: 'generated', value: "https://'+ hostShort +'/sense/app/' + newDocId + '", date: new Date() } );
		global.connection.ws.close()
		//resp.send('https://'+ hostShort +'/sense/app/' + newDocId);
	})
})
})
})
//})
  });
});


http.listen(port);
console.log("Running at Port " + port);
