/* 这个是传感器测试工具，测试网关下所有传感器的motion状态是否正常，测试过程如下：

        保持传感器没人状态至少10分钟；
        启动程序；保持无人状态；
        30分钟后触发所有传感器；
        保持无人状态；
        10分钟后，再次触发传感器；
        保持无人状态；
        保持约20分钟的无人；
        根据传感器数量估计——logLimit取值；
        大约是传感器数量X70；
        */

// let LocationId = '290596' // az
// let LocationId = '879448' // az
// let LocationId = '447223' // az 
// Location ID and Device ID, please change this to your own, can be found in Yanzi Live
// let LocationId = '229349' //fangtang
// let LocationId = '188559' //1001

// let LocationId = '938433' //1001
// let LocationId = '230381' // JOS_HK
// let LocationId = '976522' // AZ-p3-6
let LocationId = '432812' // AZ-p3-5
// let LocationId = '141828' // AZ-p3-4
let _logLimit = 500 // will exit when this number of messages has been logged


let cirrusAPIendpoint = 'cirrus20.yanzi.se'
let WebSocketClient = require('websocket').client
let username = 'frank.shen@pinyuaninfo.com'
let password = 'Ft@Sugarcube99'

// For log use only
let _Counter = 0 // message counter
let _Counter1 = 0 // sensor counter/
let _Units = new Set()
const unitObj = {
    did: '',
    locationId: '',
    // serverDid: '',
    // productType: '',
    lifeCycleState: '',
    isChassis: '',
    // chassisDid: '',
    nameSetByUser: '',
    type: ''
}
// let _Locations = [];
let sensorArray = []
// 二维数组，0：传感器ID，1：motion计数，2：Nomotion计数;3:当前value
let motionTimeStamps

let _t1 = new Date()
for (let
    i = 1; i < 4; i++) {
    sensorArray[i] = []
}
//分别记录 初次/motion,nomotion记录,以及value值
sensorArray[0] = new Set()
// Create a web socket client initialized with the options as above
let client = new WebSocketClient()

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString())
    connection.close()
})

client.on('connect', function (connection) {
    // console.log("Checking API service status with ServiceRequest.");
    sendServiceRequest()
    // Handle messages
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            let
                json = JSON.parse(message.utf8Data)
            let
                t = new Date().getTime()
            let
                timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            if (_Counter > _logLimit) {
                console.log('Enough Data, I will quit now!')
                connection.close()

                // console.log('Total sensors: ' + _Counter1)
                console.log('传感器列表');
                // console.log(sensorArray[0].length)
                console.table(sensorArray[0])
                console.log(' 传感器检测到的运动(value+1)记录数');
                console.table(sensorArray[1])
                console.log(' 传感器发出的静态(value不变)记录数');
                console.table(sensorArray[2])
                console.log(' 传感器value');
                console.table(sensorArray[3])



                process.exit()
            } // for log use only

            // Print all messages with DTO type
            // console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType);
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    if (json.responseCode.name === 'success') {
                        sendPeriodicRequest() // as keepalive
                        sendSubscribeRequest(LocationId) // test
                        sendSubscribeRequest_lifecircle(LocationId) // eventDTO
                        sendSubscribeRequest_battery(LocationId) // eventDTO
                        sendGetUnitsRequest(LocationId) // get units under this location

                    } else {
                        console.log(json.responseCode.name)
                        console.log("Couldn't login, check your username and passoword")
                        connection.close()
                        process.exit()
                    }
                    break
                case 'SubscribeData':
                    switch (json.list[0].resourceType) {
                        case 'SampleList':
                            // Sensor DATA
                            switch (json.list[0].dataSourceAddress.variableName.name) {
                                case 'motion': // sampleMotion
                                    sensorArray[0].add(json.list[0].dataSourceAddress.did) //sensor名集合
                                    let temp1 = sensorArray[3][json.list[0].dataSourceAddress.did] || -1 //当前计数
                                    sensorArray[3][json.list[0].dataSourceAddress.did] = json.list[0].list[0].value // latest value
                                    if (temp1 < json.list[0].list[0].value && temp1 !== -1) { // Value changed!
                                        console.log(' ---  value changed in ' + json.list[0].dataSourceAddress.did)
                                        sensorArray[1][json.list[0].dataSourceAddress.did]++

                                    } else if (temp1 === json.list[0].list[0].value) {
                                        console.log(' ---  value unchanged in ' + json.list[0].dataSourceAddress.did)
                                        sensorArray[2][json.list[0].dataSourceAddress.did]++
                                    } else {
                                        // sensorArray[0][json.list[0].dataSourceAddress.did] = 1
                                        sensorArray[1][json.list[0].dataSourceAddress.did] = 0
                                        sensorArray[2][json.list[0].dataSourceAddress.did] = 0

                                        console.log(' ---  first seen! ' + json.list[0].dataSourceAddress.did)
                                    };

                                    break
                                default:
                                    console.log(_Counter + '# ' + 'sensor data: ' + json.list[0].dataSourceAddress.variableName.name + ' ' + json.list[0].dataSourceAddress.did + ' ' + json.list[0].list[0].value)
                            }
                            break
                        default:
                    }
                    break
                case 'GetUnitsResponse':
                    if (json.responseCode.name === 'success') {
                        let _tempunitObj;
                        // let unitObj
                        let _UnitsCounter
                        let _OnlineUnitsCounter

                        console.log(
                            `seeing ${json.list.length} devices in  ${json.locationAddress.locationId}`
                        )
                        for (let iList = 0; iList < json.list.length; iList++) {
                            // process each response packet
                            if (
                                json.list[iList].unitTypeFixed.name !== 'gateway' &&
                                json.list[iList].unitAddress.did.indexOf('AP') == -1
                            ) {

                                // record all sensors
                                unitObj.did = json.list[iList].unitAddress.did
                                unitObj.locationId = json.locationAddress.locationId
                                unitObj.lifeCycleState = json.list[iList].lifeCycleState.name
                                unitObj.isChassis = json.list[iList].isChassis
                                unitObj.nameSetByUser = json.list[iList].nameSetByUser
                                // unitObj.serverDid = json.list[index].unitAddress.serverDid

                                unitObj.type = json.list[iList].unitTypeFixed.name

                                if (unitObj.isChassis === true) {
                                    console.log(unitObj.did);

                                    _tempunitObj = JSON.parse(JSON.stringify(unitObj))
                                    _Units.add(_tempunitObj)
                                    _UnitsCounter++
                                }
                                if (json.list[iList].lifeCycleState.name === 'present') {
                                    _OnlineUnitsCounter++
                                }
                            }
                        }

                        // console.log(_UnitsCounter + ' Units in Location:  while ' + _OnlineUnitsCounter + ' online');
                    } else {
                        console.log("Couldn't get Units")
                    }
                    // json.list[0].lifeCycleState.name
                    break
                default:
                    // console.log('!!!! cannot understand' + json)
                    // connection.close();
                    break
            }
        }
    })

    connection.on('error', function (error) {
        console.log('Connection Error: ' + error.toString())
    })

    connection.on('close', function (error) {
        console.log('Connection closed!')
    })

    function sendMessage(message) {
        if (connection.connected) {
            // Create the text to be sent
            let
                json = JSON.stringify(message, null, 1)
            //    console.log('sending' + JSON.stringify(json));
            connection.sendUTF(json)
        } else {
            console.log("sendMessage: Couldn't send message, the connection is not open")
        }
    }

    function sendServiceRequest() {
        let
            request = {
                messageType: 'ServiceRequest'
            }
        sendMessage(request)
    }

    function sendLoginRequest() {
        let
            request = {
                messageType: 'LoginRequest',
                username: username,
                password: password
            }
        sendMessage(request)
    }

    function sendGetLocationsRequest() {
        let
            now = new Date().getTime()
        // let
        nowMinusOneHour = now - 60 * 60 * 1000;
        let
            request = {
                messageType: 'GetLocationsRequest',
                timeSent: now
            }
        sendMessage(request)
    }

    function sendGetSamplesRequest() {
        let
            now = new Date().getTime()
        let
            nowMinusOneHour = now - 60 * 60 * 1000
        let
            request = {
                messageType: 'GetSamplesRequest',
                dataSourceAddress: {
                    resourceType: 'DataSourceAddress',
                    did: deviceID,
                    locationId: locationId,
                    variableName: {
                        resourceType: 'VariableName',
                        name: 'temperatureC'
                    }
                },
                timeSerieSelection: {
                    resourceType: 'TimeSerieSelection',
                    timeStart: nowMinusOneHour,
                    timeEnd: now
                }
            }
        sendMessage(request)
    }

    function sendGetUnitsRequest() {
        let
            now = new Date().getTime()
        let
            nowMinusOneHour = now - 60 * 60 * 1000
        let
            request = {

                messageType: 'GetUnitsRequest',
                timeSent: now,
                locationAddress: {
                    resourceType: 'LocationAddress',
                    locationId: LocationId
                }
            }

        sendMessage(request)
    }

    function sendSubscribeRequest(location_ID) {
        let
            now = new Date().getTime()
        //   let
        nowMinusOneHour = now - 60 * 60 * 1000;
        let
            request = {
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
        let
            now = new Date().getTime()
        //   let
        nowMinusOneHour = now - 60 * 60 * 1000;
        let
            request = {
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

    function sendSubscribeRequest_battery(location_ID) {
        let
            now = new Date().getTime()
        //   let
        nowMinusOneHour = now - 60 * 60 * 1000;
        let
            request = {
                messageType: 'SubscribeRequest',
                timeSent: now,
                unitAddress: {
                    resourceType: 'UnitAddress',
                    locationId: location_ID
                },
                subscriptionType: {
                    resourceType: 'SubscriptionType',
                    name: 'battery' // data   |  lifecircle  |  config
                }
            }

        sendMessage(request)
    }

    function sendPeriodicRequest() {
        let
            now = new Date().getTime()
        let
            request = {
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