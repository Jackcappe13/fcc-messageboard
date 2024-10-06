const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../server"); // Adjust the path as per your project structure
const assert = chai.assert;

chai.use(chaiHttp);

suite("Functional Tests", function () {
  let testThreadId; // Holds the thread ID for use in multiple tests
  let testReplyId; // Holds the reply ID for later use

  // Setup: Create a test thread before all tests
  setup(function (done) {
    chai
      .request(server)
      .post("/api/threads/test-board")
      .send({
        text: "This is a reply to the test thread",
        delete_password: "password123",
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        testThreadId = res.body._id; // Save the thread ID for future tests
        done();
      });
  });

  // 1. Test for creating a new thread
  test("Creating a new thread: POST request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post("/api/threads/test-board")
      .send({ text: "Another Test Thread", delete_password: "password123" })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, "_id");
        assert.property(res.body, "text");
        assert.equal(res.body.text, "Another Test Thread");
        done();
      });
  });

  // 2. Test for viewing recent threads
  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/test-board")
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        res.body.forEach((thread) => {
          assert.isArray(thread.replies);
          assert.isAtMost(thread.replies.length, 3);
        });
        done();
      });
  });

  // 3. Test for deleting a thread with incorrect password
  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .delete("/api/threads/test-board")
      .send({ thread_id: testThreadId, delete_password: "wrong_password" })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      });
  });

  // 4. Test for deleting a thread with correct password
  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .delete("/api/threads/test-board")
      .send({ thread_id: testThreadId, delete_password: "password123" })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
        done();
      });
  });

  // 5. Test for reporting a thread
  test("Reporting a thread: PUT request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post("/api/threads/test-board")
      .send({ text: "Thread to report", delete_password: "password123" })
      .end(function (err, res) {
        const threadIdToReport = res.body._id; // Get the ID of the thread
        chai
          .request(server)
          .put("/api/threads/test-board")
          .send({ thread_id: threadIdToReport })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");
            done();
          });
      });
  });

  // 6. Test for creating a new reply
  test("Creating a new reply: POST request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .post(`/api/replies/test-board`)
      .send({
        text: "This is a reply to the test thread",
        delete_password: "replypass",
        thread_id: testThreadId,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.text, "This is a reply to the test thread");
        testReplyId = res.body._id; // Save reply ID for later tests
        done();
      });
  });

  // 7. Test for viewing a single thread with all replies
  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .get(`/api/replies/test-board?thread_id=${testThreadId}`)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, "replies");
        assert.isArray(res.body.replies);
        done();
      });
  });

  // 8. Test for deleting a reply with incorrect password
  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}", function (done) {
    // Create a reply to ensure there is one to delete
    chai
      .request(server)
      .post(`/api/replies/test-board`)
      .send({
        text: "Reply to Delete Incorrectly",
        delete_password: "replypass",
        thread_id: testThreadId,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        const replyIdToDelete = res.body.replies[0]._id; // Get the reply ID

        // Attempt to delete the reply with an incorrect password
        chai
          .request(server)
          .delete("/api/replies/test-board")
          .send({
            thread_id: testThreadId,
            reply_id: replyIdToDelete,
            delete_password: "wrongpass",
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password"); // Check expected response
            done();
          });
      });
  });

  // 9. Test for deleting a reply with correct password
  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board}", function (done) {
    // Create a reply to delete
    chai
      .request(server)
      .post(`/api/replies/test-board`)
      .send({
        text: "Reply to Delete Correctly",
        delete_password: "replypass",
        thread_id: testThreadId,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        const replyIdToDelete = res.body.replies[0]._id; // Get the reply ID

        // Now delete the reply with the correct password
        chai
          .request(server)
          .delete("/api/replies/test-board")
          .send({
            thread_id: testThreadId,
            reply_id: replyIdToDelete,
            delete_password: "replypass",
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success"); // Check expected response
            done();
          });
      });
  });

  // 10. Test for reporting a reply
  test("Reporting a reply: PUT request to /api/replies/{board}", function (done) {
    // Create a reply to report
    chai
      .request(server)
      .post(`/api/replies/test-board`)
      .send({
        text: "Another Reply to Report",
        delete_password: "replypass2",
        thread_id: testThreadId,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        const replyIdToReport = res.body.replies[0]._id; // Get the reply ID

        // Report the reply
        chai
          .request(server)
          .put("/api/replies/test-board")
          .send({ thread_id: testThreadId, reply_id: replyIdToReport })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported"); // Check expected response
            done();
          });
      });
  });
});
