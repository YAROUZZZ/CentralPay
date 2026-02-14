require('dotenv').config();
const connectDB = require('./config/db');
connectDB();

const express = require('express');
const cors = require("cors");
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const businessRouter = require('./routes/businessUser.routes.js');
app.use('/business', businessRouter);

const normalRouter = require('./routes/normalUser.routes.js');
app.use('/normal', normalRouter);

const messageRouter = require('./routes/message.routes.js');
app.use('/message', messageRouter);


app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
    console.log('Server is running on port:', port);
});