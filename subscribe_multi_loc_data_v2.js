/* eslint-disable no-unused-vars */
/* eslint-disable no-lone-blocks */
const WebSocketClient = require('websocket').client
const cirrusAPIendpoint = 'cirrus20.yanzi.se'
let sessionId
let heartbeatFlag = 0

const username = 'frank.shen@pinyuaninfo.com'
const password = 'Ft@Sugarcube99'
    // let username = '653498331@qq.com'
    // let password = '000000'

const filter = '' // filter for console

// const typeofSubs =
const typeofSubs = ['lifecircle']
    // const typeofSubs = ['lifecircle', 'config', 'battery', 'sensorData', 'assetData', 'occupancy', 'occupancySlots', 'sensorSlots', 'assetSlots']


// data   |  lifecircle  |  config | battery|sensorData|assetData|occupancy| occupancySlots|sensorSlots| assetSlots


const _logLimit = 50000 // will exit when this number of messages has been logged
    // const locationIds = ['952675', '402837', '268429', '732449', '328916'] //拓闻淮安
    // const locationIds = ['447223', '290596', '879448'] //AZ P3
    // const locationIds = ['230381'] //JOS HK
    // const locationIds = ['108899'] //横河
    // let locationIds = ['976522'] // AZ7-4
    // let locationIds = ['803785'] // AZ7-4
let locationIds = ['797296'] // AZ7-4


let _Counter = 0 // message counter
const sensorArray = []
const motionTimeStamps = []
    // let assetTimeStamps1
    // let assetTimeStamps2
const assetTimeStamps3 = []
const _Locations = []
const _t1 = new Date()
const _t2 = new Date()
const _t3 = new Date()
const _recordObj = {
    type: '',
    Did: '',
    timeStamp: '',
    value: ''
}

function c(data) {
    if ((data.indexOf(filter) >= 0) && (filter.length !== '')) {
        try {
            console.log(data)
        } catch (error) {
            console.log(error)
        }
    }
}

const client = new WebSocketClient()

// Program body
function startConnect() {
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
}

startConnect()

client.on('connectFailed', function(error) {
    c(' --- Connect Error: reconnect -- ' + error.toString())

    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
})

client.on('connect', function(connection) {
    c(' --- Connected to cloud --- ')
    heartbeatFlag = 0
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            const json = JSON.parse(message.utf8Data)
            const t = new Date().getTime()
            const timestamp = new Date()
            timestamp.setTime(t)
            _Counter++ // counter of all received packets

            if (_Counter >= _logLimit) {
                c('Enough Data!')
                c(_Locations.length + ' locations : ' + JSON.stringify(_Locations))
                connection.close()
                process.exit()
            }
            // c(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    sessionId = json.sessionId
                    setInterval(sendPeriodicRequest, 60000) // as keepalive
                    for (let iLoc = 0; iLoc < locationIds.length; iLoc++) {
                        sendSubscribeRequest(locationIds[iLoc], typeofSubs)
                    }
                    break
                case 'GetLocationsResponse':
                    break
                case 'PeriodicResponse':
                    heartbeatFlag = 0
                    break
                case 'GetSamplesResponse':
                    break
                case 'GetUnitsResponse':
                    break
                case 'SubscribeResponse':
                    break
                case 'SubscribeData':
                    _t2.setTime(json.timeSent)
                    switch (json.list[0].resourceType) {
                        case 'SampleList':
                            switch (json.list[0].list[0].resourceType) {
                                case 'SampleMotion': // sampleMotion
                                    {
                                        _t1.setTime(json.list[0].list[0].sampleTime)
                                        _t2.setTime(json.list[0].list[0].timeLastMotion) // sensor motion-detected time
                                        _t3.setTime(json.timeSent) // packet sent

                                        // algorithm based on SampleMotion；
                                        const temp1 = sensorArray[json.list[0].dataSourceAddress.did] || 0 // json.list[0].dataSourceAddress.did
                                        let temprecordObj
                                        let motionFlag = ' ?? ' // update new value
                                        _recordObj.type = 'samplemotion'
                                        _recordObj.Did = json.list[0].dataSourceAddress.did // json.list[0].dataSourceAddress.did
                                        _recordObj.timeStamp = _t1.getTime()
                                        sensorArray[json.list[0].dataSourceAddress.did] =
                                        json.list[0].list[0].value // setup sensor array
                                        if (temp1 === json.list[0].list[0].value - 1) {
                                            // Value changed!
                                            motionFlag = ' ++ '
                                            _recordObj.value = 'in'
                                            temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                            motionTimeStamps.push(temprecordObj)
                                        } else if (temp1 === json.list[0].list[0].value) {
                                            // no change
                                            motionFlag = ' == '
                                            _recordObj.value = 'ot'
                                            temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                            motionTimeStamps.push(temprecordObj)
                                                // motionTimeStamps.push(json.list[0].dataSourceAddress.did + ',ot,' + _t1.getTime());
                                        } else {
                                            //  c("        Sensor first seen, cannot tell");
                                        }

                                        c(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t3.toLocaleTimeString() +
                                            ' SampleMotion ' +
                                            json.list[0].dataSourceAddress.did +
                                            motionFlag +
                                            // _t1.toLocaleTimeString() +
                                            // ' # ' +
                                            // json.list[0].list[0].value +
                                            // ' Last: ' +
                                            // _t2.toLocaleTimeString() +
                                            ' in ' + json.locationId
                                        )
                                    }
                                    break
                                case 'SampleAsset': // sampleAsset- free occupied ismotion isnomotion
                                    {
                                        _t3.setTime(json.list[0].list[0].sampleTime)
                                        // eslint-disable-next-line no-redeclare
                                        const motionFlag = ' ? ' // update new value
                                            // eslint-disable-next-line no-redeclare
                                        let temprecordObj
                                            // let motionFlag = ' ?? '; //update new value
                                        _recordObj.type = 'sampleAsset'
                                        _recordObj.Did = json.list[0].dataSourceAddress.did
                                        _recordObj.timeStamp = _t1.getTime()
                                        c(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t3.toLocaleTimeString() + ' ' +
                                            // ' SampleAsset ' +
                                            json.list[0].list[0].assetState.name +
                                            ' ' +
                                            json.list[0].dataSourceAddress.did +
                                            // ' @ ' +
                                            // _t3.toLocaleTimeString() +
                                            // '  ' +
                                            // json.list[0].list[0].assetState.name +
                                            ' in ' + json.locationId
                                        )
                                        switch (json.list[0].list[0].assetState.name) {
                                            case 'isMotion':
                                                // assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',mo,' + _t3.getTime() + '\n';
                                                _recordObj.value = 'mo'
                                                temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                                    // assetTimeStamps1.push(temprecordObj)

                                                break
                                            case 'isNoMotion':
                                                // assetTimeStamps1 += json.list[0].dataSourceAddress.did + ',nm,' + _t3.getTime() + '\n';
                                                _recordObj.value = 'nm'
                                                temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                                    // assetTimeStamps1.push(temprecordObj)
                                                break
                                            case 'free':
                                                // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',fr,' + _t3.getTime() + '\n';
                                                _recordObj.value = 'fr'
                                                temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                                    // assetTimeStamps2.push(temprecordObj)
                                                break
                                            case 'occupied':
                                                // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',oc,' + _t3.getTime() + '\n';
                                                _recordObj.value = 'oc'
                                                temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                                    // assetTimeStamps2.push(temprecordObj)
                                                break
                                            case 'missingInput':
                                                // assetTimeStamps2 += json.list[0].dataSourceAddress.did + ',mi,' + _t3.getTime() + '\n';
                                                _recordObj.value = 'mi'
                                                temprecordObj = JSON.parse(JSON.stringify(_recordObj))
                                                    // assetTimeStamps2.push(temprecordObj)
                                                break
                                            default:
                                                c(
                                                    '!Assetname ' +
                                                    json.list[0].list[0].assetState.name
                                                )
                                                break
                                        }
                                    }
                                    break
                                case 'SamplePercentage': // SamplePercentage
                                    {
                                        _t3.setTime(json.list[0].list[0].sampleTime)
                                        c(
                                            '   ' +
                                            _Counter +
                                            '# ' +
                                            _t2.toLocaleTimeString() +
                                            ' SamplePercentage ' +
                                            json.list[0].dataSourceAddress.did +
                                            ' @ ' +
                                            _t3.toLocaleTimeString() +
                                            ' Occu%:' +
                                            json.list[0].list[0].value + ' in ' + json.locationId
                                        )
                                    }
                                    break
                                case 'SampleUtilization': // SampleUtilization
                                    {
                                        _t3.setTime(json.list[0].list[0].sampleTime)
                                        c(
                                            `   ${_Counter}# ${_t2.toLocaleTimeString()} SampleUtilization ${json.list[0].dataSourceAddress.did} free:${json.list[0].list[0].free} occupied:${json.list[0].list[0].occupied} in ${json.locationId}`
                                        )
                                        // assetTimeStamps3 +=
                                        // _t2.toLocaleTimeString() +
                                        // ' AsstUT ' +
                                        // json.list[0].dataSourceAddress.did +
                                        // ' free:' +
                                        // json.list[0].list[0].free +
                                        // ' occupied:' +
                                        // json.list[0].list[0].occupied + ' in ' + json.locationId +
                                        // '\n'
                                    }
                                    break
                                case 'SampleUpState':
                                    {
                                        c(`   ${_Counter}# ${_t2.toLocaleTimeString()} SampleUpState ${json.list[0].dataSourceAddress.did} ${json.list[0].list[0].deviceUpState.name} in ${json.locationId}`)
                                        // c(JSON.stringify(json));
                                    }
                                    break
                                default:
                                    // 环境参数
                                    _t2.setTime(json.timeSent)
                                        // if json.list[0].list[0].resourceType ==
                                    c('   ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' ' + json.list[0].list[0].resourceType + ' ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].value + ' ' + (json.list[0].list[0].percentFull || '') + ' in ' + json.locationId)

                                    break
                            }
                            break
                        case 'EventType':
                            {
                                switch (json.list[0].resourceType) {
                                    case 'SlotDTO':
                                        {
                                            c(
                                                '   ' +
                                                _Counter + _t2.toLocaleTimeString() +
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
                                            c(
                                                '   ' +
                                                _Counter + _t2.toLocaleTimeString() +
                                                '# EndofDTO ' +
                                                json.list[0].dataSourceAddress.did +
                                                ' ' +
                                                json.list[0].list[0].sample.assetState.name
                                            )
                                        }
                                        break
                                    default:
                                        c(' !!!!  ' + _Counter + ' Unknown eventtype: ' + json.list[0].eventType.name)
                                        break
                                }
                            }
                            break
                        case 'EventDTO':
                            {
                                // let _tempeventObj
                                switch (json.list[0].eventType.name) { // json.list[0]json.list[0].eventType.name
                                    case 'newUnAcceptedDeviceSeenByDiscovery':
                                    case 'physicalDeviceIsNowUP':
                                    case 'physicalDeviceIsNowDOWN':
                                    case 'remoteLocationGatewayIsNowDOWN':
                                    case 'remoteLocationGatewayIsNowUP':
                                    case 'locationChanged':
                                        try { c('   ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' ' + json.list[0].eventType.name + ' ' + json.list[0].unitAddress.did + ' in ' + json.locationId) } catch (error) {
                                            console.log(error)
                                            console.log(JSON.stringify(json))
                                        }
                                        break
                                    case 'unitConfigurationChanged':
                                        try { c('   ' + _Counter + '# ' + _t2.toLocaleTimeString() + ' ' + json.list[0].eventType.name + ' ' + ' in ' + json.locationId) } catch (error) {
                                            console.log(error)
                                            console.log(JSON.stringify(json))
                                        }

                                        break
                                    default:
                                        c(' !!!!  ' + _Counter + ' Unknown events:' + json.list[0].eventType.name)
                                        break
                                }
                            }
                            break
                        default:
                            c(' !!!!  ' + _Counter + 'OTHER DATA?  ' + JSON.stringify(json))
                            break
                    }
            }
        }
    })

    connection.on('error', function(error) {
        c(' --- Connection Error: reconnect in 5 sec --' + error.toString())
        setTimeout(() => {
            startConnect()
        }, 5000)
    })

    connection.on('close', function(error) {
        c('Connection closed!' + error)
    })

    function sendMessage(message) {
        if (connection.connected) {
            const json = JSON.stringify(message, null, 1)
            json.sessionId = sessionId
            connection.sendUTF(json)
        } else {
            c("sendMessage: Couldn't send message, the connection is not open")
            client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
        }
    }

    function sendServiceRequest() {
        const request = {
            messageType: 'ServiceRequest',
            clientId: 'client-fangtang'

        }
        sendMessage(request)
    }

    function sendLoginRequest() {
        const request = {
            messageType: 'LoginRequest',
            username: username,
            password: password
        }
        sendMessage(request)
    }

    function sendGetLocationsRequest() {
        const now = new Date().getTime()
        const request = {
            messageType: 'GetLocationsRequest',
            timeSent: now
        }
        sendMessage(request)
    }

    // eslint-disable-next-line camelcase
    function sendSubscribeRequest(location_ID, dataType) {
        const now = new Date().getTime()
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
        })
    }

    function sendPeriodicRequest() {
        const now = new Date().getTime()
        const request = {
            messageType: 'PeriodicRequest',
            timeSent: now
        }
        if (heartbeatFlag === 3) {
            c('    periodic request missed (%s), will reconnect', heartbeatFlag)

            connection.close()

            // heartbeatFlag = 0
            startConnect()
        }
        sendMessage(request)

        // console.log('    periodic request send (%s)', heartbeatFlag)
        heartbeatFlag++
    }
})