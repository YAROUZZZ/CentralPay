require('dotenv').config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      family: 4 
    });
    console.log("DB connected");
  } catch (err) {
    console.log("DB error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
