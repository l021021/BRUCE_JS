const fs = require('fs')
fs.open('myfile', 'wx', (err, fd) => {
    if (err) {
    if (err.code === 'EEXIST') {
    console.error('myfile already exists')
    return
    }
    throw err
    }
    writeMyData(fd)
    })
