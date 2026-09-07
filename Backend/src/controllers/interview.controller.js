const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

async function generateInterviewReportController(req, res) {
  try {
    // 1. File Upload Validation
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: "Resume PDF file is required. Please attach a valid file in field key 'resume'."
      });
    }

    // 2. Safe PDF Parsing (Fixed pdf-parse call & buffer handling)
    let resumeContent;
    try {
      resumeContent = await pdfParse(req.file.buffer);
    } catch (pdfError) {
      console.error("❌ PDF Parsing Error:", pdfError.message);
      return res.status(400).json({
        message: "Uploaded file is corrupted or not a valid PDF."
      });
    }

    const { selfDescription, jobDescription } = req.body;

    // 3. AI Service Call
    const interviewReportByAi = await generateInterviewReport({
      resume: resumeContent.text,
      selfDescription,
      jobDescription
    });

    // 4. Save to DB
    const interviewReport = await interviewReportModel.create({
      user: req.user.id,
      resume: resumeContent.text,
      selfDescription,
      jobDescription,
      ...interviewReportByAi
    });

    return res.status(201).json({
      message: "Interview report generated successfully",
      interviewReport
    });
  } catch (error) {
    console.error("❌ Error in generateInterviewReportController:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
}

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
async function getInterviewReportByIdController(req, res) {
  try {
    const { interviewId } = req.params;

    const interviewReport = await interviewReportModel.findOne({
      _id: interviewId,
      user: req.user.id
    });

    if (!interviewReport) {
      return res.status(404).json({
        message: "Interview report not found"
      });
    }

    return res.status(200).json({
      message: "Interview report fetched successfully",
      interviewReport
    });
  } catch (error) {
    console.error("❌ Error in getInterviewReportByIdController:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

/**
 * @route GET /api/interview/
 * @description get all interview reports of the logged in user.
 * @access private    
 */
async function getAllInterviewReportsController(req, res) {
  try {
    const interviewReports = await interviewReportModel
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("-resume -selfDescription -jobDescription -__v -updatedAt -technicalQuestions.answer -behavioralQuestions.answer -skillGaps -preparationPlan");

    return res.status(200).json({
      message: "Interview reports fetched successfully",
      interviewReports
    });
  } catch (error) {
    console.error("❌ Error in getAllInterviewReportsController:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

/**
 * @description Generates a PDF buffer from the provided report content.
 */
async function generateResumePdfController(req, res) {
  try {
    const { interviewReportId } = req.params;

    const interviewReport = await interviewReportModel.findById(interviewReportId);

    if (!interviewReport) {
      return res.status(404).json({
        message: "Interview report not found"
      });
    }

    const { resume, jobDescription, selfDescription } = interviewReport;
    const pdfBuffer = await generateResumePdf({
      resume,
      jobDescription,
      selfDescription
    });

    if (!pdfBuffer) {
      console.error("❌ Error: aiService.generateResumePdf returned empty buffer.");
      return res.status(500).json({ message: "Failed to generate PDF." });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=resume_${interviewReportId}.pdf`,
      'Content-Length': pdfBuffer.length || 0
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error in generateResumePdfController:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}

module.exports = {
  generateInterviewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController
};