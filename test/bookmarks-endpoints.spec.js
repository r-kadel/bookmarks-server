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

   describe(`DELETE /articles/id`, () => {
      context(`Given no articles`, () => {
         it(`responds with 404`, () => {
            const bookmarkId = 123456
            return supertest(app)
               .delete(`/bookmarks/${bookmarkId}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(404, { error: { message: `Bookmark doesn't exist` } })
         })
      })

      context('Given there are articles in DB', () => {
         const testBookmarks = makeBookmarksArray()

         beforeEach('insert bookmarks', () => {
            return db.into('bookmarks').insert(testBookmarks)
         })

         it('responds with 204 and deletes article', () => {
            const idToRemove = 2
            const expectedBookmarks = testBookmarks.filter(
               bookmark => bookmark.id !== idToRemove
            )
            return supertest(app)
               .delete(`/bookmarks/${idToRemove}`)
               .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
               .expect(204)
               .then(res =>
                  supertest(app)
                     .get(`/bookmarks`)
                     .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                     .expect(expectedBookmarks)
               )
         })
      })      
   })

   describe.only(`GET /bookmarks/:bookmark_id`, () => {
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
               .get(`/bookmarks/${maliciousBookmark.id}`)
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
})
