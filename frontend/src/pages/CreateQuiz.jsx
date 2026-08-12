import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FaBookOpen, FaPlus, FaTrash, FaArrowLeft, FaClock, FaClipboardList } from 'react-icons/fa';

const CreateQuiz = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState('');
  const [timeLimit, setTimeLimit] = useState(0); // 0 means no time limit
  
  const [questions, setQuestions] = useState([
    {
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    }
  ]);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const res = await api.get(`/courses/${courseId}`);
        setCourse(res.data);
        if (res.data.enrolledGrades && res.data.enrolledGrades.length > 0) {
          // Pre-select the first grade if available
          setGrade(res.data.enrolledGrades[0].gradeNumber);
        }
      } catch (err) {
        console.error("Error fetching course details:", err);
        toast.error("Failed to load course details.");
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourseDetails();
  }, [courseId, navigate]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1
      }
    ]);
  };

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

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, oIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) {
      toast.error("Each question must have at least 2 options.");
      return;
    }
    updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== oIndex);
    // If the correct answer index was removed or shifted, adjust it
    if (updated[qIndex].correctAnswer >= updated[qIndex].options.length) {
      updated[qIndex].correctAnswer = updated[qIndex].options.length - 1;
    }
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
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
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1} text cannot be empty.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          toast.error(`Option ${j + 1} of Question ${i + 1} cannot be empty.`);
          return;
        }
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        toast.error(`Please select a correct answer for Question ${i + 1}.`);
        return;
      }
    }

    try {
      const payload = {
        title,
        description,
        course: courseId,
        grade,
        timeLimit: parseInt(timeLimit) || 0,
        questions
      };

      await api.post('/quizzes', payload);
      toast.success("Quiz created successfully!");
      navigate(`/course/${courseId}`);
    } catch (err) {
      console.error("Error creating quiz:", err);
      toast.error(err.response?.data?.message || "Failed to create quiz.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={() => navigate(`/course/${courseId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 font-medium mb-6 transition"
        >
          <FaArrowLeft /> Back to Course details
        </button>

        {/* Title Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl font-bold">
              <FaClipboardList />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Create New Quiz</h1>
              <p className="text-gray-500 font-medium text-sm">Course: {course?.title}</p>
            </div>
          </div>
        </div>

        {/* Quiz Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Metadata Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <FaBookOpen className="text-purple-500" /> Quiz Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quiz Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mathematics Midterm Assessment"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Grade *</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                    required
                  >
                    <option value="" disabled>Select Grade</option>
                    {course?.enrolledGrades?.map((g) => (
                      <option key={g._id} value={g.gradeNumber}>
                        Grade {g.gradeNumber} {g.title && `(${g.title})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FaClock className="text-gray-400" /> Time (Mins)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0 for no limit"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Set to 0 for unlimited time.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Instructions</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the topics covered or special instructions for students..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 h-24"
              />
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-gray-800">Quiz Questions</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md shadow-purple-200 transition text-sm cursor-pointer"
              >
                <FaPlus /> Add Question
              </button>
            </div>

            {questions.map((question, qIndex) => (
              <div key={qIndex} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 relative">
                <div className="flex justify-between items-start gap-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-600 font-extrabold text-sm">
                    {qIndex + 1}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Points</label>
                      <input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => handleQuestionChange(qIndex, 'points', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-gray-400 hover:text-red-500 transition mt-4"
                      title="Delete Question"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Question Text *</label>
                  <input
                    type="text"
                    value={question.questionText}
                    onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                    placeholder="Enter the question here..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Options & Correct Answer Selection *</label>
                  <p className="text-xs text-gray-400">Select the radio button next to the correct answer option.</p>
                  
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`correctAnswer-${qIndex}`}
                        checked={question.correctAnswer === oIndex}
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                      />
                      
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                        required
                      />
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(qIndex, oIndex)}
                        className="text-gray-400 hover:text-red-500 transition"
                        title="Remove Option"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOption(qIndex)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 transition"
                  >
                    + Add Option
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`/course/${courseId}`)}
              className="px-6 py-3 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md shadow-purple-200 transition cursor-pointer"
            >
              Publish Quiz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuiz;
