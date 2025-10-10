const express = require('express');
const router = express.Router();

const User = require('./../modules/User');
const bcrypt = require('bcrypt');

const UserVerification = require('./../modules/UserVerification');

const nodemailer = require("nodemailer");

const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const path = require("path");

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

transporter.verify((error, success) => {
    if (error) console.log("\n", error, "\n");
    else console.log(success);
})

//SignUp
router.post('/signup', (req, res) => {
    let { name, email, password } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();

    if (name == "" || email == "" || password == "") {
        res.status(401).json({
            status: "FAILED",
            message: "Empty fields (signup)!"
        });
    } else if (!/^[a-zA-Z ]/.test(name)) {
        res.status(401).json({
            status: "FAILED",
            message: "Invalid name entered"
        })
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/.test(email)) {
        res.status(401).json({
            status: "FAILED",
            message: "Invalid email entered"
        })
    } else if (password.length < 8) {
        res.status(401).json({
            status: "FAILED",
            message: "Password less than 8 numbers"
        })
    } else {//ntaaked lw l email mawgod already
        User.find({ email }).then(result => {
            if (result.length) {
                res.status(401).json({
                    status: "FAILED",
                    message: "User already exists"
                })
            } else {
                //new user
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds)
                    .then(hashedPassword => {

                        const newUser = new User({
                            name,
                            email,
                            password: hashedPassword,
                            verified: false
                        });
                        newUser
                            .save().then(result => {
                                sendVerificationEmail(result, res);
                            }).catch(err => {
                                res.status(400).json({
                                    status: "FAILED",
                                    message: "An error occurred signing up"
                                })
                            })
                    }).catch(err => {
                        res.status(400).json({
                            status: "FAILED",
                            message: "An error occurred hashing password"
                        })
                    })
            }
        }).catch(err => {
            console.log(err);
            res.status(400).json({
                status: "FAILED",
                message: "An error occurred finding the existing user"
            })
        })
    }

})

//Send verification mail
const sendVerificationEmail = ({ _id, email }, res) => {
    const URL = "http://localhost:5000/";
    const uniqueString = uuidv4() + _id;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify your email",
        html: `<p>Verify your Email address to complete the signup and login into your account.</p>
       <p>This link <b>expires in 1 hour</b>.</p>
       <p>Press <a href="${URL}user/verify/${_id}/${uniqueString}">here</a> to proceed</p>`
    };

    const saltRounds = 10;
    bcrypt.hash(uniqueString, saltRounds)
        .then((hashedPassword) => {
            const newVerification = new UserVerification({
                Id: _id,
                uniqueString: hashedPassword,
                createdAt: Date.now(),
                expiresAt: Date.now() + 3600000
            });
            newVerification
                .save()
                .then(() => {
                    transporter
                        .sendMail(mailOptions)
                        .then(() => {
                            res.status(202).json({
                                status: "PENDING",
                                message: "Verification email sent!"
                            })
                        })
                        .catch((error) => {
                            console.log(error);

                            res.status(400).json({
                                status: "FAILED",
                                message: "Verification email failed"
                            })
                        })
                })
                .catch((error) => {
                    res.status(400).json({
                        status: "FAILED",
                        message: "Couldn't save verification email data"
                    })
                })
        }).catch(() => {
            res.status(400).json({
                status: "FAILED",
                message: "An error occurred while hashing email data"
            })
        })
};

//Verify email
router.get("/verify/:Id/:uniqueString", (req, res) => {
    let { Id, uniqueString } = req.params;

    UserVerification
        .find({ Id })
        .then((result) => {
            if (result.length > 0) {
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;
                if (expiresAt < Date.now()) {
                    UserVerification.deleteOne({ Id })
                        .then(result => {
                            User.deleteOne({ _id: Id })
                                .then(() => {
                                    let message = "Link has expired. Please sign up again";
                                    UserVerification.deleteOne({ Id })
                                    User.deleteOne({ _id: Id })
                                    res.redirect(`/user/verified?error=true&message=${message}`);

                                })
                                .catch(error => {
                                    let message = "Clearing user with expired unique string failed";
                                    res.redirect(`/user/verified?error=true&message=${message}`);

                                })
                        })
                        .catch((error) => {
                            console.log(error);
                            let message = "An error occurred while clearing expired user verification record";
                            res.redirect(`/user/verified?error=true&message=${message}`);
                        })
                } else {
                    bcrypt.compare(uniqueString, hashedUniqueString)
                        .then(result => {
                            if (result) {
                                User.updateOne({ _id: Id }, { verified: true })
                                    .then(() => {
                                        UserVerification.deleteOne({ Id })
                                            .then(() => {
                                                res.sendFile(path.join(__dirname, "./../views/verified.html"));
                                            })
                                            .catch(error => {
                                                console.log(error);
                                                let message = "An error occurred while finalizing verification ";
                                                UserVerification.deleteOne({ Id })
                                                User.deleteOne({ _id: Id })

                                                res.redirect(`/user/verified?error=true&message=${message}`);

                                            })
                                    })
                                    .catch(error => {
                                        console.log(error);
                                        let message = "An error occurred while updating user record ";
                                        UserVerification.deleteOne({ Id })
                                        User.deleteOne({ _id: Id })

                                        res.redirect(`/user/verified?error=true&message=${message}`);


                                    })
                            } else {
                                let message = "Invalid verification details passed. check your inbox.";
                                UserVerification.deleteOne({ _Id });
                                User.deleteOne({ _Id: Id });
                                res.redirect(`/user/verified?error=true&message=${message}`);

                            }
                        })
                        .catch(error => {
                            let message = "An Error occurred while compairing unique string";
                            UserVerification.deleteOne({ _Id });
                            User.deleteOne({ _Id: Id });
                            res.redirect(`/user/verified?error=true&message=${message}`);

                        })
                }

            } else {
                // user verification record doesn't exist
                let message = "Account record doesn't exist or has been verified already. Please sign up or log in.";
                res.redirect(`/user/verified?error=true&message=${message}`);
            }
        })
        .catch((error) => {
            console.log(error);
            let message = "An error occurred while checking for existing user verification record";
            res.redirect(`/user/verified?error=true&message=${message}`);
        })
});

router.get("/verified", (req, res) => {
    res.sendFile(path.join(__dirname, "./../views/verified.html"));
})

//SignIn
router.post('/signin', (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();
    if (email == "" || password == "") {
        res.status(401).json({
            status: "FAILED",
            message: "Empty fields (signin)!"
        });
    } else {
        User.find({ email })
            .then(data => {
                if (data.length) {

                    if (!data[0].verified) {
                        res.json({
                            status: "FAILED",
                            message: "Email hasn't been verified yet. check your inbox"
                        })
                    }

                    const hashedPassword = data[0].password;
                    bcrypt.compare(password, hashedPassword).then(result => {
                        if (result) {
                            res.status(200).json({
                                status: "SUCCESS",
                                message: "signin successfully",
                                data: data
                            })
                        } else {
                            res.status(401).json({
                                status: "FAILED",
                                message: "Wrong Password!"
                            })
                        }
                    })
                        .catch(err => {
                            res.status(400).json({
                                status: "FAILED",
                                message: "An Error Occurred signing in"
                            })
                        })
                } else {
                    res.status(401).json({
                        status: "FAILED",
                        message: "Invalid credentials entered!"
                    })
                }
            })
            .catch(err => {
                res.status(400).json({
                    status: "FAILED",
                    message: "An error occurred while checking the existing user"
                })
            })
    }

})

module.exports = router;