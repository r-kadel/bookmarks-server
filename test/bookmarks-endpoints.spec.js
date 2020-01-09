const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

describe('Bookmarks endpoints', () => {
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

   describe(`GET /api/bookmarks`, () => {
      context(`Given no bookmarks`, () => {
         it(`responds with 200 and an empty list`, () => {
            return supertest(app)
               .get('/api/bookmarks')
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
               .get('/api/bookmarks')
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(200, testBookmarks)
         })
      })
   })

   describe(`GET /api/bookmarks/id`, () => {
      context(`Given no bookmarks`, () => {
         it(`responds with 200 and an empty list`, () => {
            return supertest(app)
               .get('/api/bookmarks/123')
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
               .get('/api/bookmarks/3')
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(testBookmarks[2])
         })
      })
   })

   describe(`DELETE /api/bookmarks/id`, () => {
      context(`Given no bookmarks`, () => {
         it(`responds with 404`, () => {
            const bookmarkId = 123456
            return supertest(app)
               .delete(`/api/bookmarks/${bookmarkId}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(404, { error: { message: `Bookmark doesn't exist` } })
         })
      })

      context('Given there are bookmarks in DB', () => {
         const testBookmarks = makeBookmarksArray()

         beforeEach('insert bookmarks', () => {
            return db.into('bookmarks').insert(testBookmarks)
         })

         it('responds with 204 and deletes bookmark', () => {
            const idToRemove = 2
            const expectedBookmarks = testBookmarks.filter(
               bookmark => bookmark.id !== idToRemove
            )
            return supertest(app)
               .delete(`/api/bookmarks/${idToRemove}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(204)
               .then(res =>
                  supertest(app)
                     .get(`/api/bookmarks`)
                     .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                     .expect(expectedBookmarks)
               )
         })
      })
   })

   describe(`GET /api/bookmarks/:bookmark_id`, () => {
      context(`Given an XSS attack`, () => {
         const maliciousBookmark = {
            id: 911,
            title:
               'Naughty naughty very naughty <script>alert("xss");</script>',
            url: 'www.bookmark.com',
            description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
            rating: '5'
         }

         beforeEach('insert malicious bookmark', () => {
            return db.into('bookmarks').insert([maliciousBookmark])
         })

         it('removes XSS attack content', () => {
            return supertest(app)
               .get(`/api/bookmarks/${maliciousBookmark.id}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(200)
               .expect(res => {
                  expect(res.body.title).to.eql(
                     'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
                  )
                  expect(res.body.description).to.eql(
                     `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
                  )
               })
         })
      })
   })
   describe.only(`PATCH /api/bookmarks/:bookmark_id`, () => {
      context(`Given no bookmarks`, () => {
         it(`responds 404`, () => {
            const bookmarkId = 1234
            return supertest(app)
               .patch(`/api/bookmarks/${bookmarkId}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(404, { error: { message: `Bookmark doesn't exist` } })
         })
      })
      context('Given there are bookmarks in the database', () => {
         const testBookmarks = makeBookmarksArray()

         beforeEach('insert bookmarks', () => {
            return db.into('bookmarks').insert(testBookmarks)
         })

         it('responds with 204 and updates the bookmark', () => {
            const idToUpdate = 2
            const updateBookmark = {
               title: 'updated bookmark title',
               url: 'updated url',
               description: 'updated description',
               rating: '4'
            }
            const expectedBookmark = {
               ...testBookmarks[idToUpdate - 1],
               ...updateBookmark
            }
            return supertest(app)
               .patch(`/api/bookmarks/${idToUpdate}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .send(updateBookmark)
               .expect(204)
               .then(res =>
                  supertest(app)
                     .get(`/api/bookmarks/${idToUpdate}`)
                     .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                     .expect(expectedBookmark)
               )
         })

         it(`responds 400 if no fields supplied`, () => {
            const idToUpdate = 2
            return supertest(app)
               .patch(`/api/bookmarks/${idToUpdate}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .send({ irrelevantField: 'foo' })
               .expect(400, {
                  error: {
                     message: `Request body must contain either 'title', 'url', description or 'rating'`
                  }
               })
         })

         it(`responds with 204 when updating only a subset of fields`, () => {
            const idToUpdate = 2
            const updateBookmark = {
               title: 'updated bookmark title'
            }
            const expectedBookmark = {
               ...testBookmarks[idToUpdate - 1],
               ...updateBookmark
            }

            return supertest(app)
               .patch(`/api/bookmarks/${idToUpdate}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .send({
                  ...updateBookmark,
                  fieldToIgnore: 'should not be in GET response'
               })
               .expect(204)
               .then(res =>
                  supertest(app)
                     .get(`/api/bookmarks/${idToUpdate}`)
                     .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                     .expect(expectedBookmark)
               )
         })
      })
   })
})
