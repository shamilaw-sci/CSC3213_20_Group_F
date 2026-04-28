const Dashboard = () => {
  return (
    <div className="flex-1 bg-gray-50 p-8 min-h-screen ml-64">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Welcome back, Thanuka! 👋</h2>
        <div className="bg-white p-2 rounded-full shadow-sm">
           <span className="p-2">🔍 Search anything...</span>
        </div>
      </header>

      {/* Dummy Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Students</p>
          <h3 className="text-3xl font-bold">356</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Courses</p>
          <h3 className="text-3xl font-bold">24</h3>
        </div>
        {/* Add more cards as needed! */}
      </div>
    </div>
  );
};

export default Dashboard;