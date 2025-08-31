import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: String,
  price: Number,
  quantity: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled', 'paid', 'shipped', 'completed'],
    default: 'pending'
  },
  paymentInfo: {
    method: String,
    transactionId: String,
    paidAt: Date
  }
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);