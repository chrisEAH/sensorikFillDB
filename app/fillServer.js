var MongoClient = require('mongodb').MongoClient;
const express = require('express');
const multer = require('multer');

config={
	"host":"localhost",
	"mongoPort":"27017",
	"db":"bigChart",
	"restPort":3000,
	"dbUser":"root12",
	"dbPass":"Daten2018"
}

if(process.env.fill_monogo_host!=undefined){config.host=process.env.fill_monogo_host}
if(process.env.fill_monogo_port!=undefined){config.mongoPort=process.env.fill_monogo_port};
if(process.env.fill_monogo_db!=undefined){config.db=process.env.fill_monogo_db};
if(process.env.fill_website_port!=undefined){config.restPort=process.env.fill_website_port};
if(process.env.fill_mongo_user!=undefined){config.dbUser=process.env.fill_mongo_user};
if(process.env.fill_mongo_pw!=undefined){config.dbPass=process.env.fill_mongo_pw};

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
})
const upload = multer({storage: storage})
const app = express();
  
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/upload.html');
});

app.post('/', upload.single('file-to-upload'), (req, res)=> {
	console.log(req.file.path);
	let csvPath=req.file.path;
	let collectionName=req.file.filename.replace('.','-')+"_"+new Date().getDate()+"-"+new Date().getMonth()+"-"+new Date().getFullYear()+"-"+new Date().getHours()+":"+new Date().getMinutes();
	insertIntoMongoDB(res, collectionName, csvPath);
	res.sendFile(__dirname + '/upload.html');
});

app.listen(config.restPort, function() {
	console.log('REST-Service listening on port ' + config.restPort + '!');
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
		createIndex(dbObject, collectionName,function()
		{
			db.close();
			console.log("DONE");
		});	
	});
}


function fillServerWithThermaCamData( dbObject,  collectionName,  value)
{
	dbObject.collection(collectionName).insertMany(value, function(err, res) {
		if (err) throw err;
	});
}

function createIndex(dbObject,collectionName, callback)
{
	dbObject.collection(collectionName).createIndex("frame",function(err, res) {
		if (err) throw err;
		callback();
	})
}