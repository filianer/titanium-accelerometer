var Vector3d = require('vector3d');
var mapsUtils = require('mapsUtils');
var sensor = null;

var intentService = null;

var limitTime = 50; // cogerá 20 muestras por segundo (1 cada 50 milisegundos)
var G = 9.80665;
var min_movement = 0.5 * G; //mínimo movimiento que hará saltar las alertas
var max_movement = 2 * G; //máximo movimiento, a partir de aquí se detectará choque
var maxAccelerations = 20; //tamaño del array para obtener la media de las aceleraciones
var accelerations = []; //array para almacenar las aceleraciones y calcular la media
var maxCurrentAcceleration = 0; //aceleración máxima detectada actualmente
var maxAverageAcceleration = 0; //aceleración máxima detectada en la media
var inAverageMode = false; //modo average, para controlar cuando termina de mostrar valores de media
var inCurrentMode = false; //modo current, para controlar cuando termina de mostrar valores de current
var MODE_CURRENT = 1; //Modo actual
var MODE_AVERAGE = 2; //Modo media
var MODE_SEPARATOR = 3; //Modo separador para insertar un separador cuando pasa de un modo a otro

//contadores
var aceleraciones = 0;
var frenadas = 0;
var choques = 0;
var bruscoMedia = 0;
var bruscoCurrent = 0;

$.finalMovement.text = "Movement set: "+min_movement;
$.inputTime.value = maxAccelerations;
$.inputMove.value = 0.5;
var lastUpdateTime = new Date();

var timeout = null;
var timeoutA = null;
var timeIniAverage = null;
var timeFinAverage = null;

/**
 * Cuando cerramos o perdemos el foco paramos los listeners
 */
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== -1 ){
    alert('Accelerometer does not work on a virtual device');
} else {
    $.win.addEventListener("blur", function(e) {
        console.log("BLUR WIN");
        //incializaremos los servicios cuando se minimice la app, ver como detectar eso
        initServices();
        stopSensors();
    });
    $.win.addEventListener("close", function(e) {
        console.log("CLOSE WIN");
        stopSensors();
    });
    $.win.addEventListener("focus", function(e) {
        console.log("FOCUS WIN");
        Ti.App.fireEvent('stopService');
        startSensors();
    });
    $.win.addEventListener('open', function(){
        //en ios arrancaremos los servicios al empezar ya que solo se disparan cuando la app se va a segundo plano
        //en android se disparan cuando los creamos, por eso lo inicializaremos cuando minimicemos la App
        //TODO ver como controlar eso
        if ( OS_IOS ) {
            require('ios-lib').initPush();
            initServices();
        }
    });

    if ( OS_IOS ) {
        Titanium.App.addEventListener('pause', function(){
            stopSensors();
        });
        Titanium.App.addEventListener('resumed', function(){
            Ti.App.fireEvent('stopService');
            startSensors();
        });
        sensor = require("ti.coremotion").createAccelerometer();
        //mantenemos pantalla encendida
        Ti.App.idleTimerDisabled = true;
    } else {
        // abilitamos sensores de aceleración lineal y gravedad
        sensor = require('com.geraudbourdin.sensor');
        //mantenemos pantalla encendida
        $.win.keepScreenOn = true;

        intentService = Titanium.Android.createServiceIntent({
            url: 'drivingModeService.js'
        });
        // Service should run its code every 2 seconds.
        // intentService.putExtra('interval', 2000);
        // A message that the service should 'echo'
        intentService.putExtra('message', 'Probandoo!');
    }
}


/**
 * Inicializa los servicios de background
 */
function initServices(){
    if ( OS_ANDROID ) {

        if (!Ti.Android.isServiceRunning(intentService)) {
            Ti.Android.startService(intentService);
        } else {
            Ti.API.info('Service is already running.');
        }
    } else {
        Ti.App.fireEvent('stopService');
        var service = Ti.App.iOS.registerBackgroundService({url:'drivingModeService.js'});
    }
}

/**
 * Inicia los servicios de acelerómetro y gps
 */
function startSensors(){
    // GPS
    mapsUtils.locationPermissions(function(ok){
        if ( ok ) {
            addMonitorSpeed();
        }
    });

    // ACELERÓMETRO
    if ( OS_IOS ) {
        sensor.setAccelerometerUpdateInterval(250);
        sensor.startAccelerometerUpdates(function(e){
            if ( e.acceleration ) accelerometerCallback(e.acceleration);
        });
    } else {
        sensor.setSensor(sensor.TYPE_LINEAR_ACCELERATION);
        sensor.addEventListener('update', sensorsCallback);
    }

    on = true;
    $.on.title = "APAGAR";
}

/**
 * Para los servicios de acelerómetro y gps
 */
function stopSensors(){
    Ti.Geolocation.removeEventListener('location', monitorSpeed);
    if ( OS_ANDROID ) sensor.removeEventListener('update', sensorsCallback);
    else sensor.stopAccelerometerUpdates();
    on = false;
    $.on.title = "ENCENDER";
}

/**
 * Añadimos monitor para obtener datos del gps
 */
function addMonitorSpeed(){
    if ( OS_ANDROID ) {
        var providerGps = Ti.Geolocation.Android.createLocationProvider({
            name: Ti.Geolocation.PROVIDER_GPS,
            minUpdateDistance: 0,
            minUpdateTime: 0 //minimo tiempo de actualización de 0s
        });
        Ti.Geolocation.Android.addLocationProvider(providerGps);
        Ti.Geolocation.Android.manualMode = true;
    } else {
        Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST_FOR_NAVIGATION;
    }
    Ti.Geolocation.addEventListener('location', monitorSpeed);
}

function monitorSpeed(e){
    console.log("E: ",e);
    // console.log("GPS DRIVING MODE: ",e);
    if (!e.success || e.error ) {

    } else {
        if ( e && e.coords && e.coords.speed !== undefined && e.coords.speed !== null && e.coords.speed > -1 ) {
            $.speed.text = e.coords.speed + " km/h";
        }
    }
}

var accelerometerCallback = function(e) {
    var timeNow = new Date();
    console.log("ACCELERATION: ",e);
    $.labelTimestamp.text = 'timestamp: ' + (timeNow.getTime() - lastUpdateTime.getTime());
    lastUpdateTime = timeNow;
    // if ( (timeNow.getTime() - lastUpdateTime.getTime()) >= limitTime ) {
    	// $.labelTimestamp.text = 'timestamp: ' + timeNow.getTime();

        setLabelValue(e.x, $.labelx, $.labelxdecimal);
        setLabelValue(e.y, $.labely, $.labelydecimal);
        setLabelValue(e.z, $.labelz, $.labelzdecimal);

        var currentVector = new Vector3d(e.x,e.y,e.z);
        var currentAcceleration =  currentVector.length();
        setLabelValue(currentAcceleration, $.labela, $.labeladecimal);

        if ( currentAcceleration > maxCurrentAcceleration ) {
            // if ( timeout ) clearTimeout(timeout);
            maxCurrentAcceleration = currentAcceleration;
            setLabelValue(maxCurrentAcceleration, $.labelm, $.labelmdecimal);
            // timeout = setTimeout(function(){
            //     maxCurrentAcceleration = 0;
            // }, 10000);
        }

        if ( accelerations.length == maxAccelerations ) {
            accelerations.splice(0, 1);
        }
        accelerations.push(e);

    // if ( (timeNow.getTime() - lastUpdateTime.getTime()) >= limitTime ) {


        var averageAccelerationVector = checkAverageAccelerations();
        var averageAcceleration = averageAccelerationVector.length();

        setLabelValue(averageAcceleration, $.labelam, $.labelamdecimal);

        if ( averageAcceleration > maxAverageAcceleration ) {
            // if ( timeoutA ) clearTimeout(timeoutA);
            maxAverageAcceleration = averageAcceleration;
            setLabelValue(maxAverageAcceleration, $.labelmm, $.labelmmdecimal);
            // timeoutA = setTimeout(function(){
            //     maxAverageAcceleration = 0;
            // }, 10000);
        }

        if ( averageAcceleration > min_movement ) {
            inCurrentMode = false;
            addCol(averageAcceleration, MODE_AVERAGE);
            if ( !inAverageMode ) {
                $.timeClearAverage.text = "";
                timeIniAverage = timeNow.getTime();
                maxAverageAcceleration = averageAcceleration;
                inAverageMode = true;
                bruscoMedia++;
                $.frenadas.text = bruscoMedia;
            }
        } else if ( currentAcceleration > min_movement ) {
            if ( inAverageMode ) checkTimeAverage(timeNow.getTime());
            inAverageMode = false;
            addCol(currentAcceleration, MODE_CURRENT);
            if ( !inCurrentMode ){
                maxCurrentAcceleration = currentAcceleration;
                inCurrentMode = true;
                bruscoCurrent++;
                $.aceleraciones.text = bruscoCurrent;
            }
        } else {
            if ( inAverageMode ) checkTimeAverage(timeNow.getTime());
            if ( inCurrentMode || inAverageMode ) {
                addCol(null, MODE_SEPARATOR);
            }
            inCurrentMode = false;
            inAverageMode = false;
        }
    // }
};

function checkTimeAverage(time){
    $.timeClearAverage.text = "time clear average: "+(time - timeIniAverage);
}

function setLabelValue(value, label, labelDecimal){
    var round = (Math.round(value * 100) / 100).toString();
    label.text = round.split('.')[0];
    labelDecimal.text = round.split('.')[1] || '00';
}

function checkAverageAccelerations(){
    var avx = 0;
    var avy = 0;
    var avz = 0;
    _.each(accelerations, function(ac){
        avx += ac.x;
        avy += ac.y;
        avz += ac.z;
    });

    var mx = avx/maxAccelerations;
    var my = avy/maxAccelerations;
    var mz = avz/maxAccelerations;
    setLabelValue(mx, $.labelxm, $.labelxmdecimal);
    setLabelValue(my, $.labelym, $.labelymdecimal);
    setLabelValue(mz, $.labelzm, $.labelzmdecimal);

    return new Vector3d(mx, my, mz);
}


/**
 * Controlador de sensores, determina el tipo de sensor y llama al método correspondiente
 */
var sensorsCallback = function(e) {
    switch (e.sType) {
        case sensor.TYPE_LINEAR_ACCELERATION:
            // console.log("SENSOR ACCELEROMETER: ",e);
            accelerometerCallback(e);
            break;
    }
};



/**
 * Setea los nuevos valores para el tiempo mínimo y aceleración
 */
function setValues(e){
    maxAccelerations = parseInt($.inputTime.value);
    accelerations = [];
    min_movement = parseFloat($.inputMove.value) * G;
    $.finalMovement.text = "Movement set: "+min_movement;
    alert('Nuevos valores seteados');
}

var on = false;
/**
 * Apaga o enciende el listener
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function changeStart(e){
    if ( on ) stopSensors();
    else startSensors();
}

function addCol(value, mode){
    if ( OS_ANDROID ) {
        var ch1 = Ti.UI.createView({
            height: Math.abs(value) + 20,
            width:mode == MODE_SEPARATOR ? 5:Ti.UI.SIZE,
            borderWidth:mode == MODE_SEPARATOR ? 0:1,
            borderColor:"#212121",
            bottom:0,
            backgroundColor: mode == MODE_CURRENT ? "#1976D2" : mode == MODE_AVERAGE ? "#E64A19" : "#FFFFFF"
        });
        if ( value ) {
            ch1.add(Ti.UI.createLabel({
                text: Math.round( value * 10 ) / 10,
                color:"white",
                // left:2,
                // right:2
            }));
        }

        $.chart.add(ch1);
        $.chart.scrollToBottom();
    }
}

function clean(e){
    on = false;
    stopSensors();
    $.on.title = "ENCENDER";

    var dialog = Ti.UI.createAlertDialog({
        cancel: 1,
        buttonNames: ["Limpiar", "Cancelar"],
        message: "¿Seguro que deseas limpiar todos los datos?",
        title: "Alerta",
        persistent: true
    });
    dialog.addEventListener('click', function(e) {
        if (e.index === 0) {
            var children = $.chart.children.slice(0);

            for (var i = 0; i < children.length; ++i) {
                $.chart.remove(children[i]);
            }

            accelerations = [];
            aceleraciones = 0;
            frenadas = 0;
            choques = 0;
            bruscoMedia = 0;
            bruscoCurrent = 0;
            $.aceleraciones.text = "0";
            $.frenadas.text = "0";
            maxCurrentAcceleration = 0;
            maxAverageAcceleration = 0;
            setLabelValue(0, $.labelm, $.labelmdecimal);
            setLabelValue(0, $.labelmm, $.labelmmdecimal);
            $.timeClearAverage.text = "";
        }
    });
    dialog.show();
}

$.win.open();
