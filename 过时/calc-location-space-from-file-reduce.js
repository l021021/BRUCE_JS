/* eslint-disable eol-last */
/* eslint-disable no-redeclare */
/*
从 log-sapce-history-to-file 产生的文件中计算占用数据,精确到分

1.从文件读入记录
2.装换成in、ot数组 motiontimestamps
对每个ID循环
    计算得到timearray
    写入文件
4.查重算法,仅限于前五个记录

5.boundary

6.TODO 汇集10分钟或小时数据 use reduce?

*/
const FS = require('fs')
var str
var json = []
var locationJson = []
var unitsArray = []
var recordObj = {
    // type: '',
    Did: '',
    timeStamp: '',
    value: ''
}

var filename = '..\\log\\reduce-test-file' // 历史记录文件
const startDate = '2019/12/31/00:00:00'
const endDate = '2020/01/01/09:59:59'

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
var motionTimeStamps = []

var minDiff, t1ToNext, PrevTot2

var lastValue = -1
const c = console.log

str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })
const CSVFile = FS.createWriteStream(filename + '.csv', { encoding: 'utf8' })

// 读取文件发生错误事件
CSVFile.on('error', (err) => {
    console.log('发生异常:', err)
})
// 已打开要写入的文件事件
CSVFile.on('open', (fd) => {
    console.log('文件已打开:', fd)
})
// 文件已经就写入完成事件
CSVFile.on('finish', () => {
    console.log('写入已完成..')
    // console.log('读取文件内容:', fs.readFileSync('./file-test.js', 'utf8')) // 打印写入的内容
    // console.log(CSVFile)
})

// 文件关闭事件
CSVFile.on('close', () => {
    console.log('文件已关闭！')
})
str = str.replace(/\]\[/gi, ',') // change ][ to , which was caused by consecutive packets

locationJson = JSON.parse(str) // 总表
c('总motion记录数' + locationJson.length)

// locationJson.sort()

// 计算出一个sensor 数组
// 建立不重复的传感器表
for (let i1 = 0; i1 < locationJson.length; i1++) {
    if (unitsArray.indexOf(locationJson[i1].DID) < 0) {
        unitsArray.push(locationJson[i1].DID)
        json[locationJson[i1].DID] = []
        c(locationJson[i1].DID)
    }
}

c('总的传感器数: ' + unitsArray.length)

// 将不同传感器的数据分开放入数组

CSVFile.write('ID,Time,Pct\n') // 文件头

for (let i1 = 0; i1 < locationJson.length; i1++) {
    json[locationJson[i1].DID].push(JSON.parse(JSON.stringify(locationJson[i1])))
}

for (let i1 = 0; i1 < unitsArray.length; i1++) { // 对每一个sensor循环
    c('computing sensor ' + unitsArray[i1])

    // Process records (asset or motion) and write into motiontimestamps
    var tempObj
    c('  sorting sensor array ')
    // scan_array(json[unitsArray[i1]])

    json[unitsArray[i1]].sort(function (a, b) { // 按照时间排序,但是id是乱的
        if (a.sampleTime > b.sampleTime) {
            return 1
        } else {
            return -1
        };
    })
    c('    finish sorting sensor array ')
    // scan_array(json[unitsArray[i1]])

    // c(JSON.stringify(json[unitsArray[i1]]))

    motionTimeStamps.length = 0 // 清零
    recordObj.Did = unitsArray[i1]

    // 从motion value/free/occupy 到 in-ot 记录

    if (json[unitsArray[i1]][0].DID.indexOf('UU') >= 0) {
        c('  calculating io-ot 记录' + json[unitsArray[i1]].length + ' lists')

        // boundary

        recordObj.timeStamp = Date.parse(startDate)
        recordObj.value = 'ot' // in or ot
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)

        for (let i2 = 0; i2 < json[unitsArray[i1]].length; i2++) {
            recordObj.timeStamp = json[unitsArray[i1]][i2].sampleTime
            if (json[unitsArray[i1]][i2].assetState.name === 'occupied') {
                recordObj.value = 'in'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            } else if (json[unitsArray[i1]][i2].assetState.name === 'free') {
                recordObj.value = 'ot'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            } else {
                recordObj.value = 'ms'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            };
        }

        // add boundary record - always as the last one

        recordObj.timeStamp = Date.parse(endDate)
        // recordObj.value 取原值
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)
    } else if (json[unitsArray[i1]][0].DID.indexOf('EU') >= 0) { // json[1].value json[1].sampleTime
        c('  calculating in-ot 记录' + json[unitsArray[i1]].length + ' lists')

        // first record always 'ot'
        recordObj.timeStamp = json[unitsArray[i1]][0].sampleTime
        recordObj.value = 'ot'
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)

        for (let i2 = 1; i2 < json[unitsArray[i1]].length; i2++) { // from second records and so on
            lastValue = json[unitsArray[i1]][i2 - 1].value // update previous value

            recordObj.timeStamp = json[unitsArray[i1]][i2].sampleTime
            if (lastValue !== json[unitsArray[i1]][i2].value) { // Value changed!
                recordObj.value = 'in'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            } else if (lastValue === json[unitsArray[i1]][i2].value) { // Value unchanged!
                recordObj.value = 'ot'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            } else { // do not write to recordarray
                c('        Sensor first seen, cannot tell')
            };
        }
    }

    c('  Total motion records for this DID ' + motionTimeStamps.length)

    c('  processing all samplemotion records:')

    timeArray.length = 0 // 清零
    c('    processing time Array ' + timeArray.length)
    for (let i2 = 1; i2 < motionTimeStamps.length; i2++) { // start from second record
        t1.setTime(motionTimeStamps[i2 - 1].timeStamp) // 前一个事件时间
        t1.setMilliseconds(0) // 得到整秒
        t1m.setTime(motionTimeStamps[i2 - 1].timeStamp) // t1m：前一个事件的整分
        t1m.setMilliseconds(0)
        t1m.setSeconds(0) // 得到整分

        t2.setTime(motionTimeStamps[i2].timeStamp) // 当前事件时间
        t2.setMilliseconds(0) // 得到整秒
        t2m.setTime(motionTimeStamps[i2].timeStamp)
        t2m.setMilliseconds(0)
        t2m.setSeconds(0) // second=0
        timeObj.ID = motionTimeStamps[i2].Did

        // 得到分钟差和秒数零头

        minDiff = Math.floor((t2m - t1m) / 60 / 1000) // 两次数据之间的整分差
        t1ToNext = 60 - t1.getSeconds() // 前面的零头秒数.例如 16:14:06, 则 = 54
        PrevTot2 = t2.getSeconds() // 后面的零头秒数 16:14:06, 则 = 06
        // 这样, 10:01:22 in -10:03:44 ot ,应该计算01分的38秒占用,03分的44秒占用 ,02的66秒占用

        // c('     :' + t1.toLocaleString() + '(前)' + t1m.toLocaleTimeString() + '(分)' + minDiff + '(相差分)' + t1ToNext + '(前秒) ' + PrevTot2 + '(后秒)' + t2.toLocaleString() + '(后)  ' + t2m.toLocaleTimeString() + '(分)')

        if (motionTimeStamps[i2 - 1].value === 'in') { // 如果前一个是in,那么后面的时间段应该100%占用
            // c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

            if (t1m >= t2m) {
                //   c('        头尾在同样的一分钟,计算缝隙')
                t1ToNext = (t1ToNext + PrevTot2 - 60) /// 计算缝隙
                PrevTot2 = 0 // 合并计算了
            }

            t0.setTime(t1m.getTime()) // 前一整分

            let _RecordExist = false // 记录不存在
            // eslint-disable-next-line no-unused-vars
            // var _ExistValue = 0

            // process head
            if (timeArray.length > 1) {
                for (let k = timeArray.length - 1; k > Math.max(timeArray.length - 9, 0); k--) { // 检查是否存在这个分钟纪录
                    if (timeArray[k].timeStamp === t0.toLocaleString()) {
                        //      c(k + '        头部记录存在！增加头部的数值' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[k]))
                        _RecordExist = true
                        timeArray[k].value += t1ToNext / 60 // 增加新的占用
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = t1ToNext / 60
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                //     c('      头部记录不存在！头部加入新记录：' + JSON.stringify(_timeObj))
            }
            // process middle
            let j = 1
            // c('      准备加入中部记录');
            while (j < minDiff) {
                t0.setTime(t1m.getTime() + j * 60 * 1000) // 下一分
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 1

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                //     c('      加入中部记录：' + JSON.stringify(_timeObj))
                j += 1
            }

            { // tail会重复？
                t0.setTime(t2m.getTime()) // tail
                let _RecordExist = false
                // for (const k in timeArray) { // already exits in Array?
                //       for (let k = timeArray.length - 1; k > 0; k--) {
                if (timeArray.length > 1) {
                    for (let k = timeArray.length - 1; k > Math.max(timeArray.length - 9, 0); k--) { // 检查是否存在这个分钟纪录
                        if (timeArray[k].timeStamp === t0.toLocaleString()) {
                            _RecordExist = true
                            //        c(k + '     尾部记录存在！尾部数值增加  ' + JSON.stringify(timeArray[k]) + ' + ' + PrevTot2)
                            timeArray[k].value += PrevTot2 / 60
                            //         c(k + '     尾部记录存在！尾部数值增加  ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[k]))
                        }
                    }
                }

                if (!_RecordExist) {
                    timeObj.timeStamp = t2m.toLocaleString()
                    timeObj.value = PrevTot2 / 60
                    var _timeObj = JSON.parse(JSON.stringify(timeObj))
                    timeArray.push(_timeObj)
                    //     c('      尾部记录不存在，加入新尾部记录：' + JSON.stringify(_timeObj))
                }
            }
        } else { // 如果前一个记录是ot,后面时间缝隙全都是0
            if (t1m >= t2m) {
                // c("      头尾在相同的一分钟,计算缝隙");
                t1ToNext = (t1ToNext + PrevTot2 - 60) /// 计算缝隙
                PrevTot2 = 0 // 计算头部即可
            };

            t0.setTime(t1m) // Previous
            let _RecordExist = false

            if (timeArray.length > 1) {
                for (let k = timeArray.length - 1; k > Math.max(timeArray.length - 9, 0); k--) { // 检查是否存在这个分钟纪录
                    if (timeArray[k].timeStamp === t0.toLocaleString()) {
                        //         c(k + '      头部记录存在！头部原值+0不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[k]))
                        _RecordExist = true
                        //  _ExistValue = timeArray[k].value
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                //    c('      头部不存在！头部加入新记录 0：' + JSON.stringify(_timeObj))
            }

            // process middle
            let j = 1
            // c('      准备加入中部记录：');
            while (j < minDiff) {
                t0.setTime(t1m.getTime() + j * 60 * 1000)
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                //    c('      加入中部记录0：' + JSON.stringify(_timeObj))
                j++
            }
            // tail会重复？
            t0.setTime(t2m) // tail
            _RecordExist = false
            // for (const k in timeArray) { // already exits in Array?
            // for (let k = timeArray.length - 1; k > 0; k--) {
            if (timeArray.length > 1) {
                for (let k = timeArray.length - 1; k > Math.max(timeArray.length - 9, 0); k--) { // 检查是否存在这个分钟纪录
                    if (timeArray[k].timeStamp === t0.toLocaleString()) {
                        //         c(k + '                  尾部记录存在！尾部原值不变 ' + '   ' + JSON.stringify(timeArray[k]))
                        _RecordExist = true
                        // _ExistValue = timeArray[k].value;
                    }
                }
            }
            // do nothing
            if (!_RecordExist) {
                timeObj.timeStamp = t2m.toLocaleString()
                timeObj.value = 0
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                //     c('      尾部记录不存在，加入新尾部记录0：' + JSON.stringify(_timeObj))
            }
        }
    }

    c('    timearray: sorting ')
    timeArray.sort(function (a, b) {
        if (Date.parse(a.timeStamp) > Date.parse(b.timeStamp)) {
            return 1
        } else {
            return -1
        };
    })
    c('  writing  for this sensor ' + timeArray.length)

    // reduce
    // var sumCallback = (acc, cur) => (acc.x + cur.x)

    // var new_timeArray = [];

    // new_timeArray = timeArray.map(function (el) {

    //  })

    var sliceContainer = [] // 针对键slice进行归类的容器
    timeArray.forEach(item => {
        var ts = toHourSharp(item.timeStamp)
        sliceContainer[ts] = sliceContainer[ts] || []
        // if (sliceContainer[ts] === []) {
        sliceContainer[ts].push(item)
        // } else {
        // sliceContainer[ts].value += item.value
        // }
    })
    sliceContainer.forEach(item => { // todo meiyou run
        item.reduce(function (prev, cur) {
            prev.value += cur.value
            prev.timeStamp = ''

            return prev
        }, 0)
    })

    for (let i3 = 0; i3 < timeArray.length; i3++) {
        var e = timeArray[i3]
        CSVFile.write(unitsArray[i1] + ',' + e.timeStamp + ',' + e.value + '\n')
    }
}
// CSVFile.end()

function toHourSharp(timeStamp) {
    var t = new Date()
    t.setTime(Date.parse(timeStamp))
    t.setMinutes(0)
    t.setSeconds(0)
    t.setMilliseconds(0)
    return t.toLocaleString()
}

CSVFile.end()
    // process.exit()