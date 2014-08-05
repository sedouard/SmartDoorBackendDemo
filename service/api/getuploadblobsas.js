var azure = require('azure'); 
var qs = require('qs'); 
 
var blobService; // used to communicate with blob storage service 
var containerName;     // container must exist to support photo uploads 
var accountName;       // storage account name (you create at portal) 
var accountKey;       // storage account key (generated for you) 
var blob = 'sassample' 
 
var BlobConstants = azure.Constants.BlobConstants; 
var ServiceClient = azure.ServiceClient; 
var CloudBlobClient = azure.CloudBlobClient; 

// Issued by Raspberry Pi 
// https://[you put yours here].azure-mobile.net/api/photos 
// With headers = "X-ZUMO-APPLICATION: [get the mobile servies app key from the portal]" 
// Header contains your "application key" 
 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
//  Entry point here 
// 
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
exports.get = function(request, response) { 
 
    // These are part of "App Settings" in the configuration section 
    // of your service. Shouldn't be hard-coded into this Node.js script 
    containerName = request.service.config.appSettings.PhotoContainerName; 
    accountName = request.service.config.appSettings.StorageAccountName;  
    accountKey = request.service.config.appSettings.StorageAccountKey; 
    
    console.log('containerName:' + containerName);
    console.log('accountName:' + accountName);
    console.log('accountKey:' + accountKey);
    
    // Connect to the blob service 
    blobService = azure.createBlobService(accountName, 
                        accountKey, 
                        accountName + '.blob.core.windows.net'); 
 
    createContainer(); 
    createPolicies(); 
 
    var sasResponse = GetSAS(); 
    return request.respond(201, sasResponse); 
 
} 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
// 
// 
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function GetSAS() { 
 
  var startDate = new Date(); 
  var expiryDate = new Date(startDate); 
  expiryDate.setMinutes(startDate.getMinutes() + 15); 
 
 
  var sharedAccessPolicy = { 
    AccessPolicy: { 
      Permissions: azure.Constants.BlobConstants.SharedAccessPermissions.WRITE, 
      Start: startDate, 
      Expiry: expiryDate 
    } 
  }; 
 
  var  blobService = azure.createBlobService(accountName, 
                        accountKey, 
                        accountName + '.blob.core.windows.net'); 
 
 
  var blobname = genRandNum() + '.jpg'; 
  var signature = blobService.generateSharedAccessSignature(containerName,  
    blobname, sharedAccessPolicy); 
     
  var sharedAccessSignature = new azure.SharedAccessSignature(blobService.storageAccount,  
            blobService.storageAccessKey); 
             
  blobService.authenticationProvider = sharedAccessSignature; 
  sharedAccessSignature.permissionSet = [signature]; 
   
  console.log('baseUrl = ' + signature.baseUrl); 
  console.log('path = ' + signature.path); 
  console.log('queryString = ' + encodeURIComponent(signature.queryString)); 
  console.log('queryString = ' + signature.queryString); 
   
  
  var sasResponse = { 'sasUrl': signature.baseUrl + signature.path + '?' +  
                      qs.stringify(signature.queryString),  
                      'photoId': blobname, 'expiry':expiryDate }; 
  return sasResponse; 
} 
 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
// 
// 
// Purpose: Generate a random number to use in the filename  
// 
// 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
var genRandNum = function() {  
    return Math.floor(Math.random() * 90000) + 10000;  
}  