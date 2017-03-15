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
        //var url = "http://82.207.107.126:13541/SimpleRIDE/LAD/SM.WebApi/api/stops/?code=" + message;
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
                  )}
        ;
                }
        );
}

// Listen for when the watchface is opened
Pebble.addEventListener('ready',
        function(e) {
                console.log("PebbleKit JS ready!");
		//getWebdata('status');
});

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage', function(e) {

	var value = e.payload.REQUEST;
	console.log("AppMessage " + value);
	getWebdata(value);
});
