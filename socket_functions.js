const WebSocketClient = require('websocket').client
const cirrusAPIendpoint = 'cirrus20.yanzi.se'
var client = new WebSocketClient()

var username = 'frank.shen@pinyuaninfo.com'
var password = 'Ft@Sugarcube99'

function sendMessage(message) {
    if (connection.connected) {
        // Create the text to be sent
        var json = JSON.stringify(message, null, 1)
            //    console.log('sending' + JSON.stringify(json));
        connection.sendUTF(json)
    } else {

        startConnect()
    }
}

client.on('connect', function(connection) {
    sendServiceRequest()
})

function sendLoginRequest() {
    const request = {
        messageType: 'LoginRequest',
        username: username,
        password: password
    }
    sendMessage(request)
}

function startConnect() {
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
}

function sendServiceRequest() {
    var request = {
        messageType: 'ServiceRequest',
        clientId: 'client-fangtang'
    }
    sendMessage(request)
}

function sendLoginRequest() {
    var request = {
        messageType: 'LoginRequest',
        username: username,
        password: password
    }
    sendMessage(request)
}

function sendGetLocationsRequest() {
    var now = new Date().getTime()
        // var nowMinusOneHour = now - 60 * 60 * 1000;
    var request = {
        messageType: 'GetLocationsRequest',
        timeSent: now
    }
    sendMessage(request)
}

function sendGetUnitsRequest(locationID) {
    var now = new Date().getTime()
    var request = {
        messageType: 'GetUnitsRequest',
        timeSent: now,
        locationAddress: {
            resourceType: 'LocationAddress',
            locationId: locationID
        }
    }
    console.log('sending request for ' + locationID)
    sendMessage(request)
}

function sendPeriodicRequest() {
    var now = new Date().getTime()
    var request = {
        messageType: 'PeriodicRequest',
        timeSent: now
    }
    sendMessage(request)
}