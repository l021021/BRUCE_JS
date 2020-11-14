FS = require('fs')
var filename = 'json\\triangle'
str = FS.readFileSync(filename + '.json', { encoding: 'utf8' })

myJSON = JSON.parse(str)
var level = 0

function scan_obj(obj, _level) {
    for (var key in obj) { // 这个是关键
        if (typeof(obj[key]) === 'array' || typeof(obj[key]) === 'object') { // 递归调用
            scan_obj(obj[key], ++_level)
        } else {
            console.log("  ".repeat(_level) + key + ' = ' + obj[key] + '<br>')
        }
    }
}

scan_obj(myJSON, 1)

// myJSON.type "FeatureCollection"
// myJSON.properties.longitudemy, JSON.properties.latitude "59.40154149999999"
// "17.9467081"