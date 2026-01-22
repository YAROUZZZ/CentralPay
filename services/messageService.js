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

    async createMessage(parsedData) {
        try {
            const message = new Message({
                amount: parsedData.amount,
                date: parsedData.date,
                time: parsedData.time,
                type: parsedData.type,
            });

            return await message.save();
        } catch (error) {
            throw new Error('Database error: ' + error.message);
        }
    }
}

module.exports = new MessageService();