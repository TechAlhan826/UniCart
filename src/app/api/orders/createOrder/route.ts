//import orders from "@/app/models/orderModel";
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/app/dbConfig/dbConfig";

export async function POST(req: NextRequest){
    //const db = 
    await connect();
    return NextResponse.json({ success: true, message: `createOrder ${req} Working` });
}