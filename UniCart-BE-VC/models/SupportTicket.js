// what: support ticket schema
// why: track user support requests and admin responses
// how: ref user, store ticket details, status tracking

import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    minlength: 5,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    minlength: 20,
    maxlength: 2000
  },
  status: { 
    type: String, 
    enum: ['open', 'in-progress', 'resolved', 'closed'], 
    default: 'open' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    required: true,
    default: 'medium'
  },
  attachments: [{ 
    type: String 
  }],
  response: { 
    type: String 
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  respondedAt: {
    type: Date
  }
}, { timestamps: true });

// Add index for faster queries
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
