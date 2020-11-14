/* eslint-disable camelcase */
/* eslint-disable no-fallthrough */
/* eslint-disable eqeqeq */
// 列出所有的Location已经其下的传感器;可能需要几分钟才能收全

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus20.yanzi.se'

var username = 'frank.shen@pinyuaninfo.com'
var password = 'Ft@Sugarcube99'
    // var username = "653498331@qq.com";
    // var password = "000000";

// ################################################

// For log use only
var _Counter = 0 // message counter
const c = console.log
const idleTimeout = 1000 * 60
var _OnlineUnitsCounter = 0
var _Locations = []
var _Units = []
const logTime = 86400000 * 0.5 // DAY
var reportPeriod = 86400000 * 10
var TimeoutId = setTimeout(doReport, idleTimeout)
var _requestCount = 0
var _responseCount = 0
var sensorEvents = []

// Create a web socket client initialized with the options as above
var client = new WebSocketClient()

// All Objs definition
var locationObj = {

    locationId: '123456',
    serverDid: 'EUI64-0090DAFFFF0040A9',
    accountId: '262468578',
    name: 'Beach House',
    gwdid: 'EUI64-12411261342',
    units: 0,
    Allunits: 0,
    Onlineunits: 0,
    gwOnline: false
        // "activityLevel": "medium"

}

var unitObj = {
    did: '',
    locationId: '',
    serverDid: '',
    productType: '',
    lifeCycleState: '',
    isChassis: '',
    chassisDid: '',
    nameSetByUser: '',
    type: ''

}

// Program body
client.on('connectFailed', function(error) {
    c('Connect Error: reconnect' + error.toString())
    beginPOLL()
})

client.on('connect', function(connection) {
    // c("Checking API service status with ServiceRequest.");
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        clearTimeout(TimeoutId)
        TimeoutId = setTimeout(doReport, idleTimeout) // exit after 10 seconds idle
            //    c('timer reset  ')

        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            // if (_Counter > _logLimit) {
            //     c("Enough Data!")
            //     c(_Locations.length + " locations : " + JSON.stringify(_Locations));
            //     connection.close();
            //     doReport();
            //     process.exit();
            // } //for log use only

            // Print all messages with type
            // c(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    if (json.responseCode.name == 'success') {
                        sendPeriodicRequest() // as keepalive
                        sendGetLocationsRequest() // not mandatory
                            // sendSubscribeRequest(LocationId); //test one location
                            // sendSubscribeRequest_lifecircle(LocationId); //eventDTO
                    } else {
                        c(json.responseCode.name)
                        c("Couldn't login, check your username and passoword")
                        connection.close()
                        process.exit()
                    }
                    break
                case 'GetLocationsResponse':
                    if (json.responseCode.name == 'success') {
                        // UPDATE location IDs
                        if (json.list.length != 0) { // 收到一组新的location
                            for (var i = 0; i < json.list.length; i++) {
                                let _locationExist = false

                                for (const key in _Locations) { // already exits in Array?
                                    if (_Locations[key].locationID || (_Locations[key].locationID == json.list[i].locationAddress.locationId)) {
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
                                    _templocationObj = JSON.parse(JSON.stringify(locationObj)) // deep copy
                                    _Locations.push(_templocationObj)
                                    sendGetUnitsRequest(json.list[i].locationAddress.locationId) // get units under this location
                                }
                            }
                        }
                    } else {
                        c(json.responseCode.name)
                        c("Couldn't get location")
                        connection.close()
                        process.exit()
                    };
                    // sendGetUnitsRequest(537931);
                    break
                case 'GetSamplesResponse':
                    if (json.responseCode.name === 'success' && json.sampleListDto.list) {
                        c('receiving ' + json.sampleListDto.list.length + ' lists for ' + json.sampleListDto.dataSourceAddress.did + ' # ' + ++_responseCount)
                            // sensorEvents[json.sampleListDto.dataSourceAddress.did] = json.sampleListDto.list.length

                        for (let index = 0; index < json.sampleListDto.list.length; index++) {
                            if (json.sampleListDto.list[index].deviceUpState.name.indexOf('going') >= 0) {
                                // c('receiving ' + json.sampleListDto.list.length + ' lists for ' + json.sampleListDto.dataSourceAddress.did + ' # ' + ++_responseCount)
                                sensorEvents[json.sampleListDto.dataSourceAddress.locationId + '_' + json.sampleListDto.dataSourceAddress.did] = (sensorEvents[json.sampleListDto.dataSourceAddress.locationId + '_' + json.sampleListDto.dataSourceAddress.did] + 1) || 1
                            }
                            // _listCount += json.sampleListDto.list.length json.sampleListDto.list[0].deviceUpState.name
                            // dataFile.write(JSON.stringify(json.sampleListDto.list).replace(/resourceType/g, 'DID').replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleUpState/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did))
                            // c(JSON.stringify(json.sampleListDto.list).replace(/resourceType/g, 'DID').replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleUpState/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did))
                        }
                    } else {
                        // c(' empty list # ' + ++_responseCount)
                        // c(JSON.stringify(json))
                    }

                    break
                case 'GetUnitsResponse':
                    if (json.responseCode.name == 'success') {
                        // c(JSON.stringify(json) + '\n\n');

                        var _tempunitObj

                        // c('seeing ' + json.list.length + ' in  ' + json.locationAddress.locationId)
                        for (let index = 0; index < json.list.length; index++) { // process each response packet
                            if (json.list[index].unitTypeFixed.name == 'gateway' || json.list[index].unitAddress.did.indexOf('AP') != -1) { // c(json.list[index].unitAddress.did);
                                // c('GW or AP in ' + json.locationAddress.locationId)
                                // sendGetSamplesRequest(json.locationAddress.locationId, json.list[index].unitAddress.did, Date.now() - logTime, Date.now())
                                // c('checking ' + json.locationAddress.locationId + '->' + json.list[index].unitAddress.did + ' # ' + ++_requestCount)
                            } else {
                                // record all sensors
                                unitObj.did = json.list[index].unitAddress.did //
                                unitObj.locationId = json.locationAddress.locationId
                                unitObj.chassisDid = json.list[index].chassisDid
                                unitObj.productType = json.list[index].productType
                                unitObj.lifeCycleState = json.list[index].lifeCycleState.name
                                unitObj.isChassis = json.list[index].isChassis
                                unitObj.nameSetByUser = json.list[index].nameSetByUser
                                unitObj.serverDid = json.list[index].unitAddress.serverDid

                                unitObj.type = json.list[index].unitTypeFixed.name

                                // c(json.list[index].unitTypeFixed.name + '\n\n');
                                // json.list[0].isChassis 'true false
                                // json.list[0].chassisDid

                                _tempunitObj = JSON.parse(JSON.stringify(unitObj))
                                _Units.push(_tempunitObj)
                                    // _UnitsCounter++;
                                if (json.list[index].lifeCycleState.name == 'present') {
                                    _OnlineUnitsCounter++
                                }
                                if (unitObj.isChassis) {
                                    sendGetSamplesRequest(unitObj.locationId, unitObj.did, Date.now() - logTime, Date.now())
                                        // c('checking ' + unitObj.locationId + '->' + unitObj.did + ' # ' + ++_requestCount)
                                }
                            };
                        }

                        // c(_UnitsCounter + ' Units in Location:  while ' + _OnlineUnitsCounter + ' online');
                    } else {
                        c("Couldn't get Units")
                    }

                    break
                case 'PeriodicResponse':
                    setTimeout(sendPeriodicRequest, 600000)
                        // c(_Counter + '# ' + "periodic response-keepalive");
                    break
                case 'SubscribeResponse':

                case 'SubscribeData':

                default:
                    c('!!!! cannot understand')
                        // connection.close();
                    break
            }
        }
    })

    connection.on('error', function(error) {
        c('Connection Error: reconnect' + error.toString())
        beginPOLL()
    })

    connection.on('close', function() {
        c('Connection closed!')
    })

    function sendMessage(message) {
        if (connection.connected) {
            // Create the text to be sent
            var json = JSON.stringify(message, null, 1)
                //    c('sending' + JSON.stringify(json));
            connection.sendUTF(json)
        } else {
            c("sendMessage: Couldn't send message, the connection is not open")
        }
    }

    function sendServiceRequest() {
        var request = {
            messageType: 'ServiceRequest',
            clientId: 'client-fangtang'

        }
        sendMessage(request)
    }

    function sendGetSamplesRequest(locationId, deviceID, timeStart_mili, timeEnd_mili) {
        if (timeStart_mili > timeEnd_mili) {
            c('Wrong Date.')
            return null
        }
        if (timeEnd_mili - timeStart_mili >= reportPeriod) {
            var request = {
                    messageType: 'GetSamplesRequest',
                    dataSourceAddress: {
                        resourceType: 'DataSourceAddress',
                        did: deviceID,
                        locationId: locationId
                    },
                    timeSerieSelection: {
                        resourceType: 'TimeSerieSelection',
                        timeStart: timeStart_mili,
                        timeEnd: timeStart_mili + reportPeriod
                    }
                }
                // push message in que
                // c('  request : ' + request.dataSourceAddress.did + ' ' + request.timeSerieSelection.timeStart + ' #:' + ++_requestCount)
            sendMessage(request)
            sendGetSamplesRequest(
                locationId, // 递归
                deviceID,
                timeStart_mili + reportPeriod,
                timeEnd_mili
            )
        } else {
            var request = {
                    messageType: 'GetSamplesRequest',
                    dataSourceAddress: {
                        resourceType: 'DataSourceAddress',
                        did: deviceID,
                        locationId: locationId
                    },
                    timeSerieSelection: {
                        resourceType: 'TimeSerieSelection',
                        timeStart: timeStart_mili,
                        timeEnd: timeEnd_mili
                    }
                }
                //   c('  request : ' + request.dataSourceAddress.did + ' ' + request.timeSerieSelection.timeStart + ' #:' + ++_requestCount)
            sendMessage(request)
        }
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
            // c('sending request for ' + locationID)
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
        // c("Connecting to wss://" + cirrusAPIendpoint + "/cirrusAPI using username " + username);
}

function doReport() {
    var output = ''
    var t = new Date().getTime()
    var timestamp = new Date()
    timestamp.setTime(t)
    c('Reporting：')
    c(timestamp.toLocaleTimeString() + '')
        // sorting
    _Locations.sort(function(a, b) {
        var x = a.locationId
        var y = b.locationId
        if (x > y) return 1
        if (x < y) return -1
        return 0
    })
    _Units.sort(function(a, b) {
        var x = a.locationId
        var y = b.locationId
        if (x > y) return 1
        if (x < y) return -1
        return 0
    })

    // record all  Locations

    // for (const key in _Locations) {
    //     output += _Locations[key].locationId + ' or ' + _Locations[key].name + '\n'
    // }
    c('total ' + _Locations.length + ' locations: \n' + output) // print all locations with name
    c('total ' + _Units.length + ' Units: \n') // print all Units with name

    // match sensor to locations
    for (let i = 0; i < _Units.length; i++) {
        for (let j = 0; j < _Locations.length; j++) { // update to its locations
            if (_Locations[j].locationId == _Units[i].locationId) { // Location match
                _Locations[j].Allunits++
                    if (_Units[i].lifeCycleState == 'present') { // mark live gateways
                        _Locations[j].gwOnline = true // Location Online
                        _Locations[j].Onlineunits++ // mark online sensors
                    }
                if (_Units[i].isChassis == 'true') {
                    _Locations[j].units++
                } // mark physical sensors
                break // 跳出循环
            }
        }
    }

    // list each active location with sensors
    for (let j = 0; j < _Locations.length; j++) {
        if (_Locations[j].gwOnline) { c('' + _Locations[j].locationId + '-' + _Locations[j].name + ' is online  with ' + _Locations[j].Onlineunits + ' active sensors, ' + _Locations[j].Allunits + ' logical') }
    }
    c('total ' + _Units.length + ' logical sensors live while ' + _OnlineUnitsCounter + ' sensors online') // sum up

    scan_map(sensorEvents)
    c('Ordered by events ')

    scan_map1(sensorEvents)
    c('Ordered by location ')

    t = new Date().getTime()
    timestamp = new Date()
    timestamp.setTime(t)
    c(timestamp.toLocaleTimeString() + 'ok!')
    clearTimeout(TimeoutId)
    const ordered = []

    // Object.keys(sensorEvents).sort().forEach(function (key) {
    //     ordered[key] = sensorEvents[key]
    // })

    process.exit()
}

function scan_map(arr) {
    c('\n Listing Stored Events: \n')
    const orderedArr = []
    let i = 0
    for (var key in arr) { // 这个是关键
        if (typeof(arr[key]) === 'array' || typeof(arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            orderedArr[i] = []
            orderedArr[i][0] = key.toString()
            orderedArr[i][1] = arr[key]
            i++
        }
    }
    // console.log('      ' + key + ' --- ' + arr[key])
    orderedArr.sort(function(a, b) { return b[1] - a[1] })
    for (let index = 0; index < orderedArr.length; index++) {
        c(orderedArr[index][0] + '---' + orderedArr[index][1])
    }
}

function scan_map1(arr) {
    c('\n Listing Stored Events: \n')
    const orderedArr = []
    let i = 0
    for (var key in arr) { // 这个是关键
        if (typeof(arr[key]) === 'array' || typeof(arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            orderedArr[i] = []
            orderedArr[i][0] = key.toString()
            orderedArr[i][1] = arr[key]
            i++
        }
    }
    // console.log('      ' + key + ' --- ' + arr[key])
    orderedArr.sort(function(a, b) {
        if (b[0] > a[0]) return -1
        if (b[0] < a[0]) return 1
    })
    for (let index = 0; index < orderedArr.length; index++) {
        c(orderedArr[index][0] + '---' + orderedArr[index][1])
    }
}

function scan_array(arr) {
    // c('\n Listing Stored Events: \n')
    for (var key in arr) { // 这个是关键
        if (typeof(arr[key]) === 'array' || typeof(arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            console.log('      ' + key + ' --- ' + arr[key])
        }
    }
}
beginPOLL()