const { GoogleGenAI, Type } = require("@google/genai");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// Helper function: Delay execution
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
      description: "List of technical questions with intentions and ideal answers",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The technical question text" },
          intention: { type: Type.STRING, description: "The reasoning behind asking this question" },
          answer: { type: Type.STRING, description: "The ideal answer expected from the candidate" },
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
          answer: { type: Type.STRING, description: "The ideal response using STAR method" },
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
  Analyze the candidate's documentation and job requirements to generate a complete report.
  
  CRITICAL ASSIGNMENT:
  1. Evaluate overall alignment and calculate 'matchScore' (0-100).
  2. Populate 'technicalQuestions' and 'behavioralQuestions' as structured JSON arrays of objects.
  3. Extract all required properties according to the exact schema properties.

  INPUT CONTEXT:
  - Resume: ${resume}
  - Self Description: ${selfDescription}
  - Job Description: ${jobDescription}
  `;

  const maxRetries = 4;
  let delayTime = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Correct model parameter
        contents: prompt,
        config: {
          systemInstruction:
            "You are an automated backend JSON generator. Populate all keys defined in the schema hierarchy directly. Output must be raw valid JSON.",
          responseMimeType: "application/json",
          responseJsonSchema: interviewReportSchema,
        },
      });

      console.log(`--- REPORT GENERATED (Attempt ${attempt}) ---`);
      const parsedData = JSON.parse(response.text);
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

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // Render / Cloud execution safe args
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });
  await browser.close();
  return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  try {
    const prompt = `Generate a resume in HTML format based on the candidate's information and job description.
    Resume: ${resume}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}
    Ensure the HTML is well-structured and visually appealing when converted to PDF. All styling must be inline within HTML.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Correct model parameter
      contents: prompt,
      config: {
        systemInstruction:
          "You are an automated backend JSON generator. Output must be raw valid JSON matching the requested schema.",
        responseMimeType: "application/json",
        responseJsonSchema: resumePdfSchema,
      },
    });

    const jsonContent = JSON.parse(response.text);

    if (!jsonContent || !jsonContent.html) {
      console.error("❌ Gemini did not return html property inside JSON");
      return null;
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html);
    return pdfBuffer;
  } catch (error) {
    console.error("❌ Error in generateResumePdf service:", error);
    throw error;
  }
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
};