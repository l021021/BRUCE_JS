// 处理逻辑：一分钟切片
// 每一分钟 ：12:01:00 有一个对应的占用 0-1，比如0.5 :代表50%的利用率
// 算法:每一个时间戳看前一个： 当前占用-前一个占用，标记为100%
// 当前占用 前一个空闲 标记为0
// 当前空闲 均标记为0
// 标记举例 1:01.11 in 1:05:44 in
//         1:01:00 49/60
//         1:02:00 1
//         1:03:00 1
//         1:04:00 1
//         1:05:00 1
//         标记举例 1:01.11 out 1:05:44 in
//         1:01:00 0
//         1:02:00 0
//         1:03:00 0
//         1:04:00 0
//         1:05:00 16/60

var RecordArray
RecordArray = [{
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135021868,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA950A1-3-Motion',
    timeStamp: 1574135021868,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE793DE3-3-Motion',
    timeStamp: 1574135021868,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7931C7-3-Motion',
    timeStamp: 1574135026044,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7931C7-3-Motion',
    timeStamp: 1574135026044,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135034114,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135076802,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135103709,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7931C7-3-Motion',
    timeStamp: 1574135110485,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7931C7-3-Motion',
    timeStamp: 1574135116559,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7B282F-3-Motion',
    timeStamp: 1574135131640,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE793DE3-3-Motion',
    timeStamp: 1574135139539,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE792CD8-3-Motion',
    timeStamp: 1574135140562,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA950A1-3-Motion',
    timeStamp: 1574135148706,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7931C7-3-Motion',
    timeStamp: 1574135155663,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7B282F-3-Motion',
    timeStamp: 1574135182306,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE793DE3-3-Motion',
    timeStamp: 1574135182306,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE792CD8-3-Motion',
    timeStamp: 1574135182306,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135191595,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA950A1-3-Motion',
    timeStamp: 1574135191595,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135207518,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA950A1-3-Motion',
    timeStamp: 1574135223946,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE793DE3-3-Motion',
    timeStamp: 1574135244009,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93F5C-3-Motion',
    timeStamp: 1574135247362,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE7931C7-3-Motion',
    timeStamp: 1574135268624,
    value: 'in'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA950A1-3-Motion',
    timeStamp: 1574135274848,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93DB7-3-Motion',
    timeStamp: 1574135274848,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE793DE3-3-Motion',
    timeStamp: 1574135274848,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-90FD9FFFFEA93F5C-3-Motion',
    timeStamp: 1574135290830,
    value: 'ot'
}, {
    type: 'sampleAsset',
    Did: 'EUI64-D0CF5EFFFE108D1B-3-Motion',
    timeStamp: 1574135303424,
    value: 'ot'
}]



console.log(RecordArray.find(Sensor => Sensor.Did.indexOf('793') >= 0))
console.log(RecordArray.findIndex(Sensor => Sensor.Did.indexOf('793') >= 0))