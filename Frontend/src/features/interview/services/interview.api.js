import api from "./auth.api";

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
    formData.append("resume", resumeFile);

    const response = await api.post("/interview/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("API Response:", response.data);

    // Dynamic response handling
    const reportData = response.data?.interviewReport || response.data;
    return reportData;
  } catch (error) {
    console.error("Interview API Error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
    });

    if (
      error.message === "Network Error" ||
      error.code === "ERR_NETWORK" ||
      error.message?.includes("ERR_CONNECTION")
    ) {
      const networkError = new Error(
        "Unable to connect to backend server. Please check your network or server status."
      );
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
  try {
    const response = await api.get(`/interview/report/${interviewId}`);
    return response.data;
  } catch (error) {
    console.error("Get Report By ID Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get All Interview Reports
 */
export const getAllInterviewReports = async () => {
  try {
    const response = await api.get("/interview");
    return response.data;
  } catch (error) {
    console.error("Get All Reports Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Generate Resume PDF
 */
export const generateResumePdf = async ({ interviewReportId }) => {
  try {
    const response = await api.post(
      `/interview/resume/pdf/${interviewReportId}`,
      {},
      {
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], { type: "application/pdf" });
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `Tailored_Resume_${interviewReportId}.pdf`);
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return true;
  } catch (error) {
    console.error(
      "Generate PDF API Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};