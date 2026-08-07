const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

// Models for dynamic user data fallback
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Schedule = require('../models/Schedule');

// Read local institutional context file safely
const filePath = path.join(__dirname, '../data/institute_info.txt');
const institutionalKnowledge = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : "No institutional data uploaded yet.";

// Candidate Gemini model list in order of preference (active models)
const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];

// Helper to execute Gemini generation using @google/genai SDK or REST fallback
async function generateGeminiReply(systemInstruction, userMessage) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in backend environment.");
    }

    // 1. Try standard @google/genai package across candidate models
    try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        for (const modelName of CANDIDATE_MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: [
                        { role: 'system', parts: [{ text: systemInstruction }] },
                        { role: 'user', parts: [{ text: userMessage }] }
                    ]
                });
                if (response && response.text) {
                    return response.text;
                }
            } catch (modelErr) {
                const msg = modelErr.message || '';
                if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
                    throw new Error("QUOTA_EXHAUSTED: Daily free tier quota limit reached for this API key. Please check your Google AI Studio plan or use a fresh key.");
                }
                // Continue to next candidate model if 404 or unsupported
            }
        }
    } catch (sdkError) {
        if (sdkError.message && sdkError.message.startsWith('QUOTA_EXHAUSTED')) {
            throw sdkError;
        }
    }

    // 2. Direct REST API fallback
    const fetch = globalThis.fetch || require('node-fetch');
    for (const modelName of CANDIDATE_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: `System Instruction: ${systemInstruction}\n\nUser Question: ${userMessage}` }
                            ]
                        }
                    ]
                })
            });

            const data = await res.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }

            if (data.error) {
                const errMsg = data.error.message || '';
                if (data.error.code === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                    throw new Error("QUOTA_EXHAUSTED: Daily free tier quota limit reached for this API key. Please check your Google AI Studio plan or use a fresh key.");
                }
            }
        } catch (restErr) {
            if (restErr.message && restErr.message.startsWith('QUOTA_EXHAUSTED')) {
                throw restErr;
            }
        }
    }

    throw new Error("Unable to retrieve valid response from AI assistant.");
}

// POST /api/chat
router.post('/', protect, async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ reply: "Message cannot be empty." });
    }

    const lowerMsg = message.toLowerCase().trim();
    const currentUser = req.user;

    // Declare dbContext OUTSIDE try block so it is in scope for catch block!
    let dbContext = "";

    try {
        // 1. DATABASE INTENT FALLBACK (For user-specific data like attendance, payments, fees, status)
        if (
            lowerMsg.includes('attendance') ||
            lowerMsg.includes('absent') ||
            lowerMsg.includes('present') ||
            lowerMsg.includes('status') ||
            lowerMsg.includes('mage attendance')
        ) {
            const attendanceRecords = await Attendance.find({ studentId: currentUser._id })
                .populate('courseId', 'title code grade subject')
                .sort({ createdAt: -1 })
                .limit(10);

            const recordSummary = attendanceRecords.length > 0
                ? attendanceRecords.map(a => `- Date: ${new Date(a.date).toLocaleDateString()}, Status: ${a.status}, Course: ${a.courseId?.title || 'General'}, Mode: ${a.mode || 'N/A'}`).join('\n')
                : "No attendance records recorded yet.";

            dbContext += `\n[User Attendance Log]:\nLogged in Student: ${currentUser.name} (${currentUser.email}, Grade: ${currentUser.grade || 'N/A'}, Type: ${currentUser.studentType || 'physical'}).\nRecent Attendance Count: ${attendanceRecords.length}\nRecords:\n${recordSummary}\n`;
        }

        if (
            lowerMsg.includes('fee') ||
            lowerMsg.includes('payment') ||
            lowerMsg.includes('paid') ||
            lowerMsg.includes('cost') ||
            lowerMsg.includes('salli') ||
            lowerMsg.includes('gewuwa')
        ) {
            const paymentRecords = await Payment.find({
                $or: [{ student: currentUser._id }, { studentId: currentUser._id }]
            })
                .populate('course', 'title price')
                .sort({ createdAt: -1 })
                .limit(10);

            const paySummary = paymentRecords.length > 0
                ? paymentRecords.map(p => `- Date: ${new Date(p.paymentDate || p.createdAt).toLocaleDateString()}, Course: ${p.course?.title || 'Course'}, Amount: LKR ${p.amount}, Status: ${p.status}, Month: ${p.month || 'N/A'}`).join('\n')
                : "No payment transactions found.";

            dbContext += `\n[User Payment & Fees Log]:\nLogged in Student: ${currentUser.name}.\nRecent Payments Count: ${paymentRecords.length}\nRecords:\n${paySummary}\n`;
        }

        if (
            lowerMsg.includes('my course') ||
            lowerMsg.includes('enrolled') ||
            lowerMsg.includes('panthi') ||
            lowerMsg.includes('my class') ||
            lowerMsg.includes('schedule') ||
            lowerMsg.includes('hotline')
        ) {
            const courses = await Course.find({}).limit(10);
            const courseList = courses.map(c => `- ${c.title} (Grade ${c.grade}, Subject: ${c.subject}, Fee: LKR ${c.fee || c.price || 'N/A'})`).join('\n');
            dbContext += `\n[Available Courses in Academy]:\n${courseList}\n`;
        }

        // Construct System Instruction with RAG & Multilingual Guidelines
        const systemInstruction = `You are LuminaChat, the friendly and intelligent AI virtual assistant for LuminaLearn LMS.
User Info: ${currentUser.name} (Role: ${currentUser.role}, Grade: ${currentUser.grade || 'Not set'}, Type: ${currentUser.studentType || 'physical'}).

Official Institution & Knowledge Base Context:
---
${institutionalKnowledge}
---
${dbContext ? `Database Real-time User Context:\n---${dbContext}---` : ''}

Guidelines for responding:
1. Answer questions regarding class schedules, teachers, venues, hotline, fees, and institute policies accurately based on the institution knowledge base above.
2. If user inquires about their personal attendance, payments, or enrolled status, utilize the Database Real-time User Context provided above.
3. Multilingual & Singlish Support: The user might ask in English, pure Sinhala (සිංහල), or Singlish (e.g., "mata ada tiyena panthi monawada", "attendance balanne kohomada", "ayubowan"). Understand it seamlessly and reply in the matching tone/language warmly and clearly.
4. For general academic or educational questions outside the institution context, provide accurate, helpful answers politely.
5. Format your responses with clean bullet points and bold formatting where appropriate. Keep answers clear and friendly.`;

        // Attempt Gemini Generation
        const replyText = await generateGeminiReply(systemInstruction, message);
        return res.json({ reply: replyText });

    } catch (err) {
        console.error("LuminaChat API Notice:", err.message);

        // Check if rate limit / quota exceeded error
        const isQuotaError = err.message && (err.message.includes('QUOTA_EXHAUSTED') || err.message.includes('429') || err.message.includes('Quota exceeded'));

        let fallbackNotice = isQuotaError
            ? "⚠️ **Daily free tier quota limit reached for this Gemini API key.**\n\n"
            : "Ayubowan! Operating in **Offline Mode**:\n\n";

        if (dbContext && dbContext.trim()) {
            fallbackNotice += "ℹ️ **Your Account & System Records**:\n" + dbContext.trim();
        } else {
            fallbackNotice += "ℹ️ **Institute Information**:\n" + institutionalKnowledge.trim();
        }

        return res.json({ reply: fallbackNotice });
    }
});

module.exports = router;
