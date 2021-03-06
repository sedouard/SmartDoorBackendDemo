/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
//  Module references
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
var azure = require('azure');
var mongoose = require('mongoose');
var schemas = require('../shared/schemas.js');

/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
//  Constants
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
//get our service bus connection string
var connectionString = process.env.ServiceBusConnectionString;
//this task will run for 60 seconds so the initial timeout should be 60
var c_Timeout = 60;

//schemas for our database
var DoorBell = schemas.DoorBell;
var Photo = schemas.Photo;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
//  Ensures connection to MongoDB and then executes callback
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function dbConnectAndExecute(callback){
	var mongoConnectionString = process.env.MongodbConnectionString;
	var db = mongoose.connection;
	//check if we are already connected to the db
    if(db.readyState == 1){
        callback();
    } else{
		//we aren't connected to the database
        db.connect(null);
        mongoose.connect(mongoConnectionString);
        
        db.on('connect', function(){
            callback(null);
        });
        db.on('error', function(){
            callback('Could not connect to database');
        });
        
    }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
//  Entry point here 
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function doorbellListener() {
    //get the current unix time in seconds
    var date = new Date();
    var time = date.getTime();
    var startSeconds = time / 1000;

    var sb = azure.createServiceBusService(connectionString);
 	listenForMessages(c_Timeout);

    //define a function that will listen for messages on the queue for seconds number
    //of seconds
    function listenForMessages(seconds) {
        console.log('Doorbell Listener Started for timeout: ' + seconds);

        //long poll the service bus for seconds
        sb.receiveQueueMessage("smartdoorqueue", { timeoutIntervalInS: seconds }, 
            function(err, data) { 

                if(err){
                    //this path will get hit if we didn't get any messages
                    console.log(err);
                }
                else{

                    //we have recieved a message from a device
                    var ringNotification = JSON.parse(data.body);
                    console.log('recieved message from doorbell ' + ringNotification.doorBellID + ' with image link ' + ringNotification.imageUrl);

                   	//create database entry for this image
               		dbConnectAndExecute(function(err){

               			if(err){
               				console.log('could not record image to database -' + err);
               				return;
               			}

               			DoorBell.findOne({ doorBellID: ringNotification.doorBellID}, function(err, doorbell){

               				if(err){
               					return console.error(err);
               				}

               				if(doorbell === null){
               				    console.log('Doorbell not found in DB, creating a new one');
               				    //take the entire body's json. Assuming it fits into this schema
               				    var entityObject = {
               				        doorBellID : ringNotification.doorBellID,
               				        photos : []
               				    };

				                entityObject.photos.push({
				                	url : ringNotification.imageUrl,
				                	//set timestamp to current server time
				                	timestamp : ((new Date()).getTime()).toString()
				                })
				                var doorbell = new DoorBell(entityObject);

				                
               				}
               				else{
               					//we already have this device in the database. add a picture
               					doorbell.photos.push({
				                	url : ringNotification.imageUrl,
				                	//set timestamp to current server time
				                	timestamp : ((new Date()).getTime()).toString()
				                });
               				}

               				//commit changes to db
               				doorbell.save(function (err, entity) {
			                	if(err){
			                		return console.error(err);
			                	}

			                    console.log('sucessfully created new entity for: ' + entity);
			                    return;
			                });
               			});
               		});
                }

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
				// 
				//  Continues the 'loop' of polling the service bus until this task is over
				// 
				/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
                function continueListeningForMessages(){

                   //go back and listen for more message for the duration of this task
                   var currentDate = new Date();
                   var currentSeconds = currentDate.getTime() / 1000;

                   console.log('currentSeconds ' + currentSeconds);
                   console.log('startSeconds ' + startSeconds);

                   //compute the seconds between when we started this scheduled task and now.
                   //this is the time that we will long-poll the service bus.
                   var newTimeout = Math.round((c_Timeout - (currentSeconds - startSeconds)));
                   if(newTimeout > 0){
                       //note: the recieveQueueMessage function takes ints no decimals!!
                       listenForMessages(newTimeout);
                   }

                }

                continueListeningForMessages();   
            }
        ); 
	}
}