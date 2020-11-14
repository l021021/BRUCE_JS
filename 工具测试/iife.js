let person = function(name) {
    return {
        getName: function() {
            return name;
        }
    };
}("Nicholas");
console.log(person.getName());

let person = ((name) => {
    return {
        getName: function() {
            return name;
        }
    };
})("Nicholas");
console.log(person.getName());