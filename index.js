const express = require("express");
require("dotenv").config();

const cors = require("cors");
const { connection } = require("./db");
const { seatRouter } = require("./src/Route/Seats.route");
const UserRouter=require('./src/Route/User.route');
const  bodyParser = require('express').json
const app = express();
app.use(bodyParser());




// app.use(express.json());
app.use(cors());
app.use("/seats", seatRouter);
app.use('/user',UserRouter);

app.listen(process.env.PORT, async() => {
    try {
        await connection;
        console.log("App is connected to DB");
        console.log(`Server is running on port ${process.env.PORT}`);
    } catch (error) {
        console.log(error);
    }
});

module.exports = { app };