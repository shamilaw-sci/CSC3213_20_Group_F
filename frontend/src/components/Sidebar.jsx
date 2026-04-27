import { FaThLarge, FaBook, FaUserCheck, FaWallet, FaChartBar } from "react-icons/fa";

const Sidebar = () => {
  const menuItems = [
    { name: "Dashboard", icon: <FaThLarge /> },
    { name: "Courses", icon: <FaBook /> },
    { name: "Attendance", icon: <FaUserCheck /> },
    { name: "Payments", icon: <FaWallet /> },
    { name: "Analytics", icon: <FaChartBar /> },
  ];

  return (
    <div className="w-64 bg-lumina-purple h-screen text-white flex flex-col p-6 fixed left-0 top-0">
      <h1 className="text-2xl font-bold mb-10 flex items-center gap-2">
        <span className="text-yellow-400">💡</span> LuminaLearn
      </h1>
      <nav className="flex flex-col gap-4">
        {menuItems.map((item) => (
          <div key={item.name} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition">
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;