const Message = require('../modules/message');

class MessageService {
    
    async extractMessageData(messageText) {
        try {

            const amountMatch = messageText.match(/مبلغ ([\d.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;


            const dateMatch = messageText.match(/يوم (\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : null;

            const timeMatch = messageText.match(/الساعة\s*(\d{2}:\d{2})/);
            const time = timeMatch ? timeMatch[1] : null;

            const type = messageText.includes("إضافة تحويل") ? "incoming_transfer" : "outgoing_transfer"
           // const type = typeMatch ? typeMatch[1] : null;

            return {
                amount,
                date,
                time,
                type
            };
        } catch (error) {
            throw new Error('Failed to parse message: ' + error.message);
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
            throw new Error('Database error while checking for duplicates: ' + error.message);
        }
    }

    async createMessage(parsedData) {
        try {
            // Check if message already exists
            const duplicate = await this.checkDuplicate(parsedData);
            
            if (duplicate) {
                throw new Error('This message already exists. Duplicate entry detected.');
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
                throw new Error('Duplicate message: A message with the same amount, date, time, and type already exists.');
            }
            throw error;
        }
    }
}

module.exports = new MessageService();