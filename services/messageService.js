const Message = require('../modules/message');
const User = require('../modules/User');
const AppError = require('../utils/appError');

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

                    const parsedData = await this.extractMessageData(MessageBody, Date);
                    const savedMessage = await this.saveMessageToDevice(
                        userId,
                        Devicename,
                        parsedData,
                        Sender,
                        Lastsyncdate
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
            throw AppError.create('Batch processing failed: ' + error.message, 500);
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
                        ...m.toObject ? m.toObject() : m,
                        device: device.name
                    })));
                }
            });

            // sort by date desc
            allMsgs.sort((a,b) => new Date(b.date) - new Date(a.date));

            return allMsgs.slice(0, limit);
        } catch (error) {
            throw AppError.create('Failed to fetch messages for user: ' + error.message, 500);
        }
    }


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
                                ...m.toObject ? m.toObject() : m,
                                device: device.name
                            });
                        }
                    });
                }
            });

            monthMsgs.sort((a,b) => new Date(b.date) - new Date(a.date));
            return monthMsgs;

        } catch (error) {
            throw AppError.create('Failed to fetch messages for this month: ' + error.message, 500);
        }
    }
    
    async extractMessageData(messageBody, date) {
        try {
            if (!messageBody || typeof messageBody !== 'string') {
                throw AppError.create('MessageBody must be a non-empty string', 400);
            }

            const amountMatch = messageBody.match(/مبلغ ([\d.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

            let type = null;

            if (messageBody.includes("إضافة تحويل") || messageBody.includes("إيداع") || messageBody.includes("رد مبلغ")){
                type = "recieved"
            }else if(messageBody.includes("سحب") || messageBody.includes("خصم") || messageBody.includes("تنفيذ تحويل")){
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
                date
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
            throw AppError.create('Database error while checking for duplicates: ' + error.message, 500);
        }
    }

    async createMessage(parsedData, sender,userId, userRole) {
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

    async saveMessageToDevice(userId, deviceName, parsedData, sender, lastSyncDate) {
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
            
            if (!device) {
                // Create new device
                device = {
                    name: deviceName,
                    lastSyncDate: lastSyncDate ? new Date(lastSyncDate) : new Date(),
                    messages: []
                };
                user.devices.push(device);
            } else {
                // Update last sync date
                device.lastSyncDate = lastSyncDate ? new Date(lastSyncDate) : new Date();
            }

            // Add message to device - ensure proper date handling
            const messageObj = {
                sender: sender,
                amount: parsedData.amount,
                date: parsedData.date ? new Date(parsedData.date) : new Date(),
                type: parsedData.type
            };

            // Guard against legacy or corrupted schema where messages might be a string
            if (!Array.isArray(device.messages)) {
                device.messages = [];
            }

            device.messages.push(messageObj);

            // Save user with updated device
            const updatedUser = await user.save();

            // Return the saved message object with ID
            const savedDevice = updatedUser.devices.find(d => d.name === deviceName);
            const savedMessage = savedDevice.messages[savedDevice.messages.length - 1];

            return {
              //  _id: savedMessage._id,
                sender: savedMessage.sender,
                amount: savedMessage.amount,
                date: savedMessage.date,
                type: savedMessage.type,
                createdAt: savedMessage.createdAt
            };
        } catch (error) {
            throw error instanceof AppError 
                ? error 
                : AppError.create('Failed to save message to device: ' + error.message, 500);
        }
    }

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
                throw AppError.create('Device not found', 404);
            }

            // Ensure messages exists and is an array
            const messages = (device.messages && Array.isArray(device.messages))
                ? device.messages.map(m => ({
                    sender: m.sender,
                    amount: m.amount,
                    date: m.date,
                    type: m.type
                }))
                : [];

            return { name: device.name, lastSyncDate: device.lastSyncDate, messages: messages };
        } catch (error) {
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
                        senderStats[msg.sender].totalAmount += (msg.amount || 0);
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

            // Get top 5 senders (most messages)
            const topUsed = senderDataWithPercentage.slice(0, 5);

            // Get least 5 senders (fewest messages)
            const leastUsed = senderDataWithPercentage.slice(-5).reverse();

            // Create usage breakdown object
            const usageBreakdown = {};
            senderDataWithPercentage.forEach(sender => {
                usageBreakdown[sender.name] = sender.percentage;
            });

            return { topUsed, leastUsed, usageBreakdown };
        } catch (error) {
            throw AppError.create('Failed to fetch sender statistics: ' + error.message, 500);
        }
    }
}

module.exports = new MessageService();