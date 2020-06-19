const app = require('express')()
const http = require('http')
const Server  = require('socket.io')
const crypto = require('crypto')

const server = http.createServer(app)
const io = Server(server)

const users = new Map()
const history = []

function createId () {
    const currentDate = (new Date()).valueOf().toString()
    const randomString = Math.random().toString()
    return crypto.createHash('sha1').update(currentDate + randomString).digest('hex')
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

io.use((socket, next) => {
    // const { uid } = socket.handshake.query
    const { id } = socket
    // console.log('id', id)

    if (id) {
        users.set(id, socket)
        return next()
    }
    next(new Error('authentication error'))
})

function onConnect (socket) {
    
    const { on, id } = socket
    const rooms = []   // 记录该 socket/用户 进入了哪些房间


    // socket.on = function (event) {
    //     return new Promise((resolve, reject) => {
    //         on.call(this, event, (result) => {
    //             resolve(result)
    //         })
    //     })
    // }

    socket.on('disconnect', () => {
        if (users.has(id)) {
            users.delete(id)
        }
        console.log(`user ${id} disconnected`)
        socket.broadcast.emit('disconnectEvent', id)
    })

    socket.on('message', (msg) => {
        // if (uid !== id) return console.error('用户id不匹配')

        console.log(`receive message from ${id}: ${msg}`)
        history.push({ id, msg })

        const private = msg.match(/@([^ ]+) (.+)/)
        if (private) {
            const targetId = private[1]
            const msg = private[2]
            // const targetSocket = users.get(targetId)
            // if (targetSocket) {
            //     targetSocket.send({ id, msg })
            // }
            socket.to(targetId).emit('message', { id, msg })
        } else {
            if (rooms.length) {
                for (const room of rooms) {                      
                    const roomSockets = io.sockets.adapter.rooms[room].sockets

                    for (const socketId of Object.keys(roomSockets)) {                                       
                        users.get(socketId).emit('message', { id, msg })
                    }
                }
            } else {
                io.emit('message', { id, msg } )
            }
        }
    })

    socket.on('keypress', () => {
        io.emit('keypress', id )
    })

    socket.on('keypressdone', () => {
        io.emit('keypressdone')
    })

    socket.on('join', room => {
        if (rooms.indexOf(room) === -1) {
            socket.join(room, () => {
                rooms.push(room)
                socket.emit('joined', room)
                socket.send({ 
                    id: 'SYSTEM', 
                    msg: `你已加入${room}房间`,
                    color: '#56abe4'
                })
                // 给房间内所有人包括自己发消息
                // io.to(room).emit('message', {
                //     id: 'SYSTEM',
                //     msg: `${id}加入${room}房间`,
                //     color: '#56abe4'
                // })
                // 给房间内除自己外的所有人发消息
                socket.to(room).emit('message', {
                    id: 'SYSTEM',
                    msg: `${id}加入${room}房间`,
                    color: '#56abe4'
                })
            })
        }
    })

    socket.on('leave', room => {
        let index = rooms.indexOf(room)
        if (index !== -1) {
            socket.leave(room, () => {
                rooms.splice(index, 1)
                socket.emit('left', room)
                socket.send({
                    id: 'SYSTEM',
                    msg: `你已离开${room}房间`,
                    color: 'darkorchid'
                })
                socket.to(room).emit('message', {
                    id: 'SYSTEM',
                    msg: `${id}离开${room}房间`,
                    color: 'darkorchid'
                })
            })
        }
    })

    console.log(`user ${id} connected`)

    // 发送给所有客户端，包括发送者
    // io.emit('connectEvent', id)

    // 发送给所有客户端，除了发送者
    socket.broadcast.emit('connectEvent', id)
}

io.on('connection', onConnect)

server.listen(3000, () => {
    console.log('listening on *:3000')
})