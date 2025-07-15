const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
    console.log("connected to db");
}

const initDB = async () => {
    await Listing.deleteMany({});
    initdata.data = initdata.data.map((obj)=>({
        ...obj,
        owner:"652d0001ae547c5d37e56b5f",
    }));
    await Listing.insertMany(initdata.data);
    console.log("data was saved");
};

main()
  .then(() => initDB())
  .then(() => mongoose.connection.close())
  .catch(err => console.log(err));

