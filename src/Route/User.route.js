const express=require('express');
const router=express.Router();
const otpGenerator = require('otp-generator');
const User=require('../Model/User.Model');
const nodemailer = require('nodemailer');
const bcrypt=require('bcrypt');
const { fail } = require('assert');
const crypto = require('crypto');

// GETTING ALL THE USERS

// Add this at the end of your existing code
router.get('/get-all-users', async (req, res) => {
    try {
        // Retrieve all users from the database
        const allUsers = await User.find();

        res.json({
            status: 'SUCCESS',
            message: 'All users retrieved successfully.',
            data: allUsers,
        });
    } catch (err) {
        console.error('Error in get-all-users endpoint:', err);
        res.json({
            status: 'FAILED',
            message: 'An error occurred while fetching all users.',
        });
    }
});



router.post('/signup', (req, res) => {
    let { name, email, password } = req.body;
  
    // Safely check if the fields are undefined or null before trimming
    if (name && email && password) {
      name = name.trim();
      email = email.trim();
      password = password.trim();
    } else {
      return res.json({
        status: "Failed",
        message: "Empty input fields!"
      });
    }
  
    // Check if the fields are still empty after trimming
    if (name === "" || email === "" || password === "") {
      return res.json({
        status: "Failed",
        message: "Empty input fields!"
      });
    }
  
    // Validate the email format
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.json({
        status: "Failed",
        message: "Invalid email entered"
      });
    }
  
    // Check password length
    if (password.length < 8) {
      return res.json({
        status: "Failed",
        message: "Password is too short!"
      });
    }
  
    // Check if the email already exists in the database
    User.find({ email }).then(result => {
      if (result.length) {
        return res.json({
          status: "Failed",
          message: "User with provided email already exists"
        });
      } else {
        // Hash the password and create a new user
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds).then(hashedPassword => {
          const newUser = new User({
            name,
            email,
            password: hashedPassword,
          });
          
          newUser.save().then(result => {
            return res.json({
              status: "SUCCESS",
              message: "Signup successful",
              data: result,
            });
          }).catch(err => {
            return res.json({
              status: "Failed",
              message: "An error occurred while saving user account!"
            });
          });
        }).catch(err => {
          return res.json({
            status: "Failed",
            message: "An error occurred while hashing password!"
          });
        });
      }
    }).catch(err => {
      console.log(err);
      return res.json({
        status: "Failed",
        message: "An error occurred while checking for existing user"
      });
    });
  });
  

router.post('/signin', async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.trim();
        password = password.trim();

        if (email == "" || password == "") {
            res.json({
                status: "FAILED",
                message: "Empty credentials supplied"
            });
        } else {
            const data = await User.find({ email });

            if (data.length > 0) {
                const hashedPassword = data[0].password;
                const result = await bcrypt.compare(password, hashedPassword);

                if (result) {
                    res.json({
                        status: "SUCCESS",
                        message: "Sign successful",
                        data: data
                    });
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Invalid password entered!"
                    });
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid credentials entered!"
                });
            }
        }
    } catch (err) {
        res.json({
            status: "FAILED",
            message: "An error occurred: " + err.message
        });
    }
});


function generateResetToken() {
    return crypto.randomBytes(32).toString('hex'); // Generates a random token
}



// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER, // Your email (use environment variables to store credentials)
        pass: process.env.MAIL_PASS  // Your email password or App password
    }
});



router.post('/forget-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'No user found with this email.'
            });
        }

        // Generate a reset token
        const resetToken = generateResetToken();

        // Update user's resetToken in the database
        await User.findOneAndUpdate({ email }, { $set: { resetToken } });

        // Create the reset link with the token
        const resetLink = `http://your-reset-website.com/reset-password?token=${encodeURIComponent(resetToken)}`;

        // Setup email options
        const mailOptions = {
            from: 'sujitkymar101@gmail.com', // Your email
            to: email,
            subject: 'Password Reset',
            text: `Click on the following link to reset your password: ${resetLink}`
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        console.log('Password reset link sent to:', email);

        res.json({
            status: 'SUCCESS',
            message: 'Password reset link sent to your email.'
        });
    } catch (err) {
        console.error('Error in forget-password endpoint:', err);
        res.json({
            status: 'FAILED',
            message: 'An error occurred while processing your request.',
            error: err.message
        });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        console.log('Received reset-password request:', { email, token });

        // Validate the reset token
        const user = await User.findOne({
            email: { $regex: new RegExp(email, 'i') },
            resetToken: token
        });

        console.log('Found User:', user);

        if (!user) {
            console.log('Invalid or expired reset token.');
            return res.json({
                status: 'FAILED',
                message: 'Invalid or expired reset token.'
            });
        }

        // Check token expiration
        const tokenExpiry = parseInt(token.substr(-1), 36); // Extract expiry from token
        if (Date.now() > tokenExpiry) {
            console.log('Reset token has expired.');
            return res.json({
                status: 'FAILED',
                message: 'Reset token has expired.'
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and resetToken
        await User.findOneAndUpdate({ email }, { $set: { password: hashedPassword, resetToken: null } });

        console.log('Password reset successful for:', email);
        res.json({
            status: 'SUCCESS',
            message: 'Password reset successful.'
        });
    } catch (err) {
        console.error('Error in reset-password endpoint:', err);
        res.json({
            status: 'FAILED',
            message: 'An error occurred while resetting your password.'
        });
    }
});

module.exports=router;