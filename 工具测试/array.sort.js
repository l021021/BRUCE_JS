function factorial(n, p = 1) {
    if (n <= 1) {
        return 1 * p;
    } else {
        let result = n * p;
        // 被优化
        return factorial(n - 1, result);
    }
}


function factorial_(n) {
    if (n <= 1) {
        return 1;
    } else {
        // 未被优化：在返回之后还要执行乘法
        return n * factorial(n - 1);
    }
}
console.log(factorial_(100));

function scan_array(arr) {
    // c('\n Listing Stored Events: \n')
    for (var key in arr) { // 这个是关键
        if (typeof(arr[key]) === 'array' || typeof(arr[key]) === 'object') { // 递归调用
            scan_array(arr[key])
        } else {
            console.log('      ' + key + ' --- ' + arr[key])
        }
    }
    console.log('\n                ------- \n')
}
scan_array(result)