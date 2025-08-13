/* eslint-disable */
// eslint-disable no-alert, no-console
import { connect } from "@/app/dbConfig/dbConfig";
import products from "@/app/models/productModel";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
    try {
        const prod: product = await req.json();

        console.log(prod);
        console.table(prod);

        await connect();

        products.create(prod);

        return NextResponse.json(
            { success: true, message: "Product Successfully Created"},
            { status : 201 }
        );
    } catch (error) {
        return NextResponse.json(
            //"Unable to create product!"
            { success: false, error: "Unable to create product!"},
            { status : 500 },
        );
    }
}