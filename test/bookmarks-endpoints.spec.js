const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

describe.only('Bookmarks endpoints', () => {
   let db

   before('make knex instance', () => {
      db = knex({
         client: 'pg',
         connection: process.env.TEST_DB_URL
      })
      app.set('db', db)
   })

   after('disconnect from db', () => db.destroy())

   before('cleanup', () => db('bookmarks').truncate())

   afterEach('cleanup', () => db('bookmarks').truncate())

   describe(`GET /bookmarks`, () => {
      context(`Given no bookmarks`, () => {
         it(`responds with 200 and an empty list`, () => {
            return supertest(app)
               .get('/bookmarks')
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(200, [])
         })
      })

      context('Given there are bookmarks in the database', () => {
         const testBookmarks = makeBookmarksArray()

         beforeEach('insert bookmarks', () => {
            return db.into('bookmarks').insert(testBookmarks)
         })

         it('responds with 200 and all of the bookmarks', () => {
            return supertest(app)
               .get('/bookmarks')
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(200, testBookmarks)
         })
      })
   })

   describe(`GET /bookmarks/id`, () => {
      context(`Given no bookmarks`, () => {
         it(`responds with 200 and an empty list`, () => {
            return supertest(app)
               .get('/bookmarks/123')
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(404, 'Not Found')
         })
      })

      context(`Given there are bookmarks`, () => {
         const testBookmarks = makeBookmarksArray()

         beforeEach('insert bookmarks', () => {
            return db.into('bookmarks').insert(testBookmarks)
         })

         it('responds with the book mark of correct id', () => {
            return supertest(app)
               .get('/bookmarks/3')
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(testBookmarks[2])
         })

      })
   })
})
