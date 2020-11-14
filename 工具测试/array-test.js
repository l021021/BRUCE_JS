/* eslint-disable camelcase */
var dd = {
    a: '111111',
    b: '222222',
    c: '333333'
}
dd.d = ['444444', '55555555']
    // 遍历数组
function scan_array(arr) {
    for (var key in arr) { // 这个是关键
        if (typeof (arr[key]) === 'array' || typeof (arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            console.log(key + ' = ' + arr[key] + '<br>')
        }
    }
}

scan_array(dd)

function successionPrint(str, num) {
    num = parseInt(num)
    var return_str = ''
    for (var i = 1; i <= num; i++) {
        return_str += str
    }
    return return_str
}

function __debug(param, flag) {
    if (!param || typeof (param) === 'number' || typeof (param) === 'string') {
        return param
    }
    var t = typeof (param) + '(\n'
    flag = flag ? parseInt(flag) + 1 : 1
    for (var key in param) {
        if (typeof (param[key]) === 'array' || typeof (param[key]) === 'object') {
            var t_tmp = key + ' = ' + __debug(param[key], flag)
            t += successionPrint('\t', flag) + t_tmp + '\n'
        } else {
            var t_tmp = key + ' = ' + param[key]
            t += successionPrint('\t', flag) + t_tmp + '\n'
        }
    }
    t = t + successionPrint('\t', flag - 1) + ')'
    return t
}
