var child_process = require("child_process")
var loggers = []
var Converters = []


// const locationIds = ['114190', '996052', '912706'] //hw
// const locationIds = ['229349'] //fangtan	274189
// const locationIds = ['655623'] //wfbj	274189
// const locationIds = ['190773'] //yuanjin
// const locationIds = ['797296'] //nv
// const locationIds = ['305026'] //-CHC 
const locationIds = ['797296'] //-nv
    // const locationIds = ['675524'] //-expands
    // const locationIds = ['655623'] // wf bj
    // const locationIds = ['230381'] //JOS
    // const locationIds = ['503370'] //Jvanke
    // const locationIds = ['952675', '402837', '268429', '732449', '328916'] //拓闻淮安
    // const locationIds = ['447223', '290596', '879448', '141828', '432812', '976522'] //AZ P3
    // const locationIds = ['185308', '329312', '434888', '447224', '507828', '60358', '608739', '652990', '668617', '83561', '88252', '938433'] // AZ



// const locationIds = ['274189', '229349'] //shenao
const startDate = '2020/10/16/00:00:00'
const endDate = '2020/10/20/23:59:59'
const EUorUU = 'Motion' //Motion|UU
const interval = 30 //分钟

for (let lc = 0; lc < locationIds.length; lc++) {
    loggers[lc] = child_process.fork("get_data_worker_beta.js", [locationIds[lc], startDate, endDate, EUorUU])
        // console.log("child process entered")
    loggers[lc].on("exit", function() {
        Converters[lc] = child_process.fork("cal_data_worker_beta.js", [locationIds[lc], startDate, endDate, EUorUU, interval])
    })
}