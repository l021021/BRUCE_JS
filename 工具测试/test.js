var text
for (i = 0; i < 10; i++) {
    if (i === 3) { break; }
    text = text || ''
    text += "数字是 " + i + " ";
    console.log(text)
}