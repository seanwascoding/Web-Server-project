const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const SocketServer = require('ws');
const fs = require('fs');
const { randomUUID } = require('crypto');
const app = express();

/**  setup  */

//* open server
const PORT = 8080;
const server = app.listen(PORT, () => console.log(`Web server is listening on port ${PORT}`))

//* websocket
const keywords = new Map();
const map_name = new Map();
const wss = new SocketServer.Server({ server })
wss.on('connection', function connection(ws) {
    //? console.log('working connected', keywords.size)
    keywords.set(ws, "")
    console.log("working connected")
    ws.send("working connected from server")

    //! 處理 WebSocket 的事件
    ws.on('message', (message) => {
        const message_temp = JSON.parse(message)
        console.log('Received message:', message_temp)
        //! create room
        if (Object.keys(message_temp)[0] == '0') {
            console.log("user create keywords")
            keywords.set(ws, message_temp[Object.keys(message_temp)[0]])
            console.log('result:', keywords.get(ws))
            // ws.send("Working Create the keywords")
        }
        //! connecting
        else if (Object.keys(message_temp)[0] == '1') {
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === SocketServer.OPEN) {
                    if (message_temp[Object.keys(message_temp)[0]] == keywords.get(client)) {
                        console.log('Received message:', message_temp[Object.keys(message_temp)[0]])
                        console.log("connect other user work")
                        keywords.set(ws, client)
                        keywords.set(client, ws)
                        client.send("client working connected")
                        ws.send("client working connected")
                    }
                    else if (ws === keywords.get(client) && keywords.get(ws) === client) {
                        client.send(message_temp[Object.keys(message_temp)[0]])
                    }
                    else if (keywords.get(ws) != "") {
                        //? jump
                    }
                    else {
                        ws.send("error keywords")
                    }
                } else if (keywords.size == 1) {
                    client.send("only one user")
                }
            });
        }
        //! send picture
        else if (Object.keys(message_temp)[0] == '2') {
            try {
                //? 傳送表單給客戶 => 傳送照片 => 核對照片
                const path = message_temp['2']
                fs.readdir(path, (err, files) => {
                    if (err) {
                        console.error('Error reading directory:', err);
                        return;
                    }
                    console.log(files + ":" + files.length);

                    //? send form (numbers of image)
                    keywords.get(ws).send("times" + files.length)
                    keywords.get(ws).send("filenames" + files)

                    //? send data
                    files.forEach((file) => {
                        const filePath = path + "/" + file;
                        const fileData = fs.readFileSync(filePath);
                        keywords.get(ws).send(fileData)
                    })

                    //? Delete dir
                    fs.rm(path, { recursive: true }, (err) => {
                        if (err) {
                            console.error('Error deleting directory:', err);
                            return;
                        }
                        console.log('Directory deleted successfully.');
                        ws.send('sending work');
                    });
                })
            } catch (err) {
                console.log(err)
                fs.unlinkSync(message_temp['2']);
                ws.send("not work")
            }
        }
        //! name pair
        else if (Object.keys(message_temp)[0] == '3') {
            let name_temp = message_temp['3']
            map_name.set(ws, name_temp)
            console.log(map_name.size)
            ws.send("working to send name")
        }
        //! exception
        else {
            console.log("connect fail")
        }
    });

    //! disconnected
    ws.on('close', () => {
        console.log('WebSocket disconnected');
        //?
        try {
            const temp = keywords.get(ws)
            temp.send("disconnected")
        } catch (error) {
            // console.log("error:", error)
            console.log("not exist pair")
        }
        keywords.delete(ws)

        //?
        try {
            const delete_name = map_name.get(ws)
            // console.log(delete_name)
            //? 更新 is_active 为 false
            pool.query('UPDATE account SET is_active = ? WHERE username = ?', [false, delete_name], function (err, updateResult) {
                if (err) {
                    console.error('Error updating is_active: ', err);
                }
                else if (updateResult.length > 0) {
                    console.log("is_active updated successfully");
                }
                else {
                    console.log("no result found")
                }
            });
        } catch (err) {
            console.log("error:", err)
        }
        map_name.delete(ws)
    });
})

//* 解析file
app.use(bodyParser.json());

/**  帳號密碼  */

//* mysql setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Amks94884674?',
    database: 'test'
});

//* login
app.post('/login', (req, res) => {
    console.log(req.body)
    const name = Object.keys(req.body)[0]
    const password = req.body[name]
    //! 先檢查使用者名稱是否已存在
    pool.query('SELECT * FROM account WHERE username = ? AND password = ? AND is_active = ?', [name, password, false], function (err, results) {
        if (err) {
            console.error('Error executing query: ', err);
            res.send('Error checking username');
            return;
        }
        //! 使用者名稱已存在
        if (results.length > 0) {

            console.log("login successfully");
            //? 更新 is_active 为 true
            pool.query('UPDATE account SET is_active = ? WHERE username = ?', [true, name], function (err, updateResult) {
                if (err) {
                    console.error('Error updating is_active: ', err);
                    res.send('Error updating is_active');
                    return;
                }
                console.log("is_active updated successfully");
                res.send('login successfully');
                return;
            });
        }
        else {
            //! 使用者名稱不存在 or 密碼打錯
            console.log("User not exists or error password");
            res.send('User not exists or error password');
            return;
        }
    });
});

//* registe
app.post('/registe', (req, res) => {
    console.log(req.body)
    const name = Object.keys(req.body)[0]
    const password = req.body[name]
    //! 先檢查使用者名稱是否已存在
    pool.query('SELECT * FROM account WHERE username = ?', [name], function (err, results) {
        if (err) {
            console.error('Error executing query: ', err);
            res.send('Error checking username');
            return;
        }
        if (results.length > 0) {
            //! 使用者名稱已存在
            console.log("Username already exists");
            res.send('Username already exists');
            return;
        }
        else {
            //! create account
            pool.query('INSERT INTO account (username, password) VALUES (?, ?)', [name, password], function (err) {
                if (err) {
                    console.error('Error executing query: ', err);
                    res.status(500).send('Error inserting data into database');
                    return;
                }
                //! 更新 is_active 为 true
                pool.query('UPDATE account SET is_active = ? WHERE username = ?', [true, name], function (err, updateResult) {
                    if (err) {
                        console.error('Error updating is_active: ', err);
                        res.send('Error updating is_active');
                        return;
                    }
                    console.log('working to create');
                    res.send('working to create');
                    return;
                });
            });
            return;
        }
    });
});

/** 上傳照片  */

//* 設定儲存位置和檔名
let image_path = [] //line up
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (image_path.every(element => element.substring(element.length - 36, element.length) !== file.originalname.substring(0, 40 - 4)) || image_path.length < 1) {
            // console.log(file.originalname.substring(0, 40 - 4))
            const destinationPath = "image/" + randomUUID() + file.originalname.substring(0, 40 - 4)
            image_path.push(destinationPath)
            fs.mkdir(destinationPath, { recursive: true }, function (err) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, destinationPath);
                }
            });
            //! test output
            // image_path.forEach((element, index) => {
            //     console.log(element.substring(element.length - 36, element.length))
            //     console.log(file.originalname.substring(0, 40 - 4))
            // })
        }
        else {
            image_path.forEach((element, index) => {
                if (file.originalname.substring(0, 40 - 4) == element.substring(element.length - 36, element.length)) {
                    // console.log("one more image path:", element)
                    cb(null, element)
                }
            })
        }
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './image2/image')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage })
const upload2 = multer({ storage: storage2 })

// app.use(bodyParser.urlencoded({ extended: true }));

//* Photo download
app.post('/down', upload.array('image'), (req, res) => {

    console.log("Photo upload working", req.files[0].destination)
    res.send(req.files[0].destination)

    //! send data to matlab


});

app.post('/down2', upload2.single('image'), (req, res) => {

    console.log("Photo upload working")
    res.send("Photo upload working")

});

/** 傳送命令  */

//* Send state
let filePath = "";
app.post('/state', async (req, res) => {

    //! data
    const key = Object.keys(req.body)[0]
    const state = req.body[key]
    const key_length = key.length

    //! output
    //console.log("來自手機的訊號:", "name:" + key,"action:" + state, "name_length:" + key_length);

    client.write(`${key_length}`);
    client.write(`${key}`);
    client.write(`${state}`);

    //! wait data
    //send data to android
    catch_signal(key)
        .then((result) => res.sendFile(result))
        .then(() => filePath = "")

});

//* state 2
app.post('/state2', async (req, res) => {

    console.log(req.body)

    //! data
    const key = Object.keys(req.body)[0]
    const state = req.body[key]
    const key_length = key.length

    client.write(`${key_length}`);
    client.write(`${key}`);
    client.write(`${state}`);

    catch_signal(key)
        .then((result) => res.sendFile(result))
        .then(() => filePath = "")

});

//* catch signal
function catch_signal(name) {
    return new Promise((resolve) => {
        let timer = setInterval(function () {
            if (filePath != "") {
                clearInterval(timer)
                console.log("catch_signal")
                resolve(filePath + name + '.png')
            }
            else {
                console.log("等待中")
            }
        }, 1000);
    });
}

//* identify connect matlab
// const client = net.createConnection({ port: 65500 }, () => {
//     console.log('Working to connect matlab');
//     client.on('data', (data) => {
//         console.log(`接收到 Matlab 數據：${data}`);
//         if (data == 1) {
//             filePath = 'C:/Users/Sean/Desktop/vscode/project/image/gray/';
//         } else if (data == 2) {
//             filePath = 'C:/Users/Sean/Desktop/vscode/project/image/encryption/';
//         } else if (data == 3) {
//             filePath = 'C:/Users/Sean/Desktop/vscode/project/image/decrypt/';
//         } else if (data == 4) {
//             filePath = 'C:/Users/Sean/Desktop/vscode/project/image2/encryption/'
//         } else if (data == 5) {
//             filePath = 'C:/Users/Sean/Desktop/vscode/project/image2/decrypt/'
//         }
//     });
// });