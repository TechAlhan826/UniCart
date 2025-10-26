// what: admin seller logic
// why: list and approve
// how: find/update users with role seller

import User from '../models/User.js';

export const getSellers = async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' }).select('name email isVerified rating profile createdAt');
    res.json({ success: true, data: sellers });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const approveSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    
    seller.isVerified = true;
    await seller.save();
    
    res.json({ success: true, message: 'Seller approved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};