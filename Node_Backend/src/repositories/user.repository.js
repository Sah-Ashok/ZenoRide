const pool = require("../config/db");

exports.createUser = async ({name, email, phone, password, role}) => {
  const query =
    "INSERT INTO users(name, email,phone ,  password_hash, role) VALUES ($1, $2, $3 , $4 , $5) RETURNING *";

  const values = [name, email, phone, password, role];

  const result = await pool.query(query, values);

  return result.rows[0];
};


exports.findUserByEmail = async (email) => {

  const query = "SELECT * FROM users WHERE email = $1";

  const result = await pool.query(query,[email]);
 
  return result.rows[0];

  
}


