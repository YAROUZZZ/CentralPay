require('./config/db');

const app = require('express')();
const port = process.env.PORT || 5000;

const cors = require("cors");
app.use(cors());
const USerRouter = require('./api/User');

const bodyParser = require('express').json;
app.use(bodyParser());

app.use('/user', USerRouter);

app.listen(port, ()=>{
    console.log('Server is running on port: ', port);
})