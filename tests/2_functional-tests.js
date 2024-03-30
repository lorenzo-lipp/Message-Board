const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
let testID;
let replyID;

chai.use(chaiHttp);

suite('Functional Tests', function() {
  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/test')
      .send({
        text: "Lorem ipsum",
        delete_password: "123"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, "_id");
        assert.property(res.body, "text");
        assert.property(res.body, "created_on");
        assert.property(res.body, "bumped_on");
        assert.equal(res.body.created_on, res.body.bumped_on);
        assert.property(res.body, "reported");
        assert.property(res.body, "delete_password");
        assert.property(res.body, "replies");
        assert.isArray(res.body.replies);
        testID = res.body._id;
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    chai.request(server)
      .get('/api/threads/test')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAbove(res.body.length, 0);
        assert.isAtMost(res.body.length, 10);
        for (i in res.body) {
          assert.property(res.body[i], "_id");
          assert.property(res.body[i], "text");
          assert.property(res.body[i], "created_on");
          assert.property(res.body[i], "bumped_on");
          assert.property(res.body[i], "replies");
          assert.isArray(res.body[i].replies);
          assert.isAtMost(res.body[i].replies.length, 3);
        }
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete('/api/threads/test')
      .send({
        thread_id: testID,
        delete_password: "787878"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      })
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete('/api/threads/test')
      .send({
        thread_id: testID,
        delete_password: "123"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
        done();
      })
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/test')
      .send({
        text: "Lorem ipsum",
        delete_password: "123"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, "_id");
        testID = res.body._id;
        
        chai.request(server)
          .put('/api/threads/test')
          .send({
            thread_id: testID
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");
            done();
          });
        
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/replies/test')
      .send({
        thread_id: testID,
        text: "A good post!",
        delete_password: "12345"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, "created_on");
        assert.property(res.body, "bumped_on")
        assert.notEqual(res.body.created_on, res.body.bumped_on);
        assert.property(res.body, "replies");
        assert.isArray(res.body.replies);
        assert.isAbove(res.body.replies.length, 0);
        assert.property(res.body.replies[0], "_id");
        replyID = res.body.replies[0]._id;
        assert.property(res.body.replies[0], "created_on");
        assert.property(res.body.replies[0], "delete_password");
        assert.property(res.body.replies[0], "text");
        assert.property(res.body.replies[0], "reported");
        done();
      })
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get('/api/replies/test?thread_id=' + testID)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, "_id");
        assert.property(res.body, "text");
        assert.property(res.body, "created_on");
        assert.property(res.body, "bumped_on");
        assert.property(res.body, "replies");
        assert.isArray(res.body.replies);
        assert.isAbove(res.body.replies.length, 0);
        done();
      })
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete('/api/replies/test')
      .send({
        thread_id: testID,
        reply_id: replyID,
        delete_password: "7878"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      })
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai.request(server)
      .put('/api/replies/test')
      .send({
        thread_id: testID,
        reply_id: replyID
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
        done();
      })
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete('/api/replies/test')
      .send({
        thread_id: testID,
        reply_id: replyID,
        delete_password: "12345"
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
        done();
      })
  });
  
});
