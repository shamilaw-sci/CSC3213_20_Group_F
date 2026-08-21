import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { 
  FaBookOpen, FaPlus, FaTrash, FaArrowLeft, FaClock, 
  FaClipboardList, FaImage, FaCheckCircle, FaCalendarAlt,
  FaCheckSquare, FaDotCircle, FaToggleOn, FaLightbulb, FaPercentage
} from 'react-icons/fa';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CreateQuiz = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(quizId);
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImgIndex, setUploadingImgIndex] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState('');
  const [month, setMonth] = useState('August');
  const [weekNumber, setWeekNumber] = useState(1);
  const [timeLimit, setTimeLimit] = useState(0); // 0 means no time limit
  const [passingPercentage, setPassingPercentage] = useState(50);
  
  const [questions, setQuestions] = useState([
    {
      questionText: '',
      questionImage: '',
      questionType: 'mcq', // 'mcq' | 'multiple' | 'true_false'
      options: ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: [0],
      points: 1,
      explanation: ''
    }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course details
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);

        if (!isEditMode && courseRes.data.enrolledGrades && courseRes.data.enrolledGrades.length > 0) {
          setGrade(courseRes.data.enrolledGrades[0].gradeNumber);
        }

        // If in Edit Mode, fetch existing quiz data
        if (isEditMode) {
          const quizRes = await api.get(`/quizzes/${quizId}`);
          const qData = quizRes.data;
          
          setTitle(qData.title || '');
          setDescription(qData.description || '');
          setGrade(qData.grade || '');
          setMonth(qData.month || 'August');
          setWeekNumber(qData.weekNumber !== undefined ? qData.weekNumber : 1);
          setTimeLimit(qData.timeLimit || 0);
          setPassingPercentage(qData.passingPercentage || 50);

          if (qData.questions && qData.questions.length > 0) {
            setQuestions(qData.questions.map(q => ({
              questionText: q.questionText || '',
              questionImage: q.questionImage || '',
              questionType: q.questionType || (q.options?.length === 2 && q.options[0] === 'True' && q.options[1] === 'False' ? 'true_false' : 'mcq'),
              options: q.options || ['', '', '', ''],
              correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
              correctAnswers: q.correctAnswers && q.correctAnswers.length > 0 ? q.correctAnswers : [q.correctAnswer || 0],
              points: q.points || 1,
              explanation: q.explanation || ''
            })));
          }
        }
      } catch (err) {
        console.error("Error fetching quiz/course data:", err);
        toast.error("Failed to load details.");
        navigate(`/course/${courseId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, quizId, isEditMode, navigate]);

  // Handle Question Type Change
  const handleTypeChange = (qIndex, newType) => {
    const updated = [...questions];
    const targetQ = updated[qIndex];
    targetQ.questionType = newType;

    if (newType === 'true_false') {
      targetQ.options = ['True', 'False'];
      targetQ.correctAnswer = 0;
      targetQ.correctAnswers = [0];
    } else if (newType === 'multiple') {
      if (targetQ.options.length < 2) {
        targetQ.options = ['', '', '', ''];
      }
      targetQ.correctAnswers = [targetQ.correctAnswer || 0];
    } else {
      // mcq
      if (targetQ.options.length < 2) {
        targetQ.options = ['', '', '', ''];
      }
      targetQ.correctAnswer = targetQ.correctAnswers?.[0] || 0;
    }

    setQuestions(updated);
  };

  // Add Question
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        questionImage: '',
        questionType: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: 0,
        correctAnswers: [0],
        points: 1,
        explanation: ''
      }
    ]);
  };

  // Remove Question
  const handleRemoveQuestion = (qIndex) => {
    if (questions.length === 1) {
      toast.error("A quiz must have at least one question.");
      return;
    }
    const updated = questions.filter((_, idx) => idx !== qIndex);
    setQuestions(updated);
  };

  const handleQuestionChange = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex][field] = value;
    setQuestions(updated);
  };

  // Option text change
  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  // Add Option
  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  // Remove Option
  const handleRemoveOption = (qIndex, oIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) {
      toast.error("Each question must have at least 2 options.");
      return;
    }
    updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== oIndex);
    
    // Adjust single correct answer
    if (updated[qIndex].correctAnswer >= updated[qIndex].options.length) {
      updated[qIndex].correctAnswer = updated[qIndex].options.length - 1;
    }
    // Adjust multi-select correct answers
    updated[qIndex].correctAnswers = (updated[qIndex].correctAnswers || [])
      .filter(idx => idx !== oIndex)
      .map(idx => idx > oIndex ? idx - 1 : idx);

    if (updated[qIndex].correctAnswers.length === 0) {
      updated[qIndex].correctAnswers = [0];
    }

    setQuestions(updated);
  };

  // Toggle multi-select correct answer index
  const handleToggleMultiCorrect = (qIndex, oIndex) => {
    const updated = [...questions];
    const currentCorrects = updated[qIndex].correctAnswers || [];
    
    if (currentCorrects.includes(oIndex)) {
      if (currentCorrects.length === 1) {
        toast.error("At least one option must be marked as correct.");
        return;
      }
      updated[qIndex].correctAnswers = currentCorrects.filter(idx => idx !== oIndex);
    } else {
      updated[qIndex].correctAnswers = [...currentCorrects, oIndex].sort((a, b) => a - b);
    }
    setQuestions(updated);
  };

  // Handle Question Image Upload (< 1MB)
  const handleImageUpload = async (qIndex, file) => {
    if (!file) return;

    // Check size < 1MB
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image file size must be less than 1MB.");
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImgIndex(qIndex);
    try {
      const res = await api.post('/quizzes/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updated = [...questions];
      updated[qIndex].questionImage = res.data.imageUrl;
      setQuestions(updated);
      toast.success("Question image uploaded successfully!");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error(err.response?.data?.message || "Failed to upload image.");
    } finally {
      setUploadingImgIndex(null);
    }
  };

  // Remove Question Image
  const handleRemoveImage = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].questionImage = '';
    setQuestions(updated);
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Quiz title is required.");
      return;
    }
    if (!grade) {
      toast.error("Please select a target grade.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const hasText = q.questionText && q.questionText.trim().length > 0;
      const hasImg = q.questionImage && q.questionImage.trim().length > 0;

      if (!hasText && !hasImg) {
        toast.error(`Question ${i + 1} must have question text or an uploaded image (or both).`);
        return;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          toast.error(`Option ${j + 1} of Question ${i + 1} cannot be empty.`);
          return;
        }
      }

      if (q.questionType === 'multiple') {
        if (!q.correctAnswers || q.correctAnswers.length === 0) {
          toast.error(`Please select at least one correct answer for Question ${i + 1}.`);
          return;
        }
      } else {
        if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          toast.error(`Please select a correct answer for Question ${i + 1}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        course: courseId,
        grade,
        month,
        weekNumber: parseInt(weekNumber, 10),
        timeLimit: parseInt(timeLimit, 10) || 0,
        passingPercentage: parseInt(passingPercentage, 10) || 50,
        questions
      };

      if (isEditMode) {
        await api.put(`/quizzes/${quizId}`, payload);
        toast.success("Quiz updated successfully!");
      } else {
        await api.post('/quizzes', payload);
        toast.success("Quiz published successfully!");
      }

      navigate(`/course/${courseId}`);
    } catch (err) {
      console.error("Error saving quiz:", err);
      toast.error(err.response?.data?.message || "Failed to save quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Loading quiz editor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => navigate(`/course/${courseId}`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 font-bold mb-2 transition cursor-pointer"
        >
          <FaArrowLeft /> Back to Course details
        </button>

        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-purple-100 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center text-2xl font-bold shadow-inner">
              <FaClipboardList />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Assessment Quiz' : 'Create New Assessment Quiz'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  isEditMode ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                }`}>
                  {isEditMode ? 'Edit Mode' : 'New Quiz'}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-xs mt-0.5">Course: <strong>{course?.title}</strong></p>
            </div>
          </div>
        </div>

        {/* Quiz Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Metadata Section */}
          {/* Metadata Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-purple-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-black text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <FaBookOpen className="text-purple-600 dark:text-purple-400" /> Quiz Details & Curriculum Schedule
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mathematics Midterm Assessment - Unit 3"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>

              {/* Grade Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Target Grade *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                  required
                >
                  <option value="" disabled>Select Target Grade</option>
                  {course?.enrolledGrades?.map((g) => (
                    <option key={g._id} value={g.gradeNumber}>
                      Grade {g.gradeNumber} {g.title && `(${g.title})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                  <FaCalendarAlt className="text-purple-600 dark:text-purple-400" /> Curriculum Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Week Number */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Lesson Week Number
                </label>
                <select
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                >
                  <option value={1}>Week 1</option>
                  <option value={2}>Week 2</option>
                  <option value={3}>Week 3</option>
                  <option value={4}>Week 4</option>
                  <option value={0}>All Weeks / General Assessment</option>
                </select>
              </div>

              {/* Time Limit & Passing % */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                    <FaClock className="text-purple-600 dark:text-purple-400" /> Time (Mins)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0 for unlimited"
                    min="0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">0 = No limit</span>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                    <FaPercentage className="text-purple-600 dark:text-purple-400" /> Pass %
                  </label>
                  <input
                    type="number"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Math.min(100, Math.max(1, parseInt(e.target.value) || 50)))}
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block mt-1">Default 50%</span>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Description / Student Instructions
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the topics covered, marking criteria, or special instructions for students..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 h-20"
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Quiz Questions ({questions.length})</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Create questions using text, diagram image uploads (&lt; 1MB), or both.</p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-md shadow-purple-200 transition text-sm cursor-pointer"
              >
                <FaPlus /> Add Question
              </button>
            </div>

            {questions.map((question, qIndex) => {
              const qType = question.questionType || 'mcq';
              const isMulti = qType === 'multiple';
              const isTF = qType === 'true_false';

              return (
                <div key={qIndex} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border-2 border-purple-100/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 relative transition hover:border-purple-200 dark:hover:border-slate-700">
                  
                  {/* Top Bar: Question #, Type Switcher, Points, Trash */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-2xl bg-purple-900 text-white font-black text-sm flex items-center justify-center shadow-sm">
                        {qIndex + 1}
                      </span>
                      
                      {/* Question Type Switcher Pills */}
                      <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl border border-gray-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleTypeChange(qIndex, 'mcq')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                            qType === 'mcq' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <FaDotCircle /> Single Choice (MCQ)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTypeChange(qIndex, 'multiple')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                            qType === 'multiple' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <FaCheckSquare /> Multiple Select
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTypeChange(qIndex, 'true_false')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                            qType === 'true_false' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <FaToggleOn /> True / False
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-100 dark:border-purple-800">
                        <label className="text-xs font-black text-purple-900 dark:text-purple-300">Points:</label>
                        <input
                          type="number"
                          min="1"
                          value={question.points}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 px-1 py-0.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-lg text-center font-black text-xs text-purple-950 dark:text-white focus:outline-none"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                        title="Delete Question"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Question Text Input */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                      placeholder="Type the question content here..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  {/* Image Upload Area (< 1MB) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <FaImage className="text-purple-600 dark:text-purple-400" /> Question Diagram / Image (Optional, &lt; 1MB)
                    </label>
                    
                    {question.questionImage ? (
                      <div className="relative inline-block border-2 border-purple-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm max-w-sm">
                        <img 
                          src={question.questionImage.startsWith('http') ? question.questionImage : `http://localhost:5000${question.questionImage}`} 
                          alt="Question diagram"
                          className="max-h-48 object-contain bg-gray-50 dark:bg-slate-800 p-2"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(qIndex)}
                          className="absolute top-2 right-2 px-2.5 py-1 bg-red-600 text-white font-bold text-xs rounded-xl shadow hover:bg-red-700 transition cursor-pointer"
                        >
                          ✕ Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer">
                          <FaImage /> {uploadingImgIndex === qIndex ? 'Uploading...' : 'Upload Image (< 1MB)'}
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                            onChange={(e) => handleImageUpload(qIndex, e.target.files[0])}
                            disabled={uploadingImgIndex === qIndex}
                            className="hidden"
                          />
                        </label>
                        <span className="text-xs text-gray-400 font-medium">Supports JPG, PNG, WebP, GIF, SVG</span>
                      </div>
                    )}
                  </div>

                  {/* Options List & Visual Answer Marking */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          Options & Correct Answer Selection *
                        </label>
                        <p className="text-xs text-gray-400 font-medium">
                          {isMulti 
                            ? 'Check the boxes for all correct answers.' 
                            : isTF 
                            ? 'Select True or False as the correct statement.' 
                            : 'Select the radio circle next to the correct answer.'}
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <FaCheckCircle /> Marked in Green
                      </span>
                    </div>

                    {/* Options Grid */}
                    <div className="space-y-3">
                      {question.options.map((option, oIndex) => {
                        const isCorrectSingle = !isMulti && question.correctAnswer === oIndex;
                        const isCorrectMulti = isMulti && (question.correctAnswers || []).includes(oIndex);
                        const isMarked = isCorrectSingle || isCorrectMulti;

                        return (
                          <div 
                            key={oIndex} 
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition ${
                              isMarked 
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 shadow-xs' 
                                : 'bg-gray-50/50 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-slate-600'
                            }`}
                          >
                            {/* Radio or Checkbox */}
                            {isMulti ? (
                              <input
                                type="checkbox"
                                checked={isCorrectMulti}
                                onChange={() => handleToggleMultiCorrect(qIndex, oIndex)}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                title="Mark as Correct Answer"
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`correctAnswer-${qIndex}`}
                                checked={isCorrectSingle}
                                onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                                className="w-5 h-5 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                title="Mark as Correct Answer"
                              />
                            )}

                            {/* Option text input */}
                            <input
                              type="text"
                              value={option}
                              disabled={isTF} // TF options are fixed to True/False
                              onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className={`flex-1 px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-sm font-semibold focus:outline-none ${
                                isMarked 
                                  ? 'border-emerald-400 dark:border-emerald-500 font-black text-emerald-950 dark:text-emerald-200' 
                                  : 'border-gray-200 dark:border-slate-700 focus:border-purple-500 text-gray-800 dark:text-white'
                              }`}
                              required
                            />

                            {/* Visual Correct Badge */}
                            {isMarked && (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs shrink-0">
                                <FaCheckCircle /> Correct Answer
                              </span>
                            )}

                            {/* Remove option button (not available for True/False) */}
                            {!isTF && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(qIndex, oIndex)}
                                className="text-gray-400 hover:text-red-500 transition p-1 cursor-pointer"
                                title="Remove Option"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!isTF && (
                      <button
                        type="button"
                        onClick={() => handleAddOption(qIndex)}
                        className="text-xs font-black text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline flex items-center gap-1.5 pt-1 cursor-pointer"
                      >
                        <FaPlus /> Add Another Option
                      </button>
                    )}
                  </div>

                  {/* Explanation / Rationale Input */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <FaLightbulb className="text-amber-500" /> Explanation / Rationale (Optional)
                    </label>
                    <input
                      type="text"
                      value={question.explanation || ''}
                      onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                      placeholder="Explain why the selected option(s) is correct (displayed to student after submitting)..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-xl text-xs font-medium text-amber-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Actions Bar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-purple-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/course/${courseId}`)}
              className="w-full sm:w-auto px-6 py-3 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-2xl shadow-lg shadow-purple-200 dark:shadow-none transition cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving Quiz...
                </>
              ) : isEditMode ? (
                'Save & Update Quiz'
              ) : (
                'Publish Quiz'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateQuiz;
