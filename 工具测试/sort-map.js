function SortMap() {
    this._map = {}
}

SortMap.prototype.add = function(key, value) {
    this._map[key] = value
}

SortMap.prototype.get = function(key) {
    return this._map[key]
}

SortMap.prototype.printInfo = function() {
    for (var key in this._map) {
        console.log(this._map[key])
    }
}

// var result = values.sort((a, b) => a - b);
var mapObj = new SortMap()
mapObj.add('0', 'JIANAN')
mapObj.add('1', 'bobo')
mapObj.add('2', 'xixi')
mapObj.add('3', 'xiaoming')
mapObj.add('4', 'lili')

mapObj.printInfo()

console.log(mapObj.get('1'))
console.log(mapObj.get('10'))