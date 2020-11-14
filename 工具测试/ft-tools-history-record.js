var WebSocketClient = require('websocket').client

// Set up endpoint, you'll probably need to change this
var cirrusAPIendpoint = 'cirrus11.yanzi.se'

// ##########CHANGE BELOW TO YOUR OWN DATA##########

// Set up credentials. Please DONT have your credentials in your code when running on production

// var username = "653498331@qq.com";
var username = 'bruce.li@sugarinc.cn'
var password = '000888'

// Location ID and Device ID, please change this to your own, can be found in Yanzi Live
// var locationID = '229349' //fangtang
var locationID = '797296' // novah
    // var deviceID = "EUI64-D0CF5EFFFE59F5FF-3-Motion" //Found in Yanzi Live, ends with "-Temp"
var deviceID = 'EUI64-D0CF5EFFFE59F5FF-4-Temp' // Found in Yanzi Live, ends with "-Temp"

// ################################################

// For log use only
var _Counter = 0 // message counter

var _logLimit = 500 // will exit when this number of messages has been logged

var _t1 = new Date()
var _t2 = new Date()
var _t3 = new Date()

var _Locations = []
var sensorArray = new Array()
var motionTimeStamps = ''
var assetTimeStamps1 = ''
var assetTimeStamps2 = ''

// Create a web socket client initialized with the options as above
var client = new WebSocketClient()

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString())
    connection.close()
})

client.on('connect', function(connection) {
    // console.log("Checking API service status with ServiceRequest.");
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            if (_Counter > _logLimit) {
                console.log('Enough Data, I will quit now!')
                connection.close()
                var output = ''
                for (var key in sensorArray) {
                    if (output == '') {
                        output = sensorArray[key]
                    } else {
                        output += '|' + sensorArray[key]
                    }
                } // do some report before exit

                // console.log(sensorArray.toString());
                console.log(output)
                console.log(motionTimeStamps.toString())
                console.log(assetTimeStamps1.toString())
                console.log(assetTimeStamps2.toString())
                process.exit()
            } // for log use only

            // Print all messages with DTO type
            console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    if (json.responseCode.name == 'success') {
                        sendPeriodicRequest() // as keepalive
                            // sendGetLocationsRequest();// not mandatory
                            // sendSubscribeRequest(locationID); //test
                            // sendSubscribeRequest_lifecircle(json.list[i].locationAddress.locationID);
                            // sendSubscribeRequest_lifecircle(locationID); //eventDTO
                        _t1 = new Date().getTime()
                        sendGetSamplesRequest(deviceID, locationID, _t1, _t1 - 60 * 60 * 1000)
                    } else {
                        console.log(json.responseCode.name)
                        console.log("Couldn't login, check your username and passoword")
                        connection.close()
                        process.exit()
                    }
                    break
                case 'GetLocationsResponse':
                    if (json.responseCode.name == 'success') {
                        console.log(_Counter + '# rcvd :  location  ' + JSON.stringify(json))
                            // UPDATE location IDs
                        if (json.list.length != 0) {
                            for (var i = 0; i < json.list.length; i++) {
                                if (!_Locations.includes(json.list[i].locationAddress.locationID)) {
                                    _Locations.push(json.list[i].locationAddress.locationID)
                                        // sendSubscribeRequest(json.list[i].locationAddress.locationID);
                                    sendSubscribeRequest(locationID) // test
                                        // sendSubscribeRequest_lifecircle(json.list[i].locationAddress.locationID);
                                    sendSubscribeRequest_lifecircle(locationID) // eventDTO
                                }
                            }
                        }
                    } else {
                        console.log(json.responseCode.name)
                        console.log("Couldn't get location")
                        connection.close()
                        process.exit()
                    }
                    break
                case 'GetSamplesResponse':
                    // GetSamplesResponse
                    if (json.responseCode.name == 'success') {
                        console.log('Yaaaay, temperaturedata in abundance!')
                        console.log(json.sampleListDto.list)
                        connection.close()
                    } else {
                        console.log("Couldn't get samples.")
                        connection.close()
                    }

                    break
                case 'GetUnitsResponse':
                    if (json.responseCode.name == 'success') {
                        console.log('Yaaaay, temperaturedata in abundance!')
                        console.log(json.sampleListDto.list)
                        connection.close()
                    } else {
                        console.log("Couldn't get samples.")

                        connection.close()
                    }

                    break
                case 'PeriodicResponse':
                    setTimeout(sendPeriodicRequest, 60000)
                    console.log(_Counter + '# ' + 'periodic response-keepalive')
                    break
                case 'SubscribeResponse':
                    var now = new Date().getTime()
                    setTimeout(sendGetLocationsRequest, json.expireTime - now)
                    _t1.setTime(json.expireTime)
                    console.log('susbscribe renew in (min)： ' + (json.expireTime - now) / 60000) // 100min
                    break

                case 'SubscribeData':
                    switch (json.list[0].resourceType) {
                        case 'SampleList':
                            // Sensor DATA
                            switch (json.list[0].dataSourceAddress.variableName.name) {
                                case 'motion': // sampleMotion
                                    _t1.setTime(json.list[0].list[0].sampleTime)
                                    _t2.setTime(json.list[0].list[0].timeLastMotion) // sensor motion-detected time
                                    _t3.setTime(json.timeSent) // packet sent

                                    // algorithm based on SampleMotion；
                                    var temp1 = sensorArray[json.list[0].dataSourceAddress.did]
                                    var motionFlag = ' ? ' // update new value
                                    sensorArray[json.list[0].dataSourceAddress.did] = json.list[0].list[0].value
                                    if (temp1 == (json.list[0].list[0].value - 1)) { // Value changed!
                                        console.log('motion!')
                                        motionFlag = ' + '
                                        motionTimeStamps = motionTimeStamps + json.list[0].dataSourceAddress.did + ',in,' + _t1.toLocaleTimeString() + '\n'
                                    } else if (temp1 == json.list[0].list[0].value) {
                                        console.log('no motion!')
                                        motionFlag = ' - '
                                        motionTimeStamps = motionTimeStamps + json.list[0].dataSourceAddress.did + ',ot,' + _t1.toLocaleTimeString() + '\n'
                                    } else {
                                        console.log('first seen! cannot tell')
                                    };

                                    console.log(_Counter + '# ' + _t3.toLocaleTimeString() + ' Motion ' + json.list[0].dataSourceAddress.did + motionFlag +
                                        _t1.toLocaleTimeString() + ' # ' + json.list[0].list[0].value +
                                        ' Last: ' + _t2.toLocaleTimeString() + ' static：(s) ' +
                                        (json.list[0].list[0].sampleTime - json.list[0].list[0].timeLastMotion) / 1000)
                                    break
                                case 'assetUtilization': // SampleUtilization
                                    _t2.setTime(json.timeSent)
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                    console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' AsstUT ' + json.list[0].dataSourceAddress.did + ' @ ' + _t3.toLocaleTimeString() +
                                        ' free:' + json.list[0].list[0].free + ' occupied:' + json.list[0].list[0].occupied)
                                    break
                                case 'unitState': // sampleAsset free occupied ismotion isnomotion

                                    // algorithm based on SampleAsset；

                                    _t2.setTime(json.timeSent)
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                        //    var temp1 = sensorArray[json.list[0].dataSourceAddress.did];
                                    var motionFlag = ' ? ' // update new value
                                        //     sensorArray[json.list[0].dataSourceAddress.did] = json.list[0].list[0].value;
                                    switch (json.list[0].list[0].assetState.name) {
                                        case 'isMotion':
                                            console.log('motion')
                                            assetTimeStamps1 = assetTimeStamps1 + json.list[0].dataSourceAddress.did + ',mo,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'isNoMotion':

                                            console.log('nomotion')
                                            assetTimeStamps1 = assetTimeStamps1 + json.list[0].dataSourceAddress.did + ',nm' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'free':
                                            console.log('nomotion')
                                            assetTimeStamps2 = assetTimeStamps2 + json.list[0].dataSourceAddress.did + ',fr,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'occupied':
                                            console.log('occupy')
                                            assetTimeStamps2 = assetTimeStamps2 + json.list[0].dataSourceAddress.did + ',oc,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        default:
                                            break
                                    };
                                    console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' SMPAST ' + json.list[0].dataSourceAddress.did + ' @ ' + _t3.toLocaleTimeString() + '  ' +
                                        json.list[0].list[0].assetState.name)
                                    break
                                case 'percentage': // SamplePercentage
                                    _t2.setTime(json.timeSent)
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                    console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' PCTAGE ' + json.list[0].dataSourceAddress.did + ' @ ' + _t3.toLocaleTimeString() +
                                        ' Occu%:' + json.list[0].list[0].value)
                                    break
                                case 'uplog':
                                    _t2.setTime(json.list[0].list[0].sampleTime)
                                    console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].resourceType)

                                    break
                                case 'volatileOrganicCompound':
                                case 'temperatureK':
                                case 'relativeHumidity':
                                case 'pressure':
                                case 'soundPressureLevel':
                                case 'illuminance':
                                case 'carbonDioxide':
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                    console.log(_Counter + '# ' + _t3.toLocaleTimeString() + ' Envrmt ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].resourceType + ' ' + json.list[0].list[0].value)
                                    break
                                default:
                                    console.log(_Counter + '# ' + 'Sample List Other ' + json.list[0].dataSourceAddress.variableName.name)
                            }
                            break
                        case 'EventDTO':
                            // console.log('   Event DTO : ' + json.list[0].eventType.name);
                            switch (json.list[0].eventType.name) {
                                case 'newUnAcceptedDeviceSeenByDiscovery':
                                case 'physicalDeviceIsNowUP':
                                case 'physicalDeviceIsNowDOWN':
                                case 'remoteLocationGatewayIsNowDOWN':
                                case 'remoteLocationGatewayIsNowUP':
                                    _t2.setTime(json.list[0].timeOfEvent)
                                    console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' EVENTS' + json.list[0].unitAddress.did + ' ' + json.list[0].eventType.name)
                                    break
                                default:
                                    console.log('    Event DTO : ' + json.list[0].eventType.name)
                            }
                            break
                        default:
                    }
                    break

                default:
                    console.log('!!!! cannot understand')
                        // connection.close();
                    break
            }
        }
    })

    connection.on('error', function(error) {
        console.log('Connection Error: ' + error.toString())
    })

    connection.on('close', function(error) {
        console.log('Connection closed!')
    })

    function sendMessage(message) {
        if (connection.connected) {
            // Create the text to be sent
            var json = JSON.stringify(message, null, 1)
                //    console.log('sending' + JSON.stringify(json));
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

    function sendGetLocationsRequest() {
        var now = new Date().getTime()
            // var nowMinusOneHour = now - 60 * 60 * 1000;
        var request = {
            messageType: 'GetLocationsRequest',
            timeSent: now
        }
        sendMessage(request)
    }

    function sendGetSamplesRequest(_deviceId, _locationID, _timeStart, _timeEnd) {
        var now = new Date().getTime()
        var nowMinusOneHour = now - 60 * 60 * 1000
        var request = {
            messageType: 'GetSamplesRequest',
            dataSourceAddress: {
                resourceType: 'DataSourceAddress',
                did: _deviceId,
                locationId: _locationID,
                variableName: {
                    resourceType: 'VariableName',
                    name: 'temperatureC'
                }
            },
            timeSerieSelection: {
                resourceType: 'TimeSerieSelection',
                timeStart: _timeStart,
                timeEnd: _timeEnd
            }
        }
        sendMessage(request)
    }

    function sendGetUnitsRequest() {
        var now = new Date().getTime()
        var nowMinusOneHour = now - 60 * 60 * 1000
        var request = {

            messageType: 'GetUnitsRequest',
            timeSent: now,
            locationAddress: {
                resourceType: 'LocationAddress',
                locationId: locationID
            }
        }

        sendMessage(request)
    }

    function sendSubscribeRequest(location_ID) {
        var now = new Date().getTime()
            //   var nowMinusOneHour = now - 60 * 60 * 1000;
        var request = {
            messageType: 'SubscribeRequest',
            timeSent: now,
            unitAddress: {
                resourceType: 'UnitAddress',
                locationId: location_ID
            },
            subscriptionType: {
                resourceType: 'SubscriptionType',
                name: 'data' // data   |  lifecircle  |  config
            }
        }

        sendMessage(request)
    }

    function sendSubscribeRequest_lifecircle(location_ID) {
        var now = new Date().getTime()
            //   var nowMinusOneHour = now - 60 * 60 * 1000;
        var request = {
            messageType: 'SubscribeRequest',
            timeSent: now,
            unitAddress: {
                resourceType: 'UnitAddress',
                locationID: location_ID
            },
            subscriptionType: {
                resourceType: 'SubscriptionType',
                name: 'lifecircle' // data   |  lifecircle  |  config
            }
        }

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
})

function beginPOLL() {
    if (!username) {
        console.error('The username has to be set')
        return
    }
    if (!password) {
        console.error('The password has to be set')
        return
    }
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
        // console.log("Connecting to wss://" + cirrusAPIendpoint + "/cirrusAPI using username " + username);
}

beginPOLL()