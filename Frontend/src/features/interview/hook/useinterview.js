import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf as generateResumePdfApi,
} from "../services/interview.api"
import { useContext } from "react"
import { InterviewContext } from "../interview.context"

export const useInterview = () => {
  const context = useContext(InterviewContext)
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider")
  }

  const { loading, setLoading, report, setReport, reports, setReports } = context

  const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    setLoading(true)
    try {
      const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
      setReport(response)
      return response
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const getReportById = async (interviewId) => {
    setLoading(true)
    try {
      const response = await getInterviewReportById(interviewId)
      setReport(response.interviewReport)
      return response.interviewReport
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const getAllReports = async () => {
    setLoading(true)
    try {
      const response = await getAllInterviewReports()
      setReports(response.interviewReports)
      return response.interviewReports
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const generatePdf = async ({ interviewReportId }) => {
    setLoading(true)
    try {
      const response = await generateResumePdfApi({ interviewReportId })
      return response
    } catch (error) {
      console.error("Error generating resume PDF:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    setLoading,
    report,
    setReport,
    reports,
    setReports,
    generateReport,
    getReportById,
    getAllReports,
    generateResumePdf: generatePdf,
  }
}