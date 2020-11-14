/* eslint-disable no-undef */
/* eslint-disable no-redeclare */
var WebSocketClient = require('websocket').client
// var async = require('async');

// Set up endpoint, you'll probably need to change this
var cirrusAPIendpoint = 'cirrus21.yanzi.se'

// ##########CHANGE BELOW TO YOUR OWN DATA##########

// Set up credentials. Please DONT have your credentials in your code when running on production
var username = 'frank.shen@pinyuaninfo.com'
var password = 'Internetofthing'
// Set up Location ID and Device ID, please change this to your own, can be found in Yanzi Live
var locationId = '229349' // fangtang
var deviceID = 'EUI64-D0CF5EFFFE792D88' // temp sensor
    // var deviceID = "EUI64-0080E10300056EB7-3-Temp" //temp sensor
    // var deviceID = "EUI64-90FD9FFFFEA77CBC-3-Motion" //temp sensor

var locationId = '213806' // demo
    // var deviceID = "EUI64-0080E10300056EB7-3-Temp" //temp sensor
var deviceID = 'EUI64-90FD9FFFFEA77CBC-3-Motion' // temp sensor
var deviceID = 'EUI64-90FD9FFFFEA77CBC' // temp sensor

var locationId = '797296' // demo
    // var deviceID = "EUI64-0080E10300056EB7-3-Temp" //temp sensor
var deviceID = 'EUI64-D0CF5EFFFE59F5FF-3-Motion' // temp sensor
    // var deviceID = "EUI64-D0CF5EFFFE59F5FF" //temp sensor
var deviceID = 'UUID-6971AA6340C14618845061E58AB3FDE4' // temp sensor

// Create a web socket client initialized with the options as above
var client = new WebSocketClient()
var connection

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString())
    connection.close()
})

client.on('connect', function(connection) {
    console.log('Websocket open!')
    console.log('Checking API service status with ServiceRequest.')
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            // console.log('recieved message type:');
            console.log(json.messageType)
            if (json.messageType === 'ServiceResponse') {
                console.log('ServiceRequest succeeded, sending LoginRequest')
                // console.log('rcvd' + JSON.stringify(json));
                sendLoginRequest()
            } else if (json.messageType === 'LoginResponse') {
                if (json.responseCode.name === 'success') {
                    // usually you can do something when login succeeded
                    now = new Date().getTime()

                    sendGetSamplesRequest(deviceID, now - 100000000, now) // Get sample
                } else {
                    console.log(json.responseCode.name)
                    console.log("Couldn't login, check your username and passoword")
                    connection.close()
                }
            } else if (json.messageType === 'GetSamplesResponse') {
                console.log('rcvd' + JSON.stringify(json))
                if (json.responseCode.name === 'success') {
                    console.log(json.sampleListDto.list)
                    console.log('rcvd' + JSON.stringify(json))
                    //   connection.close();
                } else {
                    console.log("Couldn't get samples.")

                    // connection.close();
                }
            } else {
                console.log("Couldn't understand")
                connection.close()
            }
        }
    })

    connection.on('error', function(error) {
        console.log('Connection Error: ' + error.toString())
    })

    // eslint-disable-next-line handle-callback-err
    connection.on('close', function(error) {
        console.log('Connection closed!')
    })

    function sendMessage(message) {
        if (connection.connected) {
            // Create the text to be sent
            var json = JSON.stringify(message, null, 1)
            console.log('sending' + JSON.stringify(json))
            connection.sendUTF(json)
        } else {
            console.log("sendMessage: Couldn't send message, the connection is not open")
        }
    }

    function sendServiceRequest() {
        var request = {
            messageType: 'ServiceRequest'
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

    function sendGetSamplesRequest(deviceID, timeStart, timeEnd) {
        var now = new Date().getTime()
        if ((timeEnd - timeStart) >= 10000000) {
            var request = {
                messageType: 'GetSamplesRequest',
                dataSourceAddress: {
                    resourceType: 'DataSourceAddress',
                    timeCreated: now,
                    did: deviceID,
                    locationId: locationId,
                    variableName: {
                        resourceType: 'VariableName'
                        // "name": "motion"
                    }
                    //   "instanceNumber": 0
                },
                timeSerieSelection: {
                    resourceType: 'TimeSerieSelection',
                    timeStart: timeStart,
                    timeEnd: timeStart + 10000000
                }
            }
            // console.log(Date(timeEnd).toTimeString());
            sendMessage(request)
            // setTimeout('
            sendGetSamplesRequest(deviceID, timeStart + 10000000, timeEnd)
        } else {
            if (timeStart >= timeEnd) { return null };

            var request = {
                messageType: 'GetSamplesRequest',
                dataSourceAddress: {
                    resourceType: 'DataSourceAddress',
                    timeCreated: now,
                    did: deviceID,
                    locationId: locationId,
                    variableName: {
                        resourceType: 'VariableName'
                        //   "name": "motion"
                    }
                    //     "instanceNumber": 0
                },
                timeSerieSelection: {
                    resourceType: 'TimeSerieSelection',
                    timeStart: timeStart,
                    timeEnd: timeEnd
                }
            }
            // console.log(Date(timeEnd).toTimeString());
            sendMessage(request)
        }
    }
})

function beginPoll() {
    if (!username) {
        console.error('The username has to be set')
        return
    }
    if (!password) {
        console.error('The password has to be set')
        return
    }
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
    console.log('Connecting to wss://' + cirrusAPIendpoint + '/cirrusAPI using username ' + username)
}

beginPoll()
