var MongoClient = require('mongodb').MongoClient;
const app = require('express')();
const multer = require('multer');
var server = require('http').createServer(app);

config={
	"host":"localhost",
	"mongoPort":"27017",
	"db":"bigChart",
	"restPort":3000,
}

if(process.env.fill_monogo_host!=undefined){config.host=process.env.fill_monogo_host}
if(process.env.fill_monogo_port!=undefined){config.mongoPort=process.env.fill_monogo_port};
if(process.env.fill_monogo_db!=undefined){config.db=process.env.fill_monogo_db};
if(process.env.fill_website_port!=undefined){config.restPort=process.env.fill_website_port};

server.listen(config.restPort, function() {
	console.log('Listening on port ' + config.restPort + '!');
});

var io = require('socket.io').listen(server);



var collection="";
var xCoordinate=0;
var yCoordinate=0;
 
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, 'uploads/')
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname)
	}
});

const upload = multer({storage: storage})


  
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/upload.html');
});

io.on('connection', function (socket) {
	console.log("sockt io connection");
	io.emit('message', { text: 'uplaoding...' });
});

app.post('/', upload.single('file-to-upload'), (req, res)=> {
	if(req.file==undefined)
	{
		res.sendFile(__dirname + '/upload.html');
		return 0;
	}
	console.log(req.file.path);
	res.sendFile(__dirname + '/loading.html');
	let csvPath=req.file.path;
	let collectionName=req.file.filename.replace('.','-')+"_"+(new Date().toLocaleDateString("de-DE")+ ":" + new Date().toLocaleTimeString("de-DE"));
	insertIntoMongoDB(res, collectionName, csvPath);
});


 
function insertIntoMongoDB(res, collectionName, csvPath)
{    
	mongoURL="mongodb://"+config.host+":"+config.mongoPort;
	console.log(mongoURL);
	MongoClient.connect(mongoURL,  { useNewUrlParser: true}, function(err, db){  
		if(err){ console.log( err); }  
		else{ 
				readCSV(db, res, collectionName, csvPath);
			}
	}); 
} 
    
function readCSV(db,res, collectionName, csvPath)
{	
	var dbObject=db.db(config.db);
	var frameNumber=0;
	
	var fs = require('fs');
	var lineReader = require('readline').createInterface({
		input: fs.createReadStream(csvPath)
	});


	lineReader.on('line', function (line) {
		var array = line.split(';');
		let values=new Array;
		
		
		for(i=0 ; i<array.length;i++)
		{
			if(array[i].indexOf("Frame")>-1)
			{
				collection=array[i];
				frameNumber++;
				yCoordinate=0;
				console.log("frame: "+frameNumber);
				io.emit('message', { text: "Fügt Frame: "+frameNumber+" ein." });
			}
			
			if(typeof collection !== 'undefined' && array[i].indexOf("Frame")==-1)
			{
				//if(frameNumber>=config.startFrame && frameNumber<=config.endFrame)
				//{
					values.push({temp:Number(array[i].replace(',','.')), frame:frameNumber, x: xCoordinate , y: yCoordinate});
					xCoordinate++;
				//}
			}
			
		}
		yCoordinate--;
		xCoordinate=0;

		
		//if(frameNumber>=config.startFrame && frameNumber<=config.endFrame)
		//{
			fillServerWithThermaCamData(dbObject, collectionName,values);
		//}
	});

	lineReader.on('close',()=> {
		lineReader.close();
		fs.unlink(csvPath, function (err) {
			if (err) throw err;
			console.log('File deleted!');
		});
		
		io.emit('message', { text: "Erstellt den Index..." });

		insertMaxFrameNumber(dbObject, collectionName, frameNumber, function()
		{
			createIndexFrame(dbObject, collectionName,function()
			{
				createIndexMaxFrame(dbObject, collectionName,function()
				{
					io.emit('message', { text: "Fertig" });
					db.close();
					console.log("DONE");
				});
			});	
		});
	});
}


function fillServerWithThermaCamData( dbObject,  collectionName,  value)
{
	dbObject.collection(collectionName).insertMany(value, function(err, res) {
		if (err) throw err;
	});
}

function createIndexFrame(dbObject,collectionName, callback)
{
	dbObject.collection(collectionName).createIndex({frame:1, temp:-1},function(err, res) {
		if (err) throw err;
		callback();
	});
}

function createIndexMaxFrame(dbObject,collectionName, callback)
{
	dbObject.collection(collectionName).createIndex({maxFrame:-1},function(err, res) {
		if (err) throw err;
		callback();
	});
}

function insertMaxFrameNumber(dbObject, collectionName, frameNumber, callback)
{
	dbObject.collection(collectionName).insertOne({maxFrame:frameNumber}, function(err, res) {
		if (err) throw err;
		callback();
	});
}