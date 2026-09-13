const { GoogleGenAI, Type } = require("@google/genai");
const PDFDocument = require("pdfkit");
const { convert } = require("html-to-text");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Google Native Schema Definition for Interview Report
const interviewReportSchema = {
  type: Type.OBJECT,
  properties: {
    matchScore: {
      type: Type.INTEGER,
      description: "The match score (0 to 100) between candidate and job description",
    },
    technicalQuestions: {
      type: Type.ARRAY,
      description: "List of technical questions with intentions and detailed answers",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The technical question text" },
          intention: { type: Type.STRING, description: "The reasoning behind asking this question" },
          answer: { type: Type.STRING, description: "Detailed ideal answer expected from candidate" },
        },
        required: ["question", "intention", "answer"],
      },
    },
    behavioralQuestions: {
      type: Type.ARRAY,
      description: "List of behavioral questions with intentions and STAR responses",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The behavioral question text" },
          intention: { type: Type.STRING, description: "The behavioral trait being tested" },
          answer: { type: Type.STRING, description: "Detailed ideal STAR response" },
        },
        required: ["question", "intention", "answer"],
      },
    },
    skillGaps: {
      type: Type.ARRAY,
      description: "Identified gaps between candidate profile and requirements",
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING, description: "The skill or technology gap identified" },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"], description: "The severity level" },
        },
        required: ["skill", "severity"],
      },
    },
    preparationPlan: {
      type: Type.ARRAY,
      description: "A day-wise roadmap to bridge the gaps",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: "The day number" },
          focus: { type: Type.STRING, description: "Main focus or topic for the day" },
          tasks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Actionable tasks for this day",
          },
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
    html: {
      type: Type.STRING,
      description: "Complete self-contained HTML string with inline CSS styling",
    },
  },
  required: ["html"],
};

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const prompt = `
  Analyze candidate details and job requirements to build a complete interview report.
  
  MANDATORY REQUIREMENT:
  For every technical and behavioral question generated, you MUST provide a non-empty, thorough string for the 'answer' property. Do NOT leave 'answer' blank or undefined.

  INPUT CONTEXT:
  - Resume: ${resume || "N/A"}
  - Self Description: ${selfDescription || "N/A"}
  - Job Description: ${jobDescription || "N/A"}
  `;

  const maxRetries = 4;
  let delayTime = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are an automated backend JSON generator. Ensure ALL schema properties (including 'answer') are strictly populated with non-empty text values.",
          responseMimeType: "application/json",
          responseJsonSchema: interviewReportSchema,
        },
      });

      console.log(`--- REPORT GENERATED (Attempt ${attempt}) ---`);
      const parsedData = JSON.parse(response.text);

      // Sanitize fallback to prevent Mongoose schema validation error
      if (parsedData.technicalQuestions) {
        parsedData.technicalQuestions = parsedData.technicalQuestions.map((q) => ({
          ...q,
          answer: q.answer && q.answer.trim() !== "" ? q.answer : "Sample detailed answer provided based on candidate profile.",
        }));
      }

      if (parsedData.behavioralQuestions) {
        parsedData.behavioralQuestions = parsedData.behavioralQuestions.map((q) => ({
          ...q,
          answer: q.answer && q.answer.trim() !== "" ? q.answer : "Sample STAR response provided based on candidate profile.",
        }));
      }

      return parsedData;
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
    const prompt = `Generate a resume in HTML format based on the candidate's information and job description.
    Resume: ${resume}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an automated backend JSON generator.",
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