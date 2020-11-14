
const log_Level = 3 // 0: fatal   1:importtant  2:Informational 5:debug

function log(logLevel, data) {
    if (logLevel <= log_Level) { console.log(data) }
}

// Test

log(1, 'this is level 1')

log(2, 'this is level 2')

log(3, 'this is level 3')

log(0, 'this is level 0')
