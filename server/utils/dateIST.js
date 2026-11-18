const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + IST_OFFSET_MS);
}

function formatDateIST(baseDate = new Date()) {
  return getISTDate(baseDate).toISOString().split('T')[0];
}

function formatTimeIST(baseDate = new Date()) {
  return getISTDate(baseDate).toISOString().slice(11, 16);
}

function shiftDaysIST(daysOffset, baseDate = new Date()) {
  const shifted = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return formatDateIST(shifted);
}

module.exports = {
  getISTDate,
  formatDateIST,
  formatTimeIST,
  shiftDaysIST,
};
