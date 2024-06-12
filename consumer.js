import mongoose from 'mongoose';
import { connect, StringCodec } from 'nats';
import Customer from './Model/Customer.js';
import Order from './Model/Order.js';
import Campaign from './Model/Campaign.js';
import dotenv from 'dotenv';

dotenv.config();

const connectToMongo = async () => {
    try {
        mongoose.connect(process.env.MONGO_URI).then(()=>{
            console.log("Connected to Database")
        }).catch((err)=>{
            throw err
        })
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }
};

const validateCustomerData = (data) => {
    const { name, email, totalSpends, lastVisit, visits } = data;

    if (!name || !email || totalSpends === undefined || !lastVisit || visits === undefined) {
        throw new Error('Invalid customer data: All fields are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        throw new Error('Invalid customer data: Invalid email format');
    }
};

const validateCampaignData = (data) => {
    const {email} = data;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        throw new Error('Invalid customer data: Invalid email format');
    }
}

const validateOrderData = (data) => {
    const { customerId, amount, date } = data;
    if (!customerId || amount === undefined || !date) {
        throw new Error('Invalid order data: All fields are required');
    }
};

const startConsumer = async () => {
    await connectToMongo();

    const nc = await connect({ servers: 'nats://localhost:4222' });
    console.log("[PUB-SUB] Connected to NATS as Consumer");

    const sc = StringCodec();

    // Subscribe to data.ingest
    const sub1 = nc.subscribe('data.ingest');
    (async () => {
        for await (const msg of sub1) {
            const message = JSON.parse(sc.decode(msg.data));
            try {
                if (message.type === 'customer') {
                    validateCustomerData(message.data);
                    const newCustomer = new Customer(message.data);
                    await newCustomer.save();
                    console.log('Customer data saved successfully.');
                } else if(message.type === 'campaign'){
                    validateCampaignData(message.data)
                    const newCampaignData = new Campaign(message.data);
                    const saved_campaign = await newCampaignData.save();

                    const response = await fetch(
                        'http://localhost:8800/api/campaign/email',{
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(saved_campaign),
                        }
                    )
                    const data = await response.json();
                    console.log('New Campaign Saved', data);
                }
            } catch (err) {
                console.error('Error processing customer data:', err);
            }
        }
    })();

    // Subscribe to data.ingest2
    const sub2 = nc.subscribe('data.ingest2');
    (async () => {
        for await (const msg of sub2) {
            const message = JSON.parse(sc.decode(msg.data));
            try {
                if (message.type === 'order') {
                    validateOrderData(message.data);
                    const newOrder = new Order(message.data);
                    await newOrder.save();
                    console.log('Order data saved successfully from data.ingest2.');
                } else if(message.type === "campaign-email"){
                    const data = message.data;
                    const campaign_id = message.data._id;
                    const campaigns = data.customerIds;
                    
                    const totalCampaigns = campaigns.length;
                    const trueCount = Math.floor(totalCampaigns * 0.9);

                    const shuffledCampaigns = campaigns.sort(() => Math.random() - 0.5);

                    const updatedCampaigns = shuffledCampaigns.map((campaign, index) => {
                        if (index < trueCount) {
                            return { ...campaign, mail_status: true };
                        } else {
                            return { ...campaign, mail_status: false };
                        }
                    });

                    const updated = await Campaign.findByIdAndUpdate(
                        campaign_id,
                        { $set: { "customerIds": updatedCampaigns } },
                        { new: true }
                    );
                    console.log('New Campaign Saved');
                }
            } catch (err) {
                console.error('Error processing order data:', err);
            }
        }
    })();
};

startConsumer();
