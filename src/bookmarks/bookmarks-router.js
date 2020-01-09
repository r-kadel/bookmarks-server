const express = require('express')
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')
const xss = require('xss')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
   id: bookmark.id,
   title: xss(bookmark.title),
   url: bookmark.url,
   description: xss(bookmark.description),
   rating: bookmark.rating
})

bookmarksRouter
   .route('/api/bookmarks')
   .get((req, res, next) => {
      BookmarksService.getAllBookmarks(req.app.get('db'))
         .then(bookmarks => res.json(bookmarks.map(serializeBookmark)))
         .catch(next)
   })
   .post(bodyParser, (req, res, next) => {
      const { title, url, description, rating } = req.body
      const newBookmark = { title, url, description, rating }

      for (const field of ['title', 'url', 'rating']) {
         if (!req.body[field]) {
            return res.status(400).json({
               error: { message: `Missing '${field}' in request body` }
            })
         }
      }

      const ratingNum = Number(rating)
      if (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
         logger.error(`Invalid rating '${rating}' supplied`)
         return res.status(400).send({
            error: { message: `'rating' must be a number between 0 and 5` }
         })
      }

      BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
         .then(bookmark => {
            res.status(201)
               .location(`/api/bookmarks/${bookmark.id}`)
               .json(serializeBookmark(bookmark))
         })
         .catch(next)
   })

bookmarksRouter
   .route('/api/bookmarks/:id')
   .all((req, res, next) => {
      const { id } = req.params
      BookmarksService.getById(req.app.get('db'), id)
         .then(bookmark => {
            if (!bookmark) {
               return res.status(404).json({
                  error: { message: `Bookmark doesn't exist` }
               })
            }
            res.bookmark = bookmark
            next()
         })
         .catch(next)
   })
   .get((req, res, next) => {
      res.json(serializeBookmark(res.bookmark))
   })
   .delete((req, res, next) => {
      const { id } = req.params

      BookmarksService.deleteBookmark(req.app.get('db'), id)
         .then( res.status(204).end())
         .catch(next)
   })
   .patch(bodyParser, (req, res, next) => {
      const { title, url, description, rating } = req.body
      const bookmarkToUpdate = { title, url, description, rating }
      const { id } = req.params
      const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean)
         .length
      if (numberOfValues === 0) {
         return res.status(400).json({
            error: {
               message: `Request body must contain either 'title', 'url', description or 'rating'`
            }
         })
      }

      BookmarksService.updateBookmark(
         req.app.get('db'),
         id,
         bookmarkToUpdate
      )
         .then(res.status(204).end())
         .catch(next)
   })

module.exports = bookmarksRouter
