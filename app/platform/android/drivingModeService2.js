/*global Ti */
var service = Ti.Android.currentService;
var intent = service.intent;
var teststring = intent.getStringExtra('message') + ' (instance ' + service.serviceInstanceId + ')';
Ti.App.fireEvent('test_service_fire', { message: teststring});
alert("HOLA SOY UN SERVICIO");

service.addEventListener('taskremoved', function(){
        Ti.API.info('**************************** taskremoved fired');
});
service.addEventListener('pause', function(){
    Ti.API.info('**************************** pause fired');
});
service.addEventListener('resume', function(){
    Ti.API.info('**************************** resume fired');
});
