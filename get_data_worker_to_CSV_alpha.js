/*worker 程序,配合main_multithread_runner工作,从命令行传入参数,直接生成python陈晓旭的输入CSV文件*/
let WebSocketClient = require('websocket').client
const fs = require('fs')

let client = new WebSocketClient();
let cirrusAPIendpoint = 'cirrus20.yanzi.se';
let username = 'frank.shen@pinyuaninfo.com';
let password = 'Ft@Sugarcube99';
const filter = [''] //['writing', 'rec'] log输出的过滤器

function c(data) {
    let match = false
    filter.forEach(element => {
        if (data.indexOf(element) >= 0) {
            match = true
        }
    })
    if (match === true) {
        try {
            console.log(data)
        } catch (error) {
            console.log(error)
        }
    }
}

let timeStamp = new Date()
timeStamp.setTime(Date.now())

console.log(timeStamp.toLocaleTimeString() + '--- Get data Worker working with:')

process.argv.forEach((val, index) => {
    console.log(`${index}: ${val}`);
});


const locationId = process.argv[2] || '503370'
const startDate = process.argv[3] || '2020/10/09/00:00:00'
const endDate = process.argv[4] || '2020/10/10/23:59:59'
const EUorUU = process.argv[5] || 'Motion'

const dataFile = fs.createWriteStream('../log/' + locationId + '_' + startDate.replace(/[/:]/gi, '_') + '_' + endDate.replace(/[/:]/gi, '_') + '_' + EUorUU + '.csv', { encoding: 'utf8' })

const TimeoutId = setTimeout(doReport, 30000) //三十秒没有收到数据,则超时重连
const window_limit = 3
let heartbeatFlag = 0
let reportPeriod = (EUorUU === 'Motion') ? 3600000 * 8 * 3 : 3600000 * 8 * 90 //取数据的间隔一天或者十天,满足最多2000的限制
    // For temp log use only
let _Counter = 0 // message counter
let _requestCount = 0
let _responseCount = 0
let _windowSize = 0
let _listCount = 0 // 每个传感器的记录总数
let _Units = []
let _records = []


let messageQueue = new Queue()


let unitObj = {
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

dataFile.on('finish',
    function() { process.exit() })
dataFile.on('destroy',
    function() { process.exit() })

function Queue() {
    this.dataStore = []
    this.enqueue = enqueue
    this.dequeue = dequeue
    this.front = head
    this.back = tail
    this.toString = toString
    this.empty = empty
    this.length = this.dataStore.length
}

function enqueue(element) {
    this.dataStore.push(element)
}

function dequeue() {
    return this.dataStore.shift()
}

function head() {
    return this.dataStore[0]
}

function tail() {
    return this.dataStore[this.dataStore.length - 1]
}

function toString() {
    let retStr = ''
    for (let i = 0; i < this.dataStore.length; ++i) {
        retStr += this.dataStore[i] + '\n'
    }
    return retStr
}

function empty() {
    if (this.dataStore.length == 0) {
        return true
    } else {
        return false
    }
}

// Program body
client.on('connectFailed', function(error) {
    c('Connect Error: reconnect' + error.toString())
    start()
})

client.on('connect', function(connection) {
    // c("Checking API service status with ServiceRequest.");
    sendServiceRequest()

    // Handle messages
    connection.on('message', function(message) {
        clearTimeout(TimeoutId)
            // TimeoutId = setTimeout(doReport, 50000) // exit after 10 seconds idle
            // c('timer reset  ')

        if (message.type === 'utf8') {
            let json = JSON.parse(message.utf8Data)
            let t = new Date().getTime()
            let timestamp = new Date()
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
                        // sendGetLocationsRequest() // not mandatory
                        sendGetUnitsRequest(locationId) // get units from location
                        setInterval(sendPeriodicRequest, 60000) // as keepalive
                            // sendSubscribeRequest(LocationId); //test one location
                            // sendSubscribeRequest_lifecircle(LocationId); //eventDTO
                    } else {
                        console.log(json.responseCode.name)
                        console.log("Couldn't login, check your username and passoword")
                        connection.close()
                        process.exit()
                    }
                    break
                case 'GetSamplesResponse': //写入历史数据
                    if (json.responseCode.name === 'success' && json.sampleListDto.list) { // json.sampleListDto.dataSourceAddress.did
                        c('receiving ' + json.sampleListDto.list.length + ' lists for ' + json.sampleListDto.dataSourceAddress.did + ' # ' + ++_responseCount)
                        _listCount += json.sampleListDto.list.length
                        _records = json.sampleListDto.list
                            /*


list:

{"resourceType":"SampleMotion","sampleTime":1602172842994,"value":37536,"timeLastMotion":1602141616386}










                            */








                        console.log(JSON.stringify(_records[0]))
                            /* dataFile.write(JSON.stringify(json.sampleListDto.list).replace(/resourceType/g, 'DID').replace(/SampleTemp/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleUpState/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleAsset/g, json.sampleListDto.dataSourceAddress.did)) // 修改了第一个replace . 插入sample报文的did
                             */
                            // c(JSON.stringify(json.sampleListDto.list).replace(/resourceType/g, 'DID').replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleUpState/g, json.sampleListDto.dataSourceAddress.did).replace(/SampleMotion/g, json.sampleListDto.dataSourceAddress.did))
                    } else {
                        c('empty list # ' + ++_responseCount)
                    }

                    sendMessagetoQue() // 保持消息队列,收一发一
                    if (_requestCount === _responseCount) { doReport() }
                    break
                case 'GetUnitsResponse': //根据返回的列表,发起历史数据请求
                    if (json.responseCode.name == 'success') {
                        // c(JSON.stringify(json) + '\n\n');

                        let _tempunitObj

                        console.log('Seeing ' + json.list.length + ' (logical or physical) sensors in  ' + json.locationAddress.locationId)
                        for (let index = 0; index < json.list.length; index++) { // process each response packet
                            if (json.list[index].unitTypeFixed.name == 'gateway' || json.list[index].unitTypeFixed.name == 'remoteGateway' || json.list[index].unitAddress.did.indexOf('AP') != -1) { // c(json.list[index].unitAddress.did);
                                // c('GW or AP in ' + json.locationAddress.locationId) // GW and AP are not sensor
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

                                _tempunitObj = JSON.parse(JSON.stringify(unitObj))
                                    // c(unitObj.type)
                                    // c(unitObj.lifeCycleState)
                                    // c(unitObj.did)
                                    // c('\n')

                                _Units.push(_tempunitObj)
                                    // request history record
                                if (((unitObj.type === 'physicalOrChassis') && EUorUU === 'EU') || ((unitObj.type === 'inputMotion') && EUorUU === 'Motion') || ((EUorUU === 'UU') && (unitObj.did.indexOf('UU') >= 0)) || ((EUorUU === 'Temp') && (unitObj.did.indexOf('Temp') >= 0))) { sendGetSamplesRequest(unitObj.did, Date.parse(startDate), Date.parse(endDate)) } // 请求何种数据?
                            };
                        }

                        // c(_UnitsCounter + ' Units in Location:  while ' + _OnlineUnitsCounter + ' online');
                    } else {
                        c("Couldn't get Units")
                    }

                    break
                case 'PeriodicResponse':
                    heartbeatFlag = 0
                    c(_Counter + '# ' + "periodic response-keepalive");
                    break
                default:
                    console.log('!!!! cannot understand')
                    connection.close();
                    break
            }
        }
    })

    connection.on('error', function(error) {
        c('Connection Error: reconnect' + error.toString())
        start()
    })

    connection.on('close', function() {
        c('Connection closed!')
    })

    function sendPeriodicRequest() {
        let now = new Date().getTime()
        let request = {
            messageType: 'PeriodicRequest',
            timeSent: now
        }
        if (heartbeatFlag === 3) {
            console.log('    periodic request missed (%s), will reconnect', heartbeatFlag)

            connection.close()

            // heartbeatFlag = 0
            start()
        }
        sendMessage(request)

        c(' ---  periodic request send ' + heartbeatFlag)
        heartbeatFlag++
    }

    function sendGetSamplesRequest(deviceID, timeStart_mili, timeEnd_mili) {
        if (timeStart_mili > timeEnd_mili) {
            c('Wrong Date.')
            return null
        }
        if (timeEnd_mili - timeStart_mili >= reportPeriod) {
            let request = {
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
            c('  request : ' + request.dataSourceAddress.did + ' ' + request.timeSerieSelection.timeStart + ' #:' + ++_requestCount)
            sendMessagetoQue(request)
            sendGetSamplesRequest( // 递归
                deviceID,
                timeStart_mili + reportPeriod,
                timeEnd_mili
            )
        } else {
            let request = {
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
            c('  request : ' + request.dataSourceAddress.did + ' ' + request.timeSerieSelection.timeStart + ' #:' + ++_requestCount)
            sendMessagetoQue(request)
        }
    }

    function sendMessagetoQue(mes) {
        // 空的mes,马上从队列发-由接收报文触发
        // 非空mes,windowsize<20,马上从队列发,-发前20个
        // 非空mes,windowSize>=20,不发,打入队列
        // 也即是说,服务器最多积压20个请求

        if (mes === undefined && messageQueue.dataStore.length > 0) {
            sendMessage(messageQueue.dequeue())
                // c('sending to queue . leaving ' + messageQueue.dataStore.length)
            c('    sending request from queue, still ' + messageQueue.dataStore.length + ' left.')
        } else if (mes !== undefined && _windowSize < window_limit) {
            messageQueue.enqueue(mes)
            _windowSize++
            sendMessage(messageQueue.dequeue())
            c('    sending request from queue, still ' + messageQueue.dataStore.length + ' left.')
                // c('sending to queue . leaving  ' + messageQueue.dataStore.length)
        } else if (mes !== undefined && _windowSize >= window_limit) {
            messageQueue.enqueue(mes)
            c('    sending request to queue, still ' + messageQueue.dataStore.length + ' left.')
        }
    }

    function sendMessage(message) {
        if (connection.connected) {
            // Create the text to be sent
            let json = JSON.stringify(message, null, 1)
                //    c('sending' + JSON.stringify(json));
            connection.sendUTF(json)
        } else {
            c("sendMessage: Couldn't send message, the connection is not open")
        }
    }

    function sendServiceRequest() {
        let request = {
            messageType: 'ServiceRequest',
            clientId: 'client-fangtang'

        }
        sendMessage(request)
    }

    function sendLoginRequest() {
        let request = {
            messageType: 'LoginRequest',
            username: username,
            password: password
        }
        sendMessage(request)
    }

    function sendGetUnitsRequest(locationID) {
        let now = new Date().getTime()
        let request = {

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

function start() {
    client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
    c('Connecting to wss://' + cirrusAPIendpoint + '/cirrusAPI using username ' + username)
}

function doReport() {
    if (_requestCount > _responseCount) {
        console.log('Failed')
        dataFile.destroy()
        console.log('  ---  restarting')
        client.abort()
        start()
            // process.exit()
    }
    let t = new Date().getTime()
    let timestamp = new Date()
    timestamp.setTime(t)
    dataFile.end()
    c('Reporting：send ' + _requestCount + ' recvd ' + _responseCount + ', covering ' + _listCount + ' lists')
    c(timestamp.toLocaleTimeString() + '')

}

start()