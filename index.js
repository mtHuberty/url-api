const express = require('express')
const dotenv = require('dotenv')
const shajs = require('sha.js')
const crypto = require('crypto')
const { Pool } = require('pg')

dotenv.config()
const app = express()
const pool = new Pool()

app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})

app.get('/urls', (req, res) => {
    pool.query("SELECT * FROM urls;", (err, dbRes) => {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            console.log(dbRes.rows);
            res.send(dbRes.rows);
        }
    });
})

app.post('/urls', (req, res) => {

    const hashedUrl = crypto.createHash('sha256').update(req.body.long_url, 'utf8').digest('hex')
    const shortenedHashedUrl = hashedUrl.slice(0, 3) + hashedUrl.slice(-3)

    // Check for duplicates
    pool.query('SELECT * FROM urls WHERE short_url=$1;', [shortenedHashedUrl], (selectErr, selectRes) => {
        if (selectErr) {
            console.log(selectErr)
            res.send(selectErr)
        } else {
            if (selectRes.rows.length > 0) {
                console.log('OH SHIT, THAT ALREADY EXISTS')
                if (selectRes.rows[0].long_url === req.body.long_url) {
                    console.log('Someone already shortened that url, sending existing DB entry')
                    res.send(selectRes.rows)
                } else {
                    console.log('Oh my god....that like....should never happen. What are the odds. Sending back existing entry anyway')
                    // TODO: Implement some true coincidental duplicate error handling logic with retries?
                    res.send(selectRes.rows)
                }
            } else {
                // Ok then, save that shit to the DB
                pool.query('INSERT INTO urls (short_url,long_url,visits) VALUES ($1, $2, 0) RETURNING *;', [shortenedHashedUrl, req.body.long_url], (insertErr, insertRes) => {
                    if (insertErr) {
                        console.log(insertErr)
                        res.send(insertErr)
                    } else {
                        res.send(insertRes.rows)
                    }
                })
            }
        }
    })
})

app.get('/:short_url', (req, res) => {
    const requestedShortUrl = req.params.short_url
    pool.query('SELECT * FROM urls WHERE short_url=$1;', [requestedShortUrl], (err, dbRes) => {
        if (err) {
            console.log(err)
            res.send(err)
        } else {
            if (dbRes.rows.length > 0) {
                res.writeHead(302, {
                    Location: `http${res.socket.encrypted ? "s" : ""}://${dbRes.rows[0].long_url}`
                })
                res.end()
                pool.query('UPDATE urls SET visits = visits + 1 WHERE url_id = $1 RETURNING visits', [dbRes.rows[0].url_id], (updateErr, updateRes) => {
                    if (updateErr) {
                        console.log(err)
                    } else {
                        console.log(updateRes.rows)
                    }
                })
            } else {
                res.send('No entry matching that short url was found')
            }
        }
    })
})

app.use('/', (req, res) => {
    res.send(`Hello`)
})

app.listen(3535, () => {
    pool.query("SELECT 1 FROM urls;", (err, res) => {
        if (err) {
            throw Error(err)
        } else {
            console.log('Listening on port 3535...')
        }
    })
})
