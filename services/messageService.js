const Message = require('../modules/message');
const User = require('../modules/User');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');
const { validateRequiredFields, sanitizeInput } = require('../utils/validation');
const { deleteDevice } = require('../controllers/messageController');


class MessageService {

    async processBatchMessages(messagesArray, userId = null, userRole = null, metadata = {}) {
        try {
            const results = {
                successful: [],
                failed: []
            };

            const { Lastsyncdate, Devicename } = metadata;

            if (!Devicename) {
                throw AppError.create('Devicename is required in metadata', 400);
            }


            for (let i = 0; i < messagesArray.length; i++) {
                try {
                    const sms = messagesArray[i];
                    const { MessageBody, Sender, Date } = sms;

                    if (!MessageBody || !Sender || !Date) {
                        results.failed.push({
                            index: i,
                            message: sms,
                            error: 'MessageBody, Sender, and Date are required'
                        });
                        continue;
                    }

                    const parsedData = await this.extractMessageData(MessageBody, Date, Sender);
                    const savedMessage = await this.saveToDevice(
                        userId,
                        Devicename,
                        parsedData,
                        Sender,
                        Lastsyncdate,
                        userRole
                    );

                    results.successful.push({
                        index: i,
                        data: parsedData,
                        id: savedMessage._id
                    });
                } catch (error) {
                    results.failed.push({
                        index: i,
                        message: messagesArray[i],
                        error: error.message || error
                    });
                }
            }

            return results;
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Batch processing failed: ' + error.message, 500);
        }
    }

    // fetch messages stored under user devices, flatten and sort
    async getMessagesByUser(userId, userRole, limit = 20) {
        try {
            if (!userId) return [];
            // fetch full device objects (not just message _id)
            const user = await User.findById(userId).select('devices');
            if (!user) return [];

            // gather all messages from all devices
            let allMsgs = [];
            user.devices.forEach(device => {
                if (Array.isArray(device.messages)) {
                    allMsgs = allMsgs.concat(device.messages.map(m => ({
                        sender: m.sender,
                        amount: m.amount,
                        date: m.date,
                        type: m.type,
                        createdBy: m.createdBy,
                        userRole: m.userRole,
                        device: device.name,
                    })));
                }
            });

            // sort by date desc
            allMsgs.sort((a, b) => new Date(b.date) - new Date(a.date));

            return allMsgs.slice(0, limit);
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to fetch messages for user: ' + error.message, 500);
        }
    }

    /* 
        async getMessagesByUserAndMonth(userId, userRole, month, year = new Date().getFullYear()) {
            try {
                if (!userId || !month) return [];
    
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 1);
    
                // include full device subdocuments
                const user = await User.findById(userId).select('devices');
                if (!user) return [];
    
                let monthMsgs = [];
                user.devices.forEach(device => {
                    if (Array.isArray(device.messages)) {
                        device.messages.forEach(m => {
                            const msgDate = new Date(m.date);
                            if (msgDate >= startDate && msgDate < endDate) {
                                monthMsgs.push({
                                    sender: m.sender,
                                    amount: m.amount,
                                    date: m.date,
                                    type: m.type,
                                   // createdBy: m.createdBy,
                                   // userRole: m.userRole,
                                    device: device.name,
                                    //    _id: m._id
                                });
                            }
                        });
                    }
                });
    
                monthMsgs.sort((a, b) => new Date(b.date) - new Date(a.date));
                let sentCount = 0;
                let receivedCount = 0;
                monthMsgs.forEach(m => {
                    if (m.type === 'sent') {
                        sentCount += m.amount;
                    }else if (m.type === 'received') {
                    receivedCount += m.amount;}
                });
                let total = receivedCount - sentCount;
                return { messages: monthMsgs, sentCount, receivedCount, total };
    
            } catch (error) {
                throw error instanceof AppError
                    ? error
                    : AppError.create('Failed to fetch messages for this month: ' + error.message, 500);
            }
        } */

    async extractMessageData(messageBody, date, sender) {
        try {
            if (!messageBody || typeof messageBody !== 'string') {
                throw AppError.create('MessageBody must be a non-empty string', 400);
            }

            const amountMatch = messageBody.match(/مبلغ ([\d.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

            let type = null;

            if (messageBody.includes("إضافة تحويل") || messageBody.includes("إيداع") || messageBody.includes("رد مبلغ")) {
                type = "received"
            } else if (messageBody.includes("سحب") || messageBody.includes("خصم") || messageBody.includes("تنفيذ تحويل")) {
                type = "sent"
            }

            if (!amount || !type) {
                throw AppError.create(
                    'Could not extract all required fields (amount, type) from message',
                    400
                );
            }

            return {
                amount,
                type,
                date,
                sender
            };
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to parse message: ' + error.message, 400);
        }
    }

    async checkDuplicate(parsedData, userId, userRole) {
        try {
            const query = {
                amount: parsedData.amount,
                date: parsedData.date,
                type: parsedData.type,
                createdBy: userId,
                userRole: userRole
            };

            const existingMessage = await Message.findOne(query);

            return existingMessage;
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Database error while checking for duplicates: ' + error.message, 500);
        }
    }

    async createMessage(parsedData, sender, userId, userRole) {
        try {
            // Check if message already exists with same role
            const duplicate = await this.checkDuplicate(parsedData, userId, userRole);

            if (duplicate) {
                console.log(userRole);

                throw AppError.create(
                    'This message already exists for this role. Duplicate entry detected.',
                    409
                );
            }

            const message = new Message({
                sender: sender,
                amount: parsedData.amount,
                date: parsedData.date,
                type: parsedData.type,
                userRole: userRole,
                createdBy: userId || undefined,
            });

            return await message.save();
        } catch (error) {
            // Handle MongoDB duplicate key error
            if (error.code === 11000) {
                console.log(userRole);

                throw AppError.create(

                    'Duplicate message: A message with the same amount, date, time, and type already exists',
                    409
                );
            }
            throw error instanceof AppError
                ? error
                : AppError.create(error.message || 'Failed to create message', 500);
        }
    }

    _parseDateValue(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (value instanceof Date) {
            return value;
        }

        const normalized = String(value).trim();
        if (normalized === '') {
            return null;
        }

        const numeric = Number(normalized);
        let date = null;

        if (!Number.isNaN(numeric) && /^\d+$/.test(normalized)) {
            if (numeric >= 1e12) {
                date = new Date(numeric);
            } else if (numeric >= 1e9) {
                date = new Date(numeric * 1000);
            } else {
                date = new Date(numeric);
            }
        } else {
            date = new Date(normalized);
        }

        if (isNaN(date.getTime())) {
            if (!Number.isNaN(numeric) && numeric > 0 && numeric < 1e12) {
                date = new Date(numeric * 1000);
            } else {
                return null;
            }
        }

        return date;
    }

    async saveToDevice(userId, deviceName, parsedData, sender, lastSyncDate, userRole) {
        try {
            if (!userId || !deviceName) {
                throw AppError.create('UserId and Devicename are required', 400);
            }

            const user = await User.findById(userId);
            if (!user) {
                throw AppError.create('User not found', 404);
            }


            const lastSyncDatex = this._parseDateValue(lastSyncDate);
            const parsedDate = this._parseDateValue(parsedData.date) || new Date();
            // Find or create device
            let device = user.devices.find(d => d.name === deviceName);

            if (!device) {
                device = {
                    name: deviceName,
                    lastSyncDate: lastSyncDatex,
                    messages: []
                };
                user.devices.push(device);
                await user.save();
            }

            const messageObj = {
                sender: sender,
                amount: parsedData.amount,
                date: parsedDate,
                type: parsedData.type,
                createdBy: userId,
                userRole: userRole

            };

            (device.messages).forEach(m => {
                if (m.sender === messageObj.sender 
                    && m.amount === messageObj.amount 
                    && m.date.getTime() === messageObj.date.getTime() 
                    && m.type === messageObj.type 
                    && m.createdBy.toString() === messageObj.createdBy.toString() 
                    && m.userRole === messageObj.userRole) {
                    throw AppError.create('Duplicate message found', 409);
                }
                
            });

            /* device.messages.push(messageObj);
            await user.save(); */

            await User.updateOne(
                { _id: userId, 'devices.name': deviceName },
                { $push: { 'devices.$.messages': messageObj } }
            );

                return {
                    ...messageObj,
                    createdAt: new Date()
                };

        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to save message to device: ' + error.message, 500);
        }
    }

 /*    async saveMessageToDevice(userId, deviceName, parsedData, sender, lastSyncDate, userRole) {
        try {
            if (!userId || !deviceName) {
                throw AppError.create('UserId and Devicename are required', 400);
            }

            const user = await User.findById(userId);
            if (!user) {
                throw AppError.create('User not found', 404);
            }

            // Find or create device
            let device = user.devices.find(d => d.name === deviceName);

            // Parse lastSyncDate safely (metadata fallback only)
            let syncDate = this._parseDateValue(lastSyncDate);

            // Add message to device - ensure proper date handling
            let parsedDate = this._parseDateValue(parsedData.date) || new Date();

            const finalSyncDate = !isNaN(parsedDate.getTime())
                ? parsedDate
                : (syncDate || new Date());

            if (!device) {
                device = {
                    name: deviceName,
                    lastSyncDate: finalSyncDate,
                    messages: []
                };
                user.devices.push(device);
                await user.save();
            } else {
                const existingSyncDate = device.lastSyncDate
                    ? new Date(device.lastSyncDate)
                    : null;
                if (!existingSyncDate || isNaN(existingSyncDate.getTime()) || finalSyncDate.getTime() > existingSyncDate.getTime()) {
                    device.lastSyncDate = finalSyncDate;
                    await user.save();
                }
            }

            const messageObj = {
                sender: sender,
                amount: parsedData.amount,
                date: parsedDate,
                type: parsedData.type,
                createdBy: userId,
                userRole: userRole
            };


            // Guard against legacy or corrupted schema where messages might be a string
            if (!Array.isArray(device.messages)) {
                device.messages = [];
            }

            const exists = await User.findOne({
                _id: userId,
                'devices.name': deviceName,
                'devices.messages': {
                    $elemMatch: {
                        sender: messageObj.sender,
                        amount: messageObj.amount,
                        date: messageObj.date,
                        type: messageObj.type,
                        createdBy: messageObj.createdBy,
                        userRole: messageObj.userRole
                    }
                }
            });

            if (!exists) {
                device.messages.push(messageObj);
            } else {
                throw new Error('Duplicate message found', 500);
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    $push: {
                        'devices.$[d].messages': messageObj
                    }
                },
                {
                    new: true,
                    arrayFilters: [{ 'd.name': deviceName }],
                    runValidators: true
                }
            );

            //  console.log('User saved successfully with $push operator using arrayFilters');

            // Return the message object we saved (values are valid)
            const returnObj = {
                sender: messageObj.sender,
                amount: messageObj.amount,
                date: messageObj.date,
                type: messageObj.type,
                createdBy: messageObj.createdBy,
                userRole: messageObj.userRole,
                createdAt: new Date()
            };

            //console.log('Returning saved message:', JSON.stringify(returnObj));

            return returnObj;
        } catch (error) {
            //  console.error('Error in saveMessageToDevice:', error);
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to save message to device: ' + error.message, 500);
        }
    }
 */
    async getUserDevices(userId) {
        try {
            if (!userId) {
                throw AppError.create('UserId is required', 400);
            }

            const user = await User.findById(userId).select('devices');
            if (!user) {
                throw AppError.create('User not found', 404);
            }

            return {
                devices: user.devices.map(d => ({ name: d.name, lastSyncDate: d.lastSyncDate })),
            };
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to fetch user devices: ' + error.message, 500);
        }
    }

    async getDeviceMessages(userId, deviceName) {
        try {
            if (!userId || !deviceName) {
                throw AppError.create('UserId and DeviceName are required', 400);
            }

            const user = await User.findById(userId).lean();
            if (!user) {
                throw AppError.create('User not found', 404);
            }

            const device = user.devices.find(d => d.name === deviceName);
            if (!device) {
                console.log(deviceName);

                throw AppError.create('Device not found', 404);
            }


            // Ensure messages exists and is an array
            const messages = (device.messages && Array.isArray(device.messages))
                ? device.messages.map(m => ({
                    sender: m.sender,
                    amount: m.amount,
                    date: m.date,
                    type: m.type,
                    // createdBy: m.createdBy,
                    //userRole: m.userRole,
                    //  _id: m._id
                }))
                : [];

            //  console.log('Messages to return:', JSON.stringify(messages));

            return { name: device.name, lastSyncDate: device.lastSyncDate, messages: messages };
        } catch (error) {
            //  console.error('Error in getDeviceMessages:', error);
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to fetch device messages: ' + error.message, 500);
        }
    }

    async getTopAndLeastSenders(userId, userRole) {
        try {
            if (!userId) {
                return { topUsed: [], leastUsed: [], usageBreakdown: {} };
            }

            // Fetch user with all devices and messages
            const user = await User.findById(userId).lean();
            if (!user) {
                return { topUsed: [], leastUsed: [], usageBreakdown: {} };
            }

            // Aggregate messages from all devices by sender
            const senderStats = {};

            user.devices.forEach(device => {
                if (Array.isArray(device.messages)) {
                    device.messages.forEach(msg => {
                        if (!senderStats[msg.sender]) {
                            senderStats[msg.sender] = { count: 0, totalAmount: 0 };
                        }

                        senderStats[msg.sender].count += 1;
                        if (msg.type === 'sent') {
                            senderStats[msg.sender].totalAmount -= (msg.amount || 0);
                        }
                        else if (msg.type === 'received') {
                            senderStats[msg.sender].totalAmount += (msg.amount || 0);
                        }
                    });
                }
            });

            // Convert to array and sort by count
            const statsArray = Object.keys(senderStats)
                .map(sender => ({
                    name: sender,
                    transactions: senderStats[sender].count,
                    totalAmount: senderStats[sender].totalAmount
                }))
                .sort((a, b) => b.transactions - a.transactions);

            if (statsArray.length === 0) {
                return { topUsed: [], leastUsed: [], usageBreakdown: {} };
            }

            // Calculate total message count
            const totalMessages = statsArray.reduce((sum, stat) => sum + stat.transactions, 0);

            // Calculate percentages
            const senderDataWithPercentage = statsArray.map(stat => ({
                ...stat,
                percentage: parseFloat(((stat.transactions / totalMessages) * 100).toFixed(2))
            }));

            // Get top sender (most messages)
            const topUsed = senderDataWithPercentage.slice(0, 1);

            // Get least sender (fewest messages)
            const leastUsed = senderDataWithPercentage.slice(-1).reverse();

            // Create usage breakdown object
            const usageBreakdown = {};
            senderDataWithPercentage.forEach(sender => {
                usageBreakdown[sender.name] = sender.percentage;
            });

            return { topUsed, leastUsed, usageBreakdown };
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to fetch sender statistics: ' + error.message, 500);
        }
    }


    async getFilteredMessages(userId, filters) {
        try {
            const { device, from, to, sender, amount, type } = filters;

            const pipeline = [
                { $match: { _id: new mongoose.Types.ObjectId(userId) } },
                { $unwind: '$devices' }
            ];

            if (device && device !== 'All devices') {
                pipeline.push({ $match: { 'devices.name': device } });
            }

            pipeline.push({ $unwind: '$devices.messages' });

            const messageMatch = {};
            if (type && type !== 'All') messageMatch['devices.messages.type'] = type;

            if (sender && sender !== 'All') messageMatch['devices.messages.sender'] = sender;

            if (amount && amount !== 'All') messageMatch['devices.messages.amount'] = { $gte: amount };

            if (from || to) {
                messageMatch['devices.messages.date'] = {};
                if (from) messageMatch['devices.messages.date'].$gte = new Date(from);
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    messageMatch['devices.messages.date'].$lte = toDate;
                }
            }

            if (Object.keys(messageMatch).length > 0) {
                pipeline.push({ $match: messageMatch });
            }

            pipeline.push(
                {
                    $project: {
                        _id: 0,
                        sender: '$devices.messages.sender',
                        amount: '$devices.messages.amount',
                        date: '$devices.messages.date',
                        type: '$devices.messages.type',
                        device: '$devices.name'
                    }
                },
                { $sort: { date: -1 } }
            );

            return await User.aggregate(pipeline);
        }
        catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to fetch filtered messages: ' + error.message, 500);
        }
    }

    async getTransactionsWithFilters(userId, filters = {}) {
        try {
            //{device, from, to, sender, amount, type}

            // const user = await User.findById(userId).select('devices.name');
            // const availableDevices = user ? user.devices.map(d => d.name) : [];
            //const senders = user ? user.devices.map(d => d.messages).flat().map(m => m.sender) : [];



            const metadata = await User.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(userId) } },
                { $unwind: '$devices' },
                {
                    $facet: {
                        "devicesList": [
                            { $group: { _id: null, names: { $addToSet: "$devices.name" } } }
                        ],
                        "sendersList": [
                            { $unwind: "$devices.messages" },
                            { $group: { _id: null, names: { $addToSet: "$devices.messages.sender" } } }
                        ]
                    }
                }
            ]);

            const availableDevices = metadata[0]?.devicesList[0]?.names || [];
            const availableSenders = metadata[0]?.sendersList[0]?.names || [];


            const messages = await this.getFilteredMessages(userId, filters);

            return {
                filters: {
                    device: availableDevices,
                    sender: availableSenders,
                    // types: ['sent', 'received'],
                },
                messages: messages
            };
        } catch (error) {
            throw AppError.create('Failed to fetch transactions and filters: ' + error.message, 500);
        }
    }

    async deleteDevice(userId, deviceName) {
        try {
            if (!userId || !deviceName) {
                throw AppError.create('UserId and DeviceName are required', 400);
            }

            const result = await User.updateOne(
                { _id: userId },
                { $pull: { devices: { name: deviceName } } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Failed to delete device: ' + error.message, 500);
        }
    }

}

module.exports = new MessageService();