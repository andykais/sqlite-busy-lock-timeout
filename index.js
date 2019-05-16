const cluster = require('cluster')
const createDatabase = require('better-sqlite3')

const measure = prefix => fn => {
  const start = process.hrtime()
  console.log(prefix, 'starting at', Date.now())
  fn()
  const end = process.hrtime(start)
  console.log(prefix, 'took', end[0] + end[1] / 1e9)
}

const timeout = n => new Promise(resolve => setTimeout(resolve, n))
const sleep = n => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n)

const measureLogSchedule = measure('schedule')
const schedule = startAtEpoch => fn => {
  let now
  do {
    now = Date.now()
  } while (now < startAtEpoch)
  fn()
}

const startMaster = () => {
  const database = createDatabase(`database-shared.db`)
  database.exec(`
DROP TABLE IF EXISTS data;
CREATE TABLE IF NOT EXISTS data (
  id INTEGER PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`)
  const worker1 = cluster.fork()
  const worker2 = cluster.fork()
  console.log('master initialized')

  worker1.send({ type: 'name', name: 'worker1' })
  worker2.send({ type: 'name', name: 'worker2' })
  const now = new Date()
  const future = now.setMilliseconds(now.getMilliseconds() + 100)
  worker1.send({ type: 'insert-slowly', startAt: future })
  worker2.send({ type: 'insert-quickly', startAt: future + 15 })
  worker1.send({ type: 'insert-slowly', startAt: future + 1000 })
  worker1.send({ type: 'insert-slowly', startAt: future + 2000 })
  worker1.send({ type: 'insert-slowly', startAt: future + 3000 })
  worker1.send({ type: 'insert-slowly', startAt: future + 4000 })
  worker1.send({ type: 'insert-slowly', startAt: future + 5000 })
  worker1.send({ type: 'exit' })
  worker2.send({ type: 'exit' })
}

const startWorker = () => {
  const database = createDatabase(`database-shared.db`)
  const someSuperHugeString = 'abc'.repeat(1000)
  const insertStatement = database.prepare(`
INSERT INTO data (value) VALUES ('${someSuperHugeString}')
`)
  const meta = {}

  process.on('message', message => {
    switch (message.type) {
      case 'name':
        meta.name = message.name
        break
      case 'insert-slowly': {
        const measureLog = measure(`${meta.name}: '${message.type}'`)

        const runInFuture = schedule(message.startAt)
        runInFuture(() => {
          const slowInsert = database.transaction(() => {
            insertStatement.run()
            sleep(100)
          })
          measureLog(slowInsert)
        })
        break
      }
      case 'insert-quickly': {
        const measureLog = measure(`${meta.name}: '${message.type}'`)

        const runInFuture = schedule(message.startAt)
        runInFuture(() => {
          measureLog(() => insertStatement.run())
        })
        break
      }
      case 'exit':
        process.exit()
        break
    }
  })
}

if (cluster.isMaster) {
  startMaster()
} else {
  startWorker()
  process.on('uncaughtException', e => {
    if (e.name === 'SqliteError' && e.code === 'SQLITE_BUSY') {
      console.log(
        `Success! this is the error we are looking for: { name: ${e.name}, code: ${e.code} }`
      )
    }
  })
}
