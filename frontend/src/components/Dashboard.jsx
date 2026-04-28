import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  // Retrieve the string from storage, then parse it back into a JavaScript object
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const navigate = useNavigate();

  console.log("THE USER OBJECT:", user);

  {user?.role?.toString() === 'admin' && (
    <button 
     className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
     onClick={() => navigate('/add-course')}
    >
     + Add New Course
    </button>
  )}
  
  return (
    <div className="flex-1 bg-gray-50 p-8 min-h-screen ml-64">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name || "User"}! 👋</h2>
        
        {/* 2. ADD COURSE BUTTON - Visible ONLY to Admins */}
        {user?.role === 'admin' && (
           <button 
             className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
             onClick={() => window.location.href = '/add-course'} // or your navigation logic
           >
             + Add New Course
           </button>
        )}
      </header>

      {/* Dummy Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* ... your existing cards ... */}
      </div>
    </div>
  );
  console.log("Current user object:", user);
};
// THIS LINE IS MISSING OR INCORRECT
export default Dashboard;