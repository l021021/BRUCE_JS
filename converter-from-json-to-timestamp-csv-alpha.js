/* 数据转换通用模块*/

const FS = require('fs')

var filename = 'C:\\codebase\\log\\675524_2020_11_02_10_00_00_2020_11_02_17_59_59_Motion' // 历史记录文件
const startDate = '2020/11/02/10:00:00' // 开始时间
const endDate = '2020/11/02/17:59:59' // 结束时间
    // var filename = 'C://codebase//log//797296_2019_06_01_00_00_00_2019_07_01_00_00_00_UU' // 历史记录文件
    // const startDate = '2019/06/01/00:00:00'
    // const endDate = '2019/07/01/00:00:00'

var str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })
const CSVFile = FS.createWriteStream(filename + '_stamp' + '.csv', { encoding: 'utf8' })


var records2D = [] //以DID为组织的二维数组
var originalRecords = [] //原始记录数组
var unitsSet = new Set() //临时set
var unitsArray = [] //传感器ID数组

var motionRecordobj = {
    // type: '',
    Did: '',
    timeStamp: '',
    value: ''
}



var recordsofSensor = []

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
    // c(' ----- 总motion记录数' + originalRecords.length)

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

CSVFile.write('ID,Elapsed,TimeStamp,Event\n') // CSV文件头
for (let iDID = 0; iDID < originalRecords.length; iDID++) {
    records2D[originalRecords[iDID].DID].push(JSON.parse(JSON.stringify(originalRecords[iDID])))
}

// 计算循环 写入 motionTimeStamps 数组
unitsArray = Array.from(unitsSet) //传感器数组


for (let iDID = 0; iDID < unitsArray.length; iDID++) { // 对每一个sensor做循环 iDID:传感器ID循环
    console.log(' ---- Computing sensor ' + unitsArray[iDID])
    console.log(' ---- Sorting sensor array ')
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
                    // c('        Sensor first seen, cannot tell')
                };
            } else { //空缺数据处理
                motionRecordobj.value = 'ms' //
                motionRecordobj.timeStamp = records2D[unitsArray[iDID]][iRec - 1].sampleTime + 10000 // 增加一个十秒后的掉线数据
                _tempMotionObj = JSON.parse(JSON.stringify(motionRecordobj))
                recordsofSensor.push(_tempMotionObj)

                // c('   ---  Miss Motion Input    ' + motionRecordobj.Did + ' ' + motionRecordobj.timeStamp)
            }
        }
    }

    // 写入文件
    // let tr = '2=31'

    let t = new Date()
    let tstr, idstring
    for (let i5 = 0; i5 < recordsofSensor.length; i5++) {
        var e = recordsofSensor[i5]
        t.setTime(e.timeStamp)
        tstr = t.toLocaleString('zh-CN', { hour12: false })
        idstring = e.Did.split('-')
            // console.log(tstr)

        CSVFile.write(idstring[1] + ',' + e.timeStamp + ',' + tstr + ',' + e.value + '\n')
    };
}
//TODO 秒数不见了
CSVFile.end()
    // process.exit()