/* eslint-disable no-redeclare */
/*
从 log-sapce-history-to-file 产生的文件中计算占用数据,精确到分

1.从文件读入记录
2.装换成in、ot数组 motiontimestamps
3.计算得到timearray
TODO:写入文件

*/
const FS = require('fs')
var str
var json
var recordObj = {
    // type: '',
    // Did: '',
    timeStamp: '',
    value: ''
}

var filename = 'EUI64-D0CF5EFFFE792D84-3-Motion_2019_11_01_0_00_00_2019_11_30_23_59_59'

var t1 = new Date()
var t2 = new Date()
var t1m = new Date()
var t0 = new Date()
var t2m = new Date()
var timeArray = []
var motionTimeStamps = []
    // var _timeObj
var timeObj = {
    ID: '',
    timeStamp: '',
    value: ''
}

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

json = JSON.parse(str)
    // c(JSON.stringify(json))

/*
json
json[0].assetState.name occupied
json[0].assetState.resourceType AssetState
json[0].resourceType "SampleAsset"
json[0].sampleTime 1573176377796

*/
// Process records
// write into motiontimestamps
var tempObj

json.sort(function(a, b) {
    if (Date.parse(a.sampleTime) > Date.parse(b.sampleTime)) {
        return -1
    } else {
        return 1
    };
})
if (json[0].assetState && json[0].assetState.resourceType === 'AssetState') {
    c('calculating ' + json.length + ' lists')
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
        } else {
            recordObj.value = 'ms'
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        };
    }
} else if (json[0].resourceType === 'SampleMotion') { // json[1].value json[1].sampleTime
    c('calculating ' + json.length + ' lists')
    for (let i = 1; i < json.length; i++) {
        lastValue = json[i - 1].value // update new value ,if the first ,take -1
            // recordObj.type = json[index].resourceType
            // recordObj.Did = json.sampleListDto.dataSourceAddress.did
        recordObj.timeStamp = json[i].sampleTime
        if (lastValue !== json[i].value) { // Value changed!
            recordObj.value = 'in'
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        } else if (lastValue === json[i].value) { // Value unchanged!
            recordObj.value = 'ot'
            tempObj = JSON.parse(JSON.stringify(recordObj))
            motionTimeStamps.push(tempObj)
        } else { // do not write to recordarray
            c('        Sensor first seen, cannot tell')
        };
    }
}

doReport()

// FS.writeFileSync(filename + '.csv', JSON.stringify(timeArray), 'utf8')

// write to csv

function doReport() {
    c('Total motion records: ' + motionTimeStamps.length)
        // c('for ' + deviceID + ' from ' + startDate + ' to ' + endDate)
        // c("Time is Up...")
    c('all samplemotion records:')
    for (let i = 0; i < motionTimeStamps.length; i++) {
        t1.setTime(motionTimeStamps[i].timeStamp)
        c(motionTimeStamps[i].value + '  ' + t1.toLocaleString())
    }
    c('processing: ')
    for (let i = 1; i < motionTimeStamps.length; i++) { //
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

        if (motionTimeStamps[i - 1].value === 'in') { // 如果前一个是in,那么后面的时间段应该100%占用
            // c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

            if (t1m === t2m) {
                //   c('   头尾在一分钟内!')
            } else { // c('   不在一分钟')
            };

            if (t1m >= t2m) {
                // c("      头尾在同样的一分钟,计算缝隙");
                t1ToNext = (t1ToNext + PrevTot2 - 60) /// 计算缝隙
                PrevTot2 = 0 // 计算头部即可
            }

            t0.setTime(t1m.getTime()) // 前一整分

            let _RecordExist = false // 记录不存在
                // eslint-disable-next-line no-unused-vars
            var _ExistValue = 0

            for (const key in timeArray) { // 检查是否存在这个分钟纪录
                if (timeArray[key].timeStamp === t0.toLocaleString()) {
                    // c('      这一分记录存在！增加头部的数值' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]))
                    _RecordExist = true
                        // _ExistValue = timeArray[key].value;
                    timeArray[key].value += t1ToNext / 60 // 增加新的占用
                    break
                }
            }

            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = t1ToNext / 60
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                    //  c('      这一分不存在！头部加入新记录：' + t0.toLocaleTimeString())
            }

            { // tail会重复？
                t0.setTime(t2m.getTime()) // tail
                let _RecordExist = false
                for (const key in timeArray) { // already exits in Array?
                    if (timeArray[key].timeStamp === t0.toLocaleString()) {
                        //  c('      这一分存在！尾部数值增加  ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]) + '  ' + JSON.stringify(motionTimeStamps[i]))
                        _RecordExist = true
                        timeArray[key].value += PrevTot2 / 60
                        break
                    }
                }

                if (!_RecordExist) {
                    timeObj.timeStamp = t2m.toLocaleString()
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
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 1

                // c('      加入中部记录：' + t0.toLocaleTimeString())
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                j += 1
            }
        } else { // 如果前一个记录是ot,后面时间缝隙全都是0
            // c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)

            if (t1m === t2m) {
                //   c('   头尾在一分钟内!')
            } else { // c('   不在一分钟')
            };

            if (t1m >= t2m) {
                // c("      头尾在相同的一分钟,计算缝隙");
                t1ToNext = (t1ToNext + PrevTot2 - 60) /// 计算缝隙
                PrevTot2 = 0 // 计算头部即可
            };

            t0.setTime(t1m) // Previous
            let _RecordExist = false

            for (const key in timeArray) { // already exits in Array?
                if (timeArray[key].timeStamp === t0.toLocaleString()) {
                    //   c('      这一分记录存在！头部原值不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]) + '  ' + JSON.stringify(motionTimeStamps[i]))
                    _RecordExist = true
                    _ExistValue = timeArray[key].value
                    break
                }
            }

            if (!_RecordExist) { // 这一分不存在
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj) // 增加记录
                    //  c('      这一分不存在！头部加入新记录 0：' + t0.toLocaleTimeString())
            }

            // tail会重复？
            t0.setTime(t2m) // tail
            _RecordExist = false
            for (const key in timeArray) { // already exits in Array?
                if (timeArray[key].timeStamp === t0.toLocaleString()) {
                    //   c('      这一分尾部存在！尾部原值不变 ' + t0.toLocaleTimeString() + '   ' + JSON.stringify(timeArray[key]) + '  ' + JSON.stringify(motionTimeStamps[i]))
                    _RecordExist = true
                        // _ExistValue = timeArray[key].value;
                    break
                }
            }
            // do nothing
            if (!_RecordExist) {
                timeObj.timeStamp = t2m.toLocaleString()
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
                timeObj.timeStamp = t0.toLocaleString()
                timeObj.value = 0

                // c('      加入中部记录：' + t0.toLocaleTimeString())
                var _timeObj = JSON.parse(JSON.stringify(timeObj))
                timeArray.push(_timeObj)
                j++
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
        c(e.timeStamp + ' = ' + e.value + '')
        CSVFile.write(e.timeStamp + ',' + e.value + '\n')
    };

    CSVFile.end()

    // CSVFile.end()
    // process.exit()
}
