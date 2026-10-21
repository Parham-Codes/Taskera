import { server } from "./app.js";
import connectDB from "./config/db.js";

connectDB();

const port = 7000;

server.listen(port, () => {
  console.log("server is running on the exact port");
});
