var flag
for (i = 3; i < 1000000; i++) {
    flag = true
    for (j = 2; j <= Math.sqrt(i); j++) {
        if (i % j === 0) {
            flag = false
            break
        }
    }

    if (flag) console.log(i)
}
