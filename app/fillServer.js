var MongoClient = require('mongodb').MongoClient;
var Spinner = require('cli-spinner').Spinner;
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
if(process.env.fill_rest_port!=undefined){config.restPort=process.env.fill_rest_port};
if(process.env.fill_rest_user!=undefined){config.dbUser=process.env.fill_rest_user};
if(process.env.fill_rest_pw!=undefined){config.dbPass=process.env.fill_rest_pw};


 
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
  
app.get('/upload', (req, res) => {
	res.sendFile(__dirname + '/upload.html');
});

app.post('/upload', upload.single('file-to-upload'), (req, res)=> {
	console.log(req);
	config.csvPath=req.file.path;
	config.collectionName=req.file.filename+"_"+new Date().getDate()+"-"+new Date().getMonth()+"-"+new Date().getFullYear()+"-"+new Date().getHours()+":"+new Date().getMinutes();
	console.log(config.collectionName);
	insertIntoMongoDB(res);
	res.sendFile(__dirname + '/upload.html');
});

app.listen(config.restPort, function() {
	console.log('REST-Service listening on port ' + config.restPort + '!');
});



var spinner = new Spinner('Insert Values in DB.. %s');
 
var collection="";
var xCoordinate=0;
var yCoordinate=0;


function insertIntoMongoDB(res)
{    
	MongoClient.connect("mongodb://"+config.dbUser+":"+config.dbPass+"@"+config.host+":"+config.mongoPort+"/?authMechanism=DEFAULT&authSource=db",  { useNewUrlParser: true }, function(err, db){  
		if(err){ console.log( err); }  
		else{ 
				readCSV(db, res);
			}
	}); 
} 
    
function readCSV(db,res)
{	
	var dbObject=db.db(config.db);
	var frameNumber=0;
		
		
	var fs = require('fs');
	var lineReader = require('readline').createInterface({
		input: fs.createReadStream(config.csvPath)
	});


	lineReader.on('line', function (line) {
		var array = line.split(';');
		let values=new Array;
		
		
		for(i=0; i<array.length;i++)
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
					values.push({temp:array[i].replace(',','.'), frame:frameNumber, x: xCoordinate , y: yCoordinate});
					xCoordinate++;
				//}
			}
			
		}
		yCoordinate++;
		xCoordinate=0;

		
		//if(frameNumber>=config.startFrame && frameNumber<=config.endFrame)
		//{
			fillServerWithThermaCamData(dbObject, config.collectionName,values);
		//}
	});

	lineReader.on('close',()=> {
			db.close();
			spinner.stop();
			console.log("DONE");
		});
}


function fillServerWithThermaCamData( dbObject,  collectionName,  value)
{
	dbObject.collection(collectionName).insertMany(value, function(err, res) {
		if (err) throw err;
	});
}