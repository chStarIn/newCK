const exp = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const cookie = require('cookie-parser');


 
const app = exp();

app.use(bodyParser.urlencoded({ extended: true }));

// 解析cookie对象
app.use(cookie());

// express请求处理管线
// 每次请求的多个回调函数构成一个请求处理管线
// 管线中的每一个请求都可以得到该请求的数据

function isLogin(req,res,next){
    if(req.cookies.username){
        next();
    }
    else{
        // 跳转 , 将 页面重定向
        res.redirect('login.html')
    }
}
app.get('./answer.html',isLogin,(req,res,next)=>{
    next();
})

app.get('./ask.html',isLogin,(req,res,next)=>{
    next();
})





// -----------  注册  ------------
app.post('/user/register', (req, res) => {
    fs.exists('user', (ex) => {
        if (ex) {
            // 写入
            writeFile();
        }
        else {
            fs.mkdir('user', (error) => {
                if (error) {
                    res.status(200).json({
                        code: 0,
                        msg: '用户创建失败'
                    })
                }
                else {
                    // 写入
                    writeFile();
                }
            })
        }
    })
    // 封装一个写入的函数
    function writeFile() {
        var filename = `user/${req.body.username}.txt`;
        fs.exists(filename, (ex) => {
            if (ex) {
                // 该用户已经被注册
                res.status(200).json({
                    code: 1,
                    msg: '该用户已被注册'
                })
            }
            else {
                req.body.ip = req.ip;
                req.body.time = Date.now();
                fs.appendFile(filename, JSON.stringify(req.body), (error) => {
                    if (!error) {
                        res.status(200).json({
                            code: 2,
                            msg: '用户注册成功'
                        })
                    }
                    else {
                        res.status(200).json({
                            code: 1,
                            msg: '用户注册失败'
                        })
                    }
                })
            }
        })
    }

})

// --------  登录  ----------
app.post('/user/login', (req, res) => {
    // 1.根据用户名去匹配user文件中的文件
    var filename = `user/${req.body.username}.txt`;
    // 判断文件是否存在
    fs.exists(filename, (exists) => {
        if (exists) {
            // 该用户已注册
            fs.readFile(filename, (error, data) => {
                if (!error) {
                    var user = JSON.parse(data);
                    if (user.psw == req.body.psw) {
                        // 将用户名存入cookie
                        var expies = new Date();
                        expies.setMonth(expies.getMonth() + 1)
                        res.cookie('username', req.body.username, { expies });

                        // 登录成功
                        res.status(200).json({
                            code: 1,
                            msg: '登录成功'
                        })
                    }
                    else {
                        res.status(200).json({
                            code: 2,
                            msg: '密码不一致'
                        })
                    }
                }
                else {
                    res.status(200).json({
                        code: 3,
                        msg: '文件读取失败'
                    })
                }
            })
        }
        else {
            res.status(200).json({
                code: 0,
                msg: '你还没有注册'
            })
        }
    })
})


// -------------  提问  --------------
app.post('/user/ask', (req, res) => {
    var content = req.body.content;
    content = content.replace(/</g,'&lt;')
    content = content.replace(/>/g,'&gt;')
    if (req.cookies.username) {
        // 将获取到的问题存入到question 文件夹中

        // 封装一个写入的函数
        function writeFile() {
            var data = Date.now();
            // 文件的名字
            var filename = `question/${data}.txt`;
            req.body.username = req.cookies.username;
            req.body.time = data;
            req.body.ip = req.ip;
            fs.writeFile(filename, JSON.stringify(req.body), (error) => {
                if (error) {
                    res.status(200).json({
                        code: 2,
                        msg: '提问失败'
                    })
                }
                else {
                    res.status(200).json({
                        code: 1,
                        msg: '提问成功'
                    })
                }
            })
        }


        fs.exists('question', (ex) => {
            if (ex) {
                writeFile();
            }
            else {
                fs.mkdir('question', (error) => {
                    if (!error) {
                        writeFile();
                    }
                })
            }
        })
    }
    else {
        res.status(200).json({
            code: 0,
            msg: '登录异常'
        })
        return;
    }
})

// -------------- 退出登录 ----------------
app.get('/user/out', (req, res) => {
    res.clearCookie('username');
    res.status(200).json({
        code: 1,
        msg: '退出成功'
    })
})


// ------------  首页  ---------------
app.get('/user/all', (req, res) => {
    fs.readdir('question', (error, file) => {
        // console.log(file)
        if (!error) {
            // 反序
            file = file.reverse();
            // 创建一个数组 , 将每个读取到的文件内容 , 转为一个对象 , 存到这个数组中
            var questions = [];
            // file.forEach(function (item) {
            //     // readFile 是异步读取文件 , 不会影响for 循环 , for循环完了 , 文件还没有读取完
            //     // readFileSync 同步的读取数据 , 没有回调函数
            //     var pushed = JSON.parse(fs.readFileSync('question/' + item));
            //     console.log(pushed);
            //     questions.push(pushed)
            //     console.log(questions);
            // })


            // 第二种 , 使用递归的方式
            var i = 0;
            function readFile() {
                if (i < file.length) {
                    var files = file[i];
                    var filename = 'question/' + files;
                    fs.readFile(filename, (error, data) => {
                        if (!error) {
                            var obj = JSON.parse(data);
                            questions.push(obj);
                            i++;
                            readFile();
                        }
                    })
                }
                else {
                    // 代表文件已经读取完毕
                    // console.log(questions)
                    res.status(200).json(questions)
                }
            }
            readFile();
            // res.status(200).json(questions)
        }

    })
})


// ---------  问题的回答  -----------
app.post('/user/answer', (req, res) => {
    // 取出question
    var question = req.cookies.question;
    // 根据question找到要回复的是哪个问题

    // 将xxs攻击阻止
    var content = req.body.content;
    content = content.replace(/</g,'&lt;')
    content = content.replace(/>/g,'&gt;')


    var filename = 'question/' + question + '.txt';
    // console.log(filename)
    // 读取内容
    fs.readFile(filename, (err, data) => {
        if (!err) {
            // 转为对象 用paser , 对象后 , 可以修改属性
            // console.log(filename)
            var obj = JSON.parse(data);
            // console.log(obj)
            if (!obj.answer) {
                obj.answer = [];
            }
            // 存在 , 将内容存入
            req.body.ip = req.ip;
            req.body.time = Date.now();
            req.body.username = req.cookies.username;
            // console.log(obj)
            obj.answer.push(req.body);
        }
        // 修改后 , 要重新写入
        fs.writeFile(filename, JSON.stringify(obj), (error) => {
            if (!error) {

                res.status(200).json({
                    code: 1,
                    msg: '回答成功'
                })
            }
            else {
                res.status(200).json({
                    code: 2,
                    msg: '回答失败'
                })
            }
        })
    })
})


app.use(exp.static('wwwroot'));
app.listen(3000, () => {
    console.log('开启问答系统服务器......')
})