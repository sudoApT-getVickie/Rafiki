require('dotenv').config();
const express = require('express');
const AfricasTalking = require('africastalking');

const app = express();

// Africa's Talking sends webhooks as URL-encoded forms, NOT standard JSON.
// This middleware is required to parse the incoming payload.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize the Africa's Talking SDK
const africastalking = AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
});
const sms = africastalking.SMS;

// ==========================================
// THE INTELLIGENCE LAYER (RAG Placeholder)
// ==========================================
async function queryRAGPipeline(userQuestion) {
    console.log(`[RAG Engine] Processing question: "${userQuestion}"...`);

    // Here is where you will eventually add:
    // 1. Text-to-Vector Embedding generation
    // 2. Vector DB Retrieval (Pinecone, pgvector)
    // 3. LLM Prompting (Gemini, Claude, etc.)

    // Simulating LLM processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Remember: SMS has a 160 character limit!
    return "Simulated AI: The current tax regulations require a 16% VAT on all digital services.";
}

// ==========================================
// THE COMMUNICATIONS LAYER (Webhook Endpoint)
// ==========================================
app.post('/api/sms/incoming', async (req, res) => {
    // 1. IMMEDIATELY acknowledge receipt to prevent AT from timing out
    res.sendStatus(200);

    // 2. Extract the payload sent by Africa's Talking
    const { phoneNumber, text, shortCode, linkId } = req.body;

    // Log incoming data for debugging
    console.log(`\n[Incoming SMS] From: ${phoneNumber} | Text: "${text}" | linkId: ${linkId}`);

    try {
        // 3. Pass the user's text to your RAG/LLM logic
        const aiResponse = await queryRAGPipeline(text);

        // 4. Construct the Premium SMS Payload
        const options = {
            to: [phoneNumber],                     // Must be an array of numbers
            from: shortCode,                       // Your sandbox 5-digit shortcode
            message: aiResponse,                   // The LLM's answer
            keyword: process.env.AT_PREMIUM_KEYWORD, // Required to bill the user
            linkId: linkId                         // Connects this reply to the user's initial prompt
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
    console.log(`\n RAG SMS Server running on http://localhost:${PORT}`);
    console.log(` Ensure Ngrok is forwarding to this port and bound in the AT Sandbox.`);
});