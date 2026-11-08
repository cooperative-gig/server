import { env } from "../config/env.js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE URL is Missing");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
