import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaChartBar, FaFileDownload, FaUsers, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const QuizSubmissions = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissionsAndQuiz = async () => {
      try {
        const [quizRes, subsRes] = await Promise.all([
          api.get(`/quizzes/${quizId}`),
          api.get(`/quizzes/${quizId}/submissions`)
        ]);

        setQuiz(quizRes.data);
        setSubmissions(subsRes.data);
      } catch (err) {
        console.error("Error fetching submissions:", err);
        toast.error("Failed to load submission records.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionsAndQuiz();
  }, [quizId, navigate]);

  // Calculate statistics
  const totalSubmissions = submissions.length;
  const totalPossibleScore = quiz ? quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0) : 0;
  
  const averageScore = totalSubmissions > 0
    ? (submissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions).toFixed(1)
    : 0;

  const averagePercentage = totalPossibleScore > 0
    ? ((averageScore / totalPossibleScore) * 100).toFixed(0)
    : 0;

  const passedCount = submissions.filter(s => {
    const pct = (s.score / totalPossibleScore) * 100;
    return pct >= 50;
  }).length;

  const passRate = totalSubmissions > 0
    ? ((passedCount / totalSubmissions) * 100).toFixed(0)
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Loading submissions...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-gray-800 dark:text-gray-100">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/course/${quiz?.course}`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition cursor-pointer"
        >
          <FaArrowLeft /> Back to Course details
        </button>

        {/* Dashboard Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">{quiz?.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              Grade {quiz?.grade} · Total Questions: {quiz?.questions?.length} ({totalPossibleScore} points)
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-purple-200 dark:border-purple-800">
              <FaUsers /> {totalSubmissions} Attempts
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Attempts Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">{totalSubmissions}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg border border-purple-200 dark:border-purple-800">
              <FaUsers />
            </div>
          </div>

          {/* Average Score Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Average Score</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
                {averageScore} <span className="text-gray-400 dark:text-gray-500 text-sm">/ {totalPossibleScore}</span>
                <span className="text-purple-600 dark:text-purple-400 text-sm font-extrabold ml-1">({averagePercentage}%)</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg border border-blue-200 dark:border-blue-800">
              <FaChartBar />
            </div>
          </div>

          {/* Pass Rate Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Pass Rate (≥ 50%)</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
                {passRate}% <span className="text-gray-400 dark:text-gray-500 text-sm font-bold">({passedCount} passed)</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/80 text-green-600 dark:text-green-400 flex items-center justify-center text-lg border border-green-200 dark:border-green-800">
              <FaCheckCircle />
            </div>
          </div>
        </div>

        {/* Submissions List Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-800 dark:text-white">Student Attempts</h2>
          </div>

          {totalSubmissions === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-medium">
              No students have completed this quiz yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Reg No</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Grade / Type</th>
                    <th className="px-6 py-4">Completed At</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {submissions.map((sub) => {
                    const pct = totalPossibleScore > 0 ? (sub.score / totalPossibleScore) * 100 : 0;
                    const passed = pct >= 50;
                    
                    return (
                      <tr key={sub._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                          {sub.student?.registrationNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-extrabold text-gray-800 dark:text-white">{sub.student?.name}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{sub.student?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-2xs font-extrabold rounded border border-gray-200 dark:border-slate-700">
                              Grade {sub.student?.grade || 'N/A'}
                            </span>
                            <span className={`px-2 py-0.5 text-2xs font-extrabold rounded capitalize ${
                              sub.student?.studentType === 'online' ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-950/80 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800'
                            }`}>
                              {sub.student?.studentType || 'Physical'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(sub.completedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-800 dark:text-white">{sub.score}</span>
                          <span className="text-gray-400 dark:text-gray-500"> / {totalPossibleScore}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 block mt-0.5">({pct.toFixed(0)}%)</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            passed ? 'bg-green-50 dark:bg-green-950/80 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {passed ? (
                              <>
                                <FaCheckCircle /> Pass
                              </>
                            ) : (
                              <>
                                <FaExclamationCircle /> Fail
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizSubmissions;
