require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const bookmarksRouter = require('./bookmarks/bookmarks-router')
const errorHandler = require('./error-handler')
const logger = require('./logger')

const app = express()

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common'
app.use(morgan(morganOption))

app.use(helmet())
app.use(cors())

app.use(function validateBearerToken(req, res, next) {
   const apiToken = process.env.API_TOKEN
   const authToken = req.get('Authorization')

   if (!authToken || authToken.split(' ')[1] !== apiToken) {
      logger.error(`Unauthorized request to path ${req.path}`)
      return res.status(401).json({ error: 'Unauthorized request' })
   }
   next()
})

app.get('/', (req, res) => {
  res.send('Hello, world!')
})

app.use(bookmarksRouter)
app.use(errorHandler)

module.exports = app
