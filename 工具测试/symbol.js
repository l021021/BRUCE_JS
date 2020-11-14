const symbol = Symbol.for('foobar')
console.log(Symbol.keyFor(symbol));
console.log()


let uid = Symbol.for("uid");
let object = {
    [uid]: "12345"
};
console.log(object[uid]); // "12345"
console.log(uid); // "Symbol(uid)"
let uid2 = Symbol.for("uid");
console.log(uid === uid2); // true
console.log(object[uid2]); // "12345"
console.log(uid2); // "Symbol(uid)