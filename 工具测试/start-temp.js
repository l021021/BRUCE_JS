/* eslint-disable no-fallthrough */
/* eslint-disable eqeqeq */
// 列出所有的Location已经其下的传感器;可能需要几分钟才能收全

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus11.yanzi.se'

var username = 'frank.shen@pinyuaninfo.com'
var password = 'Internetofthing'
    // var username = "653498331@qq.com";
    // var password = "000000";

// ################################################

// For log use only
var _Counter = 0 // message counter
var _OnlineUnitsCounter = 0
var _Locations = []
var _Units = []
var TimeoutId = setTimeout(doReport, 60000)
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
    console.log('Connect Error: reconnect' + error.toString())
    beginPOLL()
})

client.on('connect', function(connection) {
    // console.log("Checking API service status with ServiceRequest.");
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        clearTimeout(TimeoutId)
        TimeoutId = setTimeout(doReport, 60000) // exit after 10 seconds idle
        console.log('timer reset  ')

        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            // if (_Counter > _logLimit) {
            //     console.log("Enough Data!")
            //     console.log(_Locations.length + " locations : " + JSON.stringify(_Locations));
            //     connection.close();
            //     doReport();
            //     process.exit();
            // } //for log use only

            // Print all messages with type
            console.log(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
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
                        console.log(json.responseCode.name)
                        console.log("Couldn't login, check your username and passoword")
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
                        console.log(json.responseCode.name)
                        console.log("Couldn't get location")
                        connection.close()
                        process.exit()
                    };
                    // sendGetUnitsRequest(537931);
                    break
                case 'GetSamplesResponse':

                    break
                case 'GetUnitsResponse':
                    if (json.responseCode.name == 'success') {
                        // console.log(JSON.stringify(json) + '\n\n');

                        var _tempunitObj

                        console.log('seeing ' + json.list.length + ' in  ' + json.locationAddress.locationId)
                        for (let index = 0; index < json.list.length; index++) { // process each response packet
                            if (json.list[index].unitTypeFixed.name == 'gateway' || json.list[index].unitAddress.did.indexOf('AP') != -1) { // console.log(json.list[index].unitAddress.did);
                                console.log('GW or AP in ' + json.locationAddress.locationId) // GW and AP are not sensor
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

                                // console.log(json.list[index].unitTypeFixed.name + '\n\n');

                                _tempunitObj = JSON.parse(JSON.stringify(unitObj))
                                _Units.push(_tempunitObj)
                                    // _UnitsCounter++;
                                if (json.list[index].lifeCycleState.name == 'present') {
                                    _OnlineUnitsCounter++
                                }
                            };
                        }

                        // console.log(_UnitsCounter + ' Units in Location:  while ' + _OnlineUnitsCounter + ' online');
                    } else {
                        console.log("Couldn't get Units")
                    }

                    break
                case 'PeriodicResponse':
                    setTimeout(sendPeriodicRequest, 60000)
                        // console.log(_Counter + '# ' + "periodic response-keepalive");
                    break
                case 'SubscribeResponse':

                case 'SubscribeData':

                default:
                    console.log('!!!! cannot understand')
                        // connection.close();
                    break
            }
        }
    })

    connection.on('error', function(error) {
        console.log('Connection Error: reconnect' + error.toString())
        beginPOLL()
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
        console.log('sending request for ' + locationID)
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
    var output = ''
    var t = new Date().getTime()
    var timestamp = new Date()
    timestamp.setTime(t)
    console.log('Reporting：')
    console.log(timestamp.toLocaleTimeString() + '')
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

    for (const key in _Locations) {
        output += _Locations[key].locationId + ' or ' + _Locations[key].name + '\n'
    }
    console.log('total ' + _Locations.length + ' locations: \n' + output) // print all locations with name
    console.log('total ' + _Units.length + ' Units: \n') // print all Units with name

    // match sensor to locations
    for (let i = 0; i < _Units.length; i++) { // TODO: for each could be wrong
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
    for (let j = 0; j < _Locations.length; j++) { // TODO：for each
        if (_Locations[j].gwOnline) { console.log('' + _Locations[j].locationId + '-' + _Locations[j].name + ' is online  with ' + _Locations[j].Onlineunits + ' active sensors, ' + _Locations[j].Allunits + ' logical') }
    }
    console.log('total ' + _Units.length + ' logical sensors live while ' + _OnlineUnitsCounter + ' sensors online') // sum up

    // //list all online physical sensors
    // for (let j = 0; j < _Units.length; j++) {
    //     if (_Units[j].lifeCycleState == 'present')
    //         console.log(_Units[j].did + ' in ' + _Units[j].locationId);
    // }

    // //list all online logical  sensors
    // for (let j = 0; j < _Units.length; j++) {
    //     if (_Units[j].lifeCycleState == 'subUnit' && _Units[j].isChassis == false)
    //         console.log(_Units[j].did + ' as a ' + _Units[j].type + ' in ' + _Units[j].locationId);
    // }

    // _Units.forEach(function (x, i, a) {
    //     if (a[1].lifeCycleState == 'subUnit' && a[i].isChassis == false) console.log(_Units[key1].did + ' as a ' + _Units[key1].type + ' in ' + _Units[key1].locationId);

    // });
    t = new Date().getTime()
    timestamp = new Date()
    timestamp.setTime(t)
    console.log(timestamp.toLocaleTimeString() + 'ok!')
    clearTimeout(TimeoutId)
    process.exit()
}

beginPOLL()
