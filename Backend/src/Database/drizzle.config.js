import { defineConfig } from 'drizzle-kit';
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
    schema: "./schema.js",
    out: "./drizzle",
    dialect: "mysql",
    dbCredentials: { 
        host: process.env.database_host,
        user: process.env.database_user,
        password: process.env.database_password,
        database: "Capstone_project",
    },
});