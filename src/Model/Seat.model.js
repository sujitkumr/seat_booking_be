const mongoose = require("mongoose");

const seatSchema = mongoose.Schema({
    seatNumber : Number,
    isBooked : Boolean
});

const seatModel = mongoose.model("Seats", seatSchema);

module.exports = { seatModel };