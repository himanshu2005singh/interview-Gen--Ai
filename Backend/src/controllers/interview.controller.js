const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

async function generateInterviewReportController(req, res) {
  const resumeFile = req.file

  const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
  const { selfDescription, jobDescription } = req.body

  const interviewReportByAi = await generateInterviewReport({
    resume: resumeContent.text,
    selfDescription,
    jobDescription
  })

  const interviewReport = await interviewReportModel.create({
    user: req.user.id,
    resume: resumeContent.text,
    selfDescription,
    jobDescription,
    ...interviewReportByAi
  })

  res.status(201).json({
    message: "Interview report generated successfully",
    interviewReport
  })
}

/** * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
async function getInterviewReportByIdController(req, res) {
  const { interviewId } = req.params

  const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found"
    })
  }

  res.status(200).json({
    message: "Interview report fetched successfully",
    interviewReport
  })
}

/**
 * @route GET /api/interview/
 * @description get all interview reports of the logged in user.
 * @access private    
 */
async function getAllInterviewReportsController(req, res) {
  const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -updatedAt -technicalQuestions.answer -behavioralQuestions.answer -skillGaps -preparationPlan")

  res.status(200).json({
    message: "Interview reports fetched successfully",
    interviewReports
  })
}

/**
 * @description This function generates a PDF buffer from the provided HTML content.
 */
async function generateResumePdfController(req, res) {
  // 🛠️ CHANGED: Pure block ko try-catch me wrap kiya taaki agar pdfBuffer me koi dikkat ho toh console pr error dikhe, blank na jaye.
  try {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
      return res.status(404).json({
        message: "Interview report not found"
      })
    }

    const { resume, jobDescription, selfDescription } = interviewReport
    const pdfBuffer = await generateResumePdf({
      resume,
      jobDescription,
      selfDescription
    })

    // 🛠️ CHANGED: Validation check lagaya taaki agar aiService se pdfBuffer sahi se na mile toh pata chal sake.
    if (!pdfBuffer) {
      console.error("❌ Error: aiService.generateResumePdf returned undefined or empty data.");
      return res.status(500).json({ message: "Failed to generate PDF. AI service returned nothing." });
    }

    // 🛠️ CHANGED: Safe execution ke liye check kiya ki length property exist karti hai ya nahi, aur 'return' lagaya response ke saath.
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=resume_${interviewReportId}.pdf`,
      'Content-Length': pdfBuffer.length || 0 
    })
    
    return res.send(pdfBuffer)

  } catch (error) {
    // 🛠️ CHANGED: Catch block jisse ab koi bhi internal error console par turant dikhegi!
    console.error("❌ Error in generateResumePdfController:", error)
    return res.status(500).json({ error: "Internal Server Error", details: error.message })
  }
}

module.exports = { generateInterviewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }