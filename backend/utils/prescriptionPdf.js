const PDFDocument = require('pdfkit');

const generatePrescriptionPdf = (appointment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { patientId: patient, doctorId: doctor, prescription, notes, slotStartIso, consultationType } = appointment;

    const blue = '#0ea5e9';
    const dark = '#0f172a';
    const gray = '#64748b';

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 100).fill(blue);
    doc.fillColor('white').fontSize(26).font('Helvetica-Bold').text('UniCare', 50, 28);
    doc.fontSize(11).font('Helvetica').text('Digital Health Platform', 50, 58);
    doc.text('www.unicare.health  |  support@unicare.health', 50, 74);

    // Rx symbol
    doc.fontSize(48).font('Helvetica-Bold').fillColor('white').text('℞', doc.page.width - 90, 26);

    doc.moveDown(3);

    // ── Doctor Info Box ──
    doc.fillColor(dark).fontSize(13).font('Helvetica-Bold').text('DOCTOR INFORMATION', 50, 120);
    doc.moveTo(50, 136).lineTo(doc.page.width - 50, 136).stroke(blue);

    doc.fontSize(11).font('Helvetica-Bold').fillColor(dark).text(`Dr. ${doctor.name}`, 50, 144);
    doc.font('Helvetica').fillColor(gray)
      .text(`Specialization: ${doctor.specialization || 'N/A'}`, 50, 160)
      .text(`Hospital: ${doctor.hospitalInfo?.name || 'N/A'}`, 50, 175)
      .text(`Address: ${doctor.hospitalInfo?.address || ''}, ${doctor.hospitalInfo?.city || ''}`, 50, 190)
      .text(`Phone: ${doctor.phone || 'N/A'}`, 50, 205);

    // ── Patient Info Box ──
    doc.fillColor(dark).fontSize(13).font('Helvetica-Bold').text('PATIENT INFORMATION', 50, 235);
    doc.moveTo(50, 251).lineTo(doc.page.width - 50, 251).stroke(blue);

    const apptDate = new Date(slotStartIso).toLocaleDateString('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' });
    const apptTime = new Date(slotStartIso).toLocaleTimeString('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' });

    doc.fontSize(11).font('Helvetica').fillColor(gray)
      .text(`Name: ${patient.name}`, 50, 259)
      .text(`Email: ${patient.email}`, 50, 274)
      .text(`Phone: ${patient.phone || 'N/A'}`, 50, 289)
      .text(`Age: ${patient.age || 'N/A'}   |   DOB: ${patient.dob ? new Date(patient.dob).toLocaleDateString('en-IN') : 'N/A'}`, 50, 304)
      .text(`Blood Group: ${patient.bloodGroup || 'N/A'}   |   Gender: ${patient.gender || 'N/A'}`, 50, 319)
      .text(`Consultation Date: ${apptDate} at ${apptTime}`, 50, 334)
      .text(`Consultation Type: ${consultationType}`, 50, 349);

    // ── Prescription ──
    doc.fillColor(dark).fontSize(13).font('Helvetica-Bold').text('PRESCRIPTION', 50, 380);
    doc.moveTo(50, 396).lineTo(doc.page.width - 50, 396).stroke(blue);

    doc.rect(50, 404, doc.page.width - 100, prescription ? Math.max(120, prescription.length / 2) : 120)
       .stroke('#e2e8f0');

    doc.fontSize(11).font('Helvetica').fillColor(dark)
      .text(prescription || 'No prescription provided.', 60, 414, {
        width: doc.page.width - 120,
        lineGap: 4,
      });

    const afterPrescY = doc.y + 20;

    // ── Notes / Advice ──
    if (notes) {
      doc.fillColor(dark).fontSize(13).font('Helvetica-Bold').text('DOCTOR\'S NOTES & ADVICE', 50, afterPrescY);
      doc.moveTo(50, afterPrescY + 16).lineTo(doc.page.width - 50, afterPrescY + 16).stroke(blue);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
        .text(notes, 50, afterPrescY + 24, { width: doc.page.width - 100, lineGap: 4 });
    }

    // ── Footer ──
    const footerY = doc.page.height - 80;
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke('#e2e8f0');
    doc.fontSize(9).fillColor(gray)
      .text('This prescription was generated digitally via UniCare platform.', 50, footerY + 8, { align: 'center' })
      .text('For any queries, contact support@unicare.health', 50, footerY + 22, { align: 'center' })
      .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 50, footerY + 36, { align: 'center' });

    doc.end();
  });
};

module.exports = { generatePrescriptionPdf };