const s = new Set();

s.add(1).add(2).add(2);

console.log(s.size);

console.log(s.has(1));
console.log(s.has(2));
console.log(s.has(3));

s.delete(2);
console.log(s.has(2));

// set转数组
const items = new Set([1, 2, 3, 4, 5]);
const array = Array.from(items);
console.log(array);

// 去除数组重复成员
function dedupe(array) {
    return console.log(Array.from(new Set(array)));
}

dedupe([1, 1, 2, 3])