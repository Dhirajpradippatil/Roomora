if(process.env.NODE_ENV !="production"){
require('dotenv').config();
}


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path= require("path");
const methodOverride= require("method-override");
const ejsMate= require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const Review=require("./models/review.js");
const {listingSchema}=require("./schema.js");
const {reviewSchema}=require("./schema.js");
const session =require("express-session");
const MongoStore=require("connect-mongo");
const flash= require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local")
const User = require("./models/user.js");
let {isLoggedIn} = require("./middleware.js");
let { saveRediretUrl, isOwner, isAuthor, isAdmin } = require("./middleware.js");
const multer= require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({storage});
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;   // 🔥 use the correct env var name
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const DBURL= process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(DBURL);
}
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.use((err, req, res, next) => {
    res.status(500).render("listings/err.ejs", { err });
});
const store=MongoStore.create({
    mongoUrl:DBURL,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
})
store.on("error",()=>{
    console.log("ERROR in MONGO SESSION STORE",err);
})
const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,

    }
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser = req.user;
        next();
});


main()
    .then(() => {
        console.log("connected to db");
    })
    .catch((err) => {
        console.log(err);
    });
const validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
if(error){
    let errmsg = error.details.map((el)=>
el.message
    ).join(",");
    throw new  ExpressError(400,errmsg)
}else{
    next();
}

    
}
app.get("/", wrapAsync(async (req, res) => {
     const { category, search } = req.query;
    let query = {};

    if (category && category !== "Trending") {
        query.category = category;
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } }
        ];
    }
   

const alllisting=await Listing.find(query);
res.render("listings/index.ejs",{alllisting});
}));
app.get("/listing", wrapAsync(async(req, res) => {
     const { category, search } = req.query;
    let query = {};

    if (category && category !== "Trending") {
        query.category = category;
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } }
        ];
    }
   

const alllisting=await Listing.find(query);
res.render("listings/index.ejs",{alllisting});
}))
//show route
app.get("/listing/:id", wrapAsync(async(req, res) => {
let{id}=req.params;
 const listing=await Listing.findById(id).populate({path:"reviews",
    populate:{path:"author",},
 }).populate("owner");
if(!listing){
    req.flash("error","LIsting You Requested For Does Not Exist");
    res.redirect("/listing");
}
console.log(listing);
res.render("listings/show.ejs",{listing});
}))
app.get("/listings/new",isLoggedIn, (req, res) => {
  
   res.render("listings/new.ejs");
});
app.post("/listing",isLoggedIn,upload.single("listing[image]"),wrapAsync(async(req,res,next)=>{
 let response=await geocodingClient.forwardGeocode({
    query:req.body.listing.location,
    limit:1
 })
 .send();
 
 
 
    let url=req.file.path;
 let filename=req.file.filename;
 
const newlisting=new Listing(req.body.listing);
newlisting.owner=req.user._id;
newlisting.image={url,filename};
newlisting.geometry=response.body.features[0].geometry;
await newlisting.save();
req.flash("success","Your property is successfully registered on the Wanderlust");
res.redirect("/listing");
    })

);

// app.get("/testlisting", async (req, res) => {
//     let sampleListing = new Listing({
//         title: "My Home",
//         description: "sea view",  // fixed spelling
//         price: 1200,
//         location: "goa",
//         country: "india"
//     });

//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// });
app.get("/listing/:id/edit",isLoggedIn,isOwner,wrapAsync(async (req,res)=>{
let{id}=req.params;
 const listing=await Listing.findById(id);
 if(!listing){
    req.flash("error","LIsting You Requested For Does Not Exist");
    res.redirect("/listing");
}
 
res.render("listings/edit.ejs",{listing});
}))
app.put("/listing/:id", isOwner,upload.single("listing[image]"),wrapAsync(async (req, res) => {
    let { id } = req.params;
  let listing =  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  if(typeof req.file!="undefined"){
let url=req.file.path;
 let filename=req.file.filename;
 listing.image={url,filename};
 await listing.save() ;
 
  }  
  
  req.flash("success","Listing Is Successfully Edited");
    res.redirect(`/listing/${id}`);
}));
app.delete("/listing/:id",isLoggedIn,isOwner,wrapAsync(async (req,res)=>{
 let { id } = req.params;
 
    await Listing.findByIdAndDelete(id);
    req.flash("success","Your property Is Successfully Deleted");
    res.redirect("/listing");

}))
app.post("/listing/:id/reviews",isLoggedIn,validateReview,wrapAsync(async(req,res)=>
    {  let { id } = req.params;

        let listing= await Listing.findById(req.params.id);
        let newReview= new Review(req.body.review);
        newReview.author=req.user._id;
        console.log(newReview)
        listing.reviews.push(newReview);
        await newReview.save();
         await listing.save();
         console.log("new review saved");
         req.flash("success","New Review Is Successfully Created");
         res.redirect(`/listing/${id}`);
  }))

// For unmatched routes
// app.all("*", (req, res, next) => {
//     next(new ExpressError(404, "Page Not Found"));
// });



app.delete("/listing/:id/reviews/:reviewId",isLoggedIn,isAuthor,wrapAsync(async (req, res) => {
  let { id, reviewId } = req.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);


req.flash("success","Review Is Successfully Deleted");
  res.redirect(`/listing/${id}`);
}));

  app.get("/signup",(req,res)=>{
    res.render("users/signup.ejs");
  });
  app.post("/signup", wrapAsync(async (req, res) => {
    
        const { username, password ,email} = req.body;
        const user = new User({ username , email});
        const registeredUser = await User.register(user, password);
        req.login(registeredUser,(err)=>{
            if(err){
                return next(err);
            }
              req.flash("success","Welcome To Wanderlust")
        res.redirect("/listing");

        })
    
 
}));
app.get("/login",(req,res)=>{
    res.render("users/login.ejs");
}
)
app.post("/login",saveRediretUrl,passport.authenticate("local",{failureRedirect:"/login",failureFlash:true}),(req,res)=>{
 req.flash("success","Welcome To Wanderlust you're login");
 let redirectUrl = res.locals.redirectUrl || "/listing"
    res.redirect(redirectUrl);
});

app.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err){
         return   next(err);
        }
        req.flash("success"," you are loggged out!");
        res.redirect("/listing")
    })
})
app.post("/listing/:id/book",isLoggedIn, async (req, res) => {
    const Booking = require("./models/booking");
    const { id } = req.params;
    const { name, phone } = req.body;


await Booking.create({
    name,
    phone,
    listing: id
});



    // find listing to get owner
    const listing = await Listing.findById(id).populate("owner");

    // Here: logic to notify the owner.
    // For now, just console.log it:
    console.log(`Booking request for ${listing.title}`);
    console.log(`Name: ${name}, Phone: ${phone}`);
    console.log(`Owner would be notified: ${listing.owner}`);

    // You could later add:
    // - save to a "Booking" collection
    // - send email to owner
    // - show success message

    req.flash("success", "Your booking details have been successfully sent to the property owner.owner will contact you shortly to assist with your reservation ");
    res.redirect(`/listing/${id}`);
});

//   app.post("/signup",async(req,res)=>{
//     let{username ,email , password}=req.body;
//     const newuser=new User({email,username});
//    const register=await  User.register(newuser,password);
//    console.log(register);
//    req.flash("success","Welcome To Wanderlust")
//    res.redirect("/listing");

//   })
app.get("/owner/bookings",isLoggedIn, async (req, res) => {
     const Booking = require("./models/booking");
    const ownerId = req.user._id; // assuming you're using passport authentication
    // find listings owned by this owner
    const listings = await Listing.find({ owner: ownerId });

    // find bookings related to those listings
    const bookings = await Booking.find({ listing: { $in: listings } }).populate("listing");

    res.render("listings/booking.ejs", { bookings });
});
app.get('/dashboard', isAdmin, async (req, res) => {
     const Booking = require("./models/booking");
    const totalUsers = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const recentBookings = await Booking.find({}).populate('listing').limit(10000).sort({ createdAt: -1 });

    res.render("listings/dashboard.ejs", {
        totalUsers,
        totalListings,
        totalBookings,
        recentBookings,
        adminName: req.user.username
    });
});

app.listen(8080, () => {
    console.log("server is listening");  // fixed spelling
});
