const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const crypto = require('crypto')

const users = new Map()
const history = []

// function createId () {
//     const currentDate = (new Date()).valueOf().toString()
//     const randomString = Math.random().toString()
//     return crypto.createHash('sha1').update(currentDate + randomString).digest('hex')
// }

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

io.use((socket, next) => {
    // const { uid } = socket.handshake.query
    const { id } = socket
    console.log('id', id)
    if (id) {
        users.set(id, { id })
        return next()
    }
    return next(new Error('authentication error'))
})

io.on('connection', (socket) => {
    // const uid = createId()
    // users.set(uid, { id: uid })

    const { id: uid } = socket

    socket.on('disconnect', () => {
        if (users.has(uid)) {
            users.delete(uid)
        }
        console.log(`user ${uid} disconnected`)
        // io.emit('left', uid)
        socket.broadcast.emit('left', uid)
    })

    socket.on('message', (msg) => {
        // if (uid !== id) return console.error('用户id不匹配')

        console.log(`receive message from ${uid}: ${msg}`)
        history.push({ id: uid, msg })
        io.emit('message', { id: uid, msg} )
    })
    socket.on('keypress', () => {
        io.emit('keypress', uid )
    })
    socket.on('keypressdone', () => {
        io.emit('keypressdone')
    })

    console.log(`user ${uid} connected`)
    // 通知该io的所有人，包括自己
    // io.emit('join', uid)
    // 通知除自己以外的人
    socket.broadcast.emit('join', uid)
})

http.listen(3000, () => {
    console.log('listening on *:3000')
})