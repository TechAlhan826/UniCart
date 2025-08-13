import mongoose from "mongoose";

const isConnected = false; // track the connection

export async function connect() {
  if (isConnected) {
    console.log('MongoDB is already connected');
    return;
  }

    try {
        mongoose.connect(process.env.MONGO_URL!)
        const connection = mongoose.connection;

        connection.on('connected', ()=>{
            console.log("MongoDB Connected Successfully !");
        })

        connection.on('error', (err)=>{
            console.log('MongoDB Connection Error : '+ err);
            process.exit();
        })
    } catch (error){
        console.log("Something Went Wrong !");
        console.log(error);

    }

}