import {DB, DBCollection} from '@memsdb/core'
import {MemsDBServer} from 'memsdb-plugin-http'

const db = new DB('test-http')
const server = new MemsDBServer(db, {
    rootPassword: 'testpwd'
})

const col = new DBCollection(db, {
    name: 'users',
    structure: {
        username: '',
        parent: '',
        friends: []
    }
})

const commentsCol = new DBCollection(db, {
    name: 'comments',
    structure: {
        comment: '',
        user: ''
    }
})

// const parent = col.insert({
//     doc: {
//         username: 'test'
//     }
// })

// col.insert({
//     doc: {
//         username: 'test2',
//         parent: parent.id
//     }
// })

const rand = (max) => Math.floor(Math.random() * max)

for (let i = 0; i < 10000; i++) {
    // const element = 1000[i];
    const randUser = i < 3 ? 0 : rand(i - 1)
    const randSize = i < 3 ? 0 : rand(i > 60 ? 60 : i - 1)
    // const randFriendSize = (randSize > (i - 1)) ? i - 1 : randSize

    const friends = []

    for (let f = 0; f < randSize; f++) {
        friends.push(col.docs[i - 1].id)
    }

    col.insert({
        doc: {
            username: `test-${i}`,
            parent: i < 3 ? undefined : col.docs[randUser].id,
            friends: i < 3 ? undefined : friends.map(() => col.docs[rand(i - 1)].id)
        }
    })

}