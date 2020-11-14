/* eslint-disable camelcase */
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

5.boundary 首末记录处理

6.10M reports

7.process offline data

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

var filename = '..\\log\\114190_x_2020_05_11_00_00_00_2020_05_25_00_00_00' // 历史记录文件

const startDate = '2020/05/11/00:00:00'
const endDate = '2020/05/25/00:00:00'

var t1 = new Date()
var t2 = new Date()
var t1_10m = new Date()

// var t1m = new Date()
// var t1h = new Date()
// var t2h = new Date()
var t2_10m = new Date()

var t0 = new Date()
    // var t2m = new Date()
var timeArray = []
    // var _timeObj
var timeObj = {
    ID: '',
    timeStamp: '',
    value: ''
}
var motionTimeStamps = []

// var minDiff
var t1ToNext, PrevTot2, hourDiff

var lastValue = -1
const c = console.log

str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })
const CSVFile = FS.createWriteStream(filename + '-10M.csv', { encoding: 'utf8' })

// 读取文件发生错误事件
CSVFile.on('error', (err) => {
    console.log('发生异常:', err)
})

CSVFile.on('open', (fd) => {
    console.log('文件已打开:', fd)
})

CSVFile.on('finish', () => {
    console.log('写入已完成..')
    process.exit()
})
CSVFile.on('end', () => {
    console.log('写入已完成..')
    process.exit()
})

CSVFile.on('close', () => {
    console.log('文件已关闭！')
    process.exit()
})

str = str.replace(/\]\[/gi, ',') // change ][ to , which was caused by consecutive packets

locationJson = JSON.parse(str) // 从文件读入的原始记录总表
c('总motion记录数' + locationJson.length)

// locationJson.sort()

// 计算出一个sensor 数组
// 建立不重复的传感器表 unitsArray
for (let i1 = 0; i1 < locationJson.length; i1++) {
    if (unitsArray.indexOf(locationJson[i1].DID) < 0) {
        unitsArray.push(locationJson[i1].DID)
        json[locationJson[i1].DID] = [] // json:计算报告数组, 建立二维数组框架,准备存入报告数据
        c(locationJson[i1].DID)
    }
}

c('总的传感器数: ' + unitsArray.length)

// 将不同传感器的数据分开放入数组

CSVFile.write('ID,Time,Pct\n') // CSV文件头
for (let i1 = 0; i1 < locationJson.length; i1++) {
    json[locationJson[i1].DID].push(JSON.parse(JSON.stringify(locationJson[i1])))
}

// 计算循环 写入 motionTimeStamps 数组

for (let i1 = 0; i1 < unitsArray.length; i1++) { // 对每一个sensor做循环 i1:传感器ID循环
    c('computing sensor ' + unitsArray[i1])

    var tempObj

    c('  Sorting sensor array ')

    json[unitsArray[i1]].sort(function(a, b) { // 先按照时间排序
        if (a.sampleTime > b.sampleTime) {
            return 1
        } else {
            return -1
        };
    })

    c('   Finished sorting sensor array ')

    motionTimeStamps.length = 0 // 清零
    recordObj.Did = unitsArray[i1]

    // 从motion value/free/occupy 变换到 in-ot 记录

    if (json[unitsArray[i1]][0].DID.indexOf('UU') >= 0) { // asset记录
        c('  calculating io-ot records ' + json[unitsArray[i1]].length + ' lists')

        // boundary:日期边界视为空

        recordObj.timeStamp = Date.parse(startDate)
        recordObj.value = 'ot'
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)

        // 主体

        for (let i2 = 0; i2 < json[unitsArray[i1]].length; i2++) { // i2:单个传感器的记录内循环
            recordObj.timeStamp = json[unitsArray[i1]][i2].sampleTime
            if (json[unitsArray[i1]][i2].assetState.name === 'occupied') {
                recordObj.value = 'in'
            } else if (json[unitsArray[i1]][i2].assetState.name === 'free') {
                recordObj.value = 'ot'
            } else { // 包含 missinput等
                recordObj.value = 'ms'
                recordObj.timeStamp = (i2 === 0) ? Date.parse(startDate) : (json[unitsArray[i1]][i2 - 1].sampleTime + 10000) // 在前一个记录后,增加一个十秒后的掉线数据

                c('\n ms  ' + recordObj.Did + ' ' + recordObj.timeStamp + '\n')
            };
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        }

        // add boundary record - always as the last one

        recordObj.timeStamp = Date.parse(endDate)
            // recordObj.value 取原值
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)
    } else if (json[unitsArray[i1]][0].DID.indexOf('EU') >= 0) { // samplemotio 记录
        c('  calculating in-ot 记录' + json[unitsArray[i1]].length + ' lists')

        // boundary:日期边界视为空
        recordObj.timeStamp = json[unitsArray[i1]][0].sampleTime // 第一个 samplemotion记录,无法判断,先设为ot
        recordObj.value = 'ot'
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)

        // 主体

        for (let i2 = 1; i2 < json[unitsArray[i1]].length; i2++) { // from second records and so on
            lastValue = json[unitsArray[i1]][i2 - 1].value // update previous value

            recordObj.timeStamp = json[unitsArray[i1]][i2].sampleTime
            if (((json[unitsArray[i1]][i2].sampleTime - json[unitsArray[i1]][i2 - 1].sampleTime)) < 1000 * 300) { // dehole,因为时间差大于5分钟,不可靠
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
            } else {
                recordObj.value = 'ms' //
                recordObj.timeStamp = json[unitsArray[i1]][i2 - 1].sampleTime + 10000 // 增加一个十秒后的掉线数据
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
                c('\n MS    ' + recordObj.Did + ' ' + recordObj.timeStamp + '\n')
            }
        }
    }

    c('  COMPUTING ALL  motion records for this DID (BOUNDARY ADDED) : ' + motionTimeStamps.length)

    // for (let j = 0; j < motionTimeStamps.length; j++) { //打印原始记录
    //     t1.setTime(motionTimeStamps[j].timeStamp)
    //     // c(motionTimeStamps[j].value + '  ' + t1.toLocaleString())
    // }

    timeArray.length = 0 // 目标矩阵清零

    c('   \nTime array cleared,  processing time Array from (zero) ' + timeArray.length)

    for (let i2 = 1; i2 < motionTimeStamps.length; i2++) { // start from second record
        t1.setTime(motionTimeStamps[i2 - 1].timeStamp) // 前一个事件时间
        t1.setMilliseconds(0) // 得到整秒

        t1_10m.setTime(motionTimeStamps[i2 - 1].timeStamp) // t1_10M：前一个事件的整十分钟
        t1_10m.setMilliseconds(0)
        t1_10m.setSeconds(0)
        t1_10m.setMinutes(10 * (Math.floor(t1.getMinutes() / 10))) // 得到整数十分钟开始,如0,10,20,50

        t2.setTime(motionTimeStamps[i2].timeStamp) // 当前事件时间
        t2.setMilliseconds(0) // 得到整秒
            // t2h.setTime(motionTimeStamps[i2].timeStamp) //

        // t2h.setMilliseconds(0)
        // t2h.setSeconds(0)
        // t2h.setMinutes(0) // 得到整十分钟
        t2_10m.setTime(motionTimeStamps[i2].timeStamp) // t1_10M：前一个事件的整十分钟
        t2_10m.setMilliseconds(0)
        t2_10m.setSeconds(0)
        t2_10m.setMinutes(10 * (Math.floor(t2.getMinutes() / 10))) // 得到整数十分钟开始,如0,10,20,50

        timeObj.ID = motionTimeStamps[i2].Did

        // 得到十分钟差和秒数零头

        // minDiff = Math.floor((t2m - t1m) / 60 / 1000) // 两次数据之间的整分差
        hourDiff = Math.floor((t2_10m - t1_10m) / 600 / 1000) // 两次数据之间十分钟差
        t1ToNext = 600 - t1.getSeconds() - (t1.getMinutes() % 10) * 60 // 前面的零头秒数.例如 16:14:06, 则 = 45.54 =2754 TODO,有问题,对整点
        PrevTot2 = t2.getSeconds() + (t2.getMinutes() % 10) * 60 // 后面的零头秒数 16:14:06, 则 = 14.06=846
            // 这样, 10:01:22 in -11:23:44 ot ,应该计算01分的38秒占用,03分的44秒占用 ,02的66秒占用

        c('     ->' + '#1 ' + t1.toLocaleString() + '=' + t1_10m.toLocaleTimeString() + '+' + hourDiff + '+' + t1ToNext + 's= #2:' + t2.toLocaleString() + '-' + PrevTot2 + 's=' +
            t2_10m.toLocaleTimeString())

        if (motionTimeStamps[i2 - 1].value === 'in') { // 如果前一个是in,那么后面的时间段应该100%占用
            //     c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

            if (t1_10m >= t2_10m) {
                //   c('        头尾在同样的一十分钟,计算缝隙')
                t1ToNext = (t1ToNext + PrevTot2 - 600) /// 计算缝隙
                PrevTot2 = 0 // 合并计算了
            }

            t0.setTime(t1_10m.getTime()) // 前一十分钟

            let _RecordExist = false // 记录不存在
                // eslint-disable-next-line no-unused-vars
                // var _ExistValue = 0

            // process head
            if (timeArray.length >= 1) {
                for (let k = timeArray.length - 1; k >= Math.max(timeArray.length - 5, 0); k--) { // 检查是否存在这个分钟纪录,回溯9个记录(为了减少无谓计算)
                    if (timeArray[k].timeStamp === t0.toLocaleString()) {
                        // c(k + '        头部记录存在！增加数值' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[k]))
                        _RecordExist = true
                        timeArray[k].value += t1ToNext / 600 // 增加新的占用
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = t1ToNext / 600 // 10m
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                c('      头部记录不存在！加入新记录：' + JSON.stringify(_timeObj))
            }
            // process middle
            let j = 1
            c('      准备加入中部记录')
            while (j < hourDiff) {
                t0.setTime(t1_10m.getTime() + j * 600 * 1000) // 下一十分钟
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 1

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                c('      加入中部记录：' + JSON.stringify(_timeObj))
                j++
            }

            { // tail会重复？
                t0.setTime(t2_10m.getTime()) // tail
                let _RecordExist = false
                    // for (const k in timeArray) { // already exits in Array?
                    //       for (let k = timeArray.length - 1; k > 0; k--) {
                if (timeArray.length >= 1) {
                    for (let k = timeArray.length - 1; k >= Math.max(timeArray.length - 5, 0); k--) { // 检查是否存在这个分钟纪录
                        if (timeArray[k].timeStamp === t0.toLocaleString()) {
                            _RecordExist = true
                                //        c(k + '     尾部记录存在！尾部数值增加  ' + JSON.stringify(timeArray[k]) + ' + ' + PrevTot2)
                            timeArray[k].value += PrevTot2 / 600
                                // c(k + '     尾部记录存在！尾部数值增加  ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[k]))
                        }
                    }
                }

                if (!_RecordExist) {
                    timeObj.timeStamp = t2_10m.toLocaleString()
                    timeObj.value = PrevTot2 / 600 // 10m
                    var _timeObj = JSON.parse(JSON.stringify(timeObj))
                    timeArray.push(_timeObj)
                    c('      尾部记录不存在，加入新记录：' + JSON.stringify(_timeObj))
                }
            }
        } else if ((motionTimeStamps[i2 - 1].value === 'ms')) { //  ms 记录 donothing
            c(' \n ms skipped \n')
        } else { // 如果前一个记录是ot,后面时间缝隙全都是0
            if (t1_10m >= t2_10m) {
                c('      头尾在相同的一十分钟,计算缝隙')
                t1ToNext = (t1ToNext + PrevTot2 - 600) /// 计算缝隙
                PrevTot2 = 0 // 计算头部即可
            };

            t0.setTime(t1_10m) // Previous hour sharp
            let _RecordExist = false

            if (timeArray.length >= 1) {
                for (let k = timeArray.length - 1; k >= Math.max(timeArray.length - 5, 0); k--) { // 检查是否存在这个十分钟纪录,回溯若干个记录
                    if (timeArray[k].timeStamp === t0.toLocaleString()) {
                        // c(k + '      头部记录存在！原值不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[k]))
                        _RecordExist = true
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                c('      头部不存在！加入新记录 0' + JSON.stringify(_timeObj))
            }

            // process middle
            let j = 1
                // c('      准备加入中部记录：');
            while (j < hourDiff) {
                t0.setTime(t1_10m.getTime() + j * 600 * 1000)
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                c('      加入中部记录 0 ' + JSON.stringify(_timeObj))
                j++
            }
            // tail会重复？
            t0.setTime(t2_10m) // tail
            _RecordExist = false
                // for (const k in timeArray) { // already exits in Array?
                // for (let k = timeArray.length - 1; k > 0; k--) {
            if (timeArray.length >= 1) {
                for (let k = timeArray.length - 1; k >= Math.max(timeArray.length - 5, 0); k--) { // 检查是否存在这个分钟纪录
                    if (timeArray[k].timeStamp === t0.toLocaleString()) {
                        // c(k + '                  尾部记录存在！原值不变 ' + '   ' + JSON.stringify(timeArray[k]))
                        _RecordExist = true
                            // _ExistValue = timeArray[k].value;
                    }
                }
            }
            // do nothing
            if (!_RecordExist) {
                timeObj.timeStamp = t2_10m.toLocaleString()
                timeObj.value = 0
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                c('      尾部记录不存在，加入新记录 0 ' + JSON.stringify(_timeObj))
            }
        }
    }

    c('    timearray: sorting ')
    timeArray.sort(function(a, b) {
        if (Date.parse(a.timeStamp) > Date.parse(b.timeStamp)) {
            return 1
        } else {
            return -1
        };
    })
    c('  writing  for this sensor ' + timeArray.length)

    for (let i5 = 0; i5 < timeArray.length; i5++) {
        var e = timeArray[i5]
        CSVFile.write(unitsArray[i1] + ',' + e.timeStamp + ',' + e.value + '\n')
    };
}
// CSVFile.end()

CSVFile.end()
    // process.exit()