import { Router } from "express";
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


export default router;
