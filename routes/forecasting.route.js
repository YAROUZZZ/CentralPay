const express = require("express");
const router = express.Router();
const User = require("../modules/User.js");
const axios = require("axios");
const authenticate = require("../middleware/auth");
const AppError = require("../utils/appError");
const multer = require("multer");
const { findUserById } = require("../utils/database");

router.post("/forecast", authenticate, async (req, res) => {
    try {
        let sentSMS = [];
        let receivedSMS = [];
        let s = 0;
        let r = 0;
        const userId = req.currentUser.userId;
        // console.log(userId);

        const user = await findUserById(userId);
        //console.log(user);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        (user.devices).forEach(device => {
            device.messages.forEach(message => {
                let messageObj = {
                    Time: message.date,
                    Amount: message.amount,
                    tx_count: 1
                    //Type: message.type,
                    //Payment_method: message.sender
                };
                if (message.type === "sent") {
                    sentSMS.push(messageObj);
                    s++;
                } else if (message.type === "received") {
                    receivedSMS.push(messageObj);
                    r++;
                }
            });
        });

        const sent_response = await axios.post(
            "https://dinaghadeer-aml-forecasting.hf.space/forecast/send",
            {
                history: sentSMS
            }
        );

        const received_response = await axios.post(
            "https://dinaghadeer-aml-forecasting.hf.space/forecast/receive",
            {
                history: receivedSMS
            }
        );

        res.json({
            sent: sent_response.data,
            received: received_response.data,
            sent_count: s,
            received_count: r
        });

    } catch (err) {
        const error = new AppError(err.message, 500);
        console.log(JSON.stringify(err.response.data, null, 2));

        res.status(error.statusCode).json({
            message: error.message
        });
    }
});


module.exports = router;
