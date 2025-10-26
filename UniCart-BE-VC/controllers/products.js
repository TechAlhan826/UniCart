import Product from '../models/Product.js';
import User from '../models/User.js';

export const getProducts = async (req, res) => {
  const { q, category, minPrice, maxPrice, condition, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 12, sellerId } = req.query;
  
  try {
    const filters = { status: 'active' };
    
    if (sellerId === 'me' && req.user) {
      filters.sellerId = req.user._id;
      delete filters.status;
    } else if (sellerId && sellerId !== 'me') {
      filters.sellerId = sellerId;
    }
    
    if (q) filters.$text = { $search: q };
    if (category) filters.category = category;
    if (minPrice) filters.price = { ...filters.price, $gte: Number(minPrice) };
    if (maxPrice) filters.price = { ...filters.price, $lte: Number(maxPrice) };
    if (condition) filters.condition = condition;

    const sort = {};
    if (sortBy === 'price') sort.price = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'date') sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'popularity') sort.views = sortOrder === 'asc' ? 1 : -1;
    else sort.createdAt = -1;

    const skip = (Number(page) - 1) * Number(limit);
    
    const products = await Product.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('sellerId', 'name isVerified rating profile');

    const total = await Product.countDocuments(filters);
    const totalPages = Math.ceil(total / Number(limit));
    
    const items = products.map(p => ({
      id: p._id,
      title: p.title,
      description: p.description,
      price: p.price,
      images: p.images,
      category: p.category,
      condition: p.condition,
      stock: p.stock,
      sellerId: p.sellerId._id,
      seller: {
        id: p.sellerId._id,
        name: p.sellerId.name,
        isVerified: p.sellerId.isVerified,
        rating: p.sellerId.rating
      },
      featured: p.featured,
      status: p.status,
      tags: p.tags,
      views: p.views,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit), totalPages } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'name isVerified rating profile');
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    product.views += 1;
    await product.save();
    
    const data = {
      id: product._id,
      title: product.title,
      description: product.description,
      price: product.price,
      images: product.images,
      category: product.category,
      condition: product.condition,
      stock: product.stock,
      sellerId: product.sellerId._id,
      seller: {
        id: product.sellerId._id,
        name: product.sellerId.name,
        isVerified: product.sellerId.isVerified,
        rating: product.sellerId.rating
      },
      featured: product.featured,
      status: product.status,
      tags: product.tags,
      views: product.views,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
    
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const createProduct = async (req, res) => {
  const { title, description, price, images, category, condition, stock, tags } = req.body;
  
  try {
    if (!title || !description || !price || !condition) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    if (price < 0) {
      return res.status(400).json({ success: false, error: 'Price cannot be negative' });
    }
    
    if (stock && stock < 0) {
      return res.status(400).json({ success: false, error: 'Stock cannot be negative' });
    }
    
    const validCategories = ['Textbooks & Study Materials', 'Electronics & Gadgets', 'Hostel Essentials', 'Sports & Recreation', 'Fashion & Accessories', 'Lab Equipment', 'Others'];
    
    // if (category && !validCategories.includes(category.toLowerCase())) {
    //   return res.status(400).json({ success: false, error: 'Invalid category' });
    // }
    
    const product = new Product({
      title,
      description,
      price,
      images: images || [],
      category: category || 'Others',
      condition,
      stock: stock || 1,
      tags: tags || [],
      sellerId: req.user._id,
      status: 'active'
    });
    
    await product.save();
    
    const populated = await Product.findById(product._id).populate('sellerId', 'name isVerified rating');
    
    res.json({ success: true, data: populated, message: 'Product created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

export const updateProduct = async (req, res) => {
  const { status, ...updates } = req.body;
  
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const isOwner = product.sellerId.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this product' });
    }
    
    if (status) {
      const validTransitions = { draft: ['active'], active: ['sold'], sold: [] };
      
      if (!validTransitions[product.status]?.includes(status)) {
        return res.status(400).json({ success: false, error: `Cannot change status from ${product.status} to ${status}` });
      }
      
      product.status = status;
    }
    
    // if (updates.category) {
    //   const validCategories = ['Textbooks & Study Materials', 'Electronics & Gadgets', 'Hostel Essentials', 'Sports & Recreation', 'Fashion & Accessories', 'Lab Equipment', 'Others'];
      
    //   if (!validCategories.includes(updates.category)) {
    //     return res.status(400).json({ success: false, error: 'Invalid category' });
    //   }
    // }
    
    if (updates.price !== undefined && updates.price < 0) {
      return res.status(400).json({ success: false, error: 'Price cannot be negative' });
    }
    
    if (updates.stock !== undefined && updates.stock < 0) {
      return res.status(400).json({ success: false, error: 'Stock cannot be negative' });
    }
    
    Object.assign(product, updates);
    await product.save();
    
    const populated = await Product.findById(product._id).populate('sellerId', 'name isVerified rating');
    
    res.json({ success: true, data: populated, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const isOwner = product.sellerId.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this product' });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
