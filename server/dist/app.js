// app.ts
import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import connect from "./db/connect.js";
dotenv.config();
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});
const PORT = process.env.PORT || 3000;
const start = async () => {
    try {
        await connect("mongodb://localhost:27017/crowdfunding");
        console.log("connected successfuly to mongodb");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.log("there was an error :" + error);
    }
};
start();
export default app;
