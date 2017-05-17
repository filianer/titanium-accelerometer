Ti.API.info('write something ios lib');

// ACELERÓMETRO
var CoreMotion = require("ti.coremotion");
var sensor = CoreMotion.createAccelerometer();
sensor.setAccelerometerUpdateInterval(250);
sensor.startAccelerometerUpdates(function(e){
    console.log("ACCELEROMETER DATA: ",e);
});

// GPS
Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST_FOR_NAVIGATION;
Ti.Geolocation.addEventListener('location', monitorSpeed);

var contBackground = 0;

var intervalTime = setInterval(function(){
    contBackground++;
    var notification = Ti.App.iOS.scheduleLocalNotification({
    	alertBody:"Background cont: "+contBackground,
    	// alertAction:"Re-Launch!",
    	// userInfo:{"hello":"world"},
    	date:new Date(new Date().getTime())
    });
}, 1200000);

function monitorSpeed(e){
    console.log("GPS DATA: ",e);
    // console.log("GPS DRIVING MODE: ",e);
    if (!e.success || e.error ) {
    } else {
    }
}
Ti.App.addEventListener('stopService', function(){
    console.log("PARANDO ACELERÓMETRO y GPS");
    Ti.Geolocation.removeEventListener('location', monitorSpeed);
    sensor.stopAccelerometerUpdates();
    clearInterval(intervalTime);
    var notification = Ti.App.iOS.scheduleLocalNotification({
    	alertBody:"STOP SERVICE",
    	// alertAction:"Re-Launch!",
    	// userInfo:{"hello":"world"},
    	date:new Date(new Date().getTime() + 1000) // 3 seconds after backgrounding
    });
    Ti.App.currentService.stop();
});
