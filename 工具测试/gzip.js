const fs = require('fs');
const zlib = require('zlib')
const gzip = zlib.createGzip();
const inp = fs.createReadStream('C://codebase/yanzi2020/mylog.txt');
const out = fs.createWriteStream('C://codebase/yanzi2020/mylog.txt.gz');
inp.pipe(gzip)
    .on('error', () => {
        // handle error
    })
    .pipe(out)
    .on('error', () => {
        // handle error
    });