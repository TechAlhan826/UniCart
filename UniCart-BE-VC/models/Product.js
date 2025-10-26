import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: { type: [String], default: [] }, // array of urls
  category: { 
    type: String, 
    // enum: [
    //   'Textbooks & Study Materials',
    //   'Electronics & Gadgets',
    //   'Hostel Essentials',
    //   'Sports & Recreation',
    //   'Fashion & Accessories',
    //   'Lab Equipment',
    //   'Others'
    // ], 
    default: 'Others' 
  },
  condition: { type: String, enum: ['new', 'used'], required: true },
  stock: { type: Number, default: 1 },
  tags: { type: [String], default: [] },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'active', 'sold'], default: 'draft' },
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 }, // for popularity sort
}, { timestamps: true });

// index for fast queries
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1, createdAt: -1, views: -1 });

export default mongoose.model('Product', productSchema);