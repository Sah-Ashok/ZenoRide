const userRepository = require("../repositories/user.repository");
const { hashPassword, comparePassword } = require("../utils/hash.util");

const { generateToken } = require("../utils/jwt.util");

exports.signup = async (userData) => {
  const { name, email, phone, password, role } = userData;

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    name,
    email,
    phone,
    password: hashedPassword,
    role,
  });
  console.log(user);

  return user;
};

exports.login = async ({ email, password }) => {
  const user = await userRepository.findUserByEmail(email);

  if (!user) {
    throw new Error("user not found");
  }
  
  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
  });

  return token;
};
