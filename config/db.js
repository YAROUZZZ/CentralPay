require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("DB connecred");
    })
    .catch((err) => console.log("ERROR"));
