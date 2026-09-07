import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hook/useinterview'
import { useParams } from 'react-router'

const Interview = () => {
  const { interviewId } = useParams()
  const { report, getReportById, generateResumePdf, loading } = useInterview()

  const [activeCategory, setActiveCategory] = useState('technical')
  const [roadmapPlan, setRoadmapPlan] = useState([])
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // 1. Reload & Fetch Sync Effect
  useEffect(() => {
    if (!report && interviewId) {
      getReportById(interviewId)
    }
  }, [interviewId, report])

  // 2. Roadmap Mapping Effect
  useEffect(() => {
    if (report && report.preparationPlan) {
      setRoadmapPlan(
        report.preparationPlan.map((day) => ({
          ...day,
          tasks: Array.isArray(day.tasks)
            ? day.tasks.map((task) => typeof task === 'string' ? { text: task, completed: false } : task)
            : []
        }))
      )
    } else {
      setRoadmapPlan([])
    }
  }, [report])

  const toggleRoadmapTask = (dayIndex, taskIndex) => {
    setRoadmapPlan((prev) =>
      prev.map((day, dIndex) =>
        dIndex !== dayIndex
          ? day
          : {
              ...day,
              tasks: day.tasks.map((task, tIndex) =>
                tIndex !== taskIndex ? task : { ...task, completed: !task.completed }
              )
            }
      )
    )
  }

  // PDF Generation Handler
  const handleDownloadPdf = async () => {
    if (!interviewId && !report?._id) return
    setDownloadingPdf(true)
    try {
      await generateResumePdf({ interviewReportId: interviewId || report._id })
    } catch (err) {
      console.error("PDF Download failed:", err)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="interview-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', fontWeight: 'bold' }}>
        ⏳ Fetching your interview report from database...
      </div>
    )
  }

  if (!report) {
    return (
      <div className="interview-error" style={{ padding: '2rem', textAlign: 'center', margin: '100px auto' }}>
        ⚠️ Report not found. Please check your URL or connection.
      </div>
    )
  }

  const renderQuestions = () => {
    const questions =
      activeCategory === 'technical' ? (report?.technicalQuestions || []) : (report?.behavioralQuestions || [])

    return (
      <div className="questions-container">
        {questions.map((item, index) => (
          <div key={index} className="question-card">
            <div className="question-header">
              <h4>Question {index + 1}</h4>
              <span className="question-number">{index + 1}/{questions.length}</span>
            </div>

            <div className="question-content">
              <p className="question-text">{item.question}</p>

              <div className="intention-box">
                <span className="intention-label">💡 Intention:</span>
                <p>{item.intention}</p>
              </div>

              <div className="answer-box">
                <span className="answer-label">✓ Expected Answer:</span>
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderRoadmap = () => (
    <div className="questions-container roadmap-container">
      {roadmapPlan.map((dayItem, idx) => {
        const completedCount = dayItem.tasks ? dayItem.tasks.filter((task) => task.completed).length : 0
        const totalTasks = dayItem.tasks ? dayItem.tasks.length : 0
        const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

        return (
          <div key={idx} className="question-card roadmap-card">
            <span className="roadmap-day-chip">Day {dayItem.day}</span>

            <div className="question-header">
              <h4>{dayItem.focus}</h4>
            </div>

            <div className="progress-row">
              <span className="progress-label">{progress}% complete</span>
              <span className="progress-meta">{completedCount}/{totalTasks} tasks</span>
            </div>

            <div className="progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="question-content">
              <ul className="task-list">
                {dayItem.tasks && dayItem.tasks.map((task, taskIndex) => (
                  <li
                    key={taskIndex}
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                    onClick={() => toggleRoadmapTask(idx, taskIndex)}
                  >
                    <span className="task-icon">{task.completed ? '✓' : ''}</span>
                    <span className="task-text">{task.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <main className="interview">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar left-sidebar">
        <nav className="category-nav">
          <div className="nav-section">
            <button
              className={`category-btn ${activeCategory === 'technical' ? 'active' : ''}`}
              onClick={() => setActiveCategory('technical')}
            >
              📋 Technical Questions
            </button>
            <button
              className={`category-btn ${activeCategory === 'behavioral' ? 'active' : ''}`}
              onClick={() => setActiveCategory('behavioral')}
            >
              🤝 Behavioral Questions
            </button>
            <button
              className={`category-btn ${activeCategory === 'roadmap' ? 'active' : ''}`}
              onClick={() => setActiveCategory('roadmap')}
            >
              🗺️ Road Map
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <section className="main-content">
        <div className="content-wrapper">
          <div className="match-score-container">
            <div className="match-score">
              <span className="score-label">Match Score</span>
              <span className="score-value">{report?.matchScore ?? '-'}%</span>
            </div>
          </div>

          {activeCategory === 'roadmap' ? renderRoadmap() : renderQuestions()}
        </div>
      </section>

      {/* RIGHT SIDEBAR */}
      <aside className="sidebar right-sidebar">
        <div className="skill-gaps-section">
          <h3 className="section-title">Skill Gaps</h3>

          <div className="skill-tags-container">
            {(report?.skillGaps || []).map((gap, index) => (
              <span key={index} className="skill-tag">
                {gap.skill || gap}
              </span>
            ))}
          </div>

          <div className="preparation-summary">
            <h4 className="summary-title">Preparation Plan</h4>
            <p className="summary-text">
              Focus on improving skill gaps over 4 days with structured learning tasks and practical exercises.
            </p>
          </div>

          {/* DOWNLOAD RESUME ACTION */}
          <div className="download-action" style={{ marginTop: '20px' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: downloadingPdf ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {downloadingPdf ? '📄 Generating PDF...' : '📥 Download Tailored Resume PDF'}
            </button>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default Interview