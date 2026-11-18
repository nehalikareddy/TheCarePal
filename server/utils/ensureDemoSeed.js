const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const HandoverNote = require('../models/HandoverNote');
const { formatDateIST, shiftDaysIST } = require('./dateIST');

async function ensureDemoSeed({ forceReset = false } = {}) {
  const existingFamily = await User.findOne({ email: 'rohan.family@demo.com' });
  if (existingFamily && !forceReset) {
    return { seeded: false, message: 'Demo dataset already present.' };
  }

  if (forceReset) {
    await Promise.all([
      User.deleteMany({ email: { $in: ['rohan.family@demo.com', 'kavita.nurse@demo.com'] } }),
      Patient.deleteMany({ careCode: '482910' }),
    ]);
  }

  const hashedPassword = await bcrypt.hash('Demo@123', 10);

  const familyUser = await User.findOneAndUpdate(
    { email: 'rohan.family@demo.com' },
    {
      name: 'Rohan Verma',
      email: 'rohan.family@demo.com',
      password: hashedPassword,
      role: 'family',
    },
    { upsert: true, returnDocument: 'after' }
  );

  const caretakerUser = await User.findOneAndUpdate(
    { email: 'kavita.nurse@demo.com' },
    {
      name: 'Nurse Kavita R.',
      email: 'kavita.nurse@demo.com',
      password: hashedPassword,
      role: 'caretaker',
    },
    { upsert: true, returnDocument: 'after' }
  );

  let patient = await Patient.findOne({ careCode: '482910' });
  if (!patient) {
    patient = await Patient.create({
      name: 'Ramesh Verma',
      age: 74,
      condition: 'Post-Stroke & Hypertension Care',
      careCode: '482910',
      createdBy: familyUser._id,
    });
  }

  await User.updateMany(
    { _id: { $in: [familyUser._id, caretakerUser._id] } },
    { $addToSet: { patients: patient._id } }
  );

  await Medicine.deleteMany({ patientId: patient._id });
  await DoseLog.deleteMany({ patientId: patient._id });
  await HandoverNote.deleteMany({ patientId: patient._id });

  const startDate = shiftDaysIST(-15);
  const endDate = shiftDaysIST(30);

  const medicines = await Medicine.insertMany([
    {
      patientId: patient._id,
      name: 'Pantoprazole',
      strength: '40mg',
      dose: '1 tablet',
      times: ['07:30'],
      food: 'before',
      startDate,
      endDate,
      currentStock: 14,
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Telmisartan',
      strength: '40mg',
      dose: '1 tablet',
      times: ['08:30'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 2, // Triggers immediate "Runs out in 2 days" alert
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Metformin',
      strength: '500mg',
      dose: '1 tablet',
      times: ['09:00', '21:00'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 24,
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Donepezil',
      strength: '5mg',
      dose: '1 tablet',
      times: ['14:00'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 10,
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Atorvastatin',
      strength: '10mg',
      dose: '1 tablet',
      times: ['21:30'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 18,
      lowStockThresholdDays: 3,
    },
  ]);

  const skippedExceptions = {
    [`${shiftDaysIST(-5)}_Donepezil_14:00`]: 'Patient fell asleep right after lunch',
    [`${shiftDaysIST(-3)}_Metformin_21:00`]: 'Mild acidity after dinner; held evening dose',
    [`${shiftDaysIST(-2)}_Telmisartan_08:30`]: 'Fasting for morning blood test',
    [`${shiftDaysIST(-1)}_Donepezil_14:00`]: 'Refused afternoon tablet; took evening medicines normally',
  };

  const logsToInsert = [];

  for (let dayOffset = -7; dayOffset <= -1; dayOffset += 1) {
    const dateStr = shiftDaysIST(dayOffset);
    for (const med of medicines) {
      for (const time of med.times) {
        const key = `${dateStr}_${med.name}_${time}`;
        const skipReason = skippedExceptions[key];
        logsToInsert.push({
          patientId: patient._id,
          medicineId: med._id,
          scheduledDate: dateStr,
          scheduledTime: time,
          status: skipReason ? 'skipped' : 'given',
          reasonText: skipReason || '',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T${time}:00+05:30`),
        });
      }
    }
  }

  // Today (Day 0): Mark only 07:30 Pantoprazole as given; leave remaining 5 doses Pending
  const todayStr = formatDateIST();
  const pantoprazole = medicines.find((m) => m.name === 'Pantoprazole');
  if (pantoprazole) {
    logsToInsert.push({
      patientId: patient._id,
      medicineId: pantoprazole._id,
      scheduledDate: todayStr,
      scheduledTime: '07:30',
      status: 'given',
      reasonText: '',
      loggedBy: 'Nurse Kavita R.',
      loggedAt: new Date(`${todayStr}T07:32:00+05:30`),
    });
  }

  await DoseLog.insertMany(logsToInsert);

  await HandoverNote.insertMany([
    {
      patientId: patient._id,
      shift: 'Night to Day',
      noteText: 'Slept well through the night. Morning BP 128/82 mmHg. Gave Pantoprazole before breakfast.',
      authorName: 'Nurse Kavita R.',
    },
  ]);

  return { seeded: true, message: 'Demo dataset seeded successfully.' };
}

module.exports = { ensureDemoSeed };
