// 获得账号下所有location的事件信息,五分钟报告一次汇总,或者在得到记录数上限时退出
//
//

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus20.yanzi.se'
var c = console.log
var username = '653498331@qq.com'
var password = '000000'
const reportInter = 300000 //每隔五分钟,做一次汇总
    // var username = "653498331@qq.com";
    // var password = "000000";

// ################################################

// For log use only
var _Counter = 0 // message counter
var _logLimit = 5000 // will exit when this number of messages has been logged
var _t2 = new Date()
var _Locations = []
var _Events = []
var eventsCounter = []

// Create a web socket client initialized with the options as above
var client = new WebSocketClient()
var TimeoutId = setTimeout(doReport, reportInter)
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
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            if (_Counter >= _logLimit) {
                console.log('Enough Data!')
                    // console.log(_Locations.length + " locations : " + JSON.stringify(_Locations));
                connection.close()
                doReport()
                process.exit()
            } // for log use only
            try {
                // Print all messages with type
                // console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
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
                            if (json.list.length !== 0) {
                                for (var i = 0; i < json.list.length; i++) {
                                    // let _locationExist = false

                                    if (_Locations.indexOf(json.list[i].locationAddress.locationId) < 0) {
                                        _Locations[json.list[i].locationAddress.locationId] = json.list[i].name
                                        sendSubscribeRequest_lifecircle(json.list[i].locationAddress.locationId) // subscribe eventDTO
                                        sendSubscribeRequest_config(json.list[i].locationAddress.locationId)
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
                        // console.log('  ' + _Counter + '# ' + 'SubscribeData: ' + json.list[0].resourceType)
                        // eventsCounter[json.list[0].eventType.name] = (eventsCounter[json.list[0].eventType.name] + 1) || 0

                        switch (json.list[0].resourceType) {
                            case 'SampleList':
                                break
                            case 'EventDTO':
                                var _tempeventObj
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
                                console.log('      ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' ' + eventObj.did + ' in ' + eventObj.locationId + '_' + _Locations[eventObj.locationId] + ':' + eventObj.name)
                                break
                            default:
                                console.log('!!!! cannot understand this resourcetype ' + json.list[0].resourceType)
                        }
                        eventsCounter[eventObj.locationId + '_' + _Locations[eventObj.locationId] + ':' + json.list[0].eventType.name] = (eventsCounter[eventObj.locationId + '_' + _Locations[eventObj.locationId] + ':' + json.list[0].eventType.name] + 1) || 1
                            // setTimeout(doReport, reportInter)// 10分钟一次总结
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
    scan_array(eventsCounter)
    clearTimeout(TimeoutId)
    TimeoutId = setTimeout(doReport, reportInter)
}

beginPOLL()

function scan_array(arr) {
    c('\n Listing Stored Events: \n')
    for (var key in arr) { // 这个是关键
        if (typeof(arr[key]) === 'array' || typeof(arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            console.log('      ' + key + ' --- ' + arr[key])
        }
    }
    c('\n                ------- \n')
}