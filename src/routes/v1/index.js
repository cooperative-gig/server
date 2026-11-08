import { Router } from "express";
import {prisma} from "../../database/prisma.js";

const router = Router();

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Cooperative Gig API is running',
        version: 'v1',
        timestamp: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
        })
    });
});


export default router;
