const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET = process.env.JWT_SECRET;

function generateToken(payload) {
  console.log("Generating token with payload:", payload);
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};
