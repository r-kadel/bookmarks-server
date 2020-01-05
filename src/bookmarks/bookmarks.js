const express = require('express')
const uuid = require('uuid/v4')
const logger = require('../logger')
const { bookmarks } = require('../store')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

bookmarksRouter
   .route('/bookmarks')
   .get((req, res, next) => {
      BookmarksService.getAllBookmarks(req.app.get('db'))
        .then( bookmarks => res.json(bookmarks))
        .catch(next)
   })
   .post(bodyParser, (req, res) => {
      const { title, url, description, rating } = req.body
      if (!title) {
         logger.error(`Title is required`)
         return res.status(400).send('Title is required')
      }
      if (!url) {
         logger.error(`URL is required`)
         return res.status(400).send('URL is required')
      }
      if (!description) {
         logger.error(`description is required`)
         return res.status(400).send('description is required')
      }
      if (!rating) {
         logger.error(`rating is required`)
         return res.status(400).send('rating is required')
      }

      const id = uuid()
      const bookmark = {
         id,
         title,
         url,
         description,
         rating
      }

      bookmarks.push(bookmark)
      logger.info(`Bookmark with id ${id} created`)

      res.status(201)
         .location(`http://localhost:8000/bookmarks/${id}`)
         .json(bookmark)
   })

bookmarksRouter
   .route('/bookmarks/:id')
   .get((req, res, next) => {
      const { id } = req.params
      
      BookmarksService.getById(req.app.get('db'), id)
      .then(bookmark => {
        if (!bookmark) {
           logger.error(`Bookmark id ${id} not found`)
           return res.status(404).send('Not Found')
        }  
        ({ 
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          description: bookmark.description,
          rating: Number(bookmark.rating),
        })

        res.json(bookmark)
      })
      .catch(next)
   })
   .delete((req, res) => {
      const { id } = req.params
      const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.id == id)

      if (bookmarkIndex === -1) {
         logger.error(`Bookmark id ${id} not found`)
         return res.status(404).send('Not Found')
      }

      bookmarks.splice(bookmarkIndex, 1)

      logger.info(`Bookmark with id ${id} deleted.`)

      res.status(204).end()
   })

module.exports = bookmarksRouter
