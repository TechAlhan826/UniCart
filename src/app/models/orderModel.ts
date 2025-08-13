import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    cartItems: Array,
    amount: String, //Number,
    status: String,
    createdAt: Date
});

// If Collection exists fetch or Create new collection with schema/data model [ without this fallback it might create duplicate collections ]
const orders = mongoose.models.Orders || mongoose.model("Orders", orderSchema);

export default orders;