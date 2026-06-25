import 'dotenv/config';
import express from 'express';
import AfricasTalking from 'africastalking';

// --- AI & RAG IMPORTS ---
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 1. TELECOMS SETUP ---
const africastalking = AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
});
const sms = africastalking.SMS;

// --- 2. AI INTELLIGENCE SETUP ---
const llm = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.1,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
});

const vectorStore = new MemoryVectorStore(embeddings);

async function initializeKnowledgeBase() {
    console.log("[\u2699\ufe0f System] Initializing Knowledge Base...");
    const docs = [
        new Document({ pageContent: "To replace a lost national ID, visit the nearest Huduma Centre with a police abstract. The replacement fee is KES 100." }),
        new Document({ pageContent: "The Ministry of Public Service requires all IT Support attachments to be logged in the centralized portal weekly." }),
        new Document({ pageContent: "The current digital service tax regulations for 2026 require a 16% VAT." })
    ];
    await vectorStore.addDocuments(docs);
    console.log("[\u2705 System] Knowledge Base loaded and vectorized.");
}
initializeKnowledgeBase();


// --- 3. THE RAG PIPELINE ---
async function queryRAGPipeline(userQuestion) {
    console.log(`\n[RAG Engine] Processing question: "${userQuestion}"...`);

    try {
        const retriever = vectorStore.asRetriever(1);
        const retrievedDocs = await retriever.invoke(userQuestion);
        const context = retrievedDocs.map(doc => doc.pageContent).join(" ");

        const prompt = `You are a helpful offline-first SMS assistant. Answer the user's question using ONLY the provided context.
        CRITICAL RULES:
        1. Your answer MUST be completely factual.
        2. Your answer MUST be under 140 characters.
        3. DO NOT use markdown formatting (no asterisks, no bullets).
        4. If the context does not contain the answer, reply exactly with: "Sorry, I don't have information on that yet."

        Context: ${context}
        Question: ${userQuestion}
        Answer:`;

        const response = await llm.invoke(prompt);
        return response.content.trim();

    } catch (error) {
        console.error("[RAG Error] Failed to generate AI response:", error);
        return "System offline. Please try again later.";
    }
}


// --- 4. THE WEBHOOK ENDPOINT ---
app.post('/api/sms/incoming', async (req, res) => {
    res.sendStatus(200);

    const { phoneNumber, text, shortCode, linkId } = req.body;
    console.log(`\n[\ud83d\udce9 Incoming SMS] From: ${phoneNumber} | Text: "${text}"`);

    try {
        const aiResponse = await queryRAGPipeline(text);

        const options = {
            to: [phoneNumber],
            from: shortCode,
            message: aiResponse,
            keyword: process.env.AT_PREMIUM_KEYWORD,
            linkId: linkId
        };

        const response = await sms.sendPremium(options);
        console.log('[\ud83d\udce4 Outbound SMS] Successfully delivered:', response);

    } catch (error) {
        console.error('[System Error] Failed to process conversational loop:', error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n\ud83d\ude80 RAG SMS Server running on http://localhost:${PORT}`);
    console.log(`\ud83d\udce1 Ensure Ngrok is forwarding to this port and bound in the AT Sandbox.`);
});