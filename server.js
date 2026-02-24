require('dotenv').config();
const connectDB = require('./config/db');
connectDB();

const express = require('express');
const cors = require("cors");
const errorHandler = require('./middleware/errorHandler');
const Message = require('./modules/message');

const app = express();
const port = process.env.PORT || 5000;

// Clean up all non-id indexes from Message collection and rebuild from schema
(async () => {
    try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for DB connection
        
        // Drop ALL indexes except _id_
        try {
            await Message.collection.dropIndexes();
            console.log('✓ All indexes dropped from Message collection');
        } catch (e) {
            console.log('Indexes drop attempt completed');
        }
        
        // Now rebuild indexes from schema definition
        await Message.collection.createIndexes();
        console.log('✓ Indexes rebuilt from schema');
        
    } catch (error) {
        console.log('Index rebuild completed:', error.message);
    }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use('/uploads', express.static('uploads'));



/* const businessRouter = require('./routes/businessUser.routes.js');
app.use('/business', businessRouter);

const normalRouter = require('./routes/normalUser.routes.js');
app.use('/normal', normalRouter); */

const userRouter = require('./routes/user.route.js');
app.use('/user', userRouter);


const messageRouter = require('./routes/message.routes.js');
app.use('/message', messageRouter);

const receiptRouter = require('./routes/recepit.routes.js');
app.use('/recepit', receiptRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
    console.log('Server is running on port:', port);
});