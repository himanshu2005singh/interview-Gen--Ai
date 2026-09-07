

import axios from "axios";

// ✅ Hardcoded localhost ko badal kar environment variable aur production fallback set kar diya:
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL 
    ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` 
    : "https://interview-gen-ai-ws7i.onrender.com/api"),
  withCredentials: true,
});

/**
 * Generate Interview Report
 */

export const generateInterviewReport = async ({
  jobDescription,
  selfDescription,
  resumeFile,
}) => {

  try {

    const formData = new FormData();

    formData.append("jobDescription", jobDescription);

    formData.append("selfDescription", selfDescription);

    // CHANGED:
    // backend expects upload.single("resume")
    formData.append("resume", resumeFile);

    // CHANGED:
    // route fixed - baseURL already has /api, so just use /interview/
    const response = await api.post(
      "/interview/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // DEBUG: Log the full response to see structure
    console.log('API Response:', response.data);
    console.log('InterviewReport:', response.data.interviewReport);

    return response.data.interviewReport;

  } catch (error) {
    console.error('Interview API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    
    // Better error messages for different scenarios
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || error.message.includes('ERR_CONNECTION')) {
      const networkError = new Error('Backend server is not running on port 3000. Please start it with: cd Backend && npm start');
      networkError.isNetworkError = true;
      throw networkError;
    }
    
    throw error;
  }
};

/**
 * Get Interview By Id
 */

export const getInterviewReportById = async (interviewId) => {

  const response = await api.get(
    `/interview/report/${interviewId}`
  );

  return response.data;
};

/**
 * Get All Interview Reports
 */

export const getAllInterviewReports = async () => {

  const response = await api.get("/interview");

  return response.data;
};


/**
 * @description Service to generate resume pdf based on use self description, resume content and job description
 */
/**
 * Generate Resume PDF
 * @description Triggers PDF generation for a given interview report ID and automatically starts browser download.
 * @param {Object} params
 * @param {string} params.interviewReportId
 */
export const generateResumePdf = async ({ interviewReportId }) => {
  try {
    const response = await api.post(
      `/interview/resume/pdf/${interviewReportId}`,
      {},
      {
        responseType: "blob", // Standard for receiving PDF binary files
      }
    );

    // Dynamic Blob Object Creation & Browser Download Trigger
    const blob = new Blob([response.data], { type: "application/pdf" });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `Tailored_Resume_${interviewReportId}.pdf`);
    document.body.appendChild(link);
    link.click();

    // Memory Cleanup
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return true;
  } catch (error) {
    console.error("Generate PDF API Error:", error.response?.data || error.message);
    throw error;
  }
};