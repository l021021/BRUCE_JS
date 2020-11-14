var eventEmiter = require('events')
var myEmitter = new eventEmiter()
process.on("uncaughtException", function() {
    console.log("Error occured")

})

throw new error("Some error")