// what: support ticket controllers
// why: handle ticket creation, retrieval, and admin responses
// how: validate input, check permissions, send email notifications

import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import { sendTicketResponseEmail } from '../utils/emailService.js';

// Get all tickets for logged-in user
export const getUserTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id })
      .populate('respondedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    
    const enrichedTickets = tickets.map(ticket => ({
      ...ticket,
      id: ticket._id
    }));
    
    res.json({ success: true, data: { tickets: enrichedTickets } });
  } catch (err) {
    console.error('Get user tickets error:', err);
    res.status(500).json({ success: false, msg: 'Failed to fetch tickets' });
  }
};

// Get all tickets (admin only)
export const getAllTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    
    const enrichedTickets = tickets.map(ticket => ({
      ...ticket,
      id: ticket._id,
      user: ticket.userId
    }));
    
    res.json({ success: true, data: { tickets: enrichedTickets } });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({ success: false, msg: 'Failed to fetch tickets' });
  }
};

// Create new support ticket
export const createTicket = async (req, res) => {
  try {
    const { title, description, priority, attachments } = req.body;
    
    // Validate input
    if (!title || title.length < 5 || title.length > 200) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Title must be between 5 and 200 characters' 
      });
    }
    
    if (!description || description.length < 20 || description.length > 2000) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Description must be between 20 and 2000 characters' 
      });
    }
    
    if (!priority || !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Priority must be: low, medium, high, or urgent' 
      });
    }
    
    if (attachments && attachments.length > 3) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Maximum 3 attachments allowed' 
      });
    }
    
    const ticket = new SupportTicket({
      userId: req.user._id,
      title,
      description,
      priority,
      attachments: attachments || []
    });
    
    await ticket.save();
    
    res.status(201).json({
      success: true,
      data: {
        ticket: {
          id: ticket._id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt
        }
      },
      msg: 'Support ticket created successfully'
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ success: false, msg: 'Failed to create ticket' });
  }
};

// Update ticket (admin only - respond/update status)
export const updateTicket = async (req, res) => {
  try {
    const { status, response } = req.body;
    
    // Validate status if provided
    if (status && !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid status value' 
      });
    }
    
    const ticket = await SupportTicket.findById(req.params.id).populate('userId');
    
    if (!ticket) {
      return res.status(404).json({ success: false, msg: 'Ticket not found' });
    }
    
    // Update fields
    if (status) ticket.status = status;
    if (response) {
      ticket.response = response;
      ticket.respondedBy = req.user._id;
      ticket.respondedAt = new Date();
    }
    
    await ticket.save();
    
    // Send email notification if response was added
    if (response && ticket.userId) {
      try {
        await sendTicketResponseEmail(ticket.userId, ticket);
      } catch (emailErr) {
        console.error('Failed to send ticket response email:', emailErr);
      }
    }
    
    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email role')
      .lean();
    
    res.json({
      success: true,
      data: {
        ticket: {
          ...updatedTicket,
          id: updatedTicket._id
        }
      },
      msg: 'Ticket updated successfully'
    });
  } catch (err) {
    console.error('Update ticket error:', err);
    res.status(500).json({ success: false, msg: 'Failed to update ticket' });
  }
};

// Delete ticket (admin only)
export const deleteTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ success: false, msg: 'Ticket not found' });
    }
    
    res.json({ success: true, msg: 'Ticket deleted successfully' });
  } catch (err) {
    console.error('Delete ticket error:', err);
    res.status(500).json({ success: false, msg: 'Failed to delete ticket' });
  }
};
