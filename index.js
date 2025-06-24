import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import pg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = Number(process.env.PORT);
const jwt_secrets = process.env.jwt_secrets;

const saltRounds = Number(process.env.saltRounds);

app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

const db = new pg.Client({
    user: process.env.pg_user,
    host: process.env.pg_host,
    database: process.env.pg_database,
    password: process.env.pg_password,
    port : process.env.pg_port,
});

db.connect();


async function generateToken(userId , role , res) {
  const token = jwt.sign({userId, role},jwt_secrets,{expiresIn : "7d"});

  res.cookie("jwt", token ,{
    maxAge : 7 * 24 * 60 * 60 * 1000,
    httpOnly : true,
    sameSite : "strict" , 
    secure : false
  });
  return token;
}

async function protectRoute(req , res , next){
    try{
        const token = req.cookies.jwt;
        if(!token) return res.status(401).json({message : "Unauthorized-No token provided "});

        const decode = jwt.verify(token,jwt_secrets);

        if(!decode) return res.status(401).json({ message : "Unauthorized - Invalid Token"});

        console.log(decode);

        const result = await db.query("select * from users where id = $1",[decode.userId]);
        if(result.rows.length ===0){
            return res.status(404).json({message: "User not Found"});
        }
        const user = result.rows[0];
        req.user = user;
        next();
        
    }catch(err){
        console.log("Error in protectRoute middleware: ", err.message);
        res.status(500).json({ message: "Internal server error in protectRoute" });
    }
}

async function adminProtectRoute(req,res,next){

    const apikey = req.query.apikey;

    try{
        const token = req.cookies.jwt;
        if(!token) return res.status(400).json({message : "Unauthorized - No Token provided"});

        if(!apikey) return res.status(400).json({message: "Unauthorized - No apikey provided"});

        const decode = jwt.verify(token,jwt_secrets);

        if(!decode) return res.status(400).json({message: "Unauthorized - Invalid Token"});

        console.log(decode);

        const result =  await db.query("select * from admins where id = $1 and api_key =$2",[decode.userId,apikey]);
        
        if(result.rows.length === 0) return res.status(400).json({message: "Admin Not Found or Invalid Api key"});

        req.user = result.rows[0];

        next();
    }catch(err){
        console.log("Error in admin protectRoute middleware: ", err.message);
        res.status(500).json({ message: "Internal server error in adminprotectRoute" });
    }
}

app.post("/api/user/signup", async (req,res)=>{
   const name = req.body.name;
   const email = req.body.email;
   const password  = req.body.password;

   if(password.length <6 ) {
      return res.status(400).json({ message : "password must be atleast 6 characters"});
   }
   
   try{
        const result  = await db.query("select * from users where email = $1 ", [email]);
        
        if(result.rows.length > 0){
            return res.status(400).json({message : "Email already exists"});
        }

        bcrypt.hash(password,saltRounds , async(err,hash)=>{
            if(err){
               return  res.status(500).json({message : "Some internal Error"});
            }
            let result1 = await db.query("insert into users (name,email,password) values ($1,$2,$3) returning *",[name,email,hash]);
            const token = await generateToken(result1.rows[0].id,"user",res);
            return res.status(201).json({
                id : result1.rows[0].id,
                name : result1.rows[0].name,
                email : result1.rows[0].email,
            });
        });

   }catch(err){
        console.log("Error in executing users singup query",err.message);
        res.status(500).json({message : "internal server Error"});
   }

});

app.post("/api/user/login",async (req,res)=>{
    const {email,password} = req.body;
    try{
        const result = await db.query("select * from users where email = $1" , [email]);
        if(result.rows.length ===0 ){
           return res.status(400).json({message: "Email not register or check the email"});
        }
        bcrypt.compare(password , result.rows[0].password ,async (err ,same)=>{
            if(err){
                console.log(err.message);
               return  res.status(500).json({message: "Internal Server Error in comparing password"});
            }
            if(!same){
               return  res.status(400).json({message : "Invalid credentials"});
            }
            const token =await generateToken(result.rows[0].id, "user" ,res);
            return res.status(201).json({
                id: result.rows[0].id,
                name : result.rows[0].name,
                email: result.rows[0].email,
            });
        });
    }catch(err){
        console.log("Error in users login controller",err.message);
        res.status(500).json({message : "Internal server Error"});
    }
});

app.post("/api/user/logout" ,async(req,res)=>{
    try{
        res.cookie("jwt" , "" ,{maxAge : 0});
        res.status(200).json({message: "Logged out successfully"});
    }catch(err){
        console.log("Error in users logout controller",err.message);
        res.status(500).json({message : "Internal Server Error"});        
    }
});


app.get("/api/user/checkAuth", protectRoute, async (req, res) => {
  try {
    res.status(200).json({id: req.user.id,name: req.user.name,email : req.user.email});
  } catch (err) {
    console.log("Error in checkAuth:", err.message);
    res.status(500).json({ message: "Internal Server Error in checkAuth" });
  }

});

app.post("/api/admin/signup",async (req,res) =>{
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    if(password.length < 6) return res.status(400).json({message: "Password must be atleast 6 characters"}); 

    try{
        const  result = await db.query("select * from admins where email = $1",[email]);

        if(result.rows.length >0){
            return res.status(400).json({message : "Email already exists"});
        }
        

        bcrypt.hash(password , saltRounds ,async (err,hash)=>{
            if(err) return res.status(500).json({message : "Some Internal Error"});
            const apikey = (crypto.randomBytes(4).readUInt32BE() % 1e9).toString().padStart(9,"0");
            let result1  = await db.query("insert into admins (name,email,password,api_key) values ($1,$2,$3,$4) returning *",[name,email,hash,apikey]);
            const token = await generateToken(result1.rows[0].id,"admin",res);
            
            return res.status(201).json({
                id : result1.rows[0].id,
                name : result1.rows[0].name,
                email : result1.rows[0].email,
                apikey : result1.rows[0].api_key,
            });
        });
    }catch(err){
        console.log("Error in admin signup controller",err.message);
        res.status(500).json({message : "Internal server Error"});
    }
});

app.post("/api/admin/login",async (req,res)=>{
    const {email , password} = req.body;

    try{
        const result = await db.query("select * from admins where email = $1",[email]);

        if(result.rows.length===0) return res.status(400).json({message:"Invalid credentials"});

        const user = result.rows[0];
        bcrypt.compare(password,user.password ,async (err,same)=>{
            if(err) return res.status(500).json({message: "Internal Server Error in comparing passwords"});
            if(!same) return res.status(400).json({message: "Invalid credentials"});
            
            const token = await generateToken(user.id , "admin" , res);

            return res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                apikey : user.api_key,
            });
        });

    }catch(err){
        console.log("Error in login query of admin",err.message);
        res.status(500).json({message: "Internal"})
    }
});

app.post("/api/admin/logout" ,async (req,res)=>{
    try{
        res.cookie("jwt","",{maxAge: 0});
        res.status(200).json({message: "Logged out succesfully"});
    }catch(err){
        console.log("Error in logging out admin ",err.message);
        res.status(500).json({message: "Internal server error"});
    }

});

app.get("/api/admin/checkAuth" ,adminProtectRoute ,async (req,res)=>{
    try{
        res.status(200).json({
            id : req.user.id,
            name : req.user.name,
            email : req.user.email,
            apikey : req.user.api_key,
        });
    }catch(err){
        res.status(500).json({message : "Internal Server Error in checkAuth"});
    }
});

app.post("/api/buses/addBus" ,adminProtectRoute ,async (req,res)=>{
    const start_station = req.body.start_station;
    const end_station = req.body.end_station;
    const seats_available = req.body.seats_available;

    try{
        if(!start_station || !end_station || !seats_available){
            return res.status(400).json({"Error" : "All Fields are Required"});
        }
        const result = await db.query("insert into buses (start_station,end_station,seats_available ,seats_filled) values($1,$2,$3,$4) returning *",[start_station,end_station,seats_available,0]);
        res.status(201).json(result.rows[0]);
    }catch(err){
        console.log("Error in inserting the bus query",err.message);
        res.status(400).json({Error : err.message});
    }

});
app.post("/api/buses/modifyAvailability", adminProtectRoute , async (req,res)=>{
    const id = req.body.id;
    const seats_available = req.body.seats_available;

    try{
        if(!id || !seats_available){
            return res.status(400).json({message: "Both fields id,seats_availabile required"});
        }
        const result = await db.query("select * from buses where id = $1" , [id]);
        if(result.rows.length ===0 ) return res.status(400).json({Error :"No Buses Found With Specified ID"});

        if(result.rows[0].seats_filled > seats_available) return res.status(400).json({Error : "Already there a enough bookings than specified"});

        const result1 = await db.query("update buses set seats_available = $1 where id= $2 returning *" ,[seats_available,id]);
        res.status(200).json(result1.rows[0]);
    }catch(err){
        console.log("Error in modifying query of buses",err.message);
        res.status(500).json({Error :err.message });
    }
});

app.post("/api/admin/generateApiKey" ,adminProtectRoute ,async(req,res) =>{
    const id = req.user.id;
    try{
        if(!id) return res.status(404).json({Error :"id Required"});

        const apikey = (crypto.randomBytes(4).readUInt32BE() % 1e9).toString().padStart(9,"0");
        await db.query("update admins set api_key = $1 where id =  $2",[apikey,id]);
        res.status(200).json({API_KEY : apikey , name : req.user.name}); 
    }catch(err){
        console.log("Error in generateAPIKEY for admin",err.message);
        res.status(400).json({Error:"Failed To generate API Key"});
    }
});

app.post ("/api/bookings/checkBuses" ,protectRoute ,async (req,res)=>{
    const start_station = req.body.start_station;
    const end_station = req.body.end_station;

    try{
        if(!start_station || !end_station){
            return res.status(400).json({Error : "All Fields are Required"});
        }

        const result  =await db.query("select * from buses where start_station = $1 and end_station = $2" , [start_station,end_station]);

        res.status(200).json(result.rows);

    }catch(err){
        console.log("Error in checkBuses Avaiability for users",err.message);
        return res.status(404).json({"Error":err.message});
    }
});

app.post("/api/bookings/checkSeatsAvailability",protectRoute,async (req,res)=>{
    const busId = req.body.id;
    try{
        if(!busId) return res.status(404).json({Error: "busId required"});

        const result = await db.query("select * from buses where id = $1",[busId]);
        if(result.rows.length === 0){
            return res.status(404).json({Error:"No Such Buses found"});
        }
        res.status(200).json({
            seats_available: result.rows[0].seats_available,
            seats_filled: result.rows[0].seats_filled
        });
    }catch(err){
        console.log("Error in check seats Avaiability for users",err.message);
        res.status(404).json({"Error":err.message});        
    }
});
app.post("/api/bookings/bookTickets",protectRoute,async (req,res)=>{
    const busId = req.body.busId;
    const numberOfSeats  = req.body.seats;
    try{
        await db.query('BEGIN');

        if(!busId || !numberOfSeats){
            await db.query('ROLLBACK');
            return  res.status(404).json({Error : "All Fields are Required"});
        }
        const result =  await db.query("select * from buses where id = $1",[busId]);

        if(result.rows.length ===0 ){
            await db.query('ROLLBACK');
            return  res.status(404).json({Error : "No Such bus Found with Specified bus Id"});
        }
        const bus = result.rows[0];
        if(bus.seats_available === bus.seats_filled){
            await db.query('ROLLBACK');
            return res.status(404).json({Error  : "Seats Already Filled"});
        }
        const newSeatsFilled = bus.seats_filled + numberOfSeats ;
        if(newSeatsFilled > bus.seats_available){
            return res.status(404).json({Error :"Not Enough Seats as you mentioned"});
        }
        const start = bus.start_station;
        const end = bus.end_station;
        const booking_id = (crypto.randomBytes(4).readUInt32BE() % 1e9).toString().padStart(9,"0"); 
        
        const result1  = await db.query("insert into bookings (user_name,user_email,start_station,end_station,booking_id,seats_booked)values($1,$2,$3,$4,$5,$6) returning *",[req.user.name,req.user.email,start,end,booking_id,numberOfSeats]);
        await db.query("update buses set seats_filled = $1 where id = $2",[newSeatsFilled,bus.id]);

        await db.query('COMMIT');
        res.status(200).json(result1.rows[0]);

    }catch(err){
        console.log("Error in book tickets for user");
        res.status(404).json({Error:"Unable to Book Tickets"});
    }
});

app.post("/api/bookings/getBookingDetails",protectRoute,async(req,res)=>{
  const booking_id = req.body.booking_id;

  try{
    if(!booking_id) return res.status(404).json({Error : "Booking id required"});

    const result  = await db.query("select * from bookings where booking_id = $1" , [booking_id]);
    if(result.rows.length ===0) return res.status(404).json({Error : "No Records found for Given booking id"});

    return res.status(200).json(result.rows[0]);
  }catch(err){
    console.log("Error in getBooking Details for user",err.message);
    return res.status(500).json({Error : err.message});
    }
});

app.get("/api/bookings/myBookings", protectRoute, async (req, res) => {
  const user = req.user;

  try {
    const result = await db.query(
      "SELECT * FROM bookings WHERE user_email = $1 ORDER BY id DESC",
      [user.email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ Error: "No bookings found for this user" });
    }

    res.status(200).json({
      total: result.rows.length,
      bookings: result.rows,
    });
  } catch (err) {
    console.log("Error in getting my bookings", err.message);
    res.status(500).json({ Error: err.message });
  }
});

app.listen(port,(req,res)=>{
    console.log(`server running on port ${port}`);
});

