// Data repository for Kirula Education Center & LuminaLearn Platform

export const INSTITUTE_INFO = {
  name: "Kirula Education Center",
  platform: "LuminaLearn",
  fullTitle: "LuminaLearn by Kirula Education Center",
  tagline: "Online Learning & Institute Management Platform",
  description: "LuminaLearn is the official online learning and comprehensive institute management platform of Kirula Education Center, Menikhinna, Kandy.",
  owner: {
    name: "Mr. Chaminda Kumara Herath",
    role: "Founder & Director",
    phone: "071 7577 688",
    email: "ckumarah@gmail.com",
    hours: "8:00 AM - 6:00 PM daily",
    photo: "/assets/founder_photo.png"
  },
  address: {
    line1: "Kirula Education Center",
    street: "621 road",
    city: "Menikhinna",
    district: "Kandy",
    full: "Kirula Education Center, 621 road, Menikhinna, Kandy"
  },
  policies: {
    admissionAndFees: "Physical students Monthly fees are payable on or before the 7th of every month. Online payments are updated instantly.",
    attendance: "Physical attendance is logged via QR code/Barcode counter. Online students mark attendance via weekly lesson access."
  },
  contact: {
    supportEmail: "admin.luminalearn@gmail.com",
    phone: "071 7577 688"
  },
  copyright: "LuminaLearn by Kirula Education Center @ 2026",
  developers: [
    { name: "Thanuka Vishal", email: "thanukavishal22@gmail.com", role: "Lead Developer" },
    { name: "Pathum Gunawardhana", email: "s21060@sci.pdn.ac.lk", role: "Software Engineer" },
    { name: "Sakindu Rathnasiri", email: "s21486@sci.pdn.ac.lk", role: "Software Engineer" },
    { name: "Rashmika Wijewardhana", email: "s21580@sci.pdn.ac.lk", role: "Software Engineer" }
  ]
};

export const INSTRUCTORS = [
  {
    id: "pathum-gunawardhana",
    name: "Mr. Pathum Gunawardhana",
    subject: "Science",
    category: "Science",
    grades: "Grade 6 - 9 & O/L (Grade 10, Grade 11)",
    singleLineSummary: "Grade 6 - 11 (Saturday & Sunday)",
    photo: "/assets/pathum_gunawardhana.png",
    defaultPhoto: "/assets/default_instructor_icon.png",
    fees: "Rs. 1000 - 1500/month",
    feeBreakdown: "Grade 6 - 9: Rs. 1000 | Grade 10: Rs. 1200 | Grade 11: Rs. 1500",
    bio: "Experienced Science lecturer focusing on conceptual clarity, practical understanding, and O/L paper preparation.",
    schedules: [
      { grade: "Grade 6", day: "Saturday", time: "9.30 AM - 11.30 AM", fee: "Rs. 1000/month" },
      { grade: "Grade 7", day: "Saturday", time: "7.30 AM - 9.30 AM", fee: "Rs. 1000/month" },
      { grade: "Grade 8", day: "Saturday", time: "11.30 AM - 1.30 PM", fee: "Rs. 1000/month" },
      { grade: "Grade 9", day: "Saturday", time: "1.30 PM - 3.30 PM", fee: "Rs. 1000/month" },
      { grade: "Grade 10 (O/L)", day: "Saturday", time: "3.30 PM - 5.30 PM", fee: "Rs. 1200/month" },
      { grade: "Grade 11 (O/L)", day: "Sunday", time: "8.30 AM - 12.30 PM", fee: "Rs. 1500/month" }
    ]
  },
  {
    id: "sankha-dissanayake",
    name: "Mr. Sankha Dissanayake",
    subject: "Scholarship",
    category: "Primary",
    grades: "Grade 2 - 5",
    singleLineSummary: "Grade 2 - 5 (Sunday)",
    photo: "/assets/sankha_dissanayake.png",
    defaultPhoto: "/assets/default_instructor_icon.png",
    fees: "Rs. 1200/month",
    feeBreakdown: "Grade 2 - 5: Rs. 1200/month",
    bio: "Specialist Grade 5 Scholarship examination mentor empowering young minds with problem-solving and speed techniques.",
    schedules: [
      { grade: "Grade 2 & Grade 3", day: "Sunday", time: "1.00 PM - 3.00 PM", fee: "Rs. 1200/month" },
      { grade: "Grade 4 & Grade 5", day: "Sunday", time: "3.00 PM - 5.00 PM", fee: "Rs. 1200/month" }
    ]
  },
  {
    id: "lasantha-wedagedara",
    name: "Mr. Lasantha Wedagedara",
    subject: "Mathematics",
    category: "Mathematics",
    grades: "Grade 6 - 9 & O/L (Grade 10, Grade 11)",
    singleLineSummary: "Grade 6 - 11 (Saturday & Sunday)",
    photo: "/assets/lasantha_wedagedara.png",
    defaultPhoto: "/assets/default_instructor_icon.png",
    fees: "Rs. 1000 - 1500/month",
    feeBreakdown: "Grade 6 - 9: Rs. 1000 | Grade 10: Rs. 1200 | Grade 11: Rs. 1500",
    bio: "Renowned Mathematics instructor dedicated to building strong logical foundation and exam mastery.",
    schedules: [
      { grade: "Grade 6", day: "Saturday", time: "11.30 AM - 1.30 PM", fee: "Rs. 1000/month" },
      { grade: "Grade 7", day: "Saturday", time: "9.30 AM - 11.30 AM", fee: "Rs. 1000/month" },
      { grade: "Grade 8", day: "Saturday", time: "7.30 AM - 9.30 AM", fee: "Rs. 1000/month" },
      { grade: "Grade 9", day: "Sunday", time: "1.30 PM - 3.30 PM", fee: "Rs. 1000/month" },
      { grade: "Grade 10 (O/L)", day: "Sunday", time: "3.30 PM - 5.30 PM", fee: "Rs. 1200/month" },
      { grade: "Grade 11 (O/L)", day: "Saturday", time: "1.30 PM - 5.30 PM", fee: "Rs. 1500/month" }
    ]
  },
  {
    id: "chaminda-kumara-herath",
    name: "Mr. Chaminda Kumara Herath",
    subject: "Sinhala",
    category: "Sinhala",
    grades: "O/L Grade 10 and Grade 11",
    singleLineSummary: "Grade 10 & 11 O/L (Sunday)",
    photo: "/assets/founder_photo.png",
    defaultPhoto: "/assets/founder_photo.png",
    fees: "Rs. 1200/month",
    feeBreakdown: "Grade 10 & Grade 11: Rs. 1200/month",
    bio: "Founder of Kirula Education Center and expert Sinhala language lecturer specializing in O/L literature, grammar, and essay writing.",
    schedules: [
      { grade: "Grade 10 (O/L)", day: "Sunday", time: "3.30 PM - 5.30 PM", fee: "Rs. 1200/month" },
      { grade: "Grade 11 (O/L)", day: "Sunday", time: "1.30 PM - 3.30 PM", fee: "Rs. 1200/month" }
    ]
  },
  {
    id: "kevin-daraniyagala",
    name: "Mr. Kevin Daraniyagala",
    subject: "English (Secondary & O/L)",
    category: "English",
    grades: "Grade 6 - 9 & O/L (Grade 10, Grade 11)",
    singleLineSummary: "Grade 6 - 11 (Saturday)",
    photo: "/assets/kevin_daraniyagala.png",
    defaultPhoto: "/assets/default_instructor_icon.png",
    fees: "Rs. 1000 - 1500/month",
    feeBreakdown: "Grade 6 - 9: Rs. 1000 | Grade 10: Rs. 1200 | Grade 11: Rs. 1500",
    bio: "Dynamic English educator boosting student confidence in grammar, comprehension, vocabulary, and O/L paper structure.",
    schedules: [
      { grade: "Grade 6", day: "Saturday", time: "7.30 AM - 9.30 AM", fee: "Rs. 1000/month" },
      { grade: "Grade 7", day: "Saturday", time: "11.30 AM - 1.30 PM", fee: "Rs. 1000/month" },
      { grade: "Grade 8", day: "Saturday", time: "9.30 AM - 11.30 AM", fee: "Rs. 1000/month" },
      { grade: "Grade 9", day: "Saturday", time: "3.30 PM - 5.30 PM", fee: "Rs. 1000/month" },
      { grade: "Grade 10 (O/L)", day: "Saturday", time: "1.30 PM - 3.30 PM", fee: "Rs. 1200/month" },
      { grade: "Grade 11 (O/L)", day: "Saturday", time: "5.30 PM - 7.30 PM", fee: "Rs. 1500/month" }
    ]
  },
  {
    id: "rashmi-gunawardhana",
    name: "Miss Rashmi Gunawardhana",
    subject: "English (Primary)",
    category: "English",
    grades: "Grade 1 - 5",
    singleLineSummary: "Grade 1 - 5 (Saturday & Sunday)",
    photo: "/assets/rashmi_gunawardhana.png",
    defaultPhoto: "/assets/default_instructor_icon.png",
    fees: "Rs. 1000/month",
    feeBreakdown: "Grade 1 - 5: Rs. 1000/month",
    bio: "Engaging primary English mentor creating a fun, interactive learning environment for foundation students.",
    schedules: [
      { grade: "Group 1", day: "Saturday", time: "11.30 AM - 1.30 PM", fee: "Rs. 1000/month" },
      { grade: "Group 2", day: "Sunday", time: "3.30 PM - 5.30 PM", fee: "Rs. 1000/month" }
    ]
  }
];

// Helper function to extract master timetable list
export const GET_MASTER_TIMETABLE = () => {
  const list = [];
  INSTRUCTORS.forEach(inst => {
    inst.schedules.forEach(sched => {
      list.push({
        id: `${inst.id}-${sched.grade}-${sched.day}`,
        subject: inst.subject,
        instructor: inst.name,
        grade: sched.grade,
        day: sched.day,
        time: sched.time,
        fees: sched.fee || inst.fees,
        instructorPhoto: inst.photo,
        defaultPhoto: inst.defaultPhoto
      });
    });
  });
  return list;
};

// Helper function to extract diverse preview for Landing Page
export const GET_DIVERSE_TIMETABLE_PREVIEW = () => {
  const previewList = [];
  INSTRUCTORS.forEach((inst, index) => {
    if (inst.schedules && inst.schedules.length > 0) {
      // Pick a clean representative schedule from each instructor
      const sched = inst.schedules[index % inst.schedules.length] || inst.schedules[0];
      previewList.push({
        id: `preview-${inst.id}-${sched.grade}`,
        subject: inst.subject,
        instructor: inst.name,
        grade: sched.grade,
        day: sched.day,
        time: sched.time,
        fees: sched.fee || inst.fees,
        instructorPhoto: inst.photo,
        defaultPhoto: inst.defaultPhoto
      });
    }
  });
  return previewList;
};
