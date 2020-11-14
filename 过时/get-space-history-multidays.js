/* eslint-disable space-before-function-paren */
/* eslint-disable no-redeclare */
/*
首先拉回历史数据dtolist,根据counter推测in 还是 ot,写入motionstamp数组;
counter+1就是in,反之ot,否则抛弃;
根据motionstamp数组来结算占用;得到time数组

TODO:有个数据先来后到的问题,所以需要先把DTO存起来排序,再进行处理.
TODO:getsamples 迭代有问题

*/

var WebSocketClient = require('websocket').client
var cirrusAPIendpoint = 'cirrus11.yanzi.se'
var username = '653498331@qq.com'
var password = '000000'
var client = new WebSocketClient()
var connection
var c = console.log
var locationId = '229349' // fangtang
var deviceID = 'EUI64-D0CF5EFFFE792D84-3-Motion'
// var deviceID = 'UUID-17B30675BC5849C2AD81F2448E772705'

var TimeoutId = setTimeout(doReport, 10000)

// const tenDay = 8640000;
const _24Hour = 86400000
var motionTimeStamps = []
var DTO = []
var DTO1 = []

var DTOs = []
DTOs[0] = DTO
DTOs[1] = DTO1

const startDate = '2019/11/21/21:00:00'
const endDate = '2019/11/21/22:59:59'
var recordObj = {
  type: '',
  Did: '',
  timeStamp: '',
  value: ''
}

var t1 = new Date()
var t2 = new Date()
var t1m = new Date()
var t0 = new Date()
var t2m = new Date()
var timeArray = []
// var _timeObj
var timeObj = {
  ID: '',
  timeStamp: '',
  value: ''
}

var minDiff, t1ToNext, PrevTot2

var lastValue = -1

client.on('connectFailed', function (error) {
  c('Connect Error: ' + error.toString())
  connection.close()
})

client.on('connect', function (connection) {
  c('Websocket open!')
  c('Checking API service status with ServiceRequest.')
  sendServiceRequest()

  // Handle messages
  connection.on('message', function (message) {
    clearTimeout(TimeoutId)
    TimeoutId = setTimeout(doReport, 10000)

    if (message.type === 'utf8') {
      var json = JSON.parse(message.utf8Data)
    }

    if (json.messageType === 'ServiceResponse') {
      c('ServiceRequest succeeded, sending LoginRequest')
      sendLoginRequest()
    } else if (json.messageType === 'LoginResponse') {
      if (json.responseCode.name === 'success') {
        // now = new Date().getTime()
        sendGetSamplesRequest(
          deviceID,
          Date.parse(startDate) - 1000 * 300,
          Date.parse(endDate) + 1000 * 300
        ) // 历史数据拉回
      } else {
        c(json.responseCode.name)
        c("Couldn't login, check your username and passoword")
        connection.close()
      }
    } else if (json.messageType === 'GetSamplesResponse') {
      if (json.responseCode.name === 'success' && json.sampleListDto.list) {
        c('receiving ' + json.sampleListDto.list.length + ' lists') // json.sampleListDto.list.length json.sampleListDto.dataSourceAddress.variableName.name
        const _length = DTO.length
        for (let index = 0; index < json.sampleListDto.list.length; index++) {
          DTO[index + _length] = json.sampleListDto.list[index].sampleTime
          DTO1[index + _length] = json.sampleListDto.list[index].value
        }

        // Process records
        var _rObj
        switch (
        // eslint-disable-next-line indent
        json.sampleListDto.dataSourceAddress.variableName.name // json.sampleListDto.list[0].resourceType  json.sampleListDto.list[0].sampleTime  json.sampleListDto.list[0].value
        ) {
          case 'motion':
            for (
              let index = 1; index < json.sampleListDto.list.length; index++
            ) {
              lastValue = json.sampleListDto.list[index - 1].value // update new value ,if the first ,take -1
              recordObj.type = json.sampleListDto.list[index].resourceType
              recordObj.Did = json.sampleListDto.dataSourceAddress.did
              recordObj.timeStamp = json.sampleListDto.list[index].sampleTime
              if (lastValue !== json.sampleListDto.list[index].value) {
                // Value changed!
                recordObj.value = 'in'
                _rObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(_rObj)
              } else if (lastValue === json.sampleListDto.list[index].value) {
                // Value unchanged!
                recordObj.value = 'ot'
                _rObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(_rObj)
              } else {
                // do not write to recordarray
                c('        Sensor first seen, cannot tell')
              }
            }
            break
          case 'unitState':
            // json.sampleListDto.list[0].assetState.name 'free'
            // json.sampleListDto.list[0].sampleTime 'mili'

            for (
              let index = 0; index < json.sampleListDto.list.length; index++
            ) {
              // lastValue = json.sampleListDto.list[index - 1].value // update new value ,if the first ,take -1
              recordObj.type = json.sampleListDto.list[index].resourceType // json.sampleListDto.list[1].assetState.resourceType
              recordObj.Did = json.sampleListDto.dataSourceAddress.did
              recordObj.timeStamp = json.sampleListDto.list[index].sampleTime
              if (
                json.sampleListDto.list[index].assetState.name === 'occupied'
              ) {
                //
                recordObj.value = 'in'
                _rObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(_rObj)
              } else if (
                json.sampleListDto.list[index].assetState.name === 'free'
              ) {
                // Value unchanged!
                recordObj.value = 'ot'
                _rObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(_rObj)
              } else {
                recordObj.value = 'ms'
                _rObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(_rObj)
              }
            }
            break
          case 'EventDTO':
            // c('    ' + _Counter + '#    Event DTO : ' + json.list[0].eventType.name)
            break
          default:
            c(
              '!!!! cannot understand this rsourcetype ' +
              json.list[0].resourceType
            )
        }
      } else {
        c('no samples.')
      }
    } else {
      c("Couldn't understand")
      connection.close()
    }
  })

  connection.on('error', function (error) {
    c('Connection Error: ' + error.toString())
  })

  connection.on('close', function (error) {
    c('Connection closed!' + error.message)
  })

  function sendMessage(message) {
    if (connection.connected) {
      // Create the text to be sent
      var json = JSON.stringify(message, null, 1)
      // c('sending' + JSON.stringify(json));
      connection.sendUTF(json)
    } else {
      c("sendMessage: Couldn't send message, the connection is not open")
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

  function sendGetSamplesRequest(deviceID, timeStart, timeEnd) {
    if (timeStart > timeEnd) {
      c('Wrong Date.')
      return null
    }
    if (timeEnd - timeStart >= _24Hour) {
      var request = {
        messageType: 'GetSamplesRequest',
        dataSourceAddress: {
          resourceType: 'DataSourceAddress',
          did: deviceID,
          locationId: locationId
        },
        timeSerieSelection: {
          resourceType: 'TimeSerieSelection',
          timeStart: timeStart,
          timeEnd: timeStart + _24Hour
        }
      }
      sendMessage(request)
      sendGetSamplesRequest(
        deviceID,
        Date.parse(startDate + _24Hour),
        Date.parse(endDate)
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
          timeStart: timeStart,
          timeEnd: timeEnd
        }
      }
      sendMessage(request)
    }
  }
})

function beginPoll() {
  if (!username) {
    console.error('The username has to be set')
    return
  }
  if (!password) {
    console.error('The password has to be set')
    return
  }
  client.connect('wss://' + cirrusAPIendpoint + '/cirrusAPI')
  c(
    'Connecting to wss://' +
    cirrusAPIendpoint +
    '/cirrusAPI using username ' +
    username
  )
}

function doReport() {
  clearTimeout(TimeoutId)
  c('Total motion records: ' + motionTimeStamps.length)
  c('for ' + deviceID + ' from ' + startDate + ' to ' + endDate)
  // c("Time is Up...")
  c('all samplemotion records:')
  for (let i = 0; i < motionTimeStamps.length; i++) {
    t1.setTime(motionTimeStamps[i].timeStamp)
    c(motionTimeStamps[i].value + '  ' + t1.toLocaleTimeString())
  }
  for (let i = 1; i < motionTimeStamps.length; i++) {
    //
    c('processing: #' + i)

    t1.setTime(motionTimeStamps[i - 1].timeStamp) // 前一个事件时间
    t1.setMilliseconds(0) // 得到整秒
    t1m.setTime(motionTimeStamps[i - 1].timeStamp) // t1m：前一个事件的整分
    t1m.setMilliseconds(0)
    t1m.setSeconds(0) // 得到整分

    t2.setTime(motionTimeStamps[i].timeStamp) // 当前事件时间
    t2.setMilliseconds(0) // 得到整秒
    t2m.setTime(motionTimeStamps[i].timeStamp)
    t2m.setMilliseconds(0)
    t2m.setSeconds(0) // second=0
    timeObj.ID = motionTimeStamps[i].Did

    // 得到分钟差和秒数零头

    minDiff = Math.floor((t2m - t1m) / 60 / 1000) // 两次数据之间的整分差
    t1ToNext = 60 - t1.getSeconds() // 前面的零头秒数
    PrevTot2 = t2.getSeconds() // 后面的零头秒数

    // c('    seeing  ' + t1.toLocaleTimeString() + '-前  ' + t1m.toLocaleTimeString() + '整  ' + minDiff + ' 分 ' + t1ToNext + '前 ' + PrevTot2 + ' 后  ' + t2.toLocaleTimeString() + '-后  ' + t2m.toLocaleTimeString() + '  相差 ' + minDiff)

    if (motionTimeStamps[i - 1].value === 'in') {
      // 如果前一个是in,那么后面的时间段应该100%占用
      // c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

      if (t1m === t2m) {
        //   c('   头尾在一分钟内!')
      } else {
        // c('   不在一分钟')
      }

      if (t1m >= t2m) {
        // c("      头尾在同样的一分钟,计算缝隙");
        t1ToNext = t1ToNext + PrevTot2 - 60 /// 计算缝隙
        PrevTot2 = 0 // 计算头部即可
      }

      t0.setTime(t1m.getTime()) // 前一整分

      let _RecordExist = false // 记录不存在
      // eslint-disable-next-line no-unused-vars
      var _ExistValue = 0

      for (const key in timeArray) {
        // 检查是否存在这个分钟纪录
        if (timeArray[key].timeStamp === t0.toLocaleTimeString()) {
          // c('      这一分记录存在！增加头部的数值' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]))
          _RecordExist = true
          // _ExistValue = timeArray[key].value;
          timeArray[key].value += t1ToNext / 60 // 增加新的占用
          break
        }
      }

      if (!_RecordExist) {
        // 这一分不存在
        timeObj.timeStamp = t0.toLocaleTimeString()
        timeObj.value = t1ToNext / 60
        var _timeObj = JSON.parse(JSON.stringify(timeObj))
        timeArray.push(_timeObj) // 增加记录
        //  c('      这一分不存在！头部加入新记录：' + t0.toLocaleTimeString())
      }

      {
        // tail会重复？
        t0.setTime(t2m.getTime()) // tail
        let _RecordExist = false
        for (const key in timeArray) {
          // already exits in Array?
          if (timeArray[key].timeStamp === t0.toLocaleTimeString()) {
            //  c('      这一分存在！尾部数值增加  ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]) + '  ' + JSON.stringify(motionTimeStamps[i]))
            _RecordExist = true
            timeArray[key].value += PrevTot2 / 60
            break
          }
        }

        if (!_RecordExist) {
          timeObj.timeStamp = t2m.toLocaleTimeString()
          timeObj.value = PrevTot2 / 60
          var _timeObj = JSON.parse(JSON.stringify(timeObj))
          timeArray.push(_timeObj)
          //  c('      这一分不存在，加入新尾部记录：' + t2m.toLocaleTimeString())
        }
      }

      // process middle
      let j = 1
      // c('      准备加入中部记录');
      while (j < minDiff) {
        t0.setTime(t1m.getTime() + j * 60 * 1000) // 下一分
        timeObj.timeStamp = t0.toLocaleTimeString()
        timeObj.value = 1

        // c('      加入中部记录：' + t0.toLocaleTimeString())
        var _timeObj = JSON.parse(JSON.stringify(timeObj))
        timeArray.push(_timeObj)
        j += 1
      }
    } else {
      // 如果前一个记录是ot,后面时间缝隙全都是0
      // c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

      if (t1m === t2m) {
        //   c('   头尾在一分钟内!')
      } else {
        // c('   不在一分钟')
      }

      if (t1m >= t2m) {
        // c("      头尾在相同的一分钟,计算缝隙");
        t1ToNext = t1ToNext + PrevTot2 - 60 /// 计算缝隙
        PrevTot2 = 0 // 计算头部即可
      }

      t0.setTime(t1m) // Previous
      let _RecordExist = false

      for (const key in timeArray) {
        // already exits in Array?
        if (timeArray[key].timeStamp === t0.toLocaleTimeString()) {
          //   c('      这一分记录存在！头部原值不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]) + '  ' + JSON.stringify(motionTimeStamps[i]))
          _RecordExist = true
          _ExistValue = timeArray[key].value
          break
        }
      }

      if (!_RecordExist) {
        // 这一分不存在
        timeObj.timeStamp = t0.toLocaleTimeString()
        timeObj.value = 0

        var _timeObj = JSON.parse(JSON.stringify(timeObj))
        timeArray.push(_timeObj) // 增加记录
        //  c('      这一分不存在！头部加入新记录 0：' + t0.toLocaleTimeString())
      }

      // tail会重复？
      t0.setTime(t2m) // tail
      _RecordExist = false
      for (const key in timeArray) {
        // already exits in Array?
        if (timeArray[key].timeStamp === t0.toLocaleTimeString()) {
          //   c('      这一分尾部存在！尾部原值不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]) + '  ' + JSON.stringify(motionTimeStamps[i]))
          _RecordExist = true
          // _ExistValue = timeArray[key].value;
          break
        }
      }
      // do nothing
      if (!_RecordExist) {
        timeObj.timeStamp = t2m.toLocaleTimeString()
        timeObj.value = 0
        var _timeObj = JSON.parse(JSON.stringify(timeObj))
        timeArray.push(_timeObj)
        // c('      这一分尾部不存在，加入新尾部记录：' + t2m.toLocaleTimeString())
      }

      // process middle
      let j = 1
      // c('      准备加入中部记录：');
      while (j < minDiff) {
        t0.setTime(t1m.getTime() + j * 60 * 1000)
        timeObj.timeStamp = t0.toLocaleTimeString()
        timeObj.value = 0

        // c('      加入中部记录：' + t0.toLocaleTimeString())
        var _timeObj = JSON.parse(JSON.stringify(timeObj))
        timeArray.push(_timeObj)
        j++
      }
    }
  }

  c('timearray:sorting ')
  timeArray.sort(function (a, b) {
    if (
      Date.parse('2019/1/1/' + a.timeStamp) >
      Date.parse('2019/1/1/' + b.timeStamp)
    ) {
      return 1
    } else {
      return -1
    }
  })

  for (let i = 0; i < timeArray.length; i++) {
    var element = timeArray[i]

    if (!element.ID || !element.timeStamp) continue
    c(element.timeStamp + ' = ' + element.value + '')
  }
  process.exit()
}

beginPoll()
