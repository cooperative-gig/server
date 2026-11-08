import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
    console.log(`Cooperative Gig API running on port ${env.PORT}`);
});

export default server;
