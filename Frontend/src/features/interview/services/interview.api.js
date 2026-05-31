import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
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