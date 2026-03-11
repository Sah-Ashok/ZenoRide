const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const registerSocket = require("./src/sockets/index").registerSocket;

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const userRoutes = require("./src/routes/user.routes");
const rideRoutes = require("./src/routes/rides.routes");
const driverRoutes = require("./src/routes/driver.routes");
const errorHandler = require("./src/middleware/errorHandler");
const cors = require("cors");

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*" },
});

registerSocket(io);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/auth", userRoutes);
app.use("/rides", rideRoutes);
app.use("/driver", driverRoutes);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
