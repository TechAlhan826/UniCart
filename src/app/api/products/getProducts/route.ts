/* eslint-disable */
import { connect } from "@/app/dbConfig/dbConfig";
import products from "@/app/models/productModel";
import { NextResponse } from "next/server";

export async function GET(){
    try {
        await connect();

        const product = await products.find();

        return NextResponse.json(
            { success: true, product },
            { status : 302 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "No product found!"},
            { status : 404 },
        );
    }
}