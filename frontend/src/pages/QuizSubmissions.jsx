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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/course/${quiz?.course}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 font-medium transition cursor-pointer"
        >
          <FaArrowLeft /> Back to Course details
        </button>

        {/* Dashboard Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-800">{quiz?.title}</h1>
            <p className="text-gray-500 font-medium text-sm">
              Grade {quiz?.grade} · Total Questions: {quiz?.questions?.length} ({totalPossibleScore} points)
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <FaUsers /> {totalSubmissions} Attempts
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Attempts Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{totalSubmissions}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
              <FaUsers />
            </div>
          </div>

          {/* Average Score Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Average Score</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">
                {averageScore} <span className="text-gray-400 text-sm">/ {totalPossibleScore}</span>
                <span className="text-purple-600 text-sm font-extrabold ml-1">({averagePercentage}%)</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <FaChartBar />
            </div>
          </div>

          {/* Pass Rate Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pass Rate (≥ 50%)</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">
                {passRate}% <span className="text-gray-400 text-sm font-bold">({passedCount} passed)</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg">
              <FaCheckCircle />
            </div>
          </div>
        </div>

        {/* Submissions List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-800">Student Attempts</h2>
          </div>

          {totalSubmissions === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              No students have completed this quiz yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Reg No</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Grade / Type</th>
                    <th className="px-6 py-4">Completed At</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm text-gray-700 font-medium">
                  {submissions.map((sub) => {
                    const pct = totalPossibleScore > 0 ? (sub.score / totalPossibleScore) * 100 : 0;
                    const passed = pct >= 50;

                    return (
                      <tr key={sub._id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-mono text-gray-500">
                          {sub.student?.registrationNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-extrabold text-gray-800">{sub.student?.name}</div>
                            <div className="text-xs text-gray-400">{sub.student?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-2xs font-extrabold rounded">
                              Grade {sub.student?.grade || 'N/A'}
                            </span>
                            <span className={`px-2 py-0.5 text-2xs font-extrabold rounded capitalize ${sub.student?.studentType === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                              }`}>
                              {sub.student?.studentType || 'Physical'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(sub.completedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-800">{sub.score}</span>
                          <span className="text-gray-400"> / {totalPossibleScore}</span>
                          <span className="text-xs text-gray-400 block mt-0.5">({pct.toFixed(0)}%)</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${passed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
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
