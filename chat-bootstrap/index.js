const express = require('express')
const http = require('http')
const app = express()

// 设置静态文件夹，会默认找当前目录下的index.html文件当做访问的页面
app.use(express.static(__dirname))

// WebSocket是依赖HTTP协议进行握手的
const server = http.createServer(app)
const io = require('socket.io')(server)

// 用来保存对应的 socket，就是记录对方的 socket 实例
const socketNameMap = new Map()
// 记录所有连接到服务端的 socket.id 用来查找对应的用户
const socketIdMap = new Map()
// 创建一个数组用来保存最近的20条消息记录，真实项目中会存到数据库中
const msgHistory = []
const userColor = ['#00a1f4', '#0cc', '#f44336', '#795548', '#e91e63', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ffc107', '#607d8b', '#ff9800', '#ff5722']

// 乱序排列方法，方便把数组打乱
// function shuffle (arr) {
//    let len = arr.length
//    let random
//    while (len > 0) {
//         // 右移位运算符向下取整
//        random = (Math.random() * len--)
//         // 解构赋值实现变量互换
//        [arr[len], arr[random]] = [arr[random], arr[len]]
//    }
//    return arr
// }

function shuffle (arr) {
    const len = arr.length
    const index = Math.floor(Math.random() * len)
    return arr[index] 
}


// 监听与客户端的连接事件
io.on('connection', socket => {
    console.log(socket.id, '服务端连接成功')

    // 保存本次链接信息
    let username
    let color
    const rooms = []   // 记录该 socket/用户 进入了哪些房间

    // 记录 socket.id
    socketIdMap.set(socket.id, socket)

    socket.on('message', msg => {

        if (username) {
            // 正则判断消息是否为私聊专属
            const private = msg.match(/@([^ ]+) (.+)/)

            if (private) {  // 私聊消息
                // 私聊的用户，正则匹配的第一个分组
                const name = private[1]
                // 私聊的内容，正则匹配的第二个分组
                const content = private[2]
                // 从 socketNameMap 中获取私聊用户的 socket
                const toSocket = socketNameMap.get(name)

                if (toSocket) {
                    // 向私聊的用户发消息
                    toSocket.send({
                        user: username,
                        color,
                        content,
                        createAt: new Date().toLocaleString()
                    })
                }
            } else {    // 公聊消息
                // 如果 rooms 数组不为空，就代表有用户进入了房间
                if (rooms.length) {
                    for (const room of rooms) {                        
                        // 遍历该用户加入的所有房间，取得每个房间内所有 socket 集合
                        const roomSockets = io.sockets.adapter.rooms[room].sockets

                        // 遍历 roomSockets 集合，向该房间每一个 socket 发送信息
                        for (const socketId of Object.keys(roomSockets)) {               
                            console.log('room', room, socketId)
                            
                            socketIdMap.get(socketId).emit('message', {
                                room,
                                user: username,
                                color,
                                content: msg,
                                createAt: new Date().toLocaleString()
                            })
                        }
                    }

                } else {
                    // 如果不是私聊的，向所有人广播
                    io.emit('message', {
                        user: username,
                        color,
                        content: msg,
                        createAt: new Date().toLocaleString()
                    })
                    msgHistory.push({
                        user: username,
                        color,
                        content: msg,
                        createAt: new Date().toLocaleString()
                    })
                }
            }
        } else {
            // 如果是第一次进入的话，就将输入的内容当做用户名
            // 所以第一次发信息自己不会看到
            username = msg
            color = shuffle(userColor)

            // 向除了自己的所有人广播，毕竟进没进入自己是知道的，没必要跟自己再说一遍
            socket.broadcast.emit('message', {
                user: '系统消息',
                color,
                content: `${username}加入了聊天！`,
                createAt: new Date().toLocaleString()
            })

            // 把 socketNameMap 对象上对应的用户名赋为一个 socket
            socketNameMap.set(username, socket)
        }
    })

    // 监听进入房间的事件
    socket.on('join', room => {
        // 判断一下用户是否进入了房间，如果没有就让其进入房间内
        if (username && rooms.indexOf(room) === -1) {
            // socket.join 表示进入某个房间
            socket.join(room)
            rooms.push(room)
            // 这里发送个 joined 事件，让前端监听后，控制房间按钮显隐
            socket.emit('joined', room)
            // 通知一下自己
            socket.send({
                user: '系统消息',
                color,
                content: `你已加入${room}战队`,
                createAt: new Date().toLocaleString()
            })
        }
    })

    // 监听离开房间的事件
    socket.on('leave', room => {
        // index 为该房间在数组 rooms 中的索引，方便删除
        let index = rooms.indexOf(room)
        if (index !== -1) {
            socket.leave(room) // 离开该房间
            rooms.splice(index, 1) // 删掉该房间
            // 这里发送个 left 事件，让前端监听后，控制房间按钮显隐
            socket.emit('left', room)
            // 通知一下自己
            socket.send({
                user: '系统消息',
                color,
                content: `你已离开${room}战队`,
                createAt: new Date().toLocaleString()
            })
        }
    })

    // 监听获取历史消息的事件
    socket.on('getHistory', () => {
        // 获取最新的20条消息
        if (msgHistory.length) {
            const history = msgHistory.slice(-20)
            socket.emit('history', history)
        }
    })
})

// 这里要用 server 去监听端口，而非 app.listen 去监听(不然找不到 socket.io.js 文件)
server.listen(3000,  () => {
    console.log('listening on *:3000')
})