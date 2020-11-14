/* eslint-disable handle-callback-err */
/* eslint-disable camelcase */
var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus11.yanzi.se'

var username = 'frank.shen@pinyuaninfo.com'
var password = 'Internetofthing'
    // var username = "653498331@qq.com";
    // var password = "000000";

// ################################################

// For log use only
var _Counter = 0 // message counter
var _logLimit = 1000 // will exit when this number of messages has been logged
var _t2 = new Date()
var _Locations = []
var _Events = []

// Create a web socket client initialized with the options as above
var client = new WebSocketClient()

var locationObj = {

    locationId: '',
    serverDid: '',
    accountId: '',
    name: '',
    gwdid: '',
    units: 0,
    Allunits: 0,
    Onlineunits: 0,
    activityLevel: ''

}

var eventObj = {
    timeOfEvent: 1569232419674,
    did: 'EUI64-0080E10300099999',
    name: 'discovered',
    locationId: '123456'

}

// Program body
client.on('connectFailed', function(error) {
    console.log('Connect Error: reconnect' + error.toString())
    beginPOLL()
})

client.on('connect', function(connection) {
    // console.log("Checking API service status with ServiceRequest.");
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        // clearTimeout(TimeoutId);
        // TimeoutId = setTimeout(doReport, 10000); //exit after 10 seconds idle

        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            if (_Counter > _logLimit) {
                console.log('Enough Data!')
                    // console.log(_Locations.length + " locations : " + JSON.stringify(_Locations));
                connection.close()
                doReport()
                process.exit()
            } // for log use only
            try {
                // Print all messages with type
                console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
                switch (json.messageType) {
                    case 'ServiceResponse':
                        sendLoginRequest()
                        break
                    case 'LoginResponse':
                        if (json.responseCode.name === 'success') {
                            sendPeriodicRequest() // as keepalive
                            sendGetLocationsRequest() // not mandatory
                        } else {
                            console.log(json.responseCode.name)
                            console.log("Couldn't login, check your username and passoword")
                            connection.close()
                            process.exit()
                        }
                        break
                    case 'GetLocationsResponse':
                        if (json.responseCode.name === 'success') {
                            // UPDATE location IDs
                            if (json.list.length !== 0) { // 收到一组新的location
                                for (var i = 0; i < json.list.length; i++) {
                                    let _locationExist = false

                                    for (const key in _Locations) { // already exits in Array?
                                        if (_Locations[key].locationID || (_Locations[key].locationID === json.list[i].locationAddress.locationId)) {
                                            _locationExist = true
                                        }
                                    }

                                    var _templocationObj
                                    if (!_locationExist) {
                                        locationObj.locationId = json.list[i].locationAddress.locationId
                                        locationObj.serverDid = json.list[i].locationAddress.serverDid
                                        locationObj.accountId = json.list[i].accountId
                                        locationObj.name = json.list[i].name
                                        locationObj.gwdid = json.list[i].gwdid

                                        _templocationObj = JSON.parse(JSON.stringify(locationObj))

                                        _Locations.push(_templocationObj)
                                        sendSubscribeRequest_lifecircle(locationObj.locationId) // subscribe eventDTO
                                        sendSubscribeRequest_config(locationObj.locationId)
                                    }
                                }
                            }
                        } else {
                            console.log(json.responseCode.name)
                            console.log("Couldn't get location")
                            connection.close()
                            process.exit()
                        };
                        break
                    case 'GetSamplesResponse':
                        break
                    case 'GetUnitsResponse':
                        break
                    case 'PeriodicResponse':
                        setTimeout(sendPeriodicRequest, 60000)
                            // console.log(_Counter + '# ' + "periodic response-keepalive");
                        break
                    case 'SubscribeResponse':
                        break

                    case 'SubscribeData':
                        console.log('  ' + _Counter + '# ' + 'SubscribeData: ' + json.list[0].resourceType)
                        switch (json.list[0].resourceType) {
                            case 'SampleList':
                                break
                            case 'EventDTO':
                                var _tempeventObj
                                    // console.log(JSON.stringify(json))
                                    // console.log('    ' + _Counter + '#  Event DTO : ' + json.list[0].eventType.name);
                                switch (json.list[0].eventType.name) {
                                    case 'newUnAcceptedDeviceSeenByDiscovery':
                                    case 'physicalDeviceIsNowUP':
                                    case 'physicalDeviceIsNowDOWN':
                                    case 'remoteLocationGatewayIsNowDOWN':
                                    case 'remoteLocationGatewayIsNowUP':
                                    case 'unitConfigurationChanged':
                                        // console.log(json.list[0].unitAddress.did + ' 1  ' + json.list[0].unitAddress.locationId)
                                        eventObj.did = json.list[0].unitAddress.did
                                        eventObj.locationId = json.list[0].unitAddress.locationId
                                        break
                                    case 'locationChanged':
                                        //  console.log(json.list[0].list[0].locationAddress.serverDid + ' 2  ' + json.list[0].list[0].locationAddress.locationId)
                                        eventObj.did = json.list[0].list[0].locationAddress.serverDid
                                        eventObj.locationId = json.list[0].list[0].locationAddress.locationId
                                        break
                                    default:
                                        console.log('!!!! cannot understand this resourcetype ' + json.list[0].eventType.name)
                                }
                                _t2.setTime(json.timeSent)
                                eventObj.timeOfEvent = json.timeSent
                                eventObj.name = json.list[0].eventType.name
                                _tempeventObj = JSON.parse(JSON.stringify(eventObj))

                                _Events.push(_tempeventObj)
                                console.log('      ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' ' + eventObj.did + ' in ' + eventObj.locationId + ':' + eventObj.name)
                                break
                            default:
                                console.log('!!!! cannot understand this resourcetype ' + json.list[0].resourceType) // TODO
                        }
                        break

                    default:
                        console.log('!!!! cannot understand' + JSON.stringify(json))

                        break
                }
            } catch (error) {
                console.log(error.toString() + '----\n' + JSON.stringify(json))
            }
        }
    })

    connection.on('error', function(error) {
        console.log('Connection Error: reconnect' + error.toString())
        beginPOLL()
    })

    connection.on('close', function(error) {
        console.log('Connection closed!')
    })

    function sendMessage(message) {
        if (connection.connected) {
            var json = JSON.stringify(message, null, 1)
            connection.sendUTF(json)
        } else {
            console.log("sendMessage: Couldn't send message, the connection is not open")
        }
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
        var request = {
            messageType: 'GetLocationsRequest',
            timeSent: now
        }
        sendMessage(request)
    }

    function sendSubscribeRequest_lifecircle(location_ID) {
        var now = new Date().getTime()
        var request = {
            messageType: 'SubscribeRequest',
            timeSent: now,
            unitAddress: {
                resourceType: 'UnitAddress',
                locationId: location_ID
            },
            subscriptionType: {
                resourceType: 'SubscriptionType',
                name: 'lifecircle' // data   |  lifecircle  |  config
            }
        }

        sendMessage(request)
    }

    function sendSubscribeRequest_config(location_ID) {
        var now = new Date().getTime()
        var request = {
            messageType: 'SubscribeRequest',
            timeSent: now,
            unitAddress: {
                resourceType: 'UnitAddress',
                locationId: location_ID
            },
            subscriptionType: {
                resourceType: 'SubscriptionType',
                name: 'config' // data   |  lifecircle  |  config
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
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
        // console.log("Connecting to wss://" + cirrusAPIendpoint + "/cirrusAPI using username " + username);
}

function doReport() {
    //   var _c1 = 0
    //   var _c2 = 0
    var output = ''

    _Locations.sort(function(a, b) {
            var x = a.locationId
            var y = b.locationId
            if (x > y) return 1
            if (x < y) return -1
            return 0
        })
        // _Units.sort(function(a, b) {
        //     var x = a.locationId
        //     var y = b.locationId
        //     if (x > y) return 1;
        //     if (x < y) return -1;
        //     return 0;
        // });

    for (const key in _Locations) {
        output += _Locations[key].locationId + ' or ' + _Locations[key].name + '\n'
    }
    console.log('total ' + _Locations.length + ' locations: \n' + output) // print all locations with name

    // //do some work to match sensor to locations
    // for (const key in _Units) {
    //     for (const key1 in _Locations) { //update to its locations
    //         if (_Locations[key1].locationId == _Units[key].locationId) {
    //             _Locations[key1].Allunits++;
    //             if (_Units[key].lifeCycleState == 'present') { //mark live gateways
    //                 _Locations[key1].gwOnline = true;
    //                 _Locations[key1].Onlineunits++;
    //             }
    //             if (_Units[key].isChassis == 'true') { _Locations[key1].units++; } //mark physical sensors
    //             break;
    //         }
    //     }

    // }

    // //list each active location with sensors
    // for (const key1 in _Locations) {
    //     if (_Locations[key1].gwOnline)
    //         console.log('' + _Locations[key1].locationId + '-' + _Locations[key1].name + ' is online  with ' + _Locations[key1].Onlineunits + ' active sensors, ' + _Locations[key1].Allunits + ' logical');
    // }
    // console.log("total " + _Units.length + " logical sensors live while " + _OnlineUnitsCounter + ' sensors online')

    // //list all online physical sensors
    // for (const key1 in _Units) {
    //     if (_Units[key1].lifeCycleState == 'present')
    //         console.log(_Units[key1].did + ' in ' + _Units[key1].locationId);
    // }
    // for (const key1 in _Units) {
    //     if (_Units[key1].lifeCycleState == 'subUnit' && _Units[key1].isChassis == false)
    //         console.log(_Units[key1].did + ' as a ' + _Units[key1].type + ' in ' + _Units[key1].locationId);
    // }

    // clearTimeout(TimeoutId);
    process.exit()
}

beginPOLL()
