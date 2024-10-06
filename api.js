"use strict";

const threadSchema = require("../models").Thread;

module.exports = function (app) {
  app.route("/api/threads/:board").post(async (req, res) => {
    const { board } = req.params;
    const { text, delete_password } = req.body;

    try {
      // Create a new thread with the required fields
      const thread = new threadSchema({
        board,
        text,
        delete_password,
        created_on: new Date(),
        bumped_on: new Date(), // same as created_on initially
        reported: false, // reported starts as false
        replies: [], // no replies initially
      });

      // Save the thread in the database
      await thread.save();

      // Send a response
      res.json({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        reported: thread.reported,
        delete_password: thread.delete_password,
        replies: thread.replies,
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to create thread" });
    }
  });

  app.route("/api/replies/:board").post(async (req, res) => {
    const { thread_id, text, delete_password } = req.body;

    try {
      // Find the thread by its ID
      const thread = await threadSchema.findById(thread_id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Create a new reply
      const reply = {
        text,
        delete_password,
        created_on: new Date(),
        reported: false,
      };

      // Add reply to the replies array
      thread.replies.push(reply);

      // Update bumped_on to the reply's created_on date
      thread.bumped_on = reply.created_on;

      // Save the updated thread
      await thread.save();

      // Return the updated thread
      res.json({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies,
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to add reply" });
    }
  });

  app.route("/api/threads/:board").get(async (req, res) => {
    const { board } = req.params;

    try {
      // Find the most recent 10 bumped threads
      const threads = await threadSchema
        .find({ board })
        .sort({ bumped_on: -1 }) // Sort by the most recent bumped threads
        .limit(10)
        .lean(); // Convert mongoose documents to plain JS objects to modify the output

      // Format the threads to include only the most recent 3 replies and exclude fields
      const formattedThreads = threads.map((thread) => {
        return {
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: thread.replies
            .slice(-3) // Get only the most recent 3 replies
            .map((reply) => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on,
            })),
        };
      });

      res.json(formattedThreads);
    } catch (error) {
      res.status(500).json({ error: "Unable to retrieve threads" });
    }
  });

  app.route("/api/replies/:board").get(async (req, res) => {
    const { thread_id } = req.query;

    try {
      // Find the thread by its ID
      const thread = await threadSchema.findById(thread_id).lean(); // Convert to plain JS object for easier manipulation

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Exclude 'reported' and 'delete_password' from replies
      const formattedThread = {
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies.map((reply) => ({
          _id: reply._id,
          text: reply.text,
          created_on: reply.created_on,
        })),
      };

      res.json(formattedThread);
    } catch (error) {
      res.status(500).json({ error: "Unable to retrieve thread" });
    }
  });

  app.route("/api/threads/:board").delete(async (req, res) => {
    const { thread_id, delete_password } = req.body;

    try {
      // Find the thread by its ID and check the password
      const thread = await threadSchema.findById(thread_id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (thread.delete_password !== delete_password) {
        return res.send("incorrect password");
      }

      // Delete the thread
      await threadSchema.findByIdAndDelete(thread_id);
      res.send("success");
    } catch (error) {
      res.status(500).json({ error: "Unable to delete thread" });
    }
  });

  app.route("/api/replies/:board").delete(async (req, res) => {
    const { thread_id, reply_id, delete_password } = req.body;

    try {
      // Find the thread by its ID
      const thread = await threadSchema.findById(thread_id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Find the reply by its ID
      const reply = thread.replies.id(reply_id);

      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      // Check if the delete_password matches
      if (reply.delete_password !== delete_password) {
        return res.send("incorrect password");
      }

      // Update the reply text to [deleted]
      reply.text = "[deleted]";
      await thread.save();

      res.send("success");
    } catch (error) {
      res.status(500).json({ error: "Unable to delete reply" });
    }
  });

  app.route("/api/threads/:board").put(async (req, res) => {
    const { thread_id } = req.body;

    try {
      // Find the thread by its ID and update the reported status
      await threadSchema.findByIdAndUpdate(thread_id, { reported: true });
      res.send("reported");
    } catch (error) {
      res.status(500).json({ error: "Unable to report thread" });
    }
  });

  app.route("/api/replies/:board").put(async (req, res) => {
    const { thread_id, reply_id } = req.body;

    try {
      // Find the thread by its ID
      const thread = await threadSchema.findById(thread_id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Find the reply by its ID and update the reported status
      const reply = thread.replies.id(reply_id);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      reply.reported = true;
      await thread.save();
      res.send("reported");
    } catch (error) {
      res.status(500).json({ error: "Unable to report reply" });
    }
  });
};
