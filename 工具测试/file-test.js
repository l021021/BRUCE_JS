const fs = require('fs')
// const path = require('path')
    // const path = require('path');
const logStream = fs.createWriteStream('./mylog.txt', { encoding: 'utf8' })

// 读取文件发生错误事件
logStream.on('error', (err) => {
        console.log('发生异常:', err)
    })
    // 已打开要写入的文件事件
logStream.on('open', (fd) => {
        console.log('文件已打开:', fd)
    })
    // 文件已经就写入完成事件
logStream.on('finish', () => {
    console.log('写入已完成..')
    console.log('读取文件内容:', fs.readFileSync('./file-test.js', 'utf8')) // 打印写入的内容
    console.log(logStream)
})

// 文件关闭事件
logStream.on('close', () => {
    console.log('文件已关闭！')
})

logStream.write('这是我要做的测试内容')
logStream.end()
