import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    totalSpends: {
        type: Number,
        required: true
    },
    lastVisit: {
        type: Date,
        required: true
    },
    visits: {
        type: Number,
        required: true
    }
},{
    timestamps: true
})

export default mongoose.model('customer', customerSchema)