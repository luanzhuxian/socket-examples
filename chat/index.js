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
        socket.broadcast.emit('left', id)
    })

    socket.on('message', (msg) => {
        // if (uid !== id) return console.error('用户id不匹配')

        console.log(`receive message from ${id}: ${msg}`)
        history.push({ id, msg })

        const private = msg.match(/@([^ ]+) (.+)/)
        if (private) {
            const targetId = private[1]
            const msg = private[2]
            const targetSocket = users.get(targetId)
            if (targetSocket) {
                targetSocket.send({
                    id,
                    msg
                })
            }

        } else {
            io.emit('message', { id, msg} )
        }
    })

    socket.on('keypress', () => {
        io.emit('keypress', id )
    })

    socket.on('keypressdone', () => {
        io.emit('keypressdone')
    })

    console.log(`user ${id} connected`)

    // 发送给所有客户端，包括发送者
    // io.emit('join', id)

    // 发送给所有客户端，除了发送者
    socket.broadcast.emit('join', id)
}

io.on('connection', onConnect)

server.listen(3000, () => {
    console.log('listening on *:3000')
})