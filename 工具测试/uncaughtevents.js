var eventEmitter = require('events')
var myEmitter = new eventEmitter()
process.on('uncaughtException', function () {
    console.log('got error')
})
throw new Error('Error occurred')
myEmitter.emit('Error', new Error('Error!'))
