import {drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config(); 

const connection = mysql.createPool({
    host: process.env.database_host,
    user: process.env.database_user,
    password: process.env.database_password,
    database: process.env.database_name,
    port: process.env.DB_PORT, 
    ssl: {rejectUnauthorized: false}
});

export const database = drizzle(connection);
