/* eslint-disable eol-last */
/* eslint-disable no-redeclare */
/*
从 log-sapce-history-to-file 产生的文件中计算占用数据,精确到分

1.从文件读入记录
2.装换成in、ot数组 motiontimestamps
对每个ID循环
    计算得到timearray
    写入文件
4.查重算法,仅限于前五个记录5.加入边界
6.考虑掉线因素
        6.1 samplemotion:value跳变
        6.2 Asset的missinput
        6.3 标为 ms
        6.4 计算占用时忽略 ms 记录

*/
const FS = require('fs')
var str
var json = []
var locationJson = []
var unitsArray = []
var recordObj = {
    Did: '',
    timeStamp: '',
    value: ''
}

var filename = '..\\log\\212446_2019_12_30_00_00_00_2020_01_01_12_59_59_EU' // 历史记录文件
const startDate = '2019/12/30/00:00:00'
const endDate = '2020/01/01/12:59:59'

var motionTimeStamps = []

const c = console.log

str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })
const CSVFile = FS.createWriteStream(filename + '_offline.csv', { encoding: 'utf8' })

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
        json[locationJson[i1].DID] = [] // json:计算报告数组, 建立二维数组框架,准备存入报告数据
        c(locationJson[i1].DID)
    }
}

c('All (seen) sensors sum up to: ' + unitsArray.length)

// 将不同传感器的数据分开放入数组

CSVFile.write('ID,Time,EVT\n') // 文件头

for (let i1 = 0; i1 < locationJson.length; i1++) {
    json[locationJson[i1].DID].push(JSON.parse(JSON.stringify(locationJson[i1])))
}

for (let i1 = 0; i1 < unitsArray.length; i1++) { // 对每一个sensor循环,写入分开的矩阵
    c(' Computing sensor ' + unitsArray[i1])

    // Process records (asset or motion) and write into motiontimestamps
    var tempObj
    c('  Sorting sensor array ')
    // scan_array(json[unitsArray[i1]])

    json[unitsArray[i1]].sort(function (a, b) { // 按照时间排序,但是id是乱的
        if (a.sampleTime > b.sampleTime) {
            return 1
        } else {
            return -1
        };
    })
    c('    Finished sorting sensor array ')
    // scan_array(json[unitsArray[i1]])

    // c(JSON.stringify(json[unitsArray[i1]]))

    motionTimeStamps.length = 0 // 清零
    recordObj.Did = unitsArray[i1]

    // 从motion value/free/occupy 到 in-ot 记录

    c('  Calculating io-ot records ' + json[unitsArray[i1]].length + ' lists')

    for (let i2 = 0; i2 < json[unitsArray[i1]].length; i2++) {
        recordObj.timeStamp = json[unitsArray[i1]][i2].sampleTime
        recordObj.value = json[unitsArray[i1]][i2].deviceUpState.name
        tempObj = JSON.parse(JSON.stringify(recordObj))
        motionTimeStamps.push(tempObj)
        const t1 = new Date()
        t1.setTime(recordObj.timeStamp)
        CSVFile.write(recordObj.Did + ',' + t1.toLocaleString() + ',' + recordObj.value + '\n')

        // scan_array(motionTimeStamps)
    }

    // c('  COMPUTING ALL  motion records for this DID (BOUNDARY ADDED) : ' + motionTimeStamps.length)

    // timeArray.length = 0 // 清零
    // c('    ARRAY CLEARED,  processing time Array from (zero) ' + timeArray.length)

    // c('    timearray: sorting ')

    // c('  Writing  for this sensor ' + timeArray.length)
}

function scan_array(arr) {
    c('\n Listing Elements: \n')
    for (var key in arr) { // 这个是关键
        if (typeof (arr[key]) === 'array' || typeof (arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            console.log('      ' + key + ' --- ' + arr[key])
            CSVFile.write(arr[key] + ',')
        }
    }
}
CSVFile.end()