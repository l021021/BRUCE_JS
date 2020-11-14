//TODO:nothing done yet

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

var filename = '..\\log\\290596_x_2020_06_08_00_00_00_2020_06_13_00_00_00332F-3-M' // 历史记录文件
    // const startDate = '2019/12/23/00:00:00'
    // const endDate = '2019/12/31/23:59:59'

var t1 = new Date()
var t2 = new Date()
var t1m = new Date()
var t0 = new Date()
var t2m = new Date()
var timeArray = []
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
const CSVFile = FS.createWriteStream(filename + '_time.json', { encoding: 'utf8' })

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
var t = new Date()
for (let i1 = 0; i1 < locationJson.length; i1++) {
    // locationJson[i1].sampleTime =
    t.setTime(locationJson[i1].sampleTime)
    locationJson[i1].sampleTime = t.toLocaleString('zh-CN', { hour12: false })
    console.log(locationJson[i1].sampleTime);
    //  json[locationJson[i1].DID] = [] // json:计算报告数组, 建立二维数组框架,准备存入报告数据
    // c(locationJson[i1].DID)
}

CSVFile.write(JSON.stringify(locationJson))
CSVFile.end()
c("finished")