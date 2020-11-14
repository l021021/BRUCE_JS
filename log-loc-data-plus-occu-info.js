/* eslint-disable handle-callback-err */
/* eslint-disable no-undef */
/* eslint-disable camelcase */
// Check a location by log all subscribe data (data and lifecycle),especilly the motion data( 3 types) , also  check the activilty level and sensor healthy

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus20.yanzi.se'

// var username = 'frank.shen@pinyuaninfo.com'
// var password = 'Ft@Sugarcube99'

var username = 'de1999@vip.qq.com'
var password = '23456789'
    // var LocationId = '229349' // fangtang
    // var LocationId = '188559' //1001
    // var LocationId = '88252' //1002
    // var LocationId = '60358' //1003
    // var LocationId = '938433' //1004
    // var LocationId = '83561' //1005
    // eslint-disable-next-line no-redeclare
    // var LocationId = '306571' // 雷诺
var LocationId = '402837' // turnone-15



// var LocationId = '521209' //wafer-shanghai
// var LocationId = '503370' //wanshen
// var LocationId = '797296' // novah
// var LocationId = '223516' //huamao
// var LocationId = '783825' //浦发11
// var LocationId = '581669' //test36

// For log use only
var _Counter = 0 // message counter
var _logLimit = 1500 // will exit when this number of messages has been logged
var _t1 = new Date()
var _t2 = new Date()
var _t3 = new Date()

var sensorArray = []
var motionTimeStamps = ''
var assetTimeStamps1 = ''
var assetTimeStamps2 = ''
var assetTimeStamps3 = ''

LocationId = process.argv[2] || LocationId
console.log('Probing: ' + LocationId + ': ')

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
                var sensorcounter = 0
                for (var key in sensorArray) {
                    sensorcounter++
                    if (output === '') {
                        output = sensorArray[key]
                    } else {
                        output += ',' + sensorArray[key]
                    }
                } // do some report before exit

                // console.log(sensorArray.toString());
                console.log('Total Motions Sensors seen： ' + sensorcounter + ' : with counters as :' + output)
                console.log('Motion records calculated from counters:')
                console.log(motionTimeStamps.toString())
                console.log('Motion records calculated from motion/nomotion packets:')
                console.log(assetTimeStamps1.toString())
                console.log('Motion records calculated from free/occupy packets:')
                console.log(assetTimeStamps2.toString())
                console.log('Motion records calculated from assetUtilization packets:')
                console.log(assetTimeStamps3.toString())
                console.log("That's all")
                process.exit()
            } // for log use only

            // Print all messages with DTO type
            // console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ':' + json.messageType);
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    if (json.responseCode.name === 'success') {
                        sendPeriodicRequest() // as keepalive
                            // sendGetLocationsRequest();// not mandatory
                            // sendSubscribeRequest(LocationId) // test
                        console.log('    Analyzing Location:' + LocationId)
                            // sendSubscribeRequest_lifecircle(json.list[i].locationAddress.locationId);
                        sendSubscribeRequest_lifecircle(LocationId) // eventDTO
                    } else {
                        console.log(json.responseCode.name)
                        console.log("Couldn't login, check your username and passoword")
                        connection.close()
                        process.exit()
                    }
                    break

                case 'PeriodicResponse':
                    setTimeout(sendPeriodicRequest, 60000)
                        // console.log(_Counter + '# ' + "periodic response-keepalive");
                    break
                case 'SubscribeResponse':
                    var now = new Date().getTime()
                    setTimeout(sendGetLocationsRequest, json.expireTime - now)
                    _t1.setTime(json.expireTime)
                    console.log('Susbscribe renew in (min)： ' + (json.expireTime - now) / 60000) // 100min
                    break
                case 'SubscribeData':
                    // console.log('  ' + _Counter + '# ' + 'SubscribeData: ' + json.list[0].resourceType)
                    switch (json.list[0].resourceType) {
                        case 'SampleList':
                            // Sensor DATA
                            // console.log('    ' + _Counter + '# ' + 'SampleList: ' + json.list[0].list[0].resourceType)
                            switch (json.list[0].list[0].resourceType) {
                                case 'SampleMotion': // sampleMotion
                                    _t1.setTime(json.list[0].list[0].sampleTime)
                                    _t2.setTime(json.list[0].list[0].timeLastMotion) // sensor motion-detected time
                                    _t3.setTime(json.timeSent) // packet sent

                                    // algorithm based on SampleMotion；
                                    var temp1 = sensorArray[json.list[0].dataSourceAddress.did]
                                    var motionFlag = ' ?? ' // update new value
                                    sensorArray[json.list[0].dataSourceAddress.did] = json.list[0].list[0].value
                                    if (temp1 === (json.list[0].list[0].value - 1)) { // Value changed!
                                        // console.log("        Motion detected..");
                                        motionFlag = ' ++ '
                                        motionTimeStamps += json.list[0].dataSourceAddress.did + ',in,' + _t1.toLocaleTimeString() + '\n'
                                    } else if (temp1 === json.list[0].list[0].value) {
                                        // console.log("        No motion Detected..");
                                        motionFlag = ' == '
                                        motionTimeStamps += json.list[0].dataSourceAddress.did + ',ot,' + _t1.toLocaleTimeString() + '\n'
                                    } else {
                                        // console.log("        Sensor first seen, cannot tell");
                                    };

                                    console.log('      ' + _Counter + '# ' + _t3.toLocaleTimeString() + ' SampleMotion ' + json.list[0].dataSourceAddress.did + motionFlag +
                                        _t1.toLocaleTimeString() + ' # ' + json.list[0].list[0].value +
                                        ' Last: ' + _t2.toLocaleTimeString() + ' static(s)：  ' +
                                        (json.list[0].list[0].sampleTime - json.list[0].list[0].timeLastMotion) / 1000)
                                    break
                                case 'SampleAsset': // sampleAsset- free occupied ismotion isnomotion

                                    _t2.setTime(json.timeSent)
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                        // eslint-disable-next-line no-redeclare
                                    var motionFlag = ' ? ' // update new value
                                    console.log('      ' + _Counter + '# ' + json.list[0].list[0].assetState.name + ' ' + json.list[0].dataSourceAddress.did + ' @ ' + _t3.toLocaleTimeString() + '  ' +
                                        json.list[0].list[0].assetState.name)
                                    switch (json.list[0].list[0].assetState.name) {
                                        case 'isMotion':
                                            assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',mo,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'isNoMotion':
                                            assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',nm,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'free':
                                            assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',fr,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'occupied':
                                            assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',oc,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        case 'missingInput':
                                            assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',mi,' + _t3.toLocaleTimeString() + '\n'
                                            break
                                        default:
                                            console.log('!!!! cannot understand assetname ' + json.list[0].list[0].assetState.name)
                                            break
                                    };

                                    break
                                case 'SamplePercentage': // SamplePercentage
                                    _t2.setTime(json.timeSent)
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                    console.log('      ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' SamplePercentage ' + json.list[0].dataSourceAddress.did + ' @ ' + _t3.toLocaleTimeString() +
                                        ' Occu%:' + json.list[0].list[0].value)
                                    break
                                case 'SampleUtilization': // SampleUtilization

                                    _t2.setTime(json.timeSent)
                                    _t3.setTime(json.list[0].list[0].sampleTime)
                                    console.log('      ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' SampleUtilization ' + json.list[0].dataSourceAddress.did + ' @ ' + _t3.toLocaleTimeString() +
                                        ' free:' + json.list[0].list[0].free + ' occupied:' + json.list[0].list[0].occupied)
                                    assetTimeStamps3 += _t2.toLocaleTimeString() + ' AsstUT ' + json.list[0].dataSourceAddress.did + ' free:' + json.list[0].list[0].free + ' occupied:' + json.list[0].list[0].occupied + '\n'

                                    break

                                case 'SampleUpState':
                                    _t2.setTime(json.list[0].list[0].sampleTime)
                                    console.log(_Counter + '# ' + _t3.toLocaleTimeString() + ' ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].deviceUpState.name)
                                        // console.log(JSON.stringify(json));
                                    break

                                case 'SlotDTO':
                                    // console.log('      ' + _Counter + '# SlotDTO ' + json.list[0].dataSourceAddress.did + '=' + (json.list[0].list[0].maxValue + json.list[0].list[0].minValue) / 2)
                                    break
                                case 'SampleEndOfSlot':
                                    // console.log('     ' + _Counter + '# EndofDTO ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].sample.assetState.name);
                                    break
                                case 'SampleVOC':
                                case 'SampleTemp':
                                case 'SampleHumidity':
                                case 'SamplePressure':
                                case 'SampleSoundPressureLevel':
                                case 'SampleIlluminance':
                                case 'SampleCO2':
                                    // console.log('     ' + _Counter + '# Sample ' + _t3.toLocaleTimeString() + ' ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].value);
                                    break
                                default:
                                    console.log('!!!! cannot understand samplelist resourcetype' + json.list[0].list[0].resourceType)
                            }
                            break
                        case 'EventDTO':
                            console.log('    ' + _Counter + '#    Event DTO : ' + json.list[0].eventType.name)
                            switch (json.list[0].eventType.name) {
                                case 'newUnAcceptedDeviceSeenByDiscovery':
                                case 'physicalDeviceIsNowUP':
                                case 'physicalDeviceIsNowDOWN':
                                case 'remoteLocationGatewayIsNowDOWN':
                                case 'remoteLocationGatewayIsNowUP':
                                    // _t2.setTime(json.list[0].timeOfEvent);
                                    console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' EVENTS' + json.list[0].unitAddress.did + ' ' + json.list[0].eventType.name)
                                    break
                                default:
                                    // console.log(_Counter + '#    Event DTO : ' + json.list[0].eventType.name);
                                    console.log('!!!! cannot understand this Event' + json.list[0].eventType.name)
                            }
                            break
                        default:
                            console.log('!!!! cannot understand this rsourcetype ' + json.list[0].resourceType)
                    }
                    break

                default:
                    console.log('!!!! cannot understand this messagetype' + json.messageType)
                        // connection.close();
                    break
            }
        }
    })

    connection.on('error', function(error) {
        console.log('Connection Error: ' + error.toString())
    })

    connection.on('close', function() {
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
                locationId: location_ID
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