var m = new Map();
m.set(1, "black");
m.set(2, "red");
m.set("colors", 2);
m.set({ x: 1 }, 3);

m.forEach(function(item, key, mapObj) {
    console.log(item.toString());
});

// console.log
console.log(m.get(2));

m.delete(1)
m.forEach(function(item, key, mapObj) {
    console.log(item.toString());
});

/*clear
从映射中移除所有元素。
delete
从映射中移除指定的元素。
forEach
对映射中的每个元素执行指定操作。
get
返回映射中的指定元素。
has
如果映射包含指定元素， 则返回 true。
set
添加一个新建元素到映射。
toString
返回映射的字符串表示形式。
valueOf
返回指定对象的原始值。————————————————
*/