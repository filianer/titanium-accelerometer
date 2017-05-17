$.index.open();

var last_update = 0, last_movement = 0, last_movement_x = 0, last_movement_y = 0;
var prevX = 0, prevY = 0, prevZ = 0;
var curX = 0, curY = 0, curZ = 0;

var limitTime = 500000000;
var g = 9.80665;
var min_movement = 0.5 * g;
$.finalMovement.text = "Movement set: "+min_movement;
var firstAd = false;

//mantenemos la pantalla encendida
if ( OS_ANDROID ) {
    $.index.keepScreenOn = true;
} else {
    Ti.App.idleTimerDisabled = true;
}

var accelerometerCallback = function(e) {
	var current_time = e.timestamp; // en nanosegundos
	$.labelTimestamp.text = 'timestamp: ' + e.timestamp;
    // console.log("timestamp: ",e.timestamp);

	curX = e.x;
	curY = e.y;
	curZ = e.z;

    $.labelx.text = 'x: ' + curX;
	$.labely.text = 'y: ' + curY;
	$.labelz.text = 'z: ' + curZ;

	if ( prevX === 0 && prevY === 0 && prevZ === 0 ) {
		last_update = current_time;
		prevX = curX;
		prevY = curY;
		prevZ = curZ;
	}

	var time_difference = current_time - last_update;

	if ( time_difference >= limitTime ) {
        last_update = current_time;

        console.log("DIFERENCE: ",time_difference);
        //calculamos módulo
        var m1 =  Math.sqrt( Math.pow(curX,2) + Math.pow(curY,2) + Math.pow(curZ,2) );
        var m2 =  Math.sqrt( Math.pow(prevX,2) + Math.pow(prevY,2) + Math.pow(prevZ,2) );
        prevX = curX;
		prevY = curY;
		prevZ = curZ;
        // var movement = Math.sqrt( Math.pow((curX - prevX),2) + Math.pow((curY - prevY),2) + Math.pow((curZ - prevZ),2) );
        var movement = m1 - m2;
        $.movement.text = "Movement: "+movement;

        var ch1 = Ti.UI.createView({
            height: Math.abs(m1) + 20,
            width:Ti.UI.SIZE,
            borderWidth:1,
            borderColor:"#212121",
            bottom:0,
            backgroundColor: "#1976D2"
        });
        ch1.add(Ti.UI.createLabel({
            text: Math.round( m1 * 10 ) / 10,
            color:"white",
            left:2,
            right:2
        }));

        $.chart.add(ch1);


		// console.log("movement: ",movement);
	    var ch = Ti.UI.createView({
            height: Math.abs(movement) + 20,
            width:Ti.UI.SIZE,
            borderWidth:1,
            borderColor:"#212121",
            bottom:0,
            backgroundColor: movement > min_movement ? "#43A047" : (movement < (min_movement * -1)) ? "#D84315" : "#757575"
        });
        var la = Ti.UI.createLabel({
            text: Math.round( movement * 10 ) / 10,
            color:"white",
            left:2,
            right:2
        });
        ch.add(la);
        ch.addEventListener('click', function(){
            alert(movement);
        });
		$.chart.add(ch);
        $.chart.scrollToBottom();

        if (movement > min_movement) {
                $.respVertical.text = "ACELERACIÓN BRUSCA";
                setTimeout(function(){
                    $.respVertical.text = "";
                }, 1000);
		} else if ( movement < (min_movement * -1) ) {
            $.respHorizontal.text = "FRENADA BRUSCA";
            setTimeout(function(){
                $.respHorizontal.text = "";
            }, 1000);
        }


	}
};

if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== -1 ){
    alert('Accelerometer does not work on a virtual device');
} else {
    $.index.addEventListener("blur", function(e) {
        Ti.Accelerometer.removeEventListener('update', accelerometerCallback);
    });
    $.index.addEventListener("close", function(e) {
        Ti.Accelerometer.removeEventListener('update', accelerometerCallback);
    });
    // $.index.addEventListener("focus", function(e) {
    //     Ti.Accelerometer.addEventListener('update', accelerometerCallback);
    // });
}

function setValues(e){
    limitTime = parseFloat($.inputTime.value)*1000000;
    min_movement = parseFloat($.inputMove.value) * g;
    $.finalMovement.text = "Movement set: "+min_movement;
}

var on = false;
function changeStart(e){
    if ( on ) {
        on = false;
        Ti.Accelerometer.removeEventListener('update', accelerometerCallback);
        $.on.title = "ENCENDER";
    } else {
        on = true;
        Ti.Accelerometer.addEventListener('update', accelerometerCallback);
        $.on.title = "APAGAR";
    }

}

function clean(e){
    on = false;
    Ti.Accelerometer.removeEventListener('update', accelerometerCallback);
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
        }
    });
    dialog.show();
}

function prueba2(e){
    var main = Alloy.createController('prueba2').getView();
    main.addEventListener('cancel', function(){
        main.close();
    });
    main.open();
}
