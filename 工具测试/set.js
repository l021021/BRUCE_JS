let set = new Set(['red', 'green', 'blue']);
// 返回键名
for (let item of set.keys()) {
    console.log(item);
}

// 返回键值
for (let item of set.values()) {
    console.log(item);
}
// set 键名=键值

// 返回键值对
for (let item of set.entries()) {
    console.log(item);
}

// 可以直接用 for of遍历Set
// for in 和 for of的区别是：in 是遍历对象，of是遍历值
for (let x of set) {
    console.log(x);
}

// set也有forEach()方法
set.forEach((value, key) => console.log(key + ' : ' + value));
// 此处forEach方法的参数是一个处理函数。

// 数组的 map 和 filter 方法也可以间接用于Set
let s = new Set([1, 2, 3]);

// map 将原数组映射成新数组
s = new Set([...s].map(x => x * 2));
console.log(s);

// filter返回过滤后的新数组
s = new Set([...s].filter(x => (x % 3) == 0));
console.log(s);

// 实现并集、交集、差集
let a = new Set([1, 2, 3]);
let b = new Set([4, 3, 2]);

let union = new Set([...a, ...b]);
console.log(union);

let intersect = new Set([...a].filter(x => b.has(x)));
console.log(intersect);

let difference = new Set([...a].filter(x => !b.has(x)));
console.log(difference);

// 在遍历操作中，同步改变原来的Set结构的两种变通方法

// 1.利用原Set结构映射出一个新的结构，然后赋值给原来的Set结构
let set1 = new Set([1, 2, 3]);
set1 = new Set([...set1].map(val => val * 2));
console.log(set1);

// 2.利用Array.from
let set2 = new Set([1, 2, 3]);
set2 = new Set(Array.from(set2, val => val * 2));
console.log(set2)