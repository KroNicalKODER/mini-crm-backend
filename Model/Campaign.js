import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
    customerIds: {
        type: [{
            customer_id: String,
            customer_email: String,
            mail_status: Boolean
        }]
    },
    email:{
        type: String,
        required: true
    }
},{
    timestamps: true
}
)

export default mongoose.model('campaign', campaignSchema)