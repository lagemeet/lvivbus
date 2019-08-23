var Clay = require('pebble-clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig);

//Setting default geolocation accuracy if config was not saved yet
var config = JSON.parse(localStorage.getItem('clay-settings'));
if (config == null){
  var accuracy = "500";
} else {
  var accuracy = config.Accuracy;
}

//Calculate distance between geolocation and bus stop coordinates, in meters
function distance(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return Math.round(12742 * Math.asin(Math.sqrt(a)) * 1000);
}

var xhrRequest = function (url, type, callback) {

	// Perform web request
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
                callback(this.responseText);
        };
        xhr.open(type, url);
        xhr.setRequestHeader('referer', 'https://lad.lviv.ua/');
        xhr.send();
};

//Getting bus numbers and time to arrival from API and sending this to watch
function getWebdata(message) {
  // Construct URL
  var url = "https://lad.lviv.ua/api/stops/" + message;
  // Send web request
	console.log(url);
        xhrRequest(url, 'GET',
                function(responsetext) {
                  var json = JSON.parse(responsetext);
                  json = eval(json);
                  var total_items = Math.min(json.timetable.length, 7);
                  for (var i=0; i<total_items; i++) {
                    var bus = json.timetable[i];
                    var busnum = bus.time_left + ": " + bus.route;
                    var busroute = "-> " + bus.end_stop;
                    console.log(busnum + busroute);
                  
                   // Send response to Pebble
                    var dictionary = { 
                      "RESPONSE": busnum,
                      "RESPONSE_TEXT": busroute,
                      "RESPONSE_COUNT": i,
                      "TOTAL": total_items
                    };
                    console.log("Sending web response to Pebble " + i);
                    Pebble.sendAppMessage(dictionary, function(e) {
                    console.log("Web response sent to Pebble successfully!");
                  },
                  function(e) {
	            console.log("Error sending web response to Pebble!");
                  }
                  );}
                }
        );
}

//Getting nearby stops with geolocation through API and sending this to watch
function locSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  // Construct URL
  
  var url = 'https://lad.lviv.ua/api/closest?longitude=' + pos.coords.longitude + '&latitude=' + pos.coords.latitude + '&accuracy=' + accuracy;
  //var url = 'https://lad.lviv.ua/api/closest?longitude=24.0439808&latitude=49.831745&accuracy=500';
  // Send web request
	console.log(url);
        xhrRequest(url, 'GET',
                function(responsetext) {
                  var json = JSON.parse(responsetext);
                  json = eval(json);
                  var total_items = Math.min(json.length, 7);
                  for (var i=0; i<total_items; i++) {
                    var name = json[i].name;
                    var code = json[i].code;
                    console.log(name + "   " + code);
                    
                    var dist = distance(json[i].latitude,json[i].longitude,pos.coords.latitude,pos.coords.longitude);
                    //var dist = distance(json[i].latitude,json[i].longitude,"49.831745","24.0439808");
                    console.log("distance: " + dist);
                  
			              // Send response to Pebble
                    var dictionary = { 
                      "GEO_NAME": name,
                      "GEO_CODE": code + ": за " + dist + "м.",
                      "GEO_RESPONSE_COUNT": i,
                      "GEO_TOTAL": total_items
                    };
                    console.log("Sending web response to Pebble " + i);
                    Pebble.sendAppMessage(dictionary, function(e) {
                    console.log("Web response sent to Pebble successfully!");
                  },
                  function(e) {
	              console.log("Error sending web response to Pebble!");
                  }
                  );}
                }
        );
}

function locError(err) {
  if(err.code == err.PERMISSION_DENIED) {
    console.log('Location access was denied by the user.');  
  } else {
    console.log('location error (' + err.code + '): ' + err.message);
  }
}

function getGeoStops() {
  navigator.geolocation.getCurrentPosition(locSuccess, locError, {enableHighAccuracy: true});
}

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage', function(e) {
	var value = e.payload.REQUEST;
	console.log("AppMessage " + value);
	if (value == "geo"){
    getGeoStops();
  } else {
    value = value.split(':')[0]
    getWebdata(value);
  }
});
