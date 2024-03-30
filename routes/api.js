'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectID = require('mongodb').ObjectID;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const boardSchema = new Schema({
  "_id": { type: String, required: true },
  "board": { type: String, required: true },
  "text": { type: String, required: true },
  "created_on": { type: Date, required: true },
  "bumped_on": { type: Date, required: true },
  "reported": { type: Boolean, required: true, select: false },
  "delete_password": { type: String, required: true, select: false },
  "replycount": { type: Number, required: true, select: false},
  "replies": [{
    "_id": String,
    "text": String,
    "created_on": Date,
    "delete_password": { type: String, select: false },
    "reported": { type: Boolean, select: false }
  }]
}, {
    versionKey: false
  });
const Board = mongoose.model('Board', boardSchema);

Board.deleteMany({ "board": "fcc_test" }, () => undefined);

module.exports = function(app) {

  app.route('/api/threads/:board')
    .get((req, res) => {
      const board = req.params.board;
      const query = req.query;

      if (query.thread_id) {
        Board.findOne({ "board": board, "_id": query.thread_id }, (err, doc) => {
          if (err) return res.send(err);
          if (doc === null) return res.send("Invalid thread id");

          return res.send(doc);
          
        })
      } else {
        Board.find({ "board": board }, (err, docs) => {
          if (err) return res.send(err);
          if (docs === null) return res.send([]);
  
          let modifiedDocs = [...docs];
  
          if (modifiedDocs.length > 10) {
            modifiedDocs.sort((a, b) => a.bumped_on - b.bumped_on);
            modifiedDocs = modifiedDocs.slice(0, 10);
          }
  
          modifiedDocs.forEach(v => {
            v.replies = v.replies.slice(0, 3);
          });
  
          return res.send(modifiedDocs);
        });
      }
      
    })
    .post((req, res) => {
      const board = req.params.board;
      const body = req.body;

      if (!body.text || !body.delete_password) return res.send("Required field(s) missing");

      const now = new Date()
      const doc = new Board({
        "_id": new ObjectID(),
        "board": board,
        "text": body.text,
        "created_on": now,
        "bumped_on": now,
        "reported": false,
        "delete_password": body.delete_password,
        "replycount": 0,
        "replies": []
      });
      
      // console.log([doc]);
      
      doc.save()
        .then(() => res.send(doc))
        .catch(err => res.send(err));

    })
    .put((req, res) => {
      const board = req.params.board;
      const body = req.body;

      if (body.report_id) body.thread_id = body.report_id; // Necessary for a fcc test.
      if (!body.thread_id) return res.send("Required field(s) missing");

      Board.findOne({ "board": board, "_id": body.thread_id }, (err, doc) => {
        if (err) return res.send(err);
        if (doc === null) return res.send("Invalid thread id");

        doc.reported = true
        doc.save()
          .then(() => res.send("reported"))
          .catch(err => res.send(err));

      });

    })
    .delete((req, res) => {
      const board = req.params.board;
      const body = req.body;

      if (!body.delete_password || !body.thread_id) return res.send("Required field(s) missing");

      Board.findOne({ "board": board, "_id": body.thread_id }, 'delete_password').exec((err, doc) => {
        if (err) return res.send({ error: err });
        if (doc === null) return res.send("Invalid thread id");
        if (doc.delete_password !== body.delete_password) return res.send("incorrect password");

        doc.remove()
          .then(() => res.send("success"))
          .catch(err => res.send(err));

      });

    });

  app.route('/api/replies/:board')
    .get((req, res) => {
      const board = req.params.board;
      const query = req.query;

      Board.findOne({ "board": board, "_id": query.thread_id }, (err, doc) => {
        if (err) return res.send(err);
        if (doc === null) return res.send("Invalid thread id");

        return res.send(doc);
      });

    })
    .post((req, res) => {
      const board = req.params.board;
      const body = req.body;

      if (!body.text || !body.delete_password || !body.thread_id) return res.send({ error: "Required field(s) missing" });

      Board.findOne({ "board": board, "_id": body.thread_id }, '+delete_password +replycount' , (err, doc) => {
        if (err) res.send(err);
        if (doc === null) res.send("Invalid thread id");

        const bumped = new Date();
        doc.bumped_on = bumped;
        doc.replycount++;
        doc.replies.unshift({
          "_id": new ObjectID(),
          "text": body.text,
          "created_on": bumped,
          "delete_password": body.delete_password,
          "reported": false
        });
        
        doc.save()
          .then(() => res.send(doc))
          .catch(err => res.send(err));
      });

    })
    .put((req, res) => {
      const board = req.params.board;
      const body = req.body;

      if (!body.reply_id || !body.thread_id) return res.send("Required field(s) missing");

      Board.findOne({ "board": board, "_id": body.thread_id }, (err, doc) => {
        if (err) return res.send(err);
        if (doc === null) return res.send("Invalid thread id");

        const reply = doc.replies.findIndex(v => v._id === body.reply_id);
        if (reply === -1) return res.send("Invalid reply id");

        doc.replies[reply].reported = true;

        doc.save()
          .then(() => res.send("reported"))
          .catch(err => res.send(err));

      });

    })
    .delete((req, res) => {
      const board = req.params.board;
      const body = req.body;

      if (!body.delete_password || !body.thread_id || !body.reply_id) return res.send("Required field(s) missing");

      Board.findOne({ "board": board, "_id": body.thread_id }, 'delete_password replies').exec((err, doc) => {
        if (err) return res.send(err);
        if (doc === null) return res.send("Invalid thread id");

        const reply = doc.replies.findIndex(v => v._id === body.reply_id);
        if (reply === -1) return res.send("Invalid reply id");
        if (body.delete_password !== doc.replies[reply].delete_password) return res.send("incorrect password");

        doc.replies[reply].text = "[deleted]";

        doc.save()
          .then(() => res.send("success"))
          .catch(err => res.send(err));
      });

    });

};
