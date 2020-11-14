/* eslint-disable no-lone-blocks */
// 记录实时MOTION数据,形成记录文件,供后续分析

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus20.yanzi.se'

var username = 'frank.shen@pinyuaninfo.com'
var password = 'Ft@Sugarcube99'
    // var LocationId = '229349' // fangtang
    // var LocationId = '188559' //1001
    // var LocationId = '88252' //1002
    // var LocationId = '60358' //1003
    // var LocationId = '938433' //1004
    // var LocationId = '83561' //1005
    // var LocationId = '306571' // 雷诺
    // var LocationId = '897737' // 威发test
    // var LocationId = '521209' //wafer-shanghai
    // var LocationId = '503370' //wanshen
    // var LocationId = '797296' // novah
    // var LocationId = '223516' //huamao
    // var LocationId = '783825' //浦发11
    // var LocationId = '581669' //TEST36
    // var LocationId = '503370' //VANKE 上海
var locationId = '274189' // 圣奥
const typeofSubs = 'data' // data   |  lifecircle  |  config | battery|sensorData|assetData|occupancy| occupancySlots|sensorSlots| assetSlots

// For log use only
var _Counter = 0 // message counter
var _logLimit = 1000 // will exit when this number of messages has been logged
var _t1 = new Date()
var _t2 = new Date()
var _t3 = new Date()

var sensorArray = []
var motionTimeStamps = []
var assetTimeStamps1 = []
var assetTimeStamps2 = []
var assetTimeStamps3 = ''

var recordObj = {
    type: '',
    Did: '',
    timeStamp: '',
    value: ''
}

// LocationId = process.argv[2] || LocationId
console.log('Probing: ' + locationId + ': ')

// Create a web socket client initialized with the options as above
var client = new WebSocketClient()

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString())
        // eslint-disable-next-line no-undef
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
                console.log(
                    'Total Motions Sensors seen： ' +
                    sensorcounter +
                    ' : with counters as :' +
                    output
                )
                console.log('\nMotion records calculated from counters:')
                console.log(JSON.stringify(motionTimeStamps))
                console.log('\nMotion records calculated from motion/nomotion packets:')
                console.log(JSON.stringify(assetTimeStamps1))
                console.log('\nMotion records calculated from free/occupy packets:')
                console.log(JSON.stringify(assetTimeStamps2))
                console.log('\nMotion records calculated from assetUtilization packets:')
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
                    {
                        if (json.responseCode.name === 'success') {
                            setInterval(sendPeriodicRequest, 60000) // as keepalive
                            sendSubscribeRequest(locationId)
                                // setInterval(sendSubscribeRequest(LocationId), 6000000) //oeriodic subscribe
                        } else {
                            console.log(json.responseCode.name)
                            console.log("Couldn't login, check your username and passoword")
                            connection.close()
                            process.exit()
                        }
                    }
                    break
                case 'PeriodicResponse':
                    break
                case 'SubscribeResponse':
                    setInterval(sendSubscribeRequest, 6000000) // periodic subscribe
                    break
                case 'SubscribeData':
                    {
                        // console.log('  ' + _Counter + '# ' + 'SubscribeData: ' + json.list[0].resourceType)
                        switch (json.list[0].resourceType) {
                            case 'SampleList':
                                {
                                    switch (json.list[0].list[0].resourceType) {
                                        case 'SampleMotion': // sampleMotion
                                            _t1.setTime(json.list[0].list[0].sampleTime)
                                            _t2.setTime(json.list[0].list[0].timeLastMotion) // sensor motion-detected time
                                            _t3.setTime(json.timeSent) // packet sent

                                            // algorithm based on SampleMotion；
                                            var temp1 = sensorArray[json.list[0].dataSourceAddress.did]
                                            var temprecordObj
                                            var motionFlag = ' ?? ' // update new value
                                            recordObj.type = 'samplemotion'
                                            recordObj.Did = json.list[0].dataSourceAddress.did
                                            recordObj.timeStamp = _t1.getTime()
                                            sensorArray[json.list[0].dataSourceAddress.did] =
                                                json.list[0].list[0].value // setup sensor array
                                            if (temp1 === json.list[0].list[0].value - 1) { // Value changed!= motion
                                                motionFlag = ' ++ '
                                                recordObj.value = 'in'
                                                temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                motionTimeStamps.push(temprecordObj)
                                            } else if (temp1 === json.list[0].list[0].value) { // Value unchanged!= nomotion
                                                motionFlag = ' == '
                                                recordObj.value = 'ot'
                                                temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                motionTimeStamps.push(temprecordObj)
                                                    // motionTimeStamps.push(json.list[0].dataSourceAddress.did + ',ot,' + _t1.getTime());
                                            } else { // no previous Value !
                                                // do not record to record
                                                // console.log("        Sensor first seen, cannot tell");
                                            }

                                            console.log(
                                                '      ' +
                                                _Counter +
                                                '# ' +
                                                _t3.toLocaleTimeString() + ' ' +
                                                json.list[0].list[0].resourceType + ' ' +
                                                json.list[0].dataSourceAddress.did +
                                                motionFlag +
                                                _t1.toLocaleTimeString() +
                                                ' # ' +
                                                json.list[0].list[0].value +
                                                ' Last: ' +
                                                _t2.toLocaleTimeString()
                                            )
                                            break
                                        case 'SampleAsset': // sampleAsset- free occupied ismotion isnomotion
                                            _t2.setTime(json.timeSent)
                                            _t3.setTime(json.list[0].list[0].sampleTime)
                                            motionFlag = ' ? ' // update new value
                                                // temprecordObj
                                            recordObj.type = 'SampleAsset'
                                            recordObj.Did = json.list[0].dataSourceAddress.did
                                            recordObj.timeStamp = _t1.getTime()
                                            console.log(
                                                '      ' +
                                                _Counter +
                                                '# ' +
                                                _t3.toLocaleTimeString() + ' ' +
                                                // ' SampleAsset ' +
                                                json.list[0].list[0].resourceType +
                                                ' ' +
                                                json.list[0].dataSourceAddress.did +
                                                ' @ ' +
                                                _t3.toLocaleTimeString() +
                                                '  ' +
                                                json.list[0].list[0].assetState.name
                                            )
                                            switch (json.list[0].list[0].assetState.name) {
                                                case 'isMotion':
                                                    // assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',mo,' + _t3.getTime() + '\n';
                                                    recordObj.value = 'mo'
                                                    temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    assetTimeStamps1.push(temprecordObj)

                                                    break
                                                case 'isNoMotion':
                                                    // assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',nm,' + _t3.getTime() + '\n';
                                                    recordObj.value = 'nm'
                                                    temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    assetTimeStamps1.push(temprecordObj)
                                                    break
                                                case 'free':
                                                    // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',fr,' + _t3.getTime() + '\n';
                                                    recordObj.value = 'fr'
                                                    temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    assetTimeStamps2.push(temprecordObj)
                                                    break
                                                case 'occupied':
                                                    // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',oc,' + _t3.getTime() + '\n';
                                                    recordObj.value = 'oc'
                                                    temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    assetTimeStamps2.push(temprecordObj)
                                                    break
                                                case 'missingInput':
                                                    // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',mi,' + _t3.getTime() + '\n';
                                                    recordObj.value = 'mi'
                                                    temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    assetTimeStamps2.push(temprecordObj)
                                                    break
                                                default:
                                                    console.log(
                                                        '!!!! cannot understand assetname ' +
                                                        json.list[0].list[0].assetState.name
                                                    )
                                                    break
                                            }
                                            break
                                        case 'SamplePercentage': // SamplePercentage for room with chairs
                                            _t2.setTime(json.timeSent)
                                            _t3.setTime(json.list[0].list[0].sampleTime)
                                            console.log(
                                                '      ' +
                                                _Counter +
                                                '# ' +
                                                _t2.toLocaleTimeString() + ' ' +
                                                json.list[0].list[0].resourceType + ' ' +
                                                json.list[0].dataSourceAddress.did +
                                                ' @ ' +
                                                _t3.toLocaleTimeString() +
                                                ' Occu%:' +
                                                json.list[0].list[0].value
                                            )
                                            break
                                        case 'SampleUtilization': // SampleUtilization
                                            _t2.setTime(json.timeSent)
                                            _t3.setTime(json.list[0].list[0].sampleTime)
                                            console.log(
                                                '      ' +
                                                _Counter +
                                                '# ' +
                                                _t2.toLocaleTimeString() + ' ' +
                                                json.list[0].list[0].resourceType + ' ' +
                                                json.list[0].dataSourceAddress.did +
                                                ' @ ' +
                                                _t3.toLocaleTimeString() +
                                                ' free:' +
                                                json.list[0].list[0].free +
                                                ' occupied:' +
                                                json.list[0].list[0].occupied
                                            )
                                            assetTimeStamps3 +=
                                                _t2.toLocaleTimeString() +
                                                ' AsstUT ' +
                                                json.list[0].dataSourceAddress.did +
                                                ' free:' +
                                                json.list[0].list[0].free +
                                                ' occupied:' +
                                                json.list[0].list[0].occupied +
                                                '\n'

                                            break

                                        case 'SampleUpState':
                                            _t2.setTime(json.list[0].list[0].sampleTime)
                                            console.log(
                                                    _Counter +
                                                    '# ' +
                                                    _t2.toLocaleTimeString() + ' ' +
                                                    json.list[0].list[0].resourceType + ' ' +
                                                    json.list[0].dataSourceAddress.did +
                                                    ' ' +
                                                    json.list[0].list[0].deviceUpState.name
                                                )
                                                // console.log(JSON.stringify(json));
                                            break

                                        case 'SlotDTO':
                                            console.log(
                                                '      ' +
                                                _Counter + ' ' +
                                                json.list[0].list[0].resourceType + ' ' +
                                                json.list[0].dataSourceAddress.did +
                                                '=' +
                                                (json.list[0].list[0].maxValue +
                                                    json.list[0].list[0].minValue) /
                                                2
                                            )
                                            break
                                        case 'SampleEndOfSlot':
                                            console.log(
                                                '     ' +
                                                _Counter +
                                                '# EndofDTO ' +
                                                json.list[0].dataSourceAddress.did +
                                                ' ' +
                                                json.list[0].list[0].sample.assetState.name
                                            )
                                            break

                                        case 'SampleVOC':
                                        case 'SampleTemp':
                                        case 'SampleHumidity':
                                        case 'SamplePressure':
                                        case 'SampleSoundPressureLevel':
                                        case 'SampleIlluminance':
                                        case 'SampleCO2':
                                        case 'SampleBattery':

                                            console.log('      ' + _Counter + '# ' + _t3.toLocaleTimeString() + ' ' + json.list[0].list[0].resourceType + ' ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].value)
                                            break
                                        default:
                                            console.log('Unknown samplelist ' + json.list[0].list[0].resourceTyp)
                                            break
                                    }
                                }
                                break
                            case 'EventType':
                                {
                                    switch (json.list[0].list[0].resourceType) {
                                        case 'SlotDTO':
                                            {
                                                console.log(
                                                    '   ' +
                                                    _Counter +
                                                    '# SlotDTO ' +
                                                    json.list[0].dataSourceAddress.did +
                                                    '=' +
                                                    (json.list[0].list[0].maxValue +
                                                        json.list[0].list[0].minValue) /
                                                    2
                                                )
                                            }
                                            break
                                        case 'SampleEndOfSlot':
                                            {
                                                console.log(
                                                    '   ' +
                                                    _Counter +
                                                    '# EndofDTO ' +
                                                    json.list[0].dataSourceAddress.did +
                                                    ' ' +
                                                    json.list[0].list[0].sample.assetState.name
                                                )
                                            }
                                            break
                                    }
                                }
                                break
                            case 'EventDTO':
                                {
                                    console.log(
                                        '    ' +
                                        _Counter +
                                        '#    Event DTO : ' +
                                        json.list[0].eventType.name
                                    )
                                    switch (json.list[0].eventType.name) {
                                        case 'newUnAcceptedDeviceSeenByDiscovery':
                                        case 'physicalDeviceIsNowUP':
                                        case 'physicalDeviceIsNowDOWN':
                                        case 'remoteLocationGatewayIsNowDOWN':
                                        case 'remoteLocationGatewayIsNowUP':
                                            // _t2.setTime(json.list[0].timeOfEvent);
                                            // console.log(_Counter + '# ' + _t2.toLocaleTimeString() + ' EVENTS' + json.list[0].unitAddress.did + ' ' + json.list[0].eventType.name);
                                            //  break;
                                            // eslint-disable-next-line no-fallthrough
                                        default:
                                            // console.log(_Counter + '#    Event DTO : ' + json.list[0].eventType.name);
                                            console.log(
                                                '!!!! cannot understand this Event' +
                                                json.list[0].eventType.name
                                            )
                                    }
                                }
                                break
                            default:
                                console.log('!Unknown  resourcetype' + json.list[0].resourceType)
                                break
                        }
                    }
                    break
                default:
                    console.log(
                        'Unknown  messagetype' + json.messageType
                    )
                    break
            }
        }
    })

    connection.on('error', function(error) {
        console.log('Connection Error: ' + error.toString())
        beginPOLL() // reconnect
    })

    // eslint-disable-next-line handle-callback-err
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
            console.log(
                "sendMessage: Couldn't send message, the connection is not open"
            )
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

    function sendSubscribeRequest() {
        var now = new Date().getTime()
            //   var nowMinusOneHour = now - 60 * 60 * 1000;
        var request = {
            messageType: 'SubscribeRequest',
            timeSent: now,
            unitAddress: {
                resourceType: 'UnitAddress',
                locationId: locationId
            },
            subscriptionType: {
                resourceType: 'SubscriptionType',
                name: typeofSubs
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