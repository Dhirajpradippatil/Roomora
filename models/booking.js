const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    name: String,
    phone: String,
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Booking", bookingSchema);

