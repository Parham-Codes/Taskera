import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { server } from "./app.js";
import connectDB from "./config/db.js";

// Ensure .env is resolved even when executed outside server/ directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

connectDB();

const PORT = process.env.PORT || 7000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
