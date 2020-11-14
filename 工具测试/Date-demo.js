// This is a test for Date

// var a = [new Date(2012, 08), new Date(2012, 11), new Date(2012, 03)];
// var options = { year: 'numeric', month: 'long' };
// var dateTimeFormat = new Intl.DateTimeFormat('pt-BR', options);
// var formatted = a.map(dateTimeFormat.format);
// console.log(formatted.join('; '));
// // → "setembro de 2012; dezembro de 2012; abril de 2012"
let intlOption = Intl.DateTimeFormat('en-US')

var myDate = new Date() // freezed at that moment
var myDate1 = new Date() // freezed at that moment

// console.log(myDate) // Tue Nov 12 2019 11:48:51 GMT+0800 (GMT+08:00)
// console.log(JSON.parse(JSON.stringify(myDate.toJSON()))) // Tue Nov 12 2019 11:48:51 GMT+0800 (GMT+08:00)

// console.log(Date.parse('2019/01/01')) // to  mili

// myDate.setTime(Date.parse('2019/01/01 01:21:21'))

console.log(myDate.setTime(Date.now()).toLocaleString())

myDate1.setTime(158752140000)

// myDate.setMinutes(0)
// myDate.setSeconds(0)

console.log('Local Date:' + myDate.toLocaleDateString('en-US')) // 2019-11-12
console.log('Local time:' + myDate.toLocaleTimeString('en-US')) // 12:01:11
console.log('ISO : ' + myDate.toISOString()) // 
console.log(' : ' + myDate.toTimeString()) // 
console.log(' UTC : ' + myDate.toUTCString()) // 
console.log(myDate1.toLocaleDateString()) // 2019-11-12
console.log(myDate1.toLocaleTimeString()) // 12:01:11
console.log(myDate.toLocaleString()) // 12:01:11

// setTimeout(function() { console.log(myDate.toLocaleTimeString()) }, 10000)
console.log(myDate.getDate()) // 12
console.log(myDate.getTime()) // 1573531087679
console.log(Date.now()) // 1573531087679
console.log(myDate.toDateString()) // Tue Nov 12 2019
console.log(Date.parse(myDate.getFullYear() + '/' + myDate.getMonth() + '/' + myDate.getDate())) // to Mili
// myDate.setTime(1571531647736)
// myDate.setMinutes(0)
myDate.setSeconds(0)
//myDate.setMilliseconds(0)
myDate.setMinutes(10 * (Math.floor(myDate.getMinutes() / 10)))


console.log(myDate.toLocaleDateString()) // 2019-11-12
console.log(myDate.toTimeString()) // 12:01:11
console.log(myDate.toString())



// //t1_10m.setTime(motionTimeStamps[i2 - 1].timeStamp) // t1_10M：前一个事件的整十分钟
// t1_10m.setMilliseconds(0)
// t1_10m.setSeconds(0)
// t1_10m.setMinutes(10 * (Math.round(t1.getMinutes() / 6))) //得到整数十分钟开始,如0,10,20,50 

// // string to dater

// var options = { year: 'numeric', month: '2-digit', day: '2-digit', minute: '2-digit', second: '2-digit', hour: '2-digit' }

// myDate.setTime(Date.parse('2019/01/01/02:00:00'))

// console.log(Date.now())

myDate.setTime(Date.now())
myDate.setTime(Date.now())
console.log(myDate.toLocaleString('en-US'));
console.log(myDate.toLocaleString('zh-CN', { hour12: false }));
console.log(Date.parse(Date.now().toLocaleString()))

// console.time('x')
// for (let i = 0; i < 100; i++) {
//     myDate.setTime(15715316477360 + i * 100000000)
//     console.log((myDate.toLocaleString('zh-CN', options))) // get the even clock 8:00:00
// }
// console.timeEnd('x')

// console.time('x')
// for (let i = 0; i < 100; i++) {
//     myDate.setTime(15715316477360 + i * 100000000)
//     console.log((myDate.toLocaleString())) // get the even clock 8:00:00
// }
// console.timeEnd('x')

// console.time('x')
// for (let i = 0; i < 100; i++) {
//     myDate.setTime(15715316477360 + i * 100000000)
//     console.log((myDate.toISOString())) // get the even clock 8:00:00
// }
// console.timeEnd('x')
// // console.log(Date.parse('2019/11/12/' + '10:00:00'))