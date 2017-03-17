var Clay = require('pebble-clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig);

var config = JSON.parse(localStorage.getItem('clay-settings'));
if (config == null){
  var accuracy = "500";
} else {
  var accuracy = config.Accuracy;
}
  


var xhrRequest = function (url, type, callback) {

	// Perform web request
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
                callback(this.responseText);
        };
        xhr.open(type, url);
        xhr.send();
};

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
                  
			              // Send response to Pebble
			              var dictionary = { 
                      "GEO_NAME": name,
                      "GEO_CODE": code,
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
    getWebdata(value);
  }
});
