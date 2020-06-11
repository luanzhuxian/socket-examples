const express = require('express')
const app = express()
// const http = require('http').Server(app)


// 设置静态文件夹
app.use(express.static(__dirname))
const server = app.listen(3000, () => {
    console.log('listening on *:3000')
})


// 创建一个websocket服务
const { Server } = require('ws')
const ws = new Server({ port: 9999 })

// 监听服务端和客户端的连接情况
ws.on('connection', function (socket, request, client) {

    // 监听客户端发来的消息
    socket.on('message', function (msg) {
        console.log(`Received message ${msg} from user ${client}`)
        socket.send(msg + '鸭!')
    })
})


process.on('SIGTERM', shutDown)
process.on('SIGINT', shutDown)

function shutDown () {
    console.log('Received kill signal, shutting down gracefully')

    // ws.close()

    server.close(() => {
        console.log('Closed out remaining connections')
        process.exit(0)
    })

    // setTimeout(() => {
    //     console.error('Could not close connections in time, forcefully shutting down')
    //     process.exit(1)
    // }, 10000)
}