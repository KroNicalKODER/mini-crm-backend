import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import Customer from './Model/Customer.js';

dotenv.config();

// MongoDB Atlas connection string

mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("Connected to Database")
}).catch((err)=>{
    throw err
})

const seedCustomers = async () => {
    try {
        await Customer.deleteMany({}); // Clear existing data

        const customers = [];

        for (let i = 0; i < 250; i++) {
            const customer = new Customer({
                name: faker.internet.displayName(),
                email: faker.internet.email(),
                totalSpends: faker.finance.amount({min: 1000, max: 100000}),
                visits: faker.number.int({ min: 1, max: 100 }),
                lastVisit: faker.date.past()
            });

            customers.push(customer);
        }

        await Customer.insertMany(customers);
        console.log("250 customer records have been seeded to the database.");
    } catch (error) {
        console.error("Error seeding data:", error);
    } finally {
        mongoose.connection.close();
    }
};

seedCustomers();
