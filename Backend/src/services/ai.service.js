const { GoogleGenAI, Type } = require("@google/genai");
const puppeteer = require('puppeteer');

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY
});

// Helper function: Kuch milliseconds ke liye execution rokne ke liye
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Google Native Schema Definition for Interview Report
const interviewReportSchema = {
  type: Type.OBJECT,
  properties: {
    matchScore: {
      type: Type.INTEGER,
      description: "The match score (0 to 100) between candidate and job description"
    },
    technicalQuestions: {
      type: Type.ARRAY,
      description: "List of technical questions with intentions and ideal answers",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The technical question text" },
          intention: { type: Type.STRING, description: "The reasoning behind asking this question" },
          answer: { type: Type.STRING, description: "The ideal answer expected from the candidate" }
        },
        required: ["question", "intention", "answer"]
      }
    },
    behavioralQuestions: {
      type: Type.ARRAY,
      description: "List of behavioral questions with intentions and STAR responses",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The behavioral question text" },
          intention: { type: Type.STRING, description: "The behavioral trait being tested" },
          answer: { type: Type.STRING, description: "The ideal response using STAR method" }
        },
        required: ["question", "intention", "answer"]
      }
    },
    skillGaps: {
      type: Type.ARRAY,
      description: "Identified gaps between candidate profile and requirements",
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING, description: "The skill or technology gap identified" },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"], description: "The severity level" }
        },
        required: ["skill", "severity"]
      }
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
            description: "Actionable tasks for this day" 
          }
        },
        required: ["day", "focus", "tasks"]
      }
    }
  },
  required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan"],
  title: "The title of the job for which the interview report is generated"
};

// 🛠️ CHANGED: Zod ki jagah Native Google Schema banaya resume ke liye bhi, taaki SDK crash na ho
const resumePdfSchema = {
  type: Type.OBJECT,
  properties: {
    html: {
      type: Type.STRING,
      description: "The complete HTML content of the resume PDF, including inline CSS styles. This should be a fully self-contained HTML document that can be directly converted to PDF format without requiring any external resources."
    }
  },
  required: ["html"]
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
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an automated backend JSON generator. Populate all keys defined in the schema hierarchy directly. Do not wrap inner structures as string values. Output must be raw valid JSON.",
          responseMimeType: "application/json",
          responseJsonSchema: interviewReportSchema
        }
      });

      console.log(`--- NATIVE SCHEMA COMPLIANT OUTPUT (Attempt ${attempt}) ---`);
      const parsedData = JSON.parse(response.text);
      return parsedData;

    } catch (error) {
      console.error(`Attempt ${attempt} failed. Error:`, error.message || error);

      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(`Gemini API busy or threw an error. Retrying in ${delayTime}ms...`);
      await wait(delayTime);
      delayTime *= 2;
    }
  }
}

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch({ headless: "new" }); // 🛠️ CHANGED: headless warning hatane ke liye configuration di
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({ 
    format: 'A4',
    printBackground: true // 🛠️ CHANGED: Background colors aur styling ko PDF me lane ke liye
  });
  await browser.close();
  return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  // 🛠️ CHANGED: Try-catch block add kiya taaki agar AI generate karte waqt fatte toh pata chale
  try {
    const prompt = `Generate a resume in HTML format based on the candidate's information and job description. The output should be a single HTML string inside the JSON object that includes all necessary styling (using inline CSS) to create a professional resume.
    Resume: ${resume}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}
    The resume should be tailored to the job description, highlighting relevant skills and experiences. Ensure the HTML is well-structured and visually appealing when converted to PDF. Output must be in JSON format with a single key 'html' containing the entire HTML content as a string. Do not include any external CSS or resources; all styling must be inline within the HTML.The Content of  resume should not sound like it's generated by AI, it should be natural and human-like. Avoid using generic phrases and ensure the resume has a personalized touch based on the candidate's information. The HTML should be ready for PDF conversion without requiring any modifications.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an automated backend JSON generator. Output must be raw valid JSON matching the requested schema.",
        responseMimeType: "application/json",
        responseJsonSchema: resumePdfSchema // 🛠️ CHANGED: Native schema pass kiya jo upar declare kiya hai
      }
    });

    const jsonContent = JSON.parse(response.text);
    
    // 🛠️ CHANGED: Check lagaya ki kya sach me html text mila hai
    if (!jsonContent || !jsonContent.html) {
      console.error("❌ Gemini did not return html property inside JSON");
      return null;
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html);
    
    // 🛠️ CHANGED: Buffer return karna zaroori tha, varna controller ko undefined milta
    return pdfBuffer;

  } catch (error) {
    console.error("❌ Error in generateResumePdf service:", error);
    throw error;
  }
}

module.exports = {
  generateInterviewReport,
  generateResumePdf
};