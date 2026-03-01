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

                    const parsedData = await this.extractMessageData(MessageBody, Date, Sender);
                    const savedMessage = await this.saveMessageToDevice(
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
                        sender: m.sender,
                        amount: m.amount,
                        date: m.date,
                        type: m.type,
                        createdBy: m.createdBy,
                        userRole: m.userRole,
                        device: device.name,
                        _id: m._id
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
                                sender: m.sender,
                                amount: m.amount,
                                date: m.date,
                                type: m.type,
                                createdBy: m.createdBy,
                                userRole: m.userRole,
                                device: device.name,
                                _id: m._id
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
    
    async extractMessageData(messageBody, date, sender) {
        try {
            if (!messageBody || typeof messageBody !== 'string') {
                throw AppError.create('MessageBody must be a non-empty string', 400);
            }

            const amountMatch = messageBody.match(/مبلغ ([\d.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

            let type = null;

            if (messageBody.includes("إضافة تحويل") || messageBody.includes("إيداع") || messageBody.includes("رد مبلغ")){
                type = "received"
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

    async saveMessageToDevice(userId, deviceName, parsedData, sender, lastSyncDate, userRole) {
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
            
            // Parse lastSyncDate safely
            let syncDate = new Date();
            if (lastSyncDate) {
                // Try parsing as timestamp (number or string number)
                const numTimestamp = Number(lastSyncDate);
                if (!isNaN(numTimestamp) && numTimestamp > 0) {
                    syncDate = new Date(numTimestamp);
                } else {
                    // Try parsing as ISO string
                    const dateObj = new Date(lastSyncDate);
                    if (!isNaN(dateObj.getTime())) {
                        syncDate = dateObj;
                    }
                }
                
                if (isNaN(syncDate.getTime())) {
                    console.warn('⚠️ Cannot parse lastSyncDate:', lastSyncDate, 'using current date');
                    syncDate = new Date();
                }
            }
            
            if (!device) {
                // Create new device and save it first
                device = {
                    name: deviceName,
                    lastSyncDate: syncDate,
                    messages: []
                };
                user.devices.push(device);
                
                // Save user with the new device to ensure it exists in DB
                await user.save();
                console.log('📱 Created and saved new device:', deviceName);
            } else {
                // Update last sync date for existing device
                device.lastSyncDate = syncDate;
                await user.save();
                console.log('📱 Found existing device:', deviceName);
            }

            // Add message to device - ensure proper date handling
            let parsedDate = new Date();
            if (parsedData.date) {
                // Try parsing as timestamp (number or string number)
                const numTimestamp = Number(parsedData.date);
                if (!isNaN(numTimestamp) && numTimestamp > 0) {
                    parsedDate = new Date(numTimestamp);
                } else {
                    // Try parsing as ISO string or date string
                    const dateObj = new Date(parsedData.date);
                    if (!isNaN(dateObj.getTime())) {
                        parsedDate = dateObj;
                    }
                }
                
                if (isNaN(parsedDate.getTime())) {
                    console.warn('⚠️ Invalid date:', parsedData.date, 'Using current date instead');
                    parsedDate = new Date();
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

            console.log('💾 Message to save:', JSON.stringify(messageObj));

            // Guard against legacy or corrupted schema where messages might be a string
            if (!Array.isArray(device.messages)) {
                device.messages = [];
            }

            console.log('📋 Messages array before push:', device.messages.length);
            device.messages.push(messageObj);
            console.log('📋 Messages array after push:', device.messages.length);

            // Use Mongoose $push operator with arrayFilters to target device by name
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
            console.log('✅ User saved successfully with $push operator using arrayFilters');

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

            console.log('💾 Returning saved message:', JSON.stringify(returnObj));

            return returnObj;
        } catch (error) {
            console.error('❌ Error in saveMessageToDevice:', error);
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

            console.log('📱 Device found:', device.name);
            console.log('📋 Messages from DB:', JSON.stringify(device.messages));
            console.log('📋 Messages count:', device.messages ? device.messages.length : 0);
            console.log('📋 First message:', device.messages && device.messages[0] ? JSON.stringify(device.messages[0]) : 'none');

            // Ensure messages exists and is an array
            const messages = (device.messages && Array.isArray(device.messages))
                ? device.messages.map(m => ({
                    sender: m.sender,
                    amount: m.amount,
                    date: m.date,
                    type: m.type,
                    createdBy: m.createdBy,
                    userRole: m.userRole,
                    _id: m._id
                }))
                : [];

            console.log('📤 Messages to return:', JSON.stringify(messages));

            return { name: device.name, lastSyncDate: device.lastSyncDate, messages: messages };
        } catch (error) {
            console.error('❌ Error in getDeviceMessages:', error);
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
                        if(msg.type === 'sent') {
                        senderStats[msg.sender].totalAmount -= (msg.amount || 0);}
                        else if(msg.type === 'received') {
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