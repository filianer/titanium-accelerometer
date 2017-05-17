var Vector3d = require('vector3d');
var sensor = require('com.geraudbourdin.sensor');
// abilitamos sensores de aceleración lineal y gravedad
sensor.setSensor(sensor.TYPE_LINEAR_ACCELERATION);
sensor.setSensor(sensor.TYPE_GRAVITY);

var prevX = 0, prevY = 0, prevZ = 0, prevRv = null;
var curX = 0, curY = 0, curZ = 0;

//contadores
var aceleraciones = 0;
var frenadas = 0;
var choques = 0;

var limitTime = 100; // cogerá 10 muestras por segundo (1 cada 100 milisegundos)

var g = 9.80665;
var min_movement = 0.5 * g;
var max_movement = 2 * g;
$.finalMovement.text = "Movement set: "+min_movement;

$.inputTime.value = limitTime/1000;
$.inputMove.value = 0.5;

var vectorIni = new Vector3d(0,g,0); //vector inicial (el movil está completamente vertical)
var vectorGravity = new Vector3d(0, g, 0);
var lastUpdateTime = new Date();
var rotateAngle = 0;
var grados = 0;
var filterMin = 0.1;

//mantenemos la pantalla encendida
if ( OS_ANDROID ) {
    $.prueba2.keepScreenOn = true;
} else {
    Ti.App.idleTimerDisabled = true;
}

/**
 * Filtra los valores que oscilen entre -filter y filter
 */
function filter(v){
    return ( v > (filterMin * -1) && v < filterMin ) ? 0 : v;
}

function calculateVectorModule(x,y,z,x2,y2,z2) {
    return Math.sqrt(Math.pow(x - (x2 || 0),2) + Math.pow(y - (y2 || 0),2) + Math.pow(z - (z2 || 0),2));
}

var accelerometerCallback = function(e) {
    var timeNow = new Date();
	$.labelTimestamp.text = 'timestamp: ' + timeNow.getTime();

    curX = filter(e.x);
	curY = filter(e.y);
	curZ = filter(e.z);

    $.labelx.text = 'x: ' + curX;
	$.labely.text = 'y: ' + curY;
	$.labelz.text = 'z: ' + curZ;

    if ( (curX || curY || curZ) && (timeNow.getTime() - lastUpdateTime.getTime()) >= limitTime ) {
        lastUpdateTime = timeNow;

        var currentVector = new Vector3d(e.x,e.y,e.z);
        //sacamos módulo que nos dará la aceleración
        var currentAcceleration =  currentVector.length();
        $.respVertical.text = currentAcceleration;
        console.log("currentAcceleration: ",currentAcceleration);

        //rotamos vector
        var normalizeVector = currentVector.rotateAround(vectorIni, rotateAngle);

        if (currentAcceleration > min_movement ) {

            console.log("GRADOS: ",grados);
            console.log("ORIGINAL VECTOR: ",currentVector);
            console.log("NORMALICE VECTOR: ",normalizeVector);
            //calculamos angulo rotado para depurar
            console.log("GRADOS ROTADOS:",normalizeVector.angleTo(currentVector) * (180/Math.PI));

            //calculamos ángulo respecto a la toma anterior, si es < 90 será aceleración y si es mayor será frenada
            var gr = normalizeVector.angleTo(new Vector3d(prevX, prevY, prevZ)) * (180/Math.PI);
            console.log("GRADOS ROTADOS respecto anterior:",gr);
            $.angle2.text = "Ángulo respecto anterior: "+gr;

            if ( currentAcceleration < max_movement ) {
                if ( gr < 90 ) {
                    console.log("--ACELERACIÓN--");
                    aceleraciones++;
                    $.aceleraciones.text = aceleraciones;
                } else {
                    console.log("-_-FRENADA-_-");
                    frenadas++;
                    $.frenadas.text = frenadas;
                }
            } else {
                if ( gr > 90 ) {
                    console.log("***CHOQUE***");
                    choques++;
                    $.choques.text = choques;
                }
            }
        }

        prevX = normalizeVector.x;
        prevY = normalizeVector.y;
        prevZ = normalizeVector.z;
    }
};

/**
 * Setea el nuevo vector de gravedad y el ángulo de rotación respecto a nuestro vector inicial
 * @param {[type]} e [description]
 */
function setGravity(e){
    // console.log("GRAVITY: ",e);
    vectorGravity.x = e.x;
    vectorGravity.y = e.y;
    vectorGravity.z = e.z;
    rotateAngle = vectorIni.angleTo(vectorGravity);

    //esto no hace falta, es por mostrar en la pantalla
    grados = rotateAngle * (180/Math.PI);
    $.angle.text = "Angle: "+grados;
}

/**
 * Controlador de sensores, determina el tipo de sensor y llama al método correspondiente
 */
var sensorsCallback = function(e) {
    switch (e.sType) {
        case sensor.TYPE_GRAVITY:
            // console.log("SENSOR GRAVITY: ",e);
            setGravity(e);
            break;
        case sensor.TYPE_LINEAR_ACCELERATION:
            // console.log("SENSOR ACCELEROMETER: ",e);
            accelerometerCallback(e);
            break;
    }
};

/**
 * Cuando cerramos o perdemos el foco paramos los listeners
 */
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== -1 ){
    alert('Accelerometer does not work on a virtual device');
} else {
    $.prueba2.addEventListener("blur", function(e) {
        sensor.removeEventListener('update', sensorsCallback);
    });
    $.prueba2.addEventListener("close", function(e) {
        sensor.removeEventListener('update', sensorsCallback);
    });
}

/**
 * Setea los nuevos valores para el tiempo mínimo y aceleración
 */
function setValues(e){
    limitTime = parseFloat($.inputTime.value)*1000;
    min_movement = parseFloat($.inputMove.value) * g;
    $.finalMovement.text = "Movement set: "+min_movement;
}

var on = false;
/**
 * Apaga o enciende el listener
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function changeStart(e){
    if ( on ) {
        on = false;
        sensor.removeEventListener('update', sensorsCallback);
        $.on.title = "ENCENDER";
    } else {
        on = true;
        sensor.addEventListener('update', sensorsCallback);
        $.on.title = "APAGAR";
    }
}



function close(e){
    $.prueba2.fireEvent('cancel');
}

/**
 * Limpia los valores de aceleraciones, frenadas y choques
 */
function clear(e){
    aceleraciones = 0;
    frenadas = 0;
    choques = 0;
    $.choques.text = "0";
    $.aceleraciones.text = "0";
    $.frenadas.text = "0";
}
