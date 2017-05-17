var mapsUtils = {

    /**
     * Calcula la distancia en kilometros entre 2 puntos
     * @return {[number]}        [kilómetros o de distancia]
     */
    distanceTwoPoints: function(lat1, lon1, lat2, lon2){
        "use strict";
        // console.log("LAT1: ",lat1);
        // console.log("LON1: ",lon1);
        // console.log("LAT2: ",lat2);
        // console.log("LON2: ",lon2);
        Number.prototype.toDeg = function() {
            return this * 180 / Math.PI;
        };

        var R = 6371; // km de radio de la tierra
        var dLat = this.toRad(lat2-lat1);
        var dLon = this.toRad(lon2-lon1);
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;

        // Ti.API.debug("km " + d);
        // Ti.API.debug("miles " + d/1.609344);
        return d;
    },

    toRad: function(n){
        return n * Math.PI / 180;
    },

    /**
     * Devuelve una región a partir de una latitud y una longitud
     */
    regionFrom: function(lat, lon, accuracy) {
        "use strict";
        var oneDegreeOfLongitudeInMeters = 111.32 * 1000;
        var circumference = (40075 / 360) * 1000;

        var latDelta = accuracy * (1 / (Math.cos(lat) * circumference));
        var lonDelta = (accuracy / oneDegreeOfLongitudeInMeters);

        return {
            latitude: lat,
            longitude: lon,
            latitudeDelta: Math.max(0, latDelta),
            longitudeDelta: Math.max(0, lonDelta)
        };
    },

    /**
     * Devuelve latitud, longitud, deltas de un array de puntos
     * Que será la región mínima que comprenda todos los puntos
     * Los puntos deben ser un array de {lat,log}
     */
    getRegionForCoordinates: function(points) {
        "use strict";

        //inicializamos con el primer punto
        var minX = points[0].latitude;
        var maxX = points[0].latitude;
        var minY = points[0].longitude;
        var maxY = points[0].longitude;

        // calculate rect
        _.map(points, function(point){
            minX = Math.min(minX, point.latitude);
            maxX = Math.max(maxX, point.latitude);
            minY = Math.min(minY, point.longitude);
            maxY = Math.max(maxY, point.longitude);
        });

        var midX = (minX + maxX) / 2;
        var midY = (minY + maxY) / 2;
        var offsetDistance = 0.7; //TODO comprobar comportamiento, esto es para que deje un margen y ver mejor los dos puntos, a menor malor, más margen
        var deltaX = points.length > 1 ? ((maxX - minX)/offsetDistance):0.002;
        var deltaY = points.length > 1 ? ((maxY - minY)/offsetDistance):0.002;

        return {
            latitude: midX,
            longitude: midY,
            latitudeDelta: deltaX,
            longitudeDelta: deltaY
        };
    },

    /**
     * Retorna -1 si los servicios de ubicación no están habilitados
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    getUserLocation: function(callback, accuary, distanceFilter) {
        "use strict";
        var permissions = require('permissions');
        // Use library to handle run-time permissions
        permissions.requestLocationPermissions(Ti.Geolocation.AUTHORIZATION_WHEN_IN_USE, function(e) {

            if (!e.success) {
                //comprobamos cuando le hemos mostrado el último aviso
                // In some cases the library will already have displayed a dialog, in other cases we receive a message to alert
                if (e.error) alert(e.error);
                callback(null);
            } else {
                // Ti.Geolocation.accuracy = accuary || Titanium.Geolocation.ACCURACY_HIGH;
                // if ( OS_IOS && distanceFilter ) Ti.Geolocation.distanceFilter = distanceFilter;

                // Get our current position
                Ti.Geolocation.getCurrentPosition(function(e) {
                    // FIXME: https://jira.appcelerator.org/browse/TIMOB-19071
                    if (!e.success || e.error) {
                        console.log("ERROR GPS: ",e);
                        //comprobamos si tenemos los servicios de localización activados
                        if ( !Ti.Geolocation.locationServicesEnabled ) {
                            callback(-1);
                            // if ( OS_ANDROID ) {

                                //levantamos diálogo para ver si quiere activar el gps
                                // var alertDialog = Titanium.UI.createAlertDialog({
                                //     title:L('attention'),
                                //     message:L('activeGps'),
                                //     buttonNames: [L('action_accept'), L('cancel')],
                                // });
                                // alertDialog.addEventListener('click', function(e) {
                                //     if (e.index === 0) {
                                //         var intent = Ti.Android.createIntent({action:"android.settings.LOCATION_SOURCE_SETTINGS"});
                                //         Ti.Android.currentActivity.startActivityForResult(intent, function(e){
                                //             console.log("RETORNO ACTIVITY");
                                //             console.log("RESULT ACTIVITY: ",e);
                                //         });
                                //
                                //         callback(null);
                                //     } else {
                                //         callback(null);
                                //     }
                                // });
                                // alertDialog.show();
                            // } else {
                            //     alert(L('error_my_location_disabled'));
                            //     callback(null);
                            // }
                        } else {
                            // alert(L('error_my_location'));
                            callback(null);
                        }
                    } else {
                        var region = {
                            latitude: e.coords.latitude,
                            longitude: e.coords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05
                        };
                        callback(region);
                    }
                });
            }
        });
    },
    /**
     * Retorna el ancho de línea para una ruta del mapa en función de la densidad de pixel por pulgada
     */
    getRouteWidthLine:function(){
        var width = 3;
        if ( OS_ANDROID ) {
            width = Titanium.Platform.displayCaps.xdpi * 7 / 320;
        } else {
            width = Titanium.Platform.displayCaps.logicalDensityFactor * 1.2;
        }
        return width;
    },

    queueDirections:[],
   /**
    * Obtiene la dirección a partir de unas coordenadas y gestiona cola de petición de direcciones
    * @param  {object} coord, objeto con latitude y longitude
    * @param  {function} cb, callbacck
    * @return {object} {address, city}
    */
    getDirection:function(coord, cb){
        //si la cola está vacía pedimos dirección y si no añadimos a la cola
        if ( !this.queueDirections.length ) {
            this.queueDirections.push({coord:coord, cb:cb});
            console.log("La cola de direcciones está vacía, pedimos dirección");
            this.reverseGeoDirection(this.queueDirections[0].coord, this.queueDirections[0].cb);
        } else {
            console.log("hay alguien pidiendo una dirección añadimos a la cola");
            this.queueDirections.push({coord:coord, cb:cb});
        }
    },

    reverseGeoDirection:function(coord, cb){
        var that = this;
        Ti.Geolocation.reverseGeocoder(coord.latitude, coord.longitude, function(evt) {
            console.log("TAMAÑO DE LA COLA: ",that.queueDirections.length);
            //var address = L('no_address');
            var address = null;
            var city = null;

            if (evt && evt.success) {
                var places = evt.places;

                if (places && _.isArray(places) && places[0]) {
                    address = places[0].address;
                    city = places[0].city;
                }
            }

            cb({
                address:address,
                city:city
            });

            // setTimeout(function(){
                var mapsUtils = require('mapsUtils');
                //sacamos el primer elemento
                mapsUtils.queueDirections.shift();
                console.log("TAMAÑO DE LA COLA despues de next: ",mapsUtils.queueDirections.length);
                //pedimos siguiente de la cola
                if ( mapsUtils.queueDirections.length ) {
                    var next = mapsUtils.queueDirections[0];
                    console.log("RESPUESTA DIRECCIÓN, HAY ELEMENTOS EN COLA, PREGUNTAMOS");
                    mapsUtils.reverseGeoDirection(next.coord, next.cb);
                } else {
                    console.log("NO HAY MÁS ELEMENTOS EN COLA");
                }
            // }, 100);

        });
    },

    /**
     * Pide permiso para monitorizar gps
     * @return {[type]}            [description]
     */
    locationPermissions: function(callback) {
        "use strict";
        var permissions = require('permissions');
        // Use library to handle run-time permissions
        permissions.requestLocationPermissions(Ti.Geolocation.AUTHORIZATION_WHEN_IN_USE, function(e) {

            if (!e.success) {
                //comprobamos cuando le hemos mostrado el último aviso
                // In some cases the library will already have displayed a dialog, in other cases we receive a message to alert
                // if (e.error) alert(e.error);
                callback(false);
            } else {
                callback(true);
            }
        });
    },
    /**
     * Abre la aplicación de maps con las coordenadas del vehículo
     * Si no está la aplicación instalada abre un browser
     */
    openMapApp:function(latitude, longitude){
        "use strict";

        // Ti.Platform.openURL('Maps://http://maps.google.com/maps?q=48.8588054,2.3030451');
        var gMapUrl = "http://maps.google.com/maps?daddr=" + latitude + "," + longitude;
        if(OS_IOS){
            //vamos a probar a abrir la aplicación de maps de ios y si no funciona abrimos google map en app o browser
            gMapUrl = "comgooglemaps://?daddr=" + latitude + "," + longitude +"&directionsmode=driving";
            var aMapUrl = "http://maps.apple.com/maps?daddr=" + latitude + "," + longitude;
            if ( Titanium.Platform.canOpenURL(aMapUrl)){
                Ti.Platform.openURL(aMapUrl);
            } else {
                Ti.Platform.openURL(gMapUrl);
            }
        } else {
            Ti.Platform.openURL(gMapUrl);
        }
    }
};

module.exports = mapsUtils;
