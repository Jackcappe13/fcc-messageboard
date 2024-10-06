const mongoose = require("mongoose");
const uri = process.env.MONGO_URI;

const db = mongoose
  .connect(uri)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.log("Database connection error:", err));

module.exports = db;
