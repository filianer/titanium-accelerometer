Ti.API.info('write something android');
/*global Ti */
var service = Ti.Android.currentService;
var intent = service.getIntent();
var teststring = intent.getStringExtra('message') + ' (instance ' + service.serviceInstanceId + ')';
Ti.App.fireEvent('test_service_fire', { message: teststring});
// alert("HOLA SOY UN SERVICIO");

// ACELERÓMETRO
sensor = require('com.geraudbourdin.sensor');
sensor.setSensor(sensor.TYPE_LINEAR_ACCELERATION);
sensor.addEventListener('update', sensorsCallback);

// GPS
var providerGps = Ti.Geolocation.Android.createLocationProvider({
    name: Ti.Geolocation.PROVIDER_GPS,
    minUpdateDistance: 0,
    minUpdateTime: 0 //minimo tiempo de actualización de 0s
});
Ti.Geolocation.Android.addLocationProvider(providerGps);
Ti.Geolocation.Android.manualMode = true;
Ti.Geolocation.addEventListener('location', monitorSpeed);

var contBackground = 0;

var intervalTime = setInterval(function(){
    contBackground++;
    // Create the notification
    var notification = Titanium.Android.createNotification({
        // icon is passed as an Android resource ID -- see Ti.App.Android.R.
        // icon: Ti.App.Android.R.drawable.my_icon,
        contentTitle: 'CONT: '+contBackground,
        contentText : 'sigo vivo!'
    });

    // Send the notification.
    Titanium.Android.NotificationManager.notify(1, notification);
}, 10000);

function sensorsCallback(e){
    console.log("SENSOR DATA: ",e);
}
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
    sensor.removeEventListener('update', sensorsCallback);
    clearInterval(intervalTime);
    service.stop();
});
