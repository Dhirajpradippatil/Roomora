const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");

async function main() {
    await mongoose.connect("mongodb+srv://rajpatil2282:kTfqKolqqFezOXGl@cluster0.xqlvttn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
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

