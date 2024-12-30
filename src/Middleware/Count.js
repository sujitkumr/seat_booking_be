
const count = (req, res, next) => {
    const toBooked = req.body.No_of_Seats;

    if (toBooked>0 && toBooked<=7){
        next();
    } else {
        res.status(400).send({ "message" : "Cannot book more than 7 seats at a time." });
    }
};

module.exports = { count };