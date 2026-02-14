const Message = require('../modules/message');
const AppError = require('../utils/appError');

class MessageService {
    
    async processBatchMessages(messagesArray) {
        try {
            const results = {
                successful: [],
                failed: []
            };

            for (let i = 0; i < messagesArray.length; i++) {
                try {
                    const messageText = messagesArray[i].messageText;
                    if (!messageText) {
                        results.failed.push({
                            index: i,
                            message: messagesArray[i],
                            error: 'messageText is required'
                        });
                        continue;
                    }

                    const parsedData = await this.extractMessageData(messageText);
                    const savedMessage = await this.createMessage(parsedData);
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
    
    async extractMessageData(messageText) {
        try {
            if (!messageText || typeof messageText !== 'string') {
                throw AppError.create('messageText must be a non-empty string', 400);
            }

            const amountMatch = messageText.match(/مبلغ ([\d.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

            const dateMatch = messageText.match(/يوم (\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : null;

            const timeMatch = messageText.match(/الساعة\s*(\d{2}:\d{2})/);
            const time = timeMatch ? timeMatch[1] : null;

            const type = messageText.includes("إضافة تحويل") ? "incoming_transfer" : "outgoing_transfer"

            if (!amount || !date || !time) {
                throw AppError.create(
                    'Could not extract all required fields (amount, date, time) from message',
                    400
                );
            }

            return {
                amount,
                date,
                time,
                type
            };
        } catch (error) {
            throw error instanceof AppError 
                ? error 
                : AppError.create('Failed to parse message: ' + error.message, 400);
        }
    }

    async checkDuplicate(parsedData) {
        try {
            const existingMessage = await Message.findOne({
                amount: parsedData.amount,
                date: parsedData.date,
                time: parsedData.time,
                type: parsedData.type
            });

            return existingMessage;
        } catch (error) {
            throw AppError.create('Database error while checking for duplicates: ' + error.message, 500);
        }
    }

    async createMessage(parsedData) {
        try {
            // Check if message already exists
            const duplicate = await this.checkDuplicate(parsedData);
            
            if (duplicate) {
                throw AppError.create(
                    'This message already exists. Duplicate entry detected.',
                    409
                );
            }

            const message = new Message({
                amount: parsedData.amount,
                date: parsedData.date,
                time: parsedData.time,
                type: parsedData.type,
            });

            return await message.save();
        } catch (error) {
            // Handle MongoDB duplicate key error
            if (error.code === 11000) {
                throw AppError.create(
                    'Duplicate message: A message with the same amount, date, time, and type already exists.',
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