import { Router } from "express";
import { prisma } from "../../database/prisma.js";
import { sendSuccess } from "../../shared/utils/response.js";

const router = Router();

router.get('/health', (req, res) => {
    return sendSuccess(
        res,
        'Cooperative Gig API is running',
        null,
        200,
        {
            version: 'v1',
            timestamp: new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata'
            }),
        },
    );
});

router.get('/check/db', async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(
        res,
        'Database connection is successful',
        null,
        200,
        {
            version: 'v1',
            timestamp: new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata'
            }),
        },
    );
});

export default router;
