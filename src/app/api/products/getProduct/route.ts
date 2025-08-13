/* eslint-disable */
import { connect } from "@/app/dbConfig/dbConfig";
import products from "@/app/models/productModel";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest){
    try {
        const id = req.nextUrl.searchParams.get("id");

        await connect();

        const product = await products.findOne({ id });

        return NextResponse.json(
            { success: true, product },
            { status : 302 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Product not found!"},
            { status : 404 },
        );
    }
}