import React, { useState, useRef, useEffect } from "react";
import "../style/home.scss";
import { useInterview } from "../hook/useinterview";
import { useNavigate } from "react-router";

const Home = () => {
  const { loading, generateReport } = useInterview();
  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const resumeInputRef = useRef(null);
  const [resume, setResume] = useState(null);
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("interview_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing history from localStorage", e);
      }
    }
  }, []);

  const handleResumeUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        alert("Please upload a valid PDF file.");
        return;
      }
      setResume(file);
    }
  };

  const handleSubmit = async () => {
    try {
      // Always use state variable first, fallback to ref if available
      const resumeFile = resume || (resumeInputRef.current && resumeInputRef.current.files[0]);

      if (!resumeFile) {
        alert("Please upload a valid PDF resume.");
        return;
      }

      if (!jobDescription.trim() || !selfDescription.trim()) {
        alert("Please fill in job description and self description.");
        return;
      }

      // Explicit payload structure for hook/axios wrapper
      const data = await generateReport({
        jobDescription: jobDescription.trim(),
        selfDescription: selfDescription.trim(),
        resumeFile: resumeFile, // Actual File object
      });

      if (!data || !data._id) {
        console.error("Missing data structure:", { data, hasId: data?._id ? "yes" : "no" });
        alert("⚠️ Report generated but ID is missing.\n\nPlease check the console.");
        return;
      }

      const newHistoryItem = {
        id: data._id,
        jobDescription: jobDescription,
        selfDescription: selfDescription,
        resumeName: resumeFile.name,
        timestamp: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("interview_history", JSON.stringify(updatedHistory));

      navigate(`/interview/${data._id}`);
    } catch (error) {
      console.error("Error generating report:", error);
      let errorMsg = "Failed to generate report. Please try again.";

      if (error.isNetworkError) {
        errorMsg =
          "⚠️ Cannot connect to backend server!\n\nPlease start the backend:\n1. Open a new terminal\n2. cd Backend\n3. npm start\n\nThen try again.";
      } else if (error.response?.status === 503) {
        errorMsg = "⚠️ Backend server is not responding. Please ensure it's running.";
      } else if (error.response?.status === 429) {
        errorMsg = "⏱️ Rate limit reached. Please wait ~1 minute and try again.";
      } else if (error.response?.status === 400) {
        errorMsg =
          error.response?.data?.message ||
          "Invalid PDF or input parameters. Make sure the file is a readable PDF.";
      } else if (
        error.message?.includes("Network") ||
        error.message?.includes("ERR_CONNECTION")
      ) {
        errorMsg =
          "⚠️ Cannot connect to backend server!\n\nPlease start the backend:\n1. Open a new terminal\n2. cd Backend\n3. npm start";
      } else {
        errorMsg = error.response?.data?.message || errorMsg;
      }
      alert(errorMsg);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your search history?")) {
      localStorage.removeItem("interview_history");
      setHistory([]);
    }
  };

  return (
    <main className="home">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner-container">
            <div className="loading-spinner"></div>
            <h3>🤖 AI is analyzing your profile...</h3>
            <p>Building your custom interview strategy (Approx. 30s)</p>
          </div>
        </div>
      )}

      <div className="layout-wrapper">
        <div className="container">
          <div className="hero-section">
            <h1>
              Create Your Custom{" "}
              <span className="highlight-heading">Interview Plan</span>
            </h1>
            <p>
              Let our AI analyze the job requirements and your unique profile to
              build a winning strategy.
            </p>
          </div>

          <div className="interview-input-group">
            {/* LEFT SECTION */}
            <div className="left">
              <div className="section-top">
                <div className="section-title">
                  <h3>📄 Target Job Description</h3>
                </div>
                <span className="tag">REQUIRED</span>
              </div>

              <textarea
                onChange={(e) => setJobDescription(e.target.value)}
                id="jobDescription"
                placeholder={`Paste the full job description here...\n\ne.g. Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...`}
                value={jobDescription}
                disabled={loading}
              ></textarea>

              <p className="bottom-text">
                AI-Powered Strategy Generation • Approx 30s
              </p>
            </div>

            {/* RIGHT SECTION */}
            <div className="right">
              <div className="profile-title">
                <h3>👤 Your Profile</h3>
              </div>

              {/* RESUME UPLOAD */}
              <div className="input-group upload-group">
                <p>
                  Upload Resume{" "}
                  <small className="highlight">BEST RESULTS</small>
                </p>

                <label
                  htmlFor="resume"
                  className={`file-label ${loading ? "disabled" : ""}`}
                >
                  <div className="upload-icon">⬆</div>
                  <h4>
                    {resume ? resume.name : "Click to upload or drag & drop"}
                  </h4>
                  <span>PDF format only (Max 5MB)</span>
                </label>

                <input
                  ref={resumeInputRef}
                  type="file"
                  id="resume"
                  accept="application/pdf,.pdf"
                  onChange={handleResumeUpload}
                  style={{ display: "none" }}
                  disabled={loading}
                />
              </div>

              {/* SELF DESCRIPTION */}
              <div className="input-group summary-group">
                <p>Your Profile Summary</p>
                <textarea
                  id="selfDescription"
                  placeholder={`Brief description about yourself...\n\ne.g. 2 years of React experience, comfortable with Node.js backend, working on performance optimization...`}
                  value={selfDescription}
                  onChange={(e) => setSelfDescription(e.target.value)}
                  disabled={loading}
                ></textarea>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "⏳ Generating..." : "🚀 Generate Report"}
              </button>
            </div>
          </div>
        </div>

        {/* SIDE HISTORY PANEL */}
        <div className="history-sidebar">
          <div className="history-header">
            <h3>🕒 Past Strategies</h3>
            {history.length > 0 && (
              <button className="clear-btn" onClick={clearHistory}>
                Clear All
              </button>
            )}
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-history">
                <p>No past plans generated yet.</p>
                <span>Your saved reports will appear here.</span>
              </div>
            ) : (
              history.map((item, index) => (
                <div
                  key={index}
                  className="history-item"
                  onClick={() => navigate(`/interview/${item.id}`)}
                  title="Click to view this report"
                >
                  <div className="item-meta">
                    <span className="item-date">{item.timestamp}</span>
                    <span className="item-file">📎 {item.resumeName}</span>
                  </div>
                  <p className="item-jd-preview">
                    {item.jobDescription.substring(0, 60)}...
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;