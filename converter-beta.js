/* 数据转换通用模块*/

const FS = require('fs')

var filename = 'C:\\codebase\\log\\797296_2020_10_26_00_00_00_2020_10_31_23_59_59_Motion - 副本' // 历史记录文件
const startDate = '2020/10/26/00:00:00' // 开始时间
const endDate = '2020/10/31/23:59:59' // 结束时间
    // var filename = 'C://codebase//log//797296_2019_06_01_00_00_00_2019_07_01_00_00_00_UU' // 历史记录文件
    // const startDate = '2019/06/01/00:00:00'
    // const endDate = '2019/07/01/00:00:00'
const filter = ['value']
let grid = 30 // 间隔时间(分

var str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })
const CSVFile = FS.createWriteStream(filename + '_' + grid + 'M.csv', { encoding: 'utf8' })

function c(data) {
    // let match = false
    // filter.forEach(element => {
    //     if (data.indexOf(element) >= 0) {
    //         match = true
    //     }
    // })
    // if (match === true) {
    //     try {
    //         console.log(data)
    //     } catch (error) {
    //         console.log(error)
    //     }
    // }
}

var records2D = [] //以DID为组织的二维数组
var originalRecords = [] //原始记录数组
var unitsSet = new Set() //临时set
var unitsArray = [] //传感器ID数组
var t1s = new Date()
var t2s = new Date()
var t1m = new Date()
var t2m = new Date()
var t1 = new Date()
var t2 = new Date()
let beginTime = new Date()


var t0 = new Date()
var occuArray = []
var motionRecordobj = {
    // type: '',
    Did: '',
    timeStamp: '',
    value: ''
}
var occuRecobj = {
    ID: '',
    timeStamp: '',
    value: ''
}
let _tempMotionObj
let _tempOccuobj

var recordsofSensor = []

// var minDiff
var t1tofollowingGrid, previousgridtoT2, gridDelta

var _lastValue = -1

// 读取文件发生错误事件
CSVFile.on('error', (err) => {
    console.log('发生异常:', err)
})

CSVFile.on('open', (fd) => {
    console.log('文件已打开:', fd)
})

CSVFile.on('close', () => {
    console.log('文件已关闭！')
})

str = str.replace(/\]\[/gi, ',') // change ][ to , which was caused by consecutive packets

originalRecords = JSON.parse(str) // 从文件读入的原始记录总表
c(' ----- 总motion记录数' + originalRecords.length)

// 从原始数据计算出一个sensor set

for (let i1 = 0; i1 < originalRecords.length; i1++) {
    unitsSet.add(originalRecords[i1].DID)
}


//建立2维数组框架

unitsSet.forEach(element => {
    records2D[element] = []
})

console.log(' ----- 总的传感器数: ' + unitsSet.size)

// 将不同传感器的数据分开放入数组

CSVFile.write('ID,Time,Pct\n') // CSV文件头
for (let iDID = 0; iDID < originalRecords.length; iDID++) {
    records2D[originalRecords[iDID].DID].push(JSON.parse(JSON.stringify(originalRecords[iDID])))
}

// 计算循环 写入 motionTimeStamps 数组
unitsArray = Array.from(unitsSet) //传感器数组

let thisTime = new Date()
console.log("## 1. Time elapsed:" + (thisTime - beginTime))


for (let iDID = 0; iDID < unitsArray.length; iDID++) { // 对每一个sensor做循环 iDID:传感器ID循环
    console.log(' ---- Computing sensor ' + iDID + ' of ' + unitsArray.length)
        // console.log(' ---- Sorting sensor array ')
    records2D[unitsArray[iDID]].sort(function(a, b) { // 先吧这个传感器的数据按照时间排序
        if (a.sampleTime > b.sampleTime) {
            return 1
        } else {
            return -1
        };
    })

    recordsofSensor.length = 0 // 清零
    motionRecordobj.Did = unitsArray[iDID]

    // 从motion value/free/occupy 变换到 in-ot 记录。（motion、nomotion没有历史记录可以取回）

    let thisTime = new Date()
    console.log("## 2.(looP) Time elapsed:" + (thisTime - beginTime))

    console.log('  ---- Phase I: calculating sensor motion records: ' + records2D[unitsArray[iDID]].length + ' lists')
    if (records2D[unitsArray[iDID]][0].DID.indexOf('UU') >= 0) { // 如果是asset记录

        // boundary:日期起始边界先视为FREE

        motionRecordobj.timeStamp = Date.parse(startDate)
        motionRecordobj.value = 'ot'
        _tempMotionObj = JSON.parse(JSON.stringify(motionRecordobj))
        recordsofSensor.push(_tempMotionObj)

        // 主体

        for (let iRec = 0; iRec < records2D[unitsArray[iDID]].length; iRec++) { // irec:单个传感器的记录内循环
            motionRecordobj.timeStamp = records2D[unitsArray[iDID]][iRec].sampleTime
            if (records2D[unitsArray[iDID]][iRec].assetState.name === 'occupied') {
                motionRecordobj.value = 'in'
            } else if (records2D[unitsArray[iDID]][iRec].assetState.name === 'free') {
                motionRecordobj.value = 'ot'
            } else { // 包含 missinput等.处理异常
                motionRecordobj.value = 'ms'
                motionRecordobj.timeStamp = (iRec === 0) ? (Date.parse(startDate) + 10000) : (records2D[unitsArray[iDID]][iRec - 1].sampleTime + 10000) // 在前一个记录后,增加一个十秒后的掉线数据

                c('  --- Miss Input at ' + motionRecordobj.Did + ' ' + motionRecordobj.timeStamp)
            };
            _tempMotionObj = JSON.parse(JSON.stringify(motionRecordobj))
            recordsofSensor.push(_tempMotionObj)
        }


        thisTime = new Date()
        console.log("## 3. (looped) Time elapsed:" + (thisTime - beginTime))

        // add tail record - always as the last one

        motionRecordobj.timeStamp = Date.parse(endDate)
            // recordObj.value 取原值
        _temprecordObj = JSON.parse(JSON.stringify(motionRecordobj))
            // 将前一个记录延长到时段结束时间
        recordsofSensor.pop()
        recordsofSensor.push(_temprecordObj)

    } else if (records2D[unitsArray[iDID]][0].DID.indexOf('EU') >= 0) { // 如果是 samplemotion 记录
        // c('   --- calculating in-ot 记录' + records2D[unitsArray[iDID]].length + ' lists')

        // boundary:日期边界视为空
        motionRecordobj.timeStamp = records2D[unitsArray[iDID]][0].sampleTime // 第一个 samplemotion记录,无法判断,先设为ot
        motionRecordobj.value = 'ot'
        _tempMotionObj = JSON.parse(JSON.stringify(motionRecordobj))
        recordsofSensor.push(_tempMotionObj)

        let thisTime = new Date()
        console.log("## 2.(looP) Time elapsed:" + (thisTime - beginTime))
            // 主体

        for (let iRec = 1; iRec < records2D[unitsArray[iDID]].length; iRec++) { // from second records and so on
            _lastValue = records2D[unitsArray[iDID]][iRec - 1].value // update previous value

            motionRecordobj.timeStamp = records2D[unitsArray[iDID]][iRec].sampleTime
            if (((records2D[unitsArray[iDID]][iRec].sampleTime - records2D[unitsArray[iDID]][iRec - 1].sampleTime)) < 1000 * 120) { // dehole,因为时间差大于2分钟,不可靠
                if (_lastValue !== records2D[unitsArray[iDID]][iRec].value) { // Value changed!
                    motionRecordobj.value = 'in'
                    let temprecordObj = JSON.parse(JSON.stringify(motionRecordobj))
                    recordsofSensor.push(temprecordObj)
                } else if (_lastValue === records2D[unitsArray[iDID]][iRec].value) { // Value unchanged!
                    motionRecordobj.value = 'ot'
                    let temprecordObj = JSON.parse(JSON.stringify(motionRecordobj))
                    recordsofSensor.push(temprecordObj)
                } else { // do not write to recordarray
                    c('        Sensor first seen, cannot tell')
                };
            } else { //空缺数据处理
                motionRecordobj.value = 'ms' //
                motionRecordobj.timeStamp = records2D[unitsArray[iDID]][iRec - 1].sampleTime + 10000 // 增加一个十秒后的掉线数据
                _tempMotionObj = JSON.parse(JSON.stringify(motionRecordobj))
                recordsofSensor.push(_tempMotionObj)

                c('   ---  Miss Motion Input    ' + motionRecordobj.Did + ' ' + motionRecordobj.timeStamp)
            }
        }

        thisTime = new Date()
        console.log("## 3. (looped) Time elapsed:" + (thisTime - beginTime))

    }

    console.log('  ---- Phase II： computing occupancy  records for this DID (BOUNDARY ADDED) : ' + recordsofSensor.length + ' lists')

    // for (let j = 0; j < motionTimeStamps.length; j++) { //打印原始记录
    //     t1.setTime(motionTimeStamps[j].timeStamp)
    //     // c(motionTimeStamps[j].value + '  ' + t1.toLocaleString('zh-CN', { hour12: false }))
    // }

    thisTime = new Date()
    console.log("## 4.(P2) Time elapsed:" + (thisTime - beginTime))


    occuArray.length = 0 // 目标矩阵清零

    for (let iRec = 1; iRec < recordsofSensor.length; iRec++) { // start from second record
        t1.setTime(recordsofSensor[iRec - 1].timeStamp) // 前一个事件时间
        t1s = t1
        t1s.setMilliseconds(0) // 得到整秒

        t1m.setTime(recordsofSensor[iRec - 1].timeStamp) // t1m：前一个事件的整格子数
        t1m.setMilliseconds(0)
        t1m.setSeconds(0)
        t1m.setMinutes(grid * (Math.floor(t1s.getMinutes() / grid))) // 得到整格子开始,如0,20,40.或0,30,60


        t2.setTime(recordsofSensor[iRec].timeStamp) // 当前事件时间
        t2s = t2
        t2s.setMilliseconds(0).set // 得到整秒
        t2m.setTime(recordsofSensor[iRec].timeStamp)
        t2m.setMilliseconds(0)
        t2m.setSeconds(0)
        t2m.setMinutes(grid * (Math.floor(t2s.getMinutes() / grid)))

        occuRecobj.ID = recordsofSensor[iRec].Did

        // 得到格子差和秒数零头
        // c('  --- where  (' + iRec + ') ' + t1.toLocaleString('zh-CN', { hour12: false }) + ' -  ' + t2.toLocaleString('zh-CN', { hour12: false }))

        gridDelta = Math.floor((t2m - t1m) / (grid * 60 * 1000)) // 两次数据之间整格子差
        t1tofollowingGrid = 60 * grid - t1s.getSeconds() - (t1s.getMinutes() - t1m.getMinutes()) * 60 // t1到下一个格子的秒数.例如 16:14:06,格子为30 min,  则 =1800-6-840 

        // t1tofollowingGrid = // t1到下一个格子的秒数.例如 16:14:06,格子为30 min,  则 =1800-6-840 

        /*                   t1                   t2
          --------------+----------+------------+---------+
                             +     +            +  +
                             t1tonext        prevtot2  
        */

        previousgridtoT2 = t2s.getSeconds() + (t2s.getMinutes() - t2m.getMinutes()) * 60 // t2前面的格子到t2的秒数 16:44:06, 则 = 846
            // 这样, 10:01:22 in -11:03:44 ot ,应该计算01分的38秒占用,03分的44秒占用 ,02的66秒占用

        // c('  --- where 1# = ' + t1m.toLocaleString('zh-CN', { hour12: false }) + '  ' + gridDelta + ' grids with ' + t1tofollowingGrid + ' s in 1st  hole and ' + previousgridtoT2 + 's in 2nd hole to 2# ' + t2m.toLocaleString('zh-CN', { hour12: false }) + ' was ' + recordsofSensor[iRec - 1].value)

        if (recordsofSensor[iRec - 1].value === 'in') { // 如果前一个是in,那么后面的时间段应该100%占用
            //     c('    before ' + i + ' was a ' + motionTimeStamps[i - 1].value)


            ///////////////////

            if (t1m >= t2m) { //P1,P2重叠
                // c('   -- 头尾在同样的格子,计算缝隙(in)')
                t1tofollowingGrid = (t1tofollowingGrid + previousgridtoT2 - 60 * grid) /// 计算缝隙.TODO
                previousgridtoT2 = 0 // 合并计算了
            }

            t0.setTime(t1m.getTime()) // 前一格子

            let _RecordExist = false // 记录不存在

            // process head
            if (occuArray.length >= 1) { //不是第一个记录
                for (let iOccu = occuArray.length - 1; iOccu >= Math.max(occuArray.length - 5, 0); iOccu--) { // 检查是否存在这个分钟纪录,回溯5个记录(为了减少无谓计算)
                    if (occuArray[iOccu].timeStamp === t0.toLocaleString('zh-CN', { hour12: false })) {
                        _RecordExist = true
                        occuArray[iOccu].value += t1tofollowingGrid / (60 * grid) // 增加新的占用
                            // c('   -- 头部记录存在！增加数值(in)：' + t0.toLocaleString() + '   ' + JSON.stringify(occuArray[iOccu]))
                    }
                }
            }
            if (!_RecordExist) { // 这一分不存在
                occuRecobj.timeStamp = t0.toLocaleString('zh-CN', { hour12: false })
                occuRecobj.value = t1tofollowingGrid / (60 * grid) // 1 grid
                let _temprecObj = JSON.parse(JSON.stringify(occuRecobj))
                occuArray.push(_temprecObj) // 增加记录
                    // c('   --  头部记录不存在！加入新记录(in)：' + JSON.stringify(_temprecObj))
            }


            // process middle
            let j = 1
            while (j < gridDelta) {
                // c('   -- 准备加入中部记录(in) ' + gridDelta)
                t0.setTime(t1m.getTime() + j * grid * 1000 * 60) // 下一格子
                occuRecobj.timeStamp = t0.toLocaleString('zh-CN', { hour12: false })
                occuRecobj.value = 1

                _tempOccuobj = JSON.parse(JSON.stringify(occuRecobj))
                occuArray.push(_tempOccuobj)
                    // c(`   -- 加入第 ${j} 个中部记录(in)：${JSON.stringify(_tempOccuobj)}`)
                j++
            }

            {
                // c('   -- 准备加入尾部记录(in)')
                t0.setTime(t2m.getTime()) // tail
                let _RecordExist = false
                    // for (const k in timeArray) { // already exits in Array?
                    //       for (let k = timeArray.length - 1; k > 0; k--) {
                if (occuArray.length >= 1) {
                    for (let iOccu = occuArray.length - 1; iOccu >= Math.max(occuArray.length - 5, 0); iOccu--) { // 检查是否存在这个分钟纪录
                        if (occuArray[iOccu].timeStamp === t0.toLocaleString('zh-CN', { hour12: false })) {
                            _RecordExist = true
                                //        c(k + '     尾部记录存在！尾部数值增加  ' + JSON.stringify(timeArray[k]) + ' + ' + PrevTot2)
                            occuArray[iOccu].value += previousgridtoT2 / (60 * grid)
                                // c('   --  尾部记录存在！尾部数值增加(in)  ' + t0.toLocaleString() + '   ' + JSON.stringify(occuArray[iOccu]))
                        }
                    }
                }

                if (!_RecordExist) {
                    occuRecobj.timeStamp = t2m.toLocaleString('zh-CN', { hour12: false })
                    occuRecobj.value = previousgridtoT2 / 60 / grid
                    _tempOccuobj = JSON.parse(JSON.stringify(occuRecobj))
                    occuArray.push(_tempOccuobj)
                        // c('    -- 尾部记录不存在，加入新记录(in)：' + JSON.stringify(_tempOccuobj))
                }
            }
        } else if ((recordsofSensor[iRec - 1].value === 'ms')) { //  ms 记录 donothing
            // c('   --- ms skipped ')
        } else { // 如果前一个记录是ot,后面时间缝隙全都是0
            if (t1m >= t2m) {
                // c('    -- 头尾在相同的格子,计算缝隙(ot)')
                t1tofollowingGrid = 0 /// 计算缝隙
                previousgridtoT2 = 0 // 计算头部即可
            };

            t0.setTime(t1m) // Previous grid sharp
            let _RecordExist = false

            if (occuArray.length >= 1) {
                for (let iOccu = occuArray.length - 1; iOccu >= Math.max(occuArray.length - 5, 0); iOccu--) { // 检查是否存在这个十分钟纪录,回溯若干个记录
                    if (occuArray[iOccu].timeStamp === t0.toLocaleString('zh-CN', { hour12: false })) {
                        // c('    -- 头部记录存在，不改变原值(ot) ' + t0.toLocaleString() + '   ' + JSON.stringify(occuArray[iOccu]))
                        _RecordExist = true
                        break
                    }
                }
            }
            if (!_RecordExist) { // 这格子的记录不存在
                occuRecobj.timeStamp = t0.toLocaleString('zh-CN', { hour12: false })
                occuRecobj.value = 0

                _tempOccuobj = JSON.parse(JSON.stringify(occuRecobj))
                occuArray.push(_tempOccuobj) // 增加记录
                    // c('    -- 头部不存在！加入新记录（ot） ' + JSON.stringify(_tempOccuobj))
            }

            // process middle
            let j = 1
                // c('    --  准备加入中部记录(ot)：' + gridDelta);
            while (j < gridDelta) {
                t0.setTime(t1m.getTime() + j * 60 * grid * 1000)
                occuRecobj.timeStamp = t0.toLocaleString('zh-CN', { hour12: false })
                occuRecobj.value = 0

                _tempOccuobj = JSON.parse(JSON.stringify(occuRecobj))
                occuArray.push(_tempOccuobj)
                    // c(`    --  加入第 ${j} 个中部记录(ot)：${JSON.stringify(_tempOccuobj)}`)
                j++
            }
            // tail会重复？
            // c('    -- 准备加入尾部记录(ot)')
            t0.setTime(t2m) // tail
            _RecordExist = false
                // for (const k in timeArray) { // already exits in Array?
                // for (let k = timeArray.length - 1; k > 0; k--) {
            if (occuArray.length >= 1) {
                for (let iOccu = occuArray.length - 1; iOccu >= Math.max(occuArray.length - 5, 0); iOccu--) { // 检查是否存在这个分钟纪录
                    if (occuArray[iOccu].timeStamp === t0.toLocaleString('zh-CN', { hour12: false })) {
                        // c('    -- 尾部记录存在！原值不变(ot) ' + '   ' + JSON.stringify(occuArray[iOccu]))
                        _RecordExist = true
                            // _ExistValue = timeArray[k].value;
                    }
                }
            }
            // do nothing
            if (!_RecordExist) {
                occuRecobj.timeStamp = t2m.toLocaleString('zh-CN', { hour12: false })
                occuRecobj.value = 0
                _tempOccuobj = JSON.parse(JSON.stringify(occuRecobj))
                occuArray.push(_tempOccuobj)
                    // c('    -- 尾部记录不存在，加入新记录（ot） ' + JSON.stringify(_tempOccuobj))
            }
        }
    }

    thisTime = new Date()
    console.log("## 5.(P2ed) Time elapsed:" + (thisTime - beginTime))

    c('   ---- timearray: sorting ')
    occuArray.sort(function(a, b) {
        if (Date.parse(a.timeStamp) > Date.parse(b.timeStamp)) {
            return 1
        } else {
            return -1
        };
    })
    c('  ---- writing  for this sensor ' + occuArray.length)

    for (let i5 = 0; i5 < occuArray.length; i5++) {
        var e = occuArray[i5]
        CSVFile.write(unitsArray[iDID] + ',' + e.timeStamp + ',' + e.value + '\n')
    };
}
// CSVFile.end()

CSVFile.end()
    // process.exit()