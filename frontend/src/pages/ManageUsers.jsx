// 1. Ensure emptyStudentForm has the phone number
const emptyStudentForm = {
  name: '',
  email: '',
  registrationNumber: '',
  parentsPhoneNumber: '', // Kept this
  grade: '',
  temporaryPassword: ''
};

// ... inside the return statement, replace the form grid and table header ...

// 2. The Form Grid (Updated to xl:grid-cols-6 to fit all 6 fields perfectly)
<form onSubmit={handleCreateStudent} className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
  {/* ... Header stays the same ... */}
  
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
    <input
      type="text"
      placeholder="Student Name"
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      value={studentForm.name}
      onChange={(e) => handleStudentFieldChange('name', e.target.value)}
      required
    />
    <input
      type="email"
      placeholder="Email"
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      value={studentForm.email}
      onChange={(e) => handleStudentFieldChange('email', e.target.value)}
      required
    />
    <input
      type="text"
      placeholder="Reg No"
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      value={studentForm.registrationNumber}
      onChange={(e) => handleStudentFieldChange('registrationNumber', e.target.value)}
      required
    />
    <input
      type="text"
      placeholder="Parent Phone"
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      value={studentForm.parentsPhoneNumber}
      onChange={(e) => handleStudentFieldChange('parentsPhoneNumber', e.target.value)}
      required
    />
    <select
      value={studentForm.grade}
      onChange={(e) => handleStudentFieldChange('grade', e.target.value)}
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none hover:cursor-pointer"
      required
    >
      <option value="">Select Grade</option>
      {gradeOptions.map(g => (
        <option key={g} value={g}>{g}</option>
      ))}
    </select>
    <input
      type="password"
      placeholder="Temp Password"
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      value={studentForm.temporaryPassword}
      onChange={(e) => handleStudentFieldChange('temporaryPassword', e.target.value)}
      required
    />
  </div>
  
  {/* ... Submit button stays same ... */}
</form>

// 3. The Table Header (Ensure Parent's Phone is included)
<thead>
  <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
    <th className="p-4 font-semibold">User</th>
    <th className="p-4 font-semibold">Email</th>
    <th className="p-4 font-semibold">Registration No.</th>
    <th className="p-4 font-semibold">Grade</th>
    <th className="p-4 font-semibold">Parent's Phone</th>
    <th className="p-4 font-semibold">Current Role</th>
    <th className="p-4 font-semibold">Password Status</th>
    <th className="p-4 font-semibold">Joined</th>
    <th className="p-4 font-semibold text-right">Actions</th>
  </tr>
</thead>