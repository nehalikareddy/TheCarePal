require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Medicine = require('./models/Medicine');
const DoseLog = require('./models/DoseLog');
const HandoverNote = require('./models/HandoverNote');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in environment variables. Please check your .env file.');
  process.exit(1);
}

// Helper for relative date string "YYYY-MM-DD"
const getDateStr = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // Clear existing data to allow fresh re-seeding
    console.log('Clearing existing demo data...');
    await User.deleteMany({ email: { $in: ['rohan.family@demo.com', 'kavita.nurse@demo.com'] } });
    await Patient.deleteMany({ careCode: '482910' });

    // Find any medicines and logs that belonged to careCode 482910 if left over
    // Will link fresh IDs below
    const passwordHash = await bcrypt.hash('Demo@123', 10);

    // 1. Create Patient
    console.log('Creating Patient Ramesh Verma...');
    const patient = await Patient.create({
      name: 'Ramesh Verma',
      age: 74,
      condition: 'Post-Stroke & Hypertension Care',
      careCode: '482910'
    });

    // Clean up any old records referencing this careCode if re-running
    await Medicine.deleteMany({ patientId: patient._id });
    await DoseLog.deleteMany({ patientId: patient._id });
    await HandoverNote.deleteMany({ patientId: patient._id });

    // 2. Create Demo Users
    console.log('Creating Demo Users (Family & Caretaker)...');
    const familyUser = await User.create({
      name: 'Rohan Verma',
      email: 'rohan.family@demo.com',
      password: passwordHash,
      role: 'family',
      patients: [patient._id]
    });

    const caretakerUser = await User.create({
      name: 'Nurse Kavita R.',
      email: 'kavita.nurse@demo.com',
      password: passwordHash,
      role: 'caretaker',
      patients: [patient._id]
    });

    // Update patient createdBy to familyUser
    patient.createdBy = familyUser._id;
    await patient.save();

    // 3. Create 5 Medicines
    console.log('Seeding 5 Prescribed Medicines...');
    const startDate = getDateStr(-15);
    const endDate = getDateStr(30);

    const medsData = [
      {
        name: 'Pantoprazole',
        strength: '40mg',
        dose: '1 tablet',
        times: ['07:30'],
        food: 'before',
        currentStock: 14,
        lowStockThresholdDays: 3,
        prescriptionImageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=60'
      },
      {
        name: 'Telmisartan',
        strength: '40mg',
        dose: '1 tablet',
        times: ['08:30'],
        food: 'after',
        currentStock: 2, // Triggers immediate low stock warning (runs out in 2 days)
        lowStockThresholdDays: 3,
        prescriptionImageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=60'
      },
      {
        name: 'Metformin',
        strength: '500mg',
        dose: '1 tablet',
        times: ['09:00', '21:00'],
        food: 'after',
        currentStock: 24,
        lowStockThresholdDays: 3,
        prescriptionImageUrl: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&auto=format&fit=crop&q=60'
      },
      {
        name: 'Donepezil',
        strength: '5mg',
        dose: '1 tablet',
        times: ['14:00'],
        food: 'after',
        currentStock: 10,
        lowStockThresholdDays: 3,
        prescriptionImageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=60'
      },
      {
        name: 'Atorvastatin',
        strength: '10mg',
        dose: '1 tablet',
        times: ['21:30'],
        food: 'after',
        currentStock: 18,
        lowStockThresholdDays: 3,
        prescriptionImageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=600&auto=format&fit=crop&q=60'
      }
    ];

    const createdMedicines = {};
    for (const m of medsData) {
      const doc = await Medicine.create({
        patientId: patient._id,
        startDate,
        endDate,
        ...m
      });
      createdMedicines[m.name] = doc;
    }

    // 4. Past 7 Days Dose Logs (Day -7 to Day -1 = 42 doses: 38 given, 4 skipped)
    console.log('Generating 7-day dose history (38 Given, 4 Skipped with reasons)...');
    const doseLogsToInsert = [];

    // Daily schedule slots:
    // 07:30 Pantoprazole
    // 08:30 Telmisartan
    // 09:00 Metformin
    // 14:00 Donepezil
    // 21:00 Metformin
    // 21:30 Atorvastatin

    for (let dayOffset = -7; dayOffset <= -1; dayOffset++) {
      const dateStr = getDateStr(dayOffset);

      // Pantoprazole 07:30
      doseLogsToInsert.push({
        patientId: patient._id,
        medicineId: createdMedicines['Pantoprazole']._id,
        scheduledDate: dateStr,
        scheduledTime: '07:30',
        status: 'given',
        reasonText: '',
        loggedBy: 'Nurse Kavita R.',
        loggedAt: new Date(`${dateStr}T07:35:00Z`)
      });

      // Telmisartan 08:30
      if (dayOffset === -2) {
        // Day -2 Skipped
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Telmisartan']._id,
          scheduledDate: dateStr,
          scheduledTime: '08:30',
          status: 'skipped',
          reasonText: 'Fasting for morning blood test',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T08:32:00Z`)
        });
      } else {
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Telmisartan']._id,
          scheduledDate: dateStr,
          scheduledTime: '08:30',
          status: 'given',
          reasonText: '',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T08:34:00Z`)
        });
      }

      // Metformin 09:00
      doseLogsToInsert.push({
        patientId: patient._id,
        medicineId: createdMedicines['Metformin']._id,
        scheduledDate: dateStr,
        scheduledTime: '09:00',
        status: 'given',
        reasonText: '',
        loggedBy: 'Nurse Kavita R.',
        loggedAt: new Date(`${dateStr}T09:05:00Z`)
      });

      // Donepezil 14:00
      if (dayOffset === -5) {
        // Day -5 Skipped
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Donepezil']._id,
          scheduledDate: dateStr,
          scheduledTime: '14:00',
          status: 'skipped',
          reasonText: 'Patient fell asleep right after lunch',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T14:15:00Z`)
        });
      } else if (dayOffset === -1) {
        // Day -1 Skipped
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Donepezil']._id,
          scheduledDate: dateStr,
          scheduledTime: '14:00',
          status: 'skipped',
          reasonText: 'Refused afternoon tablet; took evening medicines normally',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T14:10:00Z`)
        });
      } else {
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Donepezil']._id,
          scheduledDate: dateStr,
          scheduledTime: '14:00',
          status: 'given',
          reasonText: '',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T14:03:00Z`)
        });
      }

      // Metformin 21:00
      if (dayOffset === -3) {
        // Day -3 Skipped
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Metformin']._id,
          scheduledDate: dateStr,
          scheduledTime: '21:00',
          status: 'skipped',
          reasonText: 'Mild acidity after dinner; held evening dose',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T21:12:00Z`)
        });
      } else {
        doseLogsToInsert.push({
          patientId: patient._id,
          medicineId: createdMedicines['Metformin']._id,
          scheduledDate: dateStr,
          scheduledTime: '21:00',
          status: 'given',
          reasonText: '',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T21:05:00Z`)
        });
      }

      // Atorvastatin 21:30
      doseLogsToInsert.push({
        patientId: patient._id,
        medicineId: createdMedicines['Atorvastatin']._id,
        scheduledDate: dateStr,
        scheduledTime: '21:30',
        status: 'given',
        reasonText: '',
        loggedBy: 'Nurse Kavita R.',
        loggedAt: new Date(`${dateStr}T21:35:00Z`)
      });
    }

    // 5. Today (Day 0)
    // Mark 07:30 Pantoprazole as given; leave remaining 5 pending for live evaluation
    const todayStr = getDateStr(0);
    doseLogsToInsert.push({
      patientId: patient._id,
      medicineId: createdMedicines['Pantoprazole']._id,
      scheduledDate: todayStr,
      scheduledTime: '07:30',
      status: 'given',
      reasonText: '',
      loggedBy: 'Nurse Kavita R.',
      loggedAt: new Date(`${todayStr}T07:32:00Z`)
    });

    await DoseLog.insertMany(doseLogsToInsert);

    // 6. Bonus Handover Notes
    console.log('Seeding Handover Notes...');
    await HandoverNote.create([
      {
        patientId: patient._id,
        shift: 'Night to Day',
        noteText: 'Patient had a calm night. Blood pressure monitored at 128/82. Slept 7 hours smoothly without dizziness.',
        authorName: 'Nurse Kavita R.',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000)
      },
      {
        patientId: patient._id,
        shift: 'Day to Night',
        noteText: 'Afternoon Donepezil refused by patient as noted. Evening Metformin and Atorvastatin taken after dinner with warm water.',
        authorName: 'Nurse Kavita R.',
        createdAt: new Date(Date.now() - 14 * 3600 * 1000)
      }
    ]);

    console.log('\n=========================================');
    console.log('  SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=========================================');
    console.log('Patient: Ramesh Verma (Age 74) | Care Code: 482910');
    console.log('Demo Family: rohan.family@demo.com / Demo@123');
    console.log('Demo Caretaker: kavita.nurse@demo.com / Demo@123');
    console.log('7-Day History: 38 Given, 4 Skipped (90.5% adherence)');
    console.log('Today: 1 Given (07:30 Pantoprazole), 5 Pending');
    console.log('=========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
