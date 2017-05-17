/**
 * Notificaciones push para ios
 */

var IosLib = {

    initPush: function(callback) {
        var deviceToken = null;
        // Check if the device is running iOS 8 or later
        if (Ti.Platform.name == "iPhone OS" && parseInt(Ti.Platform.version.split(".")[0]) >= 8) {

            // Wait for user settings to be registered before registering for push notifications
            Ti.App.iOS.addEventListener('usernotificationsettings', function registerForPush() {
                // Remove event listener once registered for push notifications
                // Ti.App.iOS.removeEventListener('usernotificationsettings', registerForPush);
                //
                // Ti.Network.registerForPushNotifications({
                //     success: function(e) {
                //         var deviceToken = e.deviceToken;
                //         // alert(e.deviceToken);
                //         Ti.API.info("Push notification device token is: " + deviceToken);
                //         Ti.API.info("Push notification types: " + Titanium.Network.remoteNotificationTypes);
                //         Ti.API.info("Push notification enabled: " + Titanium.Network.remoteNotificationsEnabled);
                //         callback(deviceToken);
                //
                //     },
                //     error: deviceTokenError,
                //     callback: receivePush
                // });
            });

            //TODO crear categorías si queremos hacer notificaciones interactivas
            //http://docs.appcelerator.com/platform/latest/#!/guide/iOS_Interactive_Notifications

            // Register notification types to use
            Ti.App.iOS.registerUserNotificationSettings({
                types: [Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT, Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND, Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE]
            });

            // Monitor notifications received while app is in the background
            Ti.App.iOS.addEventListener('localnotificationaction', function(e) {
                console.log("NOTIFICACIÓN BACKGROUND PULSADA");
                // if (e.category == "DOWNLOAD_CONTENT" && e.identifier == "ACCEPT_IDENTIFIER") {
                //     alert("start download");
                // }

                // Reset the badge value
                if (e.badge > 0) {
                    Ti.App.iOS.scheduleLocalNotification({
                        date: new Date(new Date().getTime() + 3000),
                        badge: "-1"
                    });
                }
                Ti.API.info(JSON.stringify(e));
            });
        }

        // For iOS 7 and earlier
        else {
            Ti.Network.registerForPushNotifications({
                // Specifies which notifications to receive
                types: [Ti.Network.NOTIFICATION_TYPE_BADGE, Ti.Network.NOTIFICATION_TYPE_ALERT, Ti.Network.NOTIFICATION_TYPE_SOUND],
                success: function(e) {
                    var deviceToken = e.deviceToken;
                    Ti.API.info("Push notification device token is: " + deviceToken);
                    Ti.API.info("Push notification types: " + Titanium.Network.remoteNotificationTypes);
                    Ti.API.info("Push notification enabled: " + Titanium.Network.remoteNotificationsEnabled);
                    // callback(deviceToken);
                },
                error: deviceTokenError,
                callback: receivePush
            });
        }

        //deviceTokenSuccess();
        /**
         * Función para recibir push
         */
        function receivePush(e) {
            // console.log("RECIBE PUSH");
            // // alert('Received push: ' + JSON.stringify(e));
            // console.log(JSON.stringify(e));
            //
            // // Titanium.Media.vibrate();
            // var data = e.data;
            // var badge = data.badge;
            // if(badge > 0){
            //     Ti.UI.iOS.appBadge = badge;
            // }
            // // var message = data.message;
            // // if(message !== ''){
            // //     var my_alert = Ti.UI.createAlertDialog({title:'', message:message});
            // //     my_alert.show();
            // // }
            // //
            // //Por ahora cada vez que llegue una notificación vamos a pedir los mensajes
            // require('messagesUtils').getServerMessages();
            //
            // UbikableData.addNotification(data, function(model){
            //     if ( model ) Ti.App.fireEvent('notifications', {model:model});
            // });
            //
            //
            // // Reset the badge value
            // if (e.badge > 0) {
            //     Ti.App.iOS.scheduleLocalNotification({
            //         date: new Date(new Date().getTime() + 3000),
            //         badge: "-1"
            //     });
            // }
        }

        function deviceTokenError(e) {
            //TODO ver que hacer en este caso
            // alert('Failed to register for push notifications! ' + e.error);
            // callback(null);
        }
    },

    cancelAllNotif: function(){
        console.log("CANCELAMOS TODAS LAS NOTIFICACIONES");
        Titanium.App.iOS.cancelAllLocalNotifications();
    }
};

module.exports = IosLib;
