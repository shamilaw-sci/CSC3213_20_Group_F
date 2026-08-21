import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { 
  FaClock, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaArrowRight, 
  FaTrophy, FaLightbulb, FaImage, FaCheckSquare, FaDotCircle, FaExclamationCircle
} from 'react-icons/fa';

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // indices or arrays of indices
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
        
        // Initialize answers based on question type
        const initialAnswers = res.data.questions.map(q => {
          return q.questionType === 'multiple' ? [] : null;
        });
        setAnswers(initialAnswers);
        
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

  // Option selection (supports single and multi-select)
  const handleSelectOption = (optionIndex, isMulti) => {
    const updated = [...answers];
    if (isMulti) {
      const currentList = Array.isArray(updated[currentQuestionIndex]) ? updated[currentQuestionIndex] : [];
      if (currentList.includes(optionIndex)) {
        updated[currentQuestionIndex] = currentList.filter(idx => idx !== optionIndex);
      } else {
        updated[currentQuestionIndex] = [...currentList, optionIndex].sort((a, b) => a - b);
      }
    } else {
      updated[currentQuestionIndex] = optionIndex;
    }
    setAnswers(updated);
  };

  const isQuestionAnswered = (index) => {
    const ans = answers[index];
    const q = quiz?.questions?.[index];
    if (!q) return false;
    if (q.questionType === 'multiple') {
      return Array.isArray(ans) && ans.length > 0;
    }
    return ans !== null && ans !== undefined;
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
    let unansweredCount = 0;
    quiz.questions.forEach((_, idx) => {
      if (!isQuestionAnswered(idx)) unansweredCount++;
    });

    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`);
      if (!confirmSubmit) return;
    } else {
      const confirmSubmit = window.confirm("Are you sure you want to submit your quiz assessment?");
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
    const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const passThreshold = quiz.passingPercentage || 50;

    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-purple-100 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-gray-900">{quiz.title}</h1>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-black rounded-full">
                Grade {quiz.grade}
              </span>
              {quiz.month && (
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full">
                  {quiz.month} {quiz.weekNumber > 0 && `(Week ${quiz.weekNumber})`}
                </span>
              )}
            </div>
          </div>

          {quiz.description && (
            <div className="bg-purple-50/60 rounded-2xl p-4 text-xs text-purple-950 font-semibold border border-purple-100">
              <p className="font-black text-purple-900 uppercase tracking-wider mb-1">Instructions:</p>
              {quiz.description}
            </div>
          )}

          <div className="space-y-3.5 border-t border-b border-gray-100 py-4 text-xs font-bold text-gray-600">
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <span className="text-gray-900 font-extrabold">{quiz.questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Limit:</span>
              <span className="text-gray-900 font-extrabold">
                {quiz.timeLimit > 0 ? `${quiz.timeLimit} Minutes` : 'No Time Limit'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Points:</span>
              <span className="text-purple-700 font-extrabold">{totalPoints} Points</span>
            </div>
            <div className="flex justify-between">
              <span>Passing Criteria:</span>
              <span className="text-emerald-700 font-extrabold">{passThreshold}% Score</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-3 border border-gray-200 bg-white font-bold text-gray-700 rounded-2xl hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartQuiz}
              className="flex-1 py-3 bg-purple-700 text-white font-black rounded-2xl hover:bg-purple-800 shadow-md shadow-purple-200 transition cursor-pointer"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: POST-SUBMISSION RESULTS & DETAILED REVIEW
  if (quizFinished) {
    const percentage = result ? Math.round((result.score / result.totalPoints) * 100) : 0;
    const passThreshold = quiz.passingPercentage || 50;
    const passed = percentage >= passThreshold;
    
    return (
      <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Trophy & Score Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl mb-1 ${
              passed ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
            }`}>
              {passed ? <FaTrophy /> : <FaExclamationCircle />}
            </div>
            
            <h1 className="text-3xl font-black text-gray-900">
              {passed ? 'Assessment Completed!' : 'Assessment Finished'}
            </h1>
            <p className="text-gray-500 font-bold text-base">{quiz.title}</p>
            
            <div className="max-w-xs mx-auto bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-2">
              <div className="text-4xl font-black text-purple-700">
                {result?.score} <span className="text-gray-400 text-lg font-bold">/ {result?.totalPoints}</span>
              </div>
              <div className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Score: {percentage}%
              </div>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                  passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {passed ? '✓ PASSED ASSESSMENT' : '✕ NEEDS IMPROVEMENT'} (Pass Mark: {passThreshold}%)
                </span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => navigate(`/course/${quiz.course}`)}
                className="px-8 py-3 bg-purple-700 text-white font-black rounded-2xl hover:bg-purple-800 transition cursor-pointer shadow-md shadow-purple-200"
              >
                Back to Course
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          {reviewSubmission && reviewSubmission.quiz && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900">Detailed Answer Review</h2>
                <span className="text-xs font-bold text-gray-400">Questions: {reviewSubmission.quiz.questions?.length}</span>
              </div>
              
              {reviewSubmission.quiz.questions.map((question, index) => {
                const studentAnswer = reviewSubmission.answers[index];
                const qType = question.questionType || 'mcq';
                const isMulti = qType === 'multiple';

                let isCorrect = false;
                if (isMulti) {
                  const correctSet = new Set((question.correctAnswers || []).map(Number));
                  const studentSet = new Set((Array.isArray(studentAnswer) ? studentAnswer : []).map(Number));
                  isCorrect = correctSet.size === studentSet.size && [...correctSet].every(v => studentSet.has(v));
                } else {
                  isCorrect = studentAnswer !== undefined && studentAnswer !== null && Number(studentAnswer) === Number(question.correctAnswer);
                }

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-3xl border-2 p-6 sm:p-7 space-y-4 transition ${
                      isCorrect ? 'border-emerald-200 bg-emerald-50/10' : 'border-red-200 bg-red-50/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-purple-900 text-white font-black text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase">
                          {isMulti ? 'Multiple Select' : qType === 'true_false' ? 'True / False' : 'Single Choice'}
                        </span>
                      </div>
                      
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
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

                    {/* Question Text */}
                    {question.questionText && (
                      <p className="text-base text-gray-900 font-extrabold">{question.questionText}</p>
                    )}

                    {/* Question Image (if any) */}
                    {question.questionImage && (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-md bg-gray-50 p-2">
                        <img 
                          src={question.questionImage.startsWith('http') ? question.questionImage : `http://localhost:5000${question.questionImage}`}
                          alt="Question diagram"
                          className="max-h-60 object-contain mx-auto"
                        />
                      </div>
                    )}

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {question.options.map((option, oIdx) => {
                        const isOptionCorrect = isMulti
                          ? (question.correctAnswers || []).includes(oIdx)
                          : question.correctAnswer === oIdx;

                        const isOptionChosen = isMulti
                          ? Array.isArray(studentAnswer) && studentAnswer.includes(oIdx)
                          : studentAnswer === oIdx;

                        let optionStyle = "border-gray-200 bg-white text-gray-700";
                        
                        if (isOptionCorrect) {
                          optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-black";
                        } else if (isOptionChosen && !isOptionCorrect) {
                          optionStyle = "border-red-500 bg-red-50 text-red-950 font-bold";
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`px-4 py-3 border-2 rounded-2xl flex items-center justify-between text-xs font-semibold ${optionStyle}`}
                          >
                            <span>{option}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isOptionCorrect && (
                                <span className="text-emerald-700 text-xs font-black flex items-center gap-1">
                                  <FaCheckCircle /> Correct
                                </span>
                              )}
                              {isOptionChosen && !isOptionCorrect && (
                                <span className="text-red-600 text-xs font-black flex items-center gap-1">
                                  <FaTimesCircle /> Your Choice
                                </span>
                              )}
                              {isOptionChosen && isOptionCorrect && (
                                <span className="text-emerald-700 text-xs font-black">
                                  (Selected)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {question.explanation && (
                      <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 text-xs text-amber-950 space-y-1">
                        <span className="font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                          <FaLightbulb className="text-amber-500" /> Explanation / Rationale:
                        </span>
                        <p className="font-semibold">{question.explanation}</p>
                      </div>
                    )}

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
  const qType = currentQuestion.questionType || 'mcq';
  const isMulti = qType === 'multiple';
  
  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header with timer */}
        <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate max-w-xs sm:max-w-md">{quiz.title}</h1>
            <p className="text-xs text-gray-400 font-bold mt-0.5">
              Question {currentQuestionIndex + 1} of {quiz.questions.length} · <span className="text-purple-700">{isMulti ? 'Multiple Select' : qType === 'true_false' ? 'True / False' : 'Single Choice'}</span>
            </p>
          </div>
          
          {quiz.timeLimit > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black border transition ${
              timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}>
              <FaClock />
              <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Question Panel */}
        <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-xl text-xs font-black">
              {currentQuestion.points || 1} Points
            </span>
            {isMulti && (
              <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
                ☑️ Select all correct options
              </span>
            )}
          </div>

          {/* Question Text */}
          {currentQuestion.questionText && (
            <h2 className="text-lg font-black text-gray-900 leading-relaxed">
              {currentQuestion.questionText}
            </h2>
          )}

          {/* Question Image (if any) */}
          {currentQuestion.questionImage && (
            <div className="border border-purple-100 rounded-2xl overflow-hidden max-w-lg mx-auto bg-gray-50 p-2 shadow-inner">
              <img 
                src={currentQuestion.questionImage.startsWith('http') ? currentQuestion.questionImage : `http://localhost:5000${currentQuestion.questionImage}`}
                alt="Question Diagram"
                className="max-h-72 object-contain mx-auto"
              />
            </div>
          )}

          {/* Options List */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {currentQuestion.options.map((option, oIdx) => {
              const isSelected = isMulti 
                ? Array.isArray(answers[currentQuestionIndex]) && answers[currentQuestionIndex].includes(oIdx)
                : answers[currentQuestionIndex] === oIdx;

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleSelectOption(oIdx, isMulti)}
                  className={`w-full text-left px-5 py-4 border-2 rounded-2xl transition flex items-center justify-between cursor-pointer group ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/70 text-purple-950 font-black shadow-xs'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-purple-300'
                  }`}
                >
                  <span className="text-sm font-semibold">{option}</span>
                  
                  {isMulti ? (
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      isSelected
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-300 group-hover:border-purple-400'
                    }`}>
                      {isSelected && <span className="text-xs font-bold">✓</span>}
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                      isSelected
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-300 group-hover:border-purple-400'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Question Selector & Navigation */}
        <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 flex flex-col gap-5">
          {/* Question Grid */}
          <div className="flex flex-wrap gap-2.5 justify-center border-b border-gray-100 pb-4">
            {quiz.questions.map((_, index) => {
              const hasAnswered = isQuestionAnswered(index);
              const isCurrent = currentQuestionIndex === index;
              
              let styleClass = "border-gray-200 text-gray-600 hover:border-purple-300";
              if (hasAnswered) styleClass = "bg-purple-100 border-purple-300 text-purple-900 font-bold";
              if (isCurrent) styleClass = "bg-purple-700 border-purple-700 text-white font-black shadow-md shadow-purple-200";

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-9 h-9 rounded-2xl border flex items-center justify-center text-xs transition cursor-pointer ${styleClass}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black border border-gray-200 rounded-2xl transition ${
                currentQuestionIndex === 0 ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <FaArrowLeft /> Previous
            </button>

            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="px-7 py-3 bg-emerald-600 text-white text-xs font-black rounded-2xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition cursor-pointer"
              >
                {submitting ? "Submitting Assessment..." : "Submit Assessment"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black border border-gray-200 rounded-2xl hover:bg-gray-50 transition cursor-pointer text-gray-800"
              >
                Next Question <FaArrowRight />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TakeQuiz;
