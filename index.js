const express = require('express')
const data = require('./fakeData')

const app = express()

app.use('/', (req, res) => {
    console.log('GOT A REQUEST')
    res.send(data)
})

app.listen(3535, () => {
    console.log('Listening on port 3535...')
})