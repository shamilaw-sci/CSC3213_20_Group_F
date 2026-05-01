import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/courses/add-with-teacher', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Course and Teacher created successfully!");
      
      // Redirect to dashboard after success
      navigate('/dashboard');
      
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Create Course & Register Teacher</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-sm font-medium text-gray-700">Course Title</label>
          <input 
            type="text" 
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea 
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
        </div>

        <hr className="my-4" />

        <h3 className="font-semibold text-gray-700">Assign New Teacher</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Teacher Name</label>
          <input 
            type="text" 
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.teacherName}
            onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Teacher Email</label>
          <input 
            type="email" 
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.teacherEmail}
            onChange={(e) => setFormData({...formData, teacherEmail: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Password</label>
          <input 
            type="password" 
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.defaultPassword}
            onChange={(e) => setFormData({...formData, defaultPassword: e.target.value})}
            required
            autoComplete="new-password" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className={`w-full text-white p-3 rounded-lg font-bold transition ${isLoading ? 'bg-gray-400' : 'bg-lumina-purple hover:bg-purple-800'}`}
        >
          {isLoading ? 'Processing...' : 'Create Course & Teacher'}
        </button>
      </form>
    </div>
  );
};

export default AddCourse;