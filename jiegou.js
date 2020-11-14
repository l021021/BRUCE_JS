let node = {
    type: "Identifier",
    name: "foo",
    loc: {
        start: {
            line: 1,
            column: 1
        },
        end: {
            line: 1,
            column: 4
        }
    }
};
let { loc: { start } } = node;
console.log(start.line); // 1
console.log(start.column);