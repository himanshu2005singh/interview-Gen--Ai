const { GoogleGenAI, Type } = require("@google/genai");
const PDFDocument = require("pdfkit");
const { convert } = require("html-to-text");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const interviewReportSchema = {
  type: Type.OBJECT,
  properties: {
    matchScore: { type: Type.INTEGER },
    technicalQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          intention: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "intention", "answer"],
      },
    },
    behavioralQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          intention: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "intention", "answer"],
      },
    },
    skillGaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
        },
        required: ["skill", "severity"],
      },
    },
    preparationPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          focus: { type: Type.STRING },
          tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["day", "focus", "tasks"],
      },
    },
  },
  required: [
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan",
  ],
  title: "Job Interview Report Schema",
};

const resumePdfSchema = {
  type: Type.OBJECT,
  properties: {
    html: { type: Type.STRING },
  },
  required: ["html"],
};

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const prompt = `
  Analyze candidate details and job requirements.
  Resume: ${resume || "N/A"}
  Self Description: ${selfDescription || "N/A"}
  Job Description: ${jobDescription || "N/A"}
  `;

  const maxRetries = 4;
  let delayTime = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Updated Model String
        contents: prompt,
        config: {
          systemInstruction: "You are an automated backend JSON generator.",
          responseMimeType: "application/json",
          responseJsonSchema: interviewReportSchema,
        },
      });

      console.log(`--- REPORT GENERATED (Attempt ${attempt}) ---`);
      return JSON.parse(response.text);
    } catch (error) {
      console.error(`Attempt ${attempt} failed. Error:`, error.message || error);

      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(`Gemini API error. Retrying in ${delayTime}ms...`);
      await wait(delayTime);
      delayTime *= 2;
    }
  }
}

function generatePdfFromHtml(htmlContent) {
  return new Promise((resolve, reject) => {
    try {
      const textContent = convert(htmlContent, { wordwrap: 130 });
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      doc.fontSize(11).text(textContent, { align: "left" });
      doc.end();
    } catch (err) {
      console.error("❌ PDF Generation error:", err);
      reject(err);
    }
  });
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  try {
    const prompt = `Generate structured text resume for candidate.
    Resume: ${resume}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Updated Model String
      contents: prompt,
      config: {
        systemInstruction: "Output valid JSON with html property.",
        responseMimeType: "application/json",
        responseJsonSchema: resumePdfSchema,
      },
    });

    const jsonContent = JSON.parse(response.text);
    return await generatePdfFromHtml(jsonContent.html);
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    throw error;
  }
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
};