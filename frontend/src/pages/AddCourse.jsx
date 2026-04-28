import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AddCourse = () => {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    teacherName: '', 
    teacherEmail: '', 
    defaultPassword: '' 
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Unified change handler: updates state based on input 'name' attribute
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem('token'); 

    try {
      await axios.post('http://localhost:5000/api/courses/add-with-teacher', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Course and Teacher registered successfully!");
      navigate('/dashboard'); 
    } catch (err) {
      // The error message from backend will now display correctly
      toast.error(err.response?.data?.error || "Failed to add course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Create Course & Register Teacher
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Course Info */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Course Title</label>
          <input 
            id="title"
            name="title"
            type="text"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
            onChange={handleChange} 
            value={formData.title}
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <input 
            id="description"
            name="description"
            type="text"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
            onChange={handleChange} 
            value={formData.description}
          />
        </div>
        
        <hr className="my-6" />
        
        {/* Teacher Info */}
        <h3 className="font-semibold text-gray-800">Assign New Teacher</h3>
        
        <div>
          <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700">Teacher Name</label>
          <input 
            id="teacherName"
            name="teacherName"
            type="text"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
            onChange={handleChange} 
            value={formData.teacherName}
          />
        </div>
        
        <div>
          <label htmlFor="teacherEmail" className="block text-sm font-medium text-gray-700">Teacher Email</label>
          <input 
            id="teacherEmail"
            name="teacherEmail"
            type="email" 
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
            onChange={handleChange} 
            value={formData.teacherEmail}
          />
        </div>

        <div>
          <label htmlFor="defaultPassword" className="block text-sm font-medium text-gray-700">Default Password</label>
          <input 
            id="defaultPassword"
            name="defaultPassword"
            type="password" 
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
            onChange={handleChange} 
            value={formData.defaultPassword}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          className={`w-full text-white py-2 px-4 rounded-md transition ${
            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? "Creating..." : "Create Course & Teacher"}
        </button>
      </form>
    </div>
  );
};

export default AddCourse;