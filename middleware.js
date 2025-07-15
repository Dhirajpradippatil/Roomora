
const Listing = require("./models/listing");

const Review =require("./models/review")  ;
module.exports.isLoggedIn = (req,res,next)=>{
 
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
            req.flash("error","You must be logged in first ");
           return res.redirect("/login");
      
        }
        next();}
module.exports.saveRediretUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl =req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner=async(req,res,next)=>{
let {id}=req.params;
let listing= await Listing.findById(id);
if(!listing.owner.equals(res.locals.currUser._id)){
    req.flash("error","you are not the owner of this listing");
    return res.redirect(`/listing/${id}`);
}
next();

};
module.exports.isAuthor=async(req,res,next)=>{
let{ id,reviewId}=req.params;
let review= await Review.findById(reviewId);
if(!review.author.equals(res.locals.currUser._id)){
    req.flash("error","you are not the author of this review");
    return res.redirect(`/listing/${id}`);
}
next();

};
module.exports.isAdmin=async(req, res, next) =>{
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash("error", "You are not authorized to view this page.");
    res.redirect("/");
}

