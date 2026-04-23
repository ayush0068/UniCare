const PDFDocument = require('pdfkit');

const generatePrescriptionPdf = (appointment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const {
      patientId: patient,
      doctorId: doctor,
      prescription,
      notes,
      symptoms,
      slotStartIso,
      consultationType,
      _id,
      parchiId: parchi,
      visitNumber = 1,
    } = appointment;

    const W = 595.28;
    const NAVY = '#1a3a5c';
    const BLUE = '#0ea5e9';
    const LIGHT_BLUE_BG = '#f0f9ff';
    const SLATE = '#475569';
    const DARK = '#0f172a';
    const BORDER = '#e2e8f0';
    const YELLOW_BG = '#fffbeb';
    const YELLOW_BORDER = '#fbbf24';
    const GREEN = '#16a34a';

    const apptDate = new Date(slotStartIso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const apptTime = new Date(slotStartIso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });

    // Parchi info
    const parchiNumber = parchi?.parchiNumber || `RX-${_id.toString().slice(-8).toUpperCase()}`;
    const parchiExpiry = parchi?.expiryDate
      ? new Date(parchi.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : 'N/A';
    const visitLabel = `Visit ${visitNumber}`;

    const generatedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // ─── HEADER ───────────────────────────────────────────────
    doc.rect(0, 0, 430, 110).fill(NAVY);
    doc.rect(430, 0, W - 430, 110).fill(BLUE);

    doc.fillColor('white').fontSize(28).font('Helvetica-Bold').text('UNICARE', 32, 22, { characterSpacing: 3 });
    doc.fillColor('#93c5fd').fontSize(10).font('Helvetica').text('DIGITAL HEALTH PLATFORM', 32, 55, { characterSpacing: 3 });
    doc.fillColor('#bfdbfe').fontSize(9.5).font('Helvetica')
      .text('support@unicare.health  |  www.unicare.health', 32, 73)
      .text('24/7 Helpline: 1800-UNI-CARE', 32, 88);

    doc.fillColor('white').fontSize(58).font('Helvetica-Bold').text('Rx', 455, 18, { width: 100, align: 'center' });
    doc.fillColor('#e0f2fe').fontSize(9).font('Helvetica').text('PRESCRIPTION', 430, 88, { width: W - 430, align: 'center', characterSpacing: 2 });

    // ─── PARCHI / OPD SLIP BAR ────────────────────────────────
    // Green bar for parchi info — real doctor parchi jaisi
    doc.rect(0, 110, W, 32).fill('#f0fdf4');
    doc.moveTo(0, 142).lineTo(W, 142).strokeColor(GREEN).lineWidth(1.5).stroke();

    const parchiItems = [
      ['OPD Parchi No:', parchiNumber],
      ['Valid Till:', parchiExpiry],
      [visitLabel === 'Visit 1' ? 'Status:' : 'Visit:', visitLabel === 'Visit 1' ? 'First Visit' : visitLabel],
      ['Date:', apptDate],
    ];
    const parchiColW = W / 4;
    parchiItems.forEach(([label, val], i) => {
      const x = i * parchiColW + 14;
      doc.fillColor('#15803d').fontSize(7.5).font('Helvetica-Bold').text(label, x, 118, { characterSpacing: 0.5 });
      doc.fillColor('#14532d').fontSize(9).font('Helvetica-Bold').text(val, x, 128);
    });

    // ─── META BAR ─────────────────────────────────────────────
    doc.rect(0, 142, W, 26).fill(LIGHT_BLUE_BG);
    doc.moveTo(0, 168).lineTo(W, 168).strokeColor(BLUE).lineWidth(1).stroke();

    const metaItems = [
      ['Appointment ID:', `APT-${_id.toString().slice(-8).toUpperCase()}`],
      ['Type:', consultationType],
      ['Time:', apptTime + ' IST'],
      ['Consultation:', visitNumber === 1 ? 'Full Fee' : visitNumber <= 3 ? 'Free (Loyalty)' : visitNumber === 4 ? 'Half Fee' : 'Full Fee'],
    ];
    const colW = W / 4;
    metaItems.forEach(([label, val], i) => {
      const x = i * colW + 14;
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica').text(label, x, 149);
      doc.fillColor(DARK).fontSize(8.5).font('Helvetica-Bold').text(val, x, 158);
    });

    // ─── INFO BOXES (Doctor + Patient) ───────────────────────
    let y = 180;
    const boxW = (W - 48) / 2;
    const leftX = 16;
    const rightX = leftX + boxW + 16;

    const drawInfoBox = (x, title, rows) => {
      doc.rect(x, y, boxW, 20).fill(NAVY);
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(title, x + 10, y + 6, { characterSpacing: 1.5 });
      const bodyH = rows.length * 17 + 14;
      doc.rect(x, y + 20, boxW, bodyH).fill('#fafafa');
      doc.rect(x, y + 20, boxW, bodyH).strokeColor(BORDER).lineWidth(0.5).stroke();
      rows.forEach(([label, val], i) => {
        const ry = y + 28 + i * 17;
        doc.fillColor(SLATE).fontSize(9).font('Helvetica').text(label, x + 10, ry);
        doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(val || 'N/A', x + 100, ry, { width: boxW - 110, ellipsis: true });
      });
      return y + 20 + bodyH;
    };

    const doctorRows = [
      ['Name', `Dr. ${doctor.name}`],
      ['Specialization', doctor.specialization || 'N/A'],
      ['Qualification', doctor.qualification || 'MBBS, MD'],
      ['Hospital', doctor.hospitalInfo?.name || 'N/A'],
      ['City', doctor.hospitalInfo?.city || 'N/A'],
      ['Contact', doctor.phone || 'N/A'],
    ];
    const patientRows = [
      ['Name', patient.name],
      ['Age / Gender', `${patient.age || 'N/A'} Yrs / ${patient.gender || 'N/A'}`],
      ['Date of Birth', patient.dob ? new Date(patient.dob).toLocaleDateString('en-IN') : 'N/A'],
      ['Blood Group', patient.bloodGroup || 'N/A'],
      ['Phone', patient.phone || 'N/A'],
      ['Email', patient.email],
    ];

    const bottomOfBoxes = drawInfoBox(leftX, 'DOCTOR INFORMATION', doctorRows);
    drawInfoBox(rightX, 'PATIENT INFORMATION', patientRows);
    y = bottomOfBoxes + 16;

    // ─── SYMPTOMS ─────────────────────────────────────────────
    if (symptoms) {
      doc.rect(leftX, y, 3, 46).fill(BLUE);
      doc.rect(leftX + 3, y, W - 32, 46).fill(LIGHT_BLUE_BG);
      doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold').text('CHIEF COMPLAINTS / SYMPTOMS', leftX + 14, y + 8, { characterSpacing: 1 });
      doc.fillColor('#0c4a6e').fontSize(9.5).font('Helvetica').text(symptoms, leftX + 14, y + 21, { width: W - 50, lineGap: 3 });
      y += 58;
    }

    // ─── RX SECTION TITLE ─────────────────────────────────────
    doc.fillColor(BLUE).fontSize(22).font('Helvetica-Bold').text('Rx', leftX, y);
    doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold').text('MEDICATIONS PRESCRIBED', leftX + 30, y + 8, { characterSpacing: 1.5 });
    doc.moveTo(leftX + 30, y + 19).lineTo(W - 16, y + 19).strokeColor(BLUE).lineWidth(1).stroke();
    y += 26;

    // ─── PRESCRIPTION TABLE ───────────────────────────────────
    const tableHeaders = ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
    const colWidths = [22, 148, 60, 80, 62, 100];
    const tableX = leftX;

    doc.rect(tableX, y, W - 32, 20).fill(NAVY);
    let cx = tableX + 8;
    tableHeaders.forEach((h, i) => {
      doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold').text(h, cx, y + 6, { width: colWidths[i], characterSpacing: 0.5 });
      cx += colWidths[i];
    });
    y += 20;

    let rxLines = [];
    if (prescription) {
      const lines = prescription.split('\n').filter(l => l.trim());
      rxLines = lines.map((line, idx) => {
        const parts = line.replace(/^\d+\.\s*/, '').split('|').map(p => p.trim());
        if (parts.length >= 2) {
          return [String(idx + 1), parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || ''];
        }
        return [String(idx + 1), line.replace(/^\d+\.\s*/, ''), '', '', '', ''];
      });
    }
    if (rxLines.length === 0) {
      rxLines = [['1', prescription || 'As directed by the doctor', '', '', '', '']];
    }

    rxLines.forEach((row, i) => {
      const rowBg = i % 2 === 0 ? 'white' : '#f8fafc';
      const rowH = 22;
      doc.rect(tableX, y, W - 32, rowH).fill(rowBg).strokeColor(BORDER).lineWidth(0.3).stroke();
      cx = tableX + 8;
      row.forEach((cell, ci) => {
        if (ci === 1) {
          doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(cell, cx, y + 7, { width: colWidths[ci] - 4, ellipsis: true });
        } else {
          doc.fillColor(SLATE).fontSize(9).font('Helvetica').text(cell, cx, y + 7, { width: colWidths[ci] - 4, ellipsis: true });
        }
        cx += colWidths[ci];
      });
      y += rowH;
    });
    y += 16;

    // ─── NOTES ────────────────────────────────────────────────
    if (notes) {
      doc.rect(leftX, y, W - 32, 14).fill(YELLOW_BORDER);
      doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold').text("DOCTOR'S ADVICE & NOTES", leftX + 10, y + 3, { characterSpacing: 1 });
      y += 14;
      const noteTextH = Math.max(50, Math.ceil(notes.length / 90) * 14 + 20);
      doc.rect(leftX, y, W - 32, noteTextH).fill(YELLOW_BG).strokeColor(YELLOW_BORDER).lineWidth(0.5).stroke();
      doc.fillColor('#78350f').fontSize(9.5).font('Helvetica').text(notes, leftX + 10, y + 10, { width: W - 52, lineGap: 3 });
      y += noteTextH + 16;
    }

    // ─── SIGNATURE ROW ────────────────────────────────────────
    const sigY = y + 2;
    const halfW = (W - 48) / 2;

    doc.moveTo(leftX, sigY + 38).lineTo(leftX + halfW, sigY + 38).strokeColor(NAVY).lineWidth(1).stroke();
    doc.fillColor(SLATE).fontSize(9).font('Helvetica').text('Patient / Guardian Signature', leftX, sigY + 42, { width: halfW, align: 'center' });

    const dSigX = leftX + halfW + 16;
    doc.moveTo(dSigX, sigY + 38).lineTo(dSigX + halfW, sigY + 38).strokeColor(NAVY).lineWidth(1).stroke();
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(`Dr. ${doctor.name}`, dSigX, sigY + 42, { width: halfW, align: 'center' });
    doc.fillColor(SLATE).fontSize(8.5).font('Helvetica').text(`${doctor.specialization || ''}`, dSigX, sigY + 55, { width: halfW, align: 'center' });

    // ─── FOOTER ───────────────────────────────────────────────
    const footerY = doc.page.height - 48;
    doc.rect(0, footerY, W, 48).fill(NAVY);
    doc.fillColor('#93c5fd').fontSize(8.5).font('Helvetica')
      .text(`OPD Parchi: ${parchiNumber}  |  Valid till: ${parchiExpiry}  |  ${visitLabel}`, 20, footerY + 8, { width: W - 120 })
      .text(`This is a digitally generated prescription via UniCare. For queries: support@unicare.health`, 20, footerY + 22, { width: W - 120 })
      .text(`Generated: ${generatedAt} IST`, 20, footerY + 36, { width: W - 120 });

    doc.rect(W - 90, footerY + 10, 74, 26).fill(BLUE);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('UNICARE', W - 90, footerY + 17, { width: 74, align: 'center', characterSpacing: 2 });

    doc.end();
  });
};

module.exports = { generatePrescriptionPdf };