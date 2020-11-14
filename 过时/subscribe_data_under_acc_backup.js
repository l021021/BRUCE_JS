/* eslint-disable no-lone-blocks */
/* eslint-disable camelcase */
// 获得账号下所有location的事件信息,五分钟报告一次汇总,或者在得到记录数上限时退出
//
//

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus20.yanzi.se'
var c = console.log
var heartbeatFlag = 0
    // var username = 'frank.shen@pinyuaninfo.com'
    // var password = 'Ft@Sugarcube99'
var username = '653498331@qq.com'
var password = '000000'
let typeofSubs = ['battery', 'data', 'lifecircle', 'config', 'sensorData', 'assetData', 'occupancy', 'occupancySlots', 'sensorSlots', 'assetSlots']
const reportInter = 300000 // 每隔五分钟,做一次汇总
    // var username = "653498331@qq.com";
    // var password = "000000";

var _Counter = 0 // message counter
var _logLimit = 50000 // will exit when this number of messages has been logged
var sensorArray = []
var motionTimeStamps = []
var assetTimeStamps1, assetTimeStamps2, assetTimeStamps3 = []

var _Locations = []

var _t1 = new Date()
var _t2 = new Date()
var _t3 = new Date()

var recordObj = {
    type: '',
    Did: '',
    timeStamp: '',
    value: ''
}


var client = new WebSocketClient()

// Program body
function startConnect() {
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
}

startConnect()

client.on('connectFailed', function(error) {
    c('Connect Error: reconnect' + error.toString())
        // setTimeout(() => {
        //     startConnect
        // }, 5000);
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
})

client.on('connectFailed', function(error) {
    c('Connect Error: reconnect' + error.toString())
        // setTimeout(() => {
        //     startConnect
        // }, 5000);
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
})

client.on('connect', function(connection) {
    c('   connected to cloud ')
    heartbeatFlag = 0
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter++ // counter of all received packets

            if (_Counter >= _logLimit) {
                console.log('Enough Data!')
                    // console.log(_Locations.length + " locations : " + JSON.stringify(_Locations));
                connection.close()
                    // doReport()
                process.exit()
            } // for log use only
            // try {
            // Print all messages with type
            // console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    if (json.responseCode.name === 'success') {
                        setInterval(sendPeriodicRequest, 60000) // as keepalive
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
                        // setTimeout(sendGetLocationsRequest, 60 * 1000 * 60)
                        // UPDATE location IDs
                        if (json.list.length !== 0) {
                            for (var i = 0; i < json.list.length; i++) {

                                if (_Locations.indexOf(json.list[i].locationAddress.locationId) < 0) {
                                    _Locations[json.list[i].locationAddress.locationId] = json.list[i].name
                                    sendSubscribeRequest(json.list[i].locationAddress.locationId, typeofSubs)
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
                    // console.log(_Counter + '# ' + "periodic response-keepalive");
                case 'PeriodicResponse':
                    heartbeatFlag--
                    c('    periodic response rcvd (%s)', heartbeatFlag)
                    break
                case 'GetSamplesResponse':
                    break
                case 'GetUnitsResponse':
                    break
                case 'SubscribeResponse':
                    break
                case 'SubscribeData':
                    switch (json.list[0].resourceType) {
                        case 'SampleList':
                            switch (json.list[0].list[0].resourceType) {
                                case 'SampleMotion': // sampleMotion
                                    {
                                        _t1.setTime(json.list[0].list[0].sampleTime)
                                        _t2.setTime(json.list[0].list[0].timeLastMotion) // sensor motion-detected time
                                        _t3.setTime(json.timeSent) // packet sent

                                        // algorithm based on SampleMotion；
                                        let temp1 = sensorArray[json.list[0].dataSourceAddress.did] || 0 //json.list[0].dataSourceAddress.did
                                        var temprecordObj
                                        var motionFlag = ' ?? ' // update new value
                                        recordObj.type = 'samplemotion'
                                        recordObj.Did = json.list[0].dataSourceAddress.did // json.list[0].dataSourceAddress.did
                                        recordObj.timeStamp = _t1.getTime()
                                        sensorArray[json.list[0].dataSourceAddress.did] =
                                        json.list[0].list[0].value // setup sensor array
                                        if (temp1 === json.list[0].list[0].value - 1) {
                                            // Value changed!
                                            motionFlag = ' ++ '
                                            recordObj.value = 'in'
                                            temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                            motionTimeStamps.push(temprecordObj)
                                        } else if (temp1 === json.list[0].list[0].value) {
                                            //no change
                                            motionFlag = ' == '
                                            recordObj.value = 'ot'
                                            temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                            motionTimeStamps.push(temprecordObj)
                                                // motionTimeStamps.push(json.list[0].dataSourceAddress.did + ',ot,' + _t1.getTime());
                                        } else {
                                            //  console.log("        Sensor first seen, cannot tell");
                                        }

                                        console.log(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t3.toLocaleTimeString() +
                                            ' SampleMotion ' +
                                            json.list[0].dataSourceAddress.did +
                                            motionFlag +
                                            _t1.toLocaleTimeString() +
                                            ' # ' +
                                            json.list[0].list[0].value +
                                            ' Last: ' +
                                            _t2.toLocaleTimeString() +
                                            ' static(s)：  ' +
                                            (json.list[0].list[0].sampleTime -
                                                json.list[0].list[0].timeLastMotion) /
                                            1000
                                        )
                                    }
                                    break
                                case 'SampleAsset': // sampleAsset- free occupied ismotion isnomotion
                                    {
                                        _t2.setTime(json.timeSent)
                                        _t3.setTime(json.list[0].list[0].sampleTime)
                                        // eslint-disable-next-line no-redeclare
                                        var motionFlag = ' ? ' // update new value
                                            // eslint-disable-next-line no-redeclare
                                        var temprecordObj
                                            // var motionFlag = ' ?? '; //update new value
                                        recordObj.type = 'sampleAsset'
                                        recordObj.Did = json.list[0].dataSourceAddress.did
                                        recordObj.timeStamp = _t1.getTime()
                                        console.log(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t3.toLocaleTimeString() + ' ' +
                                            // ' SampleAsset ' +
                                            json.list[0].list[0].assetState.name +
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
                                                    // assetTimeStamps1.push(temprecordObj)

                                                break
                                            case 'isNoMotion':
                                                // assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',nm,' + _t3.getTime() + '\n';
                                                recordObj.value = 'nm'
                                                temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    // assetTimeStamps1.push(temprecordObj)
                                                break
                                            case 'free':
                                                // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',fr,' + _t3.getTime() + '\n';
                                                recordObj.value = 'fr'
                                                temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    // assetTimeStamps2.push(temprecordObj)
                                                break
                                            case 'occupied':
                                                // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',oc,' + _t3.getTime() + '\n';
                                                recordObj.value = 'oc'
                                                temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    // assetTimeStamps2.push(temprecordObj)
                                                break
                                            case 'missingInput':
                                                // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',mi,' + _t3.getTime() + '\n';
                                                recordObj.value = 'mi'
                                                temprecordObj = JSON.parse(JSON.stringify(recordObj))
                                                    // assetTimeStamps2.push(temprecordObj)
                                                break
                                            default:
                                                console.log(
                                                    '!Assetname ' +
                                                    json.list[0].list[0].assetState.name
                                                )
                                                break
                                        }
                                    }
                                    break
                                case 'SamplePercentage': // SamplePercentage
                                    {
                                        _t2.setTime(json.timeSent)
                                        _t3.setTime(json.list[0].list[0].sampleTime)
                                        console.log(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t2.toLocaleTimeString() +
                                            ' SamplePercentage ' +
                                            json.list[0].dataSourceAddress.did +
                                            ' @ ' +
                                            _t3.toLocaleTimeString() +
                                            ' Occu%:' +
                                            json.list[0].list[0].value
                                        )
                                    }
                                    break
                                case 'SampleUtilization': // SampleUtilization
                                    {
                                        _t2.setTime(json.timeSent)
                                        _t3.setTime(json.list[0].list[0].sampleTime)
                                        console.log(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t2.toLocaleTimeString() +
                                            ' SampleUtilization ' +
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
                                    }
                                    break
                                case 'SampleUpState':
                                    {
                                        _t2.setTime(json.list[0].list[0].sampleTime)
                                        console.log('   ' +
                                            _Counter +
                                            '# ' +
                                            _t2.toLocaleTimeString() +
                                            ' SampleUpState ' +
                                            json.list[0].dataSourceAddress.did +
                                            ' ' +
                                            json.list[0].list[0].deviceUpState.name
                                        )
                                        // console.log(JSON.stringify(json));
                                    }
                                    break
                                default:
                                    // 环境参数
                                    _t2.setTime(json.timeSent)
                                        // if json.list[0].list[0].resourceType ==
                                    console.log('   ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' ' + json.list[0].list[0].resourceType + ' ' + json.list[0].dataSourceAddress.did + ' in ' + json.locationId + ' ' + json.list[0].list[0].percentFull || '')
                                    break
                            }
                            break
                        case 'EventType':
                            {
                                switch (json.list[0].resourceType) {
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
                                // var _tempeventObj
                                switch (json.list[0].eventType.name) { // json.list[0]json.list[0].eventType.name
                                    case 'newUnAcceptedDeviceSeenByDiscovery':
                                    case 'physicalDeviceIsNowUP':
                                    case 'physicalDeviceIsNowDOWN':
                                    case 'remoteLocationGatewayIsNowDOWN':
                                    case 'remoteLocationGatewayIsNowUP':
                                    case 'unitConfigurationChanged':
                                    case 'locationChanged':
                                        //  console.log(json.list[0].list[0].locationAddress.serverDid + ' 2  ' + json.list[0].list[0].locationAddress.locationId)
                                        //   eventObj.did = json.list[0].list[0].locationAddress.serverDid
                                        //  eventObj.locationId = json.list[0].list[0].locationAddress.locationId
                                        console.log('   ' + _Counter + '# ' + json.locationId + ' ' + json.list[0].eventType.name)

                                        break
                                    default:
                                        console.log(' !!!!  ' + _Counter + ' Unknown events: ' + json.list[0].eventType.name)
                                        break
                                }
                            }
                            break
                        default:
                            console.log(' !!!!  ' + _Counter + 'OTHER DATA?  ' + JSON.stringify(json))
                            break
                    }
            }

        }
    })

    connection.on('error', function(error) {
        console.log(' !!! Connection Error: reconnect' + error.toString())
        setTimeout(() => {
            startConnect
        }, 2000);
    })

    connection.on('close', function(error) {
        console.log('Connection closed!' + error)
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

    function sendSubscribeRequest(location_ID, dataType) {
        let now = new Date().getTime()
        let request

        dataType.forEach(element => {

            request = {
                messageType: 'SubscribeRequest',
                timeSent: now,
                unitAddress: {
                    resourceType: 'UnitAddress',
                    locationId: location_ID
                },
                subscriptionType: {
                    resourceType: 'SubscriptionType',
                    name: element
                }
            }

            sendMessage(request)
        });
    }

    function sendPeriodicRequest() {
        var now = new Date().getTime()
        var request = {
            messageType: 'PeriodicRequest',
            timeSent: now
        }
        if (heartbeatFlag === 5) {
            c('    periodic request missed (%s), will reconnect', heartbeatFlag)
            connection.close()

            // heartbeatFlag = 0
            startConnect()
        }
        heartbeatFlag++
        sendMessage(request)

        c('    periodic request send (%s)', heartbeatFlag)
    }
})