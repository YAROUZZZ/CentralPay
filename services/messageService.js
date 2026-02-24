const Message = require('../modules/message');
const AppError = require('../utils/appError');

class MessageService {
    
    async processBatchMessages(messagesArray, userId = null, userRole = null) {
        try {
            const results = {
                successful: [],
                failed: []
            };

            for (let i = 0; i < messagesArray.length; i++) {
                try {
                    const messageText = messagesArray[i].messageText;
                    const messageDate = messagesArray[i].date;
                    if (!messageText) {
                        results.failed.push({
                            index: i,
                            message: messagesArray[i],
                            error: 'messageText is required'
                        });
                        continue;
                    }

                    const parsedData = await this.extractMessageData(messageText, messageDate);
                    
                    const perMessageUserId = messagesArray[i].userId || userId || null;
                    const perMessageUserRole = messagesArray[i].role || userRole || null;
                    const savedMessage = await this.createMessage(parsedData, perMessageUserId, perMessageUserRole);
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

    async getMessagesByUser(userId, userRole, limit = 20) {
        try {
            if (!userId) return [];
            const messages = await Message.find({ createdBy: userId, userRole: userRole })
                .sort({ date: -1, createdAt: -1 })
                .limit(limit);
            
            return messages;
        } catch (error) {
            throw AppError.create('Failed to fetch messages for user: ' + error.message, 500);
        }
    }


    async getMessagesByUserAndMonth(userId, userRole, month, year = new Date().getFullYear()) {
        try {
            if (!userId || !month) return [];

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);

            const messages = await Message.find({
                createdBy: userId,
                userRole: userRole,
                date: {
                    $gte: startDate,
                    $lt: endDate
                }
            }).sort({ date: -1 });

            return messages;

        } catch (error) {
            throw AppError.create('Failed to fetch messages for this month: ' + error.message, 500);
        }
    }
    
    async extractMessageData(messageText, date) {
        try {
            if (!messageText || typeof messageText !== 'string') {
                throw AppError.create('messageText must be a non-empty string', 400);
            }

            const amountMatch = messageText.match(/مبلغ ([\d.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

            /*const dateMatch = messageText.match(/يوم (\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : null;

            const timeMatch = messageText.match(/الساعة\s*(\d{2}:\d{2})/);
            const time = timeMatch ? timeMatch[1] : null;*/

            let type = null;

            if (messageText.includes("إضافة تحويل") || messageText.includes("إيداع") || messageText.includes("رد مبلغ")){
                type = "recieved"
            }else if(messageText.includes("سحب") || messageText.includes("خصم") || messageText.includes("تنفيذ تحويل")){
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

    async createMessage(parsedData, userId, userRole) {
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
                
                    'Duplicate message: A message with the same amount, date, time, and type already exists for this role.',
                    409
                );
            }
            throw error instanceof AppError 
                ? error 
                : AppError.create(error.message || 'Failed to create message', 500);
        }
    }
}

module.exports = new MessageService();