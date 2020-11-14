/* eslint-disable no-redeclare */
/* eslint-disable eol-last */
/* eslint-disable camelcase */
/* eslint-disable no-fallthrough */
/* eslint-disable eqeqeq */
// 列出所有的Location已经其下的传感器;可能需要几分钟才能收全

// TODO: sensor 不对

var WebSocketClient = require('websocket').client
const fs = require('fs')

var cirrusAPIendpoint = 'cirrus11.yanzi.se'

var username = 'frank.shen@pinyuaninfo.com'
var password = 'Internetofthing'
const locationId = '229349' // fangtang
// const locationId = '581669' // 36
// const locationId = '399621' // 4u
// const locationId = '521209' // wafer shanghai
//const locationId = '797296' // novah


const startDate = '2019/10/31/00:00:00'
const endDate = '2019/12/1/13:59:59'
var c = console.log

const dataFile = fs.createWriteStream('../log/' + locationId + '_' + startDate.replace(/[/:]/gi, '_') + '_' + endDate.replace(/[/:]/gi, '_') + '.json', { encoding: 'utf8' })

// var username = "653498331@qq.com";
// var password = "000000";

// ################################################

// For log use only
var _Counter = 0 // message counter
var _requestCount = 0
var _responseCount = 0

var _Units = []

// const _24Hour = 86400000
const _12Hour = 10800000
var TimeoutId = setTimeout(doReport, 50000)
// Create a web socket client initialized with the options as above
var client = new WebSocketClient()

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
client.on('connectFailed', function (error) {
    c('Connect Error: reconnect' + error.toString())
    beginPOLL()
})

client.on('connect', function (connection) {
    // c("Checking API service status with ServiceRequest.");
    sendServiceRequest()

    // Handle messages
    connection.on('message', function (message) {
        clearTimeout(TimeoutId)
        TimeoutId = setTimeout(doReport, 50000) // exit after 10 seconds idle
        // c('timer reset  ')

        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data)
            var t = new Date().getTime()
            var timestamp = new Date()
            timestamp.setTime(t)
            _Counter = _Counter + 1 // counter of all received packets

            // Print all messages with type
            // c(_Counter + '# ' + timestamp.toLocaleTimeString() + ' RCVD_MSG:' + json.messageType)
            switch (json.messageType) {
                case 'ServiceResponse':
                    sendLoginRequest()
                    break
                case 'LoginResponse':
                    if (json.responseCode.name == 'success') {
                        // sendPeriodicRequest() // as keepalive
                        // sendGetLocationsRequest() // not mandatory
                        sendGetUnitsRequest(locationId) // get units from location
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

                    break
                case 'GetSamplesResponse':
                    //_responseCount++;
                    if (json.responseCode.name === 'success' && json.sampleListDto.list) {
                        c('receiving ' + json.sampleListDto.list.length + ' lists for ' + json.sampleListDto.dataSourceAddress.did + ' # ' + ++_responseCount)
                        // json.sampleListDto.list.length json.sampleListDto.dataSourceAddress.variableName.name

                        dataFile.write(JSON.stringify(json.sampleListDto.list).replace(/resourceType/g, 'DID').replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleAsset/g, json.sampleListDto.dataSourceAddress.did))

                        // Process records
                    } else {
                        c('0 list # ' + ++_responseCount)
                    }

                    break
                case 'GetUnitsResponse':
                    if (json.responseCode.name == 'success') {
                        // c(JSON.stringify(json) + '\n\n');

                        var _tempunitObj

                        c('seeing ' + json.list.length + ' in  ' + json.locationAddress.locationId)
                        for (let index = 0; index < json.list.length; index++) { // process each response packet
                            if (json.list[index].unitTypeFixed.name == 'gateway' || json.list[index].unitAddress.did.indexOf('AP') != -1) { // c(json.list[index].unitAddress.did);
                                c('GW or AP in ' + json.locationAddress.locationId) // GW and AP are not sensor
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

                                _tempunitObj = JSON.parse(JSON.stringify(unitObj))
                                _Units.push(_tempunitObj)
                                if (unitObj.type === 'inputMotion' || unitObj.did.indexOf('UUID') >= 0) { sendGetSamplesRequest(unitObj.did, Date.parse(startDate), Date.parse(endDate)) }
                                // _UnitsCounter++;
                                // if (json.list[index].lifeCycleState.name == 'present') {
                                //     _OnlineUnitsCounter++
                                // }
                            };
                        }

                        // c(_UnitsCounter + ' Units in Location:  while ' + _OnlineUnitsCounter + ' online');
                    } else {
                        c("Couldn't get Units")
                    }

                    break
                case 'PeriodicResponse':
                    // setTimeout(sendPeriodicRequest, 60000)
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

    connection.on('error', function (error) {
        c('Connection Error: reconnect' + error.toString())
        beginPOLL()
    })

    connection.on('close', function () {
        c('Connection closed!')
    })

    function sendGetSamplesRequest(deviceID, timeStart_mili, timeEnd_mili) {
        if (timeStart_mili > timeEnd_mili) {
            c('Wrong Date.')
            return null
        }
        if (timeEnd_mili - timeStart_mili >= _12Hour) {
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
                    timeEnd: timeStart_mili + _12Hour
                }
            }
            sendMessage(request)
            //_requestCount++
            c('requesting : ' + request.dataSourceAddress.did + ' ' + request.timeSerieSelection.timeStart + ' #:' + ++_requestCount)
            sendGetSamplesRequest(
                deviceID,
                timeStart_mili + _12Hour,
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
            // _requestCount++
            c('requesting : ' + request.dataSourceAddress.did + ' ' + request.timeSerieSelection.timeStart + ' #:' + ++_requestCount)
            sendMessage(request)
        }
    }

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

    function sendLoginRequest() {
        var request = {
            messageType: 'LoginRequest',
            username: username,
            password: password
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
        c('sending request for ' + locationID)
        sendMessage(request)
    }
})

function beginPOLL() {
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
    // c("Connecting to wss://" + cirrusAPIendpoint + "/cirrusAPI using username " + username);
}

function doReport() {
    var t = new Date().getTime()
    var timestamp = new Date()
    timestamp.setTime(t)
    c('Reporting：send ' + _requestCount + ' recvd ' + _responseCount)
    c(timestamp.toLocaleTimeString() + '')
    // sorting

    _Units.sort(function (a, b) {
        var x = a.locationId
        var y = b.locationId
        if (x > y) return 1
        if (x < y) return -1
        return 0
    })

    t = new Date().getTime()
    timestamp = new Date()
    timestamp.setTime(t)
    // c(timestamp.toLocaleTimeString() + 'ok!')
    // clearTimeout(TimeoutId)
    process.exit()
}

beginPOLL()