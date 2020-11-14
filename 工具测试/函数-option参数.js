// options 上的属性表示附加参数
function setCookie(name, value, options) {
    options = options || {};
    let secure = options.secure,
        path = options.path,
        domain = options.domain,
        expires = options.expires;
    // 设置 cookie 的代码
}
/ /
第三个参数映射到 options
setCookie("type", "js", {
    secure: true,
    expires: 60000
});

function setCookie(name, value, { secure, path, domain, expires } = {}) {
    // 设置 cookie 的代码
}
s
etCookie("type", "js", {
    secure: true,
    expires: 60000
});

function setCookie(name, value, {
    secure = false,
    path = "/",
    domain = "example.com",
    expires = new Date(Date.now() + 360000000)
} = {}) {
    // ...
}