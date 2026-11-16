/**
 * @file notificationHelper.js
 * @description Notification Helper Utility. Dispatches in-app notifications and alerts to users, with support for identifying and notifying linked parents of enrolled students.
 */

const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Find all Parent user accounts linked to a specific student.
 * Looks up by linkedStudents array reference OR matching parentsPhoneNumber / phoneNumber.
 * @param {string|mongoose.Types.ObjectId|Object} studentIdOrDoc 
 * @returns {Promise<Array<Object>>} List of parent user documents
 */
const getLinkedParentsForStudent = async (studentIdOrDoc) => {
  try {
    let studentId;
    let parentsPhone = null;

    if (studentIdOrDoc && typeof studentIdOrDoc === 'object' && studentIdOrDoc._id) {
      studentId = studentIdOrDoc._id;
      parentsPhone = studentIdOrDoc.parentsPhoneNumber || null;
    } else {
      studentId = studentIdOrDoc;
      const studentDoc = await User.findById(studentId).select('parentsPhoneNumber');
      if (studentDoc) {
        parentsPhone = studentDoc.parentsPhoneNumber || null;
      }
    }

    if (!studentId) return [];

    const orClauses = [
      { linkedStudents: studentId }
    ];

    if (parentsPhone && typeof parentsPhone === 'string' && parentsPhone.trim()) {
      const cleanPhone = parentsPhone.trim();
      orClauses.push({ phoneNumber: cleanPhone });
      orClauses.push({ parentsPhoneNumber: cleanPhone });
    }

    const parents = await User.find({
      role: 'parent',
      $or: orClauses
    });

    return parents || [];
  } catch (err) {
    console.error('Error fetching linked parents for student:', err);
    return [];
  }
};

/**
 * Dispatch In-App Notification(s) to all linked parents of a student.
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId|Object} params.studentIdOrDoc
 * @param {string} [params.studentName]
 * @param {string} params.type - 'QUIZ' | 'ASSIGNMENT' | 'ATTENDANCE' | 'PAYMENT' | 'GENERAL'
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.link]
 * @param {Object} [params.metadata]
 * @param {mongoose.Types.ObjectId} [params.sender]
 * @param {Array<string>} [params.channels]
 */
const notifyParentsOfStudent = async ({
  studentIdOrDoc,
  studentName = '',
  type = 'GENERAL',
  title,
  message,
  link = '/parent-dashboard',
  metadata = {},
  sender = null,
  channels = ['in_app']
}) => {
  try {
    const parents = await getLinkedParentsForStudent(studentIdOrDoc);
    if (!parents || parents.length === 0) return [];

    let targetStudentId = studentIdOrDoc;
    if (studentIdOrDoc && typeof studentIdOrDoc === 'object' && studentIdOrDoc._id) {
      targetStudentId = studentIdOrDoc._id;
      if (!studentName && studentIdOrDoc.name) {
        studentName = studentIdOrDoc.name;
      }
    }

    const notifDocs = parents.map(parent => ({
      recipient: parent._id,
      sender: sender || null,
      type,
      title,
      message,
      link,
      channels,
      metadata: {
        ...metadata,
        studentId: targetStudentId,
        studentName: studentName || undefined
      }
    }));

    const createdNotifs = await Notification.insertMany(notifDocs);
    return createdNotifs;
  } catch (err) {
    console.error('Error sending parent notification:', err);
    return [];
  }
};

/**
 * Dispatch In-App Notifications to parents of multiple students in bulk.
 * @param {Array<{student: Object|string, title: string, message: string, type?: string, link?: string, metadata?: Object}>} items 
 */
const notifyParentsInBatch = async (items) => {
  try {
    if (!Array.isArray(items) || items.length === 0) return [];

    const allNotifDocs = [];

    for (const item of items) {
      const parents = await getLinkedParentsForStudent(item.student);
      if (parents && parents.length > 0) {
        const studentId = item.student?._id || item.student;
        const studentName = item.student?.name || item.studentName || '';

        parents.forEach(parent => {
          allNotifDocs.push({
            recipient: parent._id,
            sender: item.sender || null,
            type: item.type || 'GENERAL',
            title: item.title,
            message: item.message,
            link: item.link || '/parent-dashboard',
            channels: item.channels || ['in_app'],
            metadata: {
              ...(item.metadata || {}),
              studentId,
              studentName: studentName || undefined
            }
          });
        });
      }
    }

    if (allNotifDocs.length > 0) {
      return await Notification.insertMany(allNotifDocs);
    }
    return [];
  } catch (err) {
    console.error('Error in batch parent notifications:', err);
    return [];
  }
};

module.exports = {
  getLinkedParentsForStudent,
  notifyParentsOfStudent,
  notifyParentsInBatch
};
