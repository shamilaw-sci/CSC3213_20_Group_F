import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FaClock, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaArrowRight, FaTrophy, FaExclamationTriangle } from 'react-icons/fa';

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // indices of chosen options
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [quizStarted, setQuizStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Results view states
  const [quizFinished, setQuizFinished] = useState(false);
  const [result, setResult] = useState(null); // { score, totalPoints }
  const [reviewSubmission, setReviewSubmission] = useState(null); // Detailed answers + correct answers from GET my-submission

  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        const res = await api.get(`/quizzes/${quizId}`);
        setQuiz(res.data);
        
        // Initialize answers with null
        setAnswers(new Array(res.data.questions.length).fill(null));
        
        // Setup timer
        if (res.data.timeLimit > 0) {
          setTimeLeft(res.data.timeLimit * 60);
        }
      } catch (err) {
        console.error("Error fetching quiz:", err);
        toast.error("Failed to load quiz details.");
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizId, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (!quizStarted || timeLeft <= 0 || quizFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning("Time is up! Submitting your answers automatically...");
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeLeft, quizFinished]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleSelectOption = (optionIndex) => {
    const updated = [...answers];
    updated[currentQuestionIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/quizzes/${quizId}/submit`, { answers });
      setResult(res.data.submission);
      setQuizFinished(true);
      fetchDetailedReview();
    } catch (err) {
      console.error("Error autosubmitting:", err);
      toast.error("Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuiz = async () => {
    // Check if there are unanswered questions
    const unansweredCount = answers.filter(a => a === null).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`);
      if (!confirmSubmit) return;
    } else {
      const confirmSubmit = window.confirm("Are you sure you want to submit your quiz?");
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/quizzes/${quizId}/submit`, { answers });
      setResult(res.data.submission);
      toast.success("Quiz submitted successfully!");
      setQuizFinished(true);
      fetchDetailedReview();
    } catch (err) {
      console.error("Error submitting quiz:", err);
      toast.error(err.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDetailedReview = async () => {
    try {
      const res = await api.get(`/quizzes/${quizId}/my-submission`);
      setReviewSubmission(res.data);
    } catch (err) {
      console.error("Error fetching submission review:", err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // SCREEN 1: QUIZ SUMMARY / INSTRUCTIONS BEFORE STARTING
  if (!quizStarted && !quizFinished) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-gray-800">{quiz.title}</h1>
            <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full">
              Grade {quiz.grade}
            </span>
          </div>

          {quiz.description && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 font-medium">
              <p className="font-bold text-gray-700 mb-1">Instructions:</p>
              {quiz.description}
            </div>
          )}

          <div className="space-y-4 border-t border-b border-gray-100 py-4 text-sm text-gray-600">
            <div className="flex justify-between font-bold">
              <span>Total Questions:</span>
              <span className="text-gray-800">{quiz.questions.length}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Time Limit:</span>
              <span className="text-gray-800">
                {quiz.timeLimit > 0 ? `${quiz.timeLimit} minutes` : 'No Time Limit'}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total Points:</span>
              <span className="text-gray-800">
                {quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0)} pts
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 border border-gray-200 bg-white font-bold text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleStartQuiz}
              className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md shadow-purple-200 transition cursor-pointer"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: POST-SUBMISSION RESULTS & DETAILED REVIEW
  if (quizFinished) {
    const percentage = result ? Math.round((result.score / result.totalPoints) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Trophy Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 text-yellow-600 text-4xl mb-2">
              <FaTrophy />
            </div>
            <h1 className="text-3xl font-black text-gray-800">Quiz Completed!</h1>
            <p className="text-gray-500 font-bold text-lg">{quiz.title}</p>
            
            <div className="max-w-xs mx-auto bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-4xl font-black text-purple-600">
                {result?.score} <span className="text-gray-400 text-lg">/ {result?.totalPoints}</span>
              </div>
              <div className="text-sm font-bold text-gray-500 mt-1">Total Score ({percentage}%)</div>
            </div>

            <button
              onClick={() => navigate(`/course/${quiz.course}`)}
              className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition cursor-pointer shadow-md shadow-purple-100"
            >
              Back to Course
            </button>
          </div>

          {/* Detailed Question Review */}
          {reviewSubmission && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-gray-800">Review Answers</h2>
              
              {reviewSubmission.quiz.questions.map((question, index) => {
                const studentAnswer = reviewSubmission.answers[index];
                const correctAnswer = question.correctAnswer;
                const isCorrect = studentAnswer === correctAnswer;

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-2xl border p-6 space-y-4 transition ${
                      isCorrect ? 'border-green-100 bg-green-50/10' : 'border-red-100 bg-red-50/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-gray-700">Question {index + 1}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <FaCheckCircle /> Correct (+{question.points || 1} pts)
                          </>
                        ) : (
                          <>
                            <FaTimesCircle /> Incorrect (0 / {question.points || 1} pts)
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-base text-gray-800 font-bold">{question.questionText}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {question.options.map((option, oIdx) => {
                        let optionStyle = "border-gray-200 bg-white text-gray-700";
                        
                        // Style correct answer in green
                        if (oIdx === correctAnswer) {
                          optionStyle = "border-green-500 bg-green-100 text-green-800 font-bold";
                        }
                        // Style student's wrong answer in red
                        else if (oIdx === studentAnswer && !isCorrect) {
                          optionStyle = "border-red-500 bg-red-100 text-red-800 font-bold";
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`px-4 py-3 border rounded-xl flex items-center justify-between text-sm ${optionStyle}`}
                          >
                            <span>{option}</span>
                            {oIdx === correctAnswer && <FaCheckCircle className="text-green-600" />}
                            {oIdx === studentAnswer && !isCorrect && <FaTimesCircle className="text-red-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 3: ACTIVE QUIZ WORKSPACE
  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with timer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-800 truncate max-w-xs sm:max-w-md">{quiz.title}</h1>
            <p className="text-xs text-gray-400 font-bold mt-1">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
          </div>
          
          {quiz.timeLimit > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border transition ${
              timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}>
              <FaClock />
              <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Question Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">
              {currentQuestion.points || 1} Points
            </span>
          </div>

          <h2 className="text-lg font-black text-gray-800">{currentQuestion.questionText}</h2>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, oIdx) => {
              const isSelected = answers[currentQuestionIndex] === oIdx;
              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleSelectOption(oIdx)}
                  className={`w-full text-left px-5 py-4 border rounded-xl transition flex items-center justify-between cursor-pointer group ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-bold'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                  }`}
                >
                  <span className="text-sm">{option}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                    isSelected
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-300 group-hover:border-purple-400'
                  }`}>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Question Selector & Submission bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          {/* Question Grid */}
          <div className="flex flex-wrap gap-2 justify-center border-b border-gray-100 pb-4">
            {quiz.questions.map((_, index) => {
              const hasAnswered = answers[index] !== null;
              const isCurrent = currentQuestionIndex === index;
              
              let styleClass = "border-gray-200 text-gray-600 hover:border-purple-300";
              if (hasAnswered) styleClass = "bg-purple-100 border-purple-200 text-purple-700 font-bold";
              if (isCurrent) styleClass = "bg-purple-600 border-purple-600 text-white font-extrabold shadow-md shadow-purple-100";

              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs transition cursor-pointer ${styleClass}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border border-gray-200 rounded-xl transition ${
                currentQuestionIndex === 0 ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaArrowLeft /> Previous
            </button>

            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-200 transition cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Next <FaArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;
