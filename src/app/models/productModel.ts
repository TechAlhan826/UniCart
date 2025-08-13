import mongoose from "mongoose";

const productSchema = new mongoose.Schema<product>({
    id: String,
    title: String,
    description: String,
    image: String,
    category: String,
    price: Number
});

// If Collection exists fetch or Create new collection with schema/data model [ without this fallback it might create duplicate collections ]
const products = mongoose.models.Products || mongoose.model("Products", productSchema);

export default products;