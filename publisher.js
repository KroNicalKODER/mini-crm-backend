import express from 'express';
import dotenv from 'dotenv';
import { connect, StringCodec } from 'nats';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import cors from 'cors';

import Customer from './Model/Customer.js';
import Campaign from './Model/Campaign.js';

const app = express();
dotenv.config();
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json());
const PORT = 8800;

let nc;

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

// API to ingest customer data
app.post('/api/customers', async (req, res) => {
    try {
        const message = {
            id: uuidv4(),
            type: 'customer',
            data: req.body,
            timestamp: new Date()
        };

        const sc = StringCodec();
        nc.publish('data.ingest', sc.encode(JSON.stringify(message)));
        res.status(200).json({ message: 'Customer data received and being processed' });
    } catch (error) {
        console.error('Error publishing customer data:', error);
        res.status(500).json({ error: 'An error occurred while processing customer data' });
    }
});

// API to ingest order data
app.post('/api/orders', async (req, res) => {
    try {
        const message = {
          id: uuidv4(),
          type: 'order',
          data: req.body,
          timestamp: new Date()
        };

        const sc = StringCodec();
        nc.publish('data.ingest2', sc.encode(JSON.stringify(message)));
        res.status(200).json({ message: 'Order data received and being processed on data.ingest2' });
    } catch (error) {
        console.error('Error publishing order data:', error);
        res.status(500).json({ error: 'An error occurred while processing order data' });
    }
});

// API to ingest campaigns
app.post('/api/campaign', async (req,res) => {
  try {
    const message = {
      type: 'campaign',
      data: req.body,
      timestamp: new Date()
    }

    const sc = StringCodec();
    nc.publish('data.ingest', sc.encode(JSON.stringify(message)));
    res.status(200).json({message: 'New campaign will be formed soon'})
  } catch (error) {
    console.error('Error making a new campaign: ', error);
    res.status(500).json({error: 'An Error Occured in making a new campaign'})
  }
})

// API TO SEND EMAIL IN CAMPAIGNS
app.post('/api/campaign/email', async (req,res) => {
  try {
    const message = {
      type: 'campaign-email',
      data: req.body,
      timestamp: new Date()
    }

    const sc = StringCodec();
    nc.publish('data.ingest2', sc.encode(JSON.stringify(message)));
    res.status(200).json({message: 'Emails will be send soon'})
  } catch (error) {
    console.error('Error making a new campaign: ', error);
    res.status(500).json({error: 'An Error Occured in making a new campaign'})
  }
})

//GET CAMPAIGN BY EMAIL ID
app.get('/api/campaign', async (req,res) => {
  try {
    const {email} = req.query;
    const campaign = await Campaign.find({email}).sort({ createdAt: -1 })
    res.status(200).json({campaign})
  } catch (error) {
    console.error('Error getting campaign by email: ', error);
    res.status(500).json({message: 'Some error occured', error: error})
  }
})

//API to get audience
app.post('/api/customers/filter', async (req, res) => {
    const { minTotalSpend, maxTotalSpend, minVisits, maxVisits, startDate, endDate, op1, op2, op3 } = req.body;
  
    // Prepare the conditions for each filter
    const conditions = [];
  
    if (minTotalSpend || maxTotalSpend) {
      const spendCondition = {};
      if (minTotalSpend) spendCondition.$gte = parseFloat(minTotalSpend);
      if (maxTotalSpend) spendCondition.$lte = parseFloat(maxTotalSpend);
      conditions.push({ totalSpends: spendCondition });
    }
  
    if (minVisits || maxVisits) {
      const visitsCondition = {};
      if (minVisits) visitsCondition.$gte = parseInt(minVisits);
      if (maxVisits) visitsCondition.$lte = parseInt(maxVisits);
      conditions.push({ visits: visitsCondition });
    }
  
    if (startDate && endDate) {
      conditions.push({ lastVisit: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }
  
    // Combine the conditions with the specified operators
    let query = [];
    if (conditions.length > 0) {
      query.push(conditions[0]);
  
      if (conditions.length > 1) {
        if (op1 === 'And') {
          query = [{ $and: [query.pop(), conditions[1]] }];
        } else {
          query = [{ $or: [query.pop(), conditions[1]] }];
        }
      }
  
      if (conditions.length > 2) {
        if (op2 === 'And') {
          query = [{ $and: [query.pop(), conditions[2]] }];
        } else {
          query = [{ $or: [query.pop(), conditions[2]] }];
        }
      }
  
      if (conditions.length > 3) {
        if (op3 === 'And') {
          query = [{ $and: [query.pop(), conditions[3]] }];
        } else {
          query = [{ $or: [query.pop(), conditions[3]] }];
        }
      }
    }
  
    try {
      const customers = await Customer.find(query.length > 0 ? { $and: query } : {});
      res.json({data: customers, query: query});
    } catch (error) {
      res.status(500).json({ error: 'Error fetching data' });
    }
  });
  

const connectToNATS = async () => {
    try {
        nc = await connect({ servers: 'nats://localhost:4222' });
        console.log("[PUB-SUB] Connected to NATS");
    } catch (err) {
        console.error("Error connecting to NATS:", err);
    }
};

app.listen(PORT, () => {
    connectToNATS();
    connectToMongo();
    console.log("[LISTENING] Server is listening on port", PORT);
});
