/* eslint-disable eol-last */
/* eslint-disable no-redeclare */
/*
从 log-sapce-history-to-file 产生的文件中计算占用数据,精确到分

1.从文件读入记录
2.装换成in、ot数组 motiontimestamps
3.计算得到timearray
4.查重算法,仅限于前五个记录
5.加入边界
6.考虑掉线因素
        6.1 samplemotion:value跳变
        6.2 Asset的missinput
        6.3 标为 ms
        6.4 计算占用时忽略 ms 记录

*/
const FS = require('fs')
var str
var json
var recordObj = {
    timeStamp: '',
    value: ''
}

var filename = '..\\log\\EUI64-D0CF5EFFFE59E445-3-Motion_2019_12_20_00_00_00_2020_01_11_23_59_59'

const startDate = '2019/12/20/00:00:00'
const endDate = '2020/01/11/23:59:59'
var t1 = new Date()
var t2 = new Date()
var t1m = new Date()
var t0 = new Date()
var t2m = new Date()
var timeArray = []
var motionTimeStamps = []
var timeObj = {
    ID: '',
    timeStamp: '',
    value: ''
}

var minDiff, t1ToNext, PrevTot2

var lastValue = -1
const c = console.log

str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })
const CSVFile = FS.createWriteStream(filename + '_1M.csv', { encoding: 'utf8' })

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

json = JSON.parse(str)

// Process records (asset or motion) and write into motiontimestamps
var tempObj

json.sort(function(a, b) {
    if (a.sampleTime > b.sampleTime) {
        return 1
    } else {
        return -1
    };
})

if (json[0].assetState && json[0].assetState.resourceType === 'AssetState') {
    c('calculating ' + json.length + ' lists')

    // add boundary record - always free assumed

    recordObj.timeStamp = Date.parse(startDate)
    recordObj.value = 'ot' // in or ot
    tempObj = JSON.parse(JSON.stringify(recordObj))
    motionTimeStamps.push(tempObj)

    for (var i = 0; i < json.length; i++) {
        recordObj.timeStamp = json[i].sampleTime
        if (json[i].assetState.name === 'occupied') {
            recordObj.value = 'in'
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        } else if (json[i].assetState.name === 'free') {
            recordObj.value = 'ot'
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        } else { // missinput or other
            recordObj.value = 'ms'
            recordObj.timeStamp = json[i - 1].sampleTime + 10000 // 上一个记录后增加一个十秒后的掉线数据
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        };
    }

    // add boundary record - always as the last one

    recordObj.timeStamp = Date.parse(endDate)
        // recordObj.value 取原值
    tempObj = JSON.parse(JSON.stringify(recordObj))
    motionTimeStamps.push(tempObj)
} else if (json[0].resourceType === 'SampleMotion') { // json[1].value json[1].sampleTime
    c('Calculating ' + json.length + ' lists')

    // first record always 'ot'
    recordObj.timeStamp = json[0].sampleTime
    recordObj.value = 'ot' // in or ot
    tempObj = JSON.parse(JSON.stringify(recordObj))
    motionTimeStamps.push(tempObj)

    for (let i = 1; i < json.length; i++) { // from second records and so on
        lastValue = json[i - 1].value // update previous value

        recordObj.timeStamp = json[i].sampleTime

        if (((json[i].sampleTime - json[i - 1].sampleTime)) < 1000 * 300) { // 间隔大于5分钟,认为是掉线数据.增加一个ot
            if (lastValue === (json[i].value - 1)) { // Value increased by 1
                recordObj.value = 'in'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            } else if (lastValue === json[i].value) { // Value unchanged!
                recordObj.value = 'ot'
                tempObj = JSON.parse(JSON.stringify(recordObj))
                motionTimeStamps.push(tempObj)
            } else { // do not write to recordarray
                c('        Sensor first seen or down, cannot tell')
            };
        } else { // 认为是掉线后的数据,value不可靠,先设为 ot
            recordObj.value = 'ms'
            recordObj.timeStamp = json[i - 1].sampleTime + 10000 // 上一个记录后增加一个十秒后的掉线数据
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        }
    }
}

doReport()

function doReport() {
    c('Total motion records: ' + motionTimeStamps.length)
    c(' Processing all motion records:')

    for (let i = 0; i < motionTimeStamps.length; i++) {
        t1.setTime(motionTimeStamps[i].timeStamp)
        c(motionTimeStamps[i].value + '  ' + t1.toLocaleString())
    }
    c(' \nProcessing: \n')
    for (let i = 1; i < motionTimeStamps.length; i++) { // start from second record
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
        t1ToNext = 60 - t1.getSeconds() // 前面的零头秒数.例如 16:14:06, 则 = 54
        PrevTot2 = t2.getSeconds() // 后面的零头秒数 16:14:06, 则 = 06
            // 这样, 10:01:22 in -10:03:44 ot ,应该计算01分的38秒占用,03分的44秒占用 ,02的66秒占用

        // c(' :' + t1.toLocaleString() + '(前)' + t1m.toLocaleTimeString() + '(分)' + minDiff + '(相差分)' + t1ToNext + '(前秒) ' + PrevTot2 + '(后秒)' + t2.toLocaleString() + '(后)  ' + t2m.toLocaleTimeString() + '(分)')

        if (motionTimeStamps[i - 1].value === 'in') { // 如果前一个是in,那么后面的时间段应该100%占用
            // c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

            if (t1m >= t2m) {
                c('      头尾在同样的一分钟,计算缝隙')
                t1ToNext = (t1ToNext + PrevTot2 - 60) /// 计算缝隙
                PrevTot2 = 0 // 合并计算了
            }

            t0.setTime(t1m.getTime()) // 前一整分

            let _RecordExist = false // 记录不存在
                // eslint-disable-next-line no-unused-vars
                // var _ExistValue = 0

            // process head
            if (timeArray.length >= 1) {
                for (let key = timeArray.length - 1; key >= Math.max(timeArray.length - 9, 0); key--) { // 检查是否存在这个分钟纪录
                    if (timeArray[key].timeStamp === t0.toLocaleString()) {
                        c(key + '      头部记录存在！增加头部的数值' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]))
                        _RecordExist = true
                        timeArray[key].value += t1ToNext / 60 // 增加新的占用
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = t1ToNext / 60
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                c('      头部记录不存在！头部加入新记录：' + JSON.stringify(_timeObj))
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
                c('      加入中部记录：' + JSON.stringify(_timeObj))
                j += 1
            }

            { // tail会重复？
                t0.setTime(t2m.getTime()) // tail
                let _RecordExist = false
                    // for (const key in timeArray) { // already exits in Array?
                    //       for (let key = timeArray.length - 1; key > 0; key--) {
                if (timeArray.length > 1) {
                    for (let key = timeArray.length - 1; key > Math.max(timeArray.length - 9, 0); key--) { // 检查是否存在这个分钟纪录
                        if (timeArray[key].timeStamp === t0.toLocaleString()) {
                            _RecordExist = true
                            c(key + '     尾部记录存在！尾部数值增加  ' + JSON.stringify(timeArray[key]) + ' + ' + PrevTot2)
                            timeArray[key].value += PrevTot2 / 60
                            c(key + '     尾部记录存在！尾部数值增加  ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]))
                        }
                    }
                }

                if (!_RecordExist) {
                    timeObj.timeStamp = t2m.toLocaleString()
                    timeObj.value = PrevTot2 / 60
                    var _timeObj = JSON.parse(JSON.stringify(timeObj))
                    timeArray.push(_timeObj)
                    c('      尾部记录不存在，加入新尾部记录：' + JSON.stringify(_timeObj))
                }
            }
        } else if ((motionTimeStamps[i - 1].value === 'ms')) { //  ms 记录 donothing
            c('ms\n\n\n')
        } else { // 如果前一个记录是ot,后面时间缝隙全都是0
            if (t1m >= t2m) {
                // c("      头尾在相同的一分钟,计算缝隙");
                t1ToNext = (t1ToNext + PrevTot2 - 60) /// 计算缝隙
                PrevTot2 = 0 // 计算头部即可
            };

            t0.setTime(t1m) // Previous
            let _RecordExist = false

            if (timeArray.length >= 1) {
                for (let key = timeArray.length - 1; key >= Math.max(timeArray.length - 9, 0); key--) { // 检查是否存在这个分钟纪录
                    if (timeArray[key].timeStamp === t0.toLocaleString()) {
                        c(key + '      头部记录存在！头部原值+0不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]))
                        _RecordExist = true
                            //  _ExistValue = timeArray[key].value
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                c('      头部不存在！头部加入新记录 0：' + JSON.stringify(_timeObj))
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
                    //  c('      加入中部记录0：' + JSON.stringify(_timeObj))
                j++
            }
            // tail会重复？
            t0.setTime(t2m) // tail
            _RecordExist = false
                // for (const key in timeArray) { // already exits in Array?
                // for (let key = timeArray.length - 1; key > 0; key--) {
            if (timeArray.length > 1) {
                for (let key = timeArray.length - 1; key > Math.max(timeArray.length - 9, 0); key--) { // 检查是否存在这个分钟纪录
                    if (timeArray[key].timeStamp === t0.toLocaleString()) {
                        c(key + '                  尾部记录存在！尾部原值不变 ' + '   ' + JSON.stringify(timeArray[key]))
                        _RecordExist = true
                            // _ExistValue = timeArray[key].value;
                    }
                }
            }
            // do nothing
            if (!_RecordExist) {
                timeObj.timeStamp = t2m.toLocaleString()
                timeObj.value = 0
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                c('      尾部记录不存在，加入新尾部记录0：' + JSON.stringify(_timeObj))
            }
        }
    }

    c('timearray:sorting ')
    timeArray.sort(function(a, b) {
        if (Date.parse(a.timeStamp) > Date.parse(b.timeStamp)) {
            return 1
        } else {
            return -1
        };
    })
    CSVFile.write('Time,Pct\n')
    for (let i = 0; i < timeArray.length; i++) {
        var e = timeArray[i]

        // if (!e.timeStamp) continue
        //   c(e.timeStamp + ' = ' + e.value + '')
        CSVFile.write(e.timeStamp + ',' + e.value + '\n')
    };

    CSVFile.end()
}