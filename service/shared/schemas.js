//get config settings from azure mobile config dashboard page

var mongoose = require('mongoose');
var connectionString = process.env.MongodbConnectionString;

//when this module loaded we will automatically connect to mongodb
mongoose.connect(connectionString);

var photoSchema = mongoose.Schema({
                url : String,
                timestamp: String
            });
var doorbellSchema = mongoose.Schema({
            doorBellID: String,
            photos: [photoSchema]
        });

var Photo = mongoose.model('Photo', photoSchema)
var DoorBell = mongoose.model('DoorBell', doorbellSchema);

//expose these schemas
exports.DoorBell = DoorBell;
exports.Photo = Photo;