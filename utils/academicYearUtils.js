const AcademicYear = require('../models/AcademicYear');

/**
 * Ensures a request body has an academicYear assigned.
 * If missing, it tries to find the current one, then any one, 
 * and finally creates a default one if none exist.
 */
const ensureAcademicYear = async (reqBody, schoolId) => {
  if (reqBody.academicYear) return reqBody.academicYear;

  let currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
  
  if (!currentYear) {
    currentYear = await AcademicYear.findOne({ schoolId }).sort({ startDate: -1 });
  }

  if (!currentYear) {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const endYear = startYear + 1;
    
    currentYear = await AcademicYear.create({
      name: `${startYear}-${endYear}`,
      schoolId,
      startDate: new Date(startYear, 3, 1),
      endDate: new Date(endYear, 2, 31),
      isCurrent: true,
      status: 'Active'
    });
  }

  return currentYear._id;
};

module.exports = { ensureAcademicYear };
