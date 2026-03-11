const userService = require('../services/user.service');

exports.signup = async (req,res)=>{
  try{
    console.log(req.body);
    const user = await userService.signup(req.body);
    res.status(201).json({
      message: 'User created successfully',
      user
    });
  }catch(error){
    res.status(500).json({
      message: 'Error creating user',
      error: error.message
    })
  }
}

exports.login = async (req,res)=>{
try{
  console.log(req.body)
  const token = await userService.login(req.body);

  res.status(200).json({
    message: 'Login successful',
    token
  });
}catch(error){
  res.status(401).json({
    error: error.message
  })
}
}

exports.me = async (req,res)=>{
  console.log("Authenticated user:", req.user);2
  res.json({
    message:"Authenticated user",
    user: req.user
  })
}