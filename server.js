require('dotenv').config();
const express = require('express');
const AfricasTalking = require('africastalking');

const app = express();
//parsing  incoming payloads, since AT sends webhooks as URL-encoded forms, not as JSONS
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//initialisiang the AT SDK
const africastalking = AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
});
const sms = africastalking.SMS;

//intelligence layer (RAG Placeholder)
async function queryRAGPipeline(userQuestion) {
    console.log('[RAG Engine] Processing question: "${userQuestion}"....');

    //To add 
    // 1. Text-to-Vector Embedding generation
    // 2. Vector DB Retrieval (Pinecone, pgvector)
    // 3. LLM Prompting (Gemini)

    // Simulating LLM processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    //Remember: SMS has 160 character limit!
    return "Simulated AI: The current tax regulations require a 16% VAT on all digital services.";
}

// communications layer (Webhook Endpoint)    

app.post('/api/sms/incoming', async (req, res) => {
    // 1. Immeadityly acknowledge receipt to prevent AT from timing out
    res.sendStatus(200);

    // 2. Extract the payload sent by Africa's Talking
    const { phoneNumber, text, shortCode, LinkId } = req.body;

    // Log incoming data for debugging
    console.log(`[Incoming SMS] From: ${phoneNumber} | Text: "${text}" | linkId: ${linkId}`);

    try {
        // 3. Pass the users's text to the RG/LLM logic
        const aiResponse = await queryRAGPipeline(text);

        //4.Construct the Premium SMS payload
        const options = {
            to: [phoneNumber],
            from: shortCode,
            message: aiResponse,
            keyword: process.env.AT_PREMIUM_KEYWORD,
            linkId: linkId
        };

        // 5. Send the response back via the network
        const response = await sms.sendPremium(options);
        console.log('[Outbound SMS] Successfully delivered:', response);

    } catch (error) {
        console.error('[System Error] Failed to process conversational loop:', error);
    }
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n RAG SMS Server running on http://localhost:${localhost}`);
    console.log(` Ensure Ngrok is forwarding to this port and bound in the AT Sandbox. `);
});
