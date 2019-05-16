# Sqlite Busy timeout repro
If the database is locked when trying to insert into sqlite (e.g. another process is writing to sqlite at that
moment) waits 1 whole second before retrying the insert. This can lead to a timeout if it fails to insert 5
times consecutively over 5 seconds.

Documentation of this behavior is under `HAVE_USLEEP` on [sqlite.org/compile](https://www.sqlite.org/compile.html)

## Install
```bash
npm install
```

## Run
```
npm run test
```

## Test output
The output may be dependent on your operating system. However, I was able to produce the error on both `ubuntu
16.04`  and `macos high sierra`

```
master initialized
worker1: 'insert-slowly' starting at 1558021716717
worker2: 'insert-quickly' starting at 1558021716732
worker1: 'insert-slowly' took 0.110990526
worker1: 'insert-slowly' starting at 1558021717717
worker1: 'insert-slowly' took 0.106111043
worker1: 'insert-slowly' starting at 1558021718717
worker1: 'insert-slowly' took 0.107911727
worker1: 'insert-slowly' starting at 1558021719717
worker1: 'insert-slowly' took 0.106095192
worker1: 'insert-slowly' starting at 1558021720717
worker1: 'insert-slowly' took 0.106203817
worker1: 'insert-slowly' starting at 1558021721717
Success! this is the error we are looking for: { name: SqliteError, code: SQLITE_BUSY }
worker1: 'insert-slowly' took 0.106154587
```
