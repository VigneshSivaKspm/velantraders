// app.js for Royal Photography Booking Generator
// Firebase config and initialization are handled in firebaseconfig.js
// Use global auth and db from firebaseconfig.js


// Function to get the next invoice number from Firestore (sequential, robust)
async function getNextInvoiceNumber() {
  try {
    const lastSnap = await db.collection('invoices').orderBy('invoiceNumber', 'desc').limit(1).get();
    let lastInvoiceNumber = 1000;
    if (!lastSnap.empty) {
      const last = lastSnap.docs[0].data();
      if (last.invoiceNumber) lastInvoiceNumber = parseInt(last.invoiceNumber);
    }
    return lastInvoiceNumber + 1;
  } catch (err) {
    return Date.now(); // fallback
  }
}

// Wait for DOMContentLoaded to ensure form exists
// Expose handler for invoice creation from index.html
window.handleBookingSubmit = async (data, submitBtn) => {
  const originalBtnText = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span> Generating Invoice...';
  submitBtn.disabled = true;
  try {
    // Get next invoice number from Firestore
    const invoiceNumber = await getNextInvoiceNumber();
    data.invoiceNumber = invoiceNumber;

    // Generate premium PDF
    const pdfBlob = await generatePremiumPDF(data);

    // Store in Firestore (invoices collection)
    await db.collection('invoices').add({
      ...data,
      createdAt: new Date()
    });

    // Display result
    const pdfUrl = URL.createObjectURL(pdfBlob);
    document.getElementById('result').innerHTML = `
      <div class="pdf-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#27ae60">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h3>Invoice Generated Successfully!</h3>
        <div class="pdf-actions">
          <a href="${pdfUrl}" download="VelanTraders_Invoice_${invoiceNumber}.pdf" class="main-btn">
            Download PDF
          </a>
          <button onclick="printPDF('${pdfUrl}')" class="main-btn secondary">
            Print Invoice
          </button>
        </div>
        <iframe src="${pdfUrl}" width="100%" height="700px" class="pdf-preview"></iframe>
      </div>
    `;
  } catch (error) {
    console.error("Error generating invoice:", error);
    document.getElementById('result').innerHTML = `
      <div class="pdf-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#e74c3c">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <h3>Error Generating Invoice</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()" class="main-btn">Try Again</button>
      </div>
    `;
  } finally {
    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;
  }
};

// Print PDF function
window.printPDF = function(pdfUrl) {
  const printWindow = window.open(pdfUrl);
  printWindow.onload = function() {
    printWindow.print();
  };
};

// Premium PDF Generation
async function generatePremiumPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    filters: ['ASCIIHexEncode']
  });

 
  // Load all images (no watermark)
  // Try to load images, but if any fail, set to null
  async function safeToDataUrl(url) {
    try {
      return await toDataUrl(url);
    } catch (e) {
      return null;
    }
  }
  // Ensure correct filenames and order
  const [logo, sign, qr] = await Promise.all([
    safeToDataUrl('logo.png'),
    safeToDataUrl('sign.png'),
    safeToDataUrl('qr.jpg')
  ]);

  // Premium color palette
  const colors = {
    gold: '#EFBF04',
    darkGreen: '#0B3D2E', // deep royal green
    cream: '#F8F6F0',
    accentGold: '#FFD700',
    textDark: '#232323',
    textLight: '#6B6B6B',
    white: '#fff'
  };

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);

  // ...existing code...

  // ==================== PAGE CORNER BORDERS ====================
  // Minimal dark green corners, wider and closer to page edge, thinner
  const cornerLen = 40; // wider (about 14mm)
  const cornerThick = 1.2; // sleeker
  const edgePad = 8; // closer to the edge
  doc.setDrawColor(colors.darkGreen);
  doc.setLineWidth(cornerThick);
  // Top-left
  doc.line(edgePad, edgePad, edgePad + cornerLen, edgePad); // horizontal
  doc.line(edgePad, edgePad, edgePad, edgePad + cornerLen); // vertical
  // Top-right
  doc.line(pageWidth - edgePad, edgePad, pageWidth - edgePad - cornerLen, edgePad);
  doc.line(pageWidth - edgePad, edgePad, pageWidth - edgePad, edgePad + cornerLen);
  // Bottom-left
  doc.line(edgePad, pageHeight - edgePad, edgePad + cornerLen, pageHeight - edgePad);
  doc.line(edgePad, pageHeight - edgePad, edgePad, pageHeight - edgePad - cornerLen);
  // Bottom-right
  doc.line(pageWidth - edgePad, pageHeight - edgePad, pageWidth - edgePad - cornerLen, pageHeight - edgePad);
  doc.line(pageWidth - edgePad, pageHeight - edgePad, pageWidth - edgePad, pageHeight - edgePad - cornerLen);

  // ==================== HEADER SECTION ====================
  doc.setFillColor(colors.darkGreen);
  doc.roundedRect(margin, margin, contentWidth, 70, 16, 16, 'F');

  // Velan Traders Invoice Header
  doc.setFillColor(colors.gold);
  doc.circle(margin + 35, margin + 35, 28, 'F');
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', margin + 10, margin + 10, 50, 50);
    } catch (e) {}
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(colors.white);
  doc.text('VELAN TRADERS', margin + 75, margin + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('INVOICE', margin + 75, margin + 58);
  // Invoice details (right)
  doc.setFontSize(10);
  doc.setTextColor(colors.white);
  const rightX = pageWidth - margin - 25;
  doc.text(`Date : ${new Date().toLocaleDateString()}`, rightX, margin + 25, { align: 'right' });
  doc.text(`Invoice No : ${data.invoiceNumber || ''}`, rightX, margin + 40, { align: 'right' });

  // ==================== CUSTOMER SECTION ====================
  let yPos = margin + 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colors.darkGreen);
  doc.text('CUSTOMER DETAILS', margin + 12, yPos + 15);
  yPos += 42;
  const col1 = margin + 12;
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.setFont('helvetica', 'normal');
  let clientY = yPos;
  doc.text('Name', col1, clientY);
  doc.text(`: ${data.customer?.name || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Phone', col1, clientY);
  doc.text(`: ${data.customer?.phone || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Email', col1, clientY);
  doc.text(`: ${data.customer?.email || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Address', col1, clientY);
  let addressText = data.customer?.address || '';
  const wrapAddress = (text, maxLen = 30, maxLines = 3) => {
    let lines = [];
    let remaining = text.trim();
    for (let l = 0; l < maxLines && remaining.length > 0; l++) {
      if (remaining.length <= maxLen) {
        lines.push(remaining);
        remaining = '';
        break;
      }
      let breakIdx = -1;
      for (let i = maxLen - 5; i <= maxLen + 5 && i < remaining.length; i++) {
        if (remaining[i] === ' ' || remaining[i] === ',') {
          breakIdx = i;
          break;
        }
      }
      if (breakIdx === -1) breakIdx = maxLen;
      lines.push(remaining.slice(0, breakIdx));
      remaining = remaining.slice(breakIdx).trim();
    }
    if (remaining.length > 0 && lines.length < maxLines) lines.push(remaining); // last overflow
    return lines;
  };
  const addrLines = wrapAddress(addressText);
  if (addrLines.length > 0) {
    doc.text(`: ${addrLines[0]}`, col1 + 78, clientY);
    for (let i = 1; i < addrLines.length; i++) {
      clientY += 13;
      doc.text(`  ${addrLines[i]}`, col1 + 78, clientY);
    }
  } else {
    doc.text(`: `, col1 + 78, clientY);
  }
  clientY += 13;
  doc.text('City', col1, clientY);
  doc.text(`: ${data.customer?.city || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Zip Code', col1, clientY);
  doc.text(`: ${data.customer?.zip || ''}`, col1 + 78, clientY);
  yPos = clientY + 20;

  // ==================== PRODUCTS SECTION ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colors.darkGreen);
  doc.text('PRODUCTS', margin + 12, yPos + 15);
  yPos += 42;
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.setFont('helvetica', 'normal');
  // Table header
  doc.setFillColor(230, 255, 240);
  doc.rect(margin + 12, yPos, contentWidth - 24, 18, 'F');
  doc.text('S.No', margin + 16, yPos + 12);
  doc.text('Name', margin + 56, yPos + 12);
  doc.text('Unit', margin + 186, yPos + 12);
  doc.text('Price', margin + 246, yPos + 12);
  doc.text('Qty', margin + 306, yPos + 12);
  doc.text('Subtotal', margin + 356, yPos + 12);
  yPos += 28; // Add extra gap (was 22)
  let totalProducts = 0;
  let subtotal = 0;
  if (Array.isArray(data.products)) {
    data.products.forEach((p, idx) => {
      doc.text(String(idx + 1), margin + 16, yPos);
      doc.text(p.name || '', margin + 56, yPos);
      doc.text(p.unit || '', margin + 186, yPos);
      doc.text(String(p.price ?? ''), margin + 246, yPos);
      doc.text(String(p.quantity ?? ''), margin + 306, yPos);
      doc.text((p.subtotal !== undefined ? p.subtotal.toFixed(2) : ''), margin + 356, yPos);
      yPos += 16;
      totalProducts += p.quantity || 0;
      subtotal += p.subtotal || 0;
    });
  }
  yPos += 10;
  // Totals below table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(colors.darkGreen);
  doc.text('Total Products:', margin + 16, yPos);
  doc.text(String(totalProducts), margin + 96, yPos);
  doc.text('Subtotal:', margin + 186, yPos);
  doc.text(formatCurrency(subtotal), margin + 246, yPos);
  yPos += 16;
  doc.setFont('helvetica', 'normal');

  // ==================== PAYMENT SECTION ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colors.darkGreen);
  doc.text('PAYMENT DETAILS', margin + 12, yPos + 15);
  yPos += 42;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textDark);
  let payY = yPos;
  function cleanAmount(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
  }
  let total = cleanAmount(data.totalAmount);
  let paid = cleanAmount(data.paidAmount);
  let balance = total - paid;
  // List Grand Total, Paid Amount, Balance Due one by one
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(colors.darkGreen);
  doc.text('Grand Total', margin + 12, payY);
  doc.text(`: ${formatCurrency(total)}`, margin + 100, payY);
  payY += 13;
  doc.text('Paid Amount', margin + 12, payY);
  doc.text(`: ${formatCurrency(paid)}`, margin + 100, payY);
  payY += 13;
  doc.text('Balance Due', margin + 12, payY);
  doc.text(`: ${formatCurrency(balance)}`, margin + 100, payY);
  payY += 16;
  // Show cleared details if present
  if (data.clearedAmount && data.clearedDate) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(colors.gold);
    doc.text('Cleared Amount', margin + 12, payY);
    doc.text(`: ${formatCurrency(data.clearedAmount)}`, margin + 100, payY);
    payY += 13;
    doc.text('Cleared Date', margin + 12, payY);
    doc.text(`: ${formatDate(data.clearedDate)}`, margin + 100, payY);
    payY += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(colors.textDark);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  // Optionally, show payment method and UPI details after
  doc.text('Payment Method', margin + 12, payY);
  doc.text(`: ${data.paymentMethod || ''}`, margin + 100, payY);
  payY += 13;
  if (data.paymentMethod === 'Upid/Gpay') {
    if (data.upidNumber) {
      doc.text('UPI Number', margin + 12, payY);
      doc.text(`: ${data.upidNumber}`, margin + 100, payY);
      payY += 13;
    }
    if (data.upidDate) {
      doc.text('Date', margin + 12, payY);
      doc.text(`: ${formatDate(data.upidDate)}`, margin + 100, payY);
      payY += 13;
    }
    if (data.upidRecipient) {
      doc.text('Recipient', margin + 12, payY);
      doc.text(`: ${data.upidRecipient}`, margin + 100, payY);
      payY += 13;
    }
  }
  yPos = payY + 20;

// --- Date formatting helpers ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
}
function formatDateTime(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d)) return dtStr;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

  // ==================== SIGNATURE SECTION ====================
  doc.setDrawColor(colors.gold);
  doc.setLineWidth(1);
  doc.line(pageWidth - margin - 150, yPos, pageWidth - margin, yPos);
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.text('Customer Signature', pageWidth - margin - 75, yPos + 20, { align: 'center' });
  // Only customer signature here
  yPos = yPos + 70; // Add space after customer signature section

  // ==================== FOOTER SIGNATURE (Managing Director) ====================
  // Place sign above the 'Managing Director' label in the footer
  const directorLabelX = pageWidth - margin - 60; // center label under signature image
  const directorFooterGap = 40; // increase gap between footer and director content
  const directorLabelY = pageHeight - margin - 60 - directorFooterGap;
  if (sign) {
    try {
      doc.addImage(sign, 'PNG', directorLabelX - 40, directorLabelY - 50, 80, 40);
    } catch (e) {}
  }
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.text('Managing Director', directorLabelX, directorLabelY, { align: 'center' });
  doc.text('Velan Traders', directorLabelX, directorLabelY + 14, { align: 'center' });

  // ==================== FOOTER ====================
  yPos = pageHeight - margin - 40;
  doc.setFillColor(colors.darkGreen);
  doc.roundedRect(margin, yPos, contentWidth, 40, 10, 10, 'F');
  doc.setFontSize(11);
  doc.setTextColor(colors.white);
  doc.setFont('times', 'bold');
  doc.text('Velan Traders', margin + 12, yPos + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  // Add clickable phone and email in footer
  const footerPhone = '+91 97158 25150';
  const footerEmail = 'velantraders@gmail.com';
  const phoneLabel = 'Phone: ';
  const emailLabel = 'Email: ';
  let xFooter = margin + 12;
  let yFooter = yPos + 33;
  // Phone clickable
  doc.text(phoneLabel, xFooter, yFooter);
  xFooter += doc.getTextWidth(phoneLabel);
  doc.textWithLink(footerPhone, xFooter, yFooter, { url: `tel:${footerPhone.replace(/[^0-9+]/g, '')}` });
  xFooter += doc.getTextWidth(footerPhone) + 3;
  doc.text('|', xFooter, yFooter);
  xFooter += doc.getTextWidth('|') + 3;
  doc.text(emailLabel, xFooter, yFooter);
  xFooter += doc.getTextWidth(emailLabel);
  doc.textWithLink(footerEmail, xFooter, yFooter, { url: `mailto:${footerEmail}` });

  // Place qr.png inside the footer bar, bottom right
  if (qr) {
    try {
      const qrFooterSize = 36;
      const qrFooterY = yPos + 2;
      const qrFooterX = pageWidth - margin - qrFooterSize - 8; // 8px padding from right
      doc.addImage(qr, 'PNG', qrFooterX, qrFooterY, qrFooterSize, qrFooterSize);
    } catch (e) {
      console.error('Error drawing qr.png in footer:', e);
    }
  } else {
    console.warn('qr.png not loaded or not found.');
  }

  let baseY = margin + 90 + 15; // Name
  let phoneY = baseY + 13; // Phone
  let emailY = phoneY + 13; // Email
  // Phone clickable
  if (data.phone) {
    const phoneX = col1 + 78;
    doc.textWithLink(`: ${data.phone}`, phoneX, phoneY, { url: `tel:${String(data.phone).replace(/[^0-9+]/g, '')}` });
  }
  // Email clickable
  if (data.email) {
    const emailX = col1 + 78;
    doc.textWithLink(`: ${data.email}`, emailX, emailY, { url: `mailto:${data.email}` });
  }

  return doc.output('blob');
}

function formatCurrency(amount) {
  let num = 0;
  if (typeof amount === 'string') {
    num = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  } else {
    num = Number(amount) || 0;
  }
  return 'Rs. ' + num.toLocaleString('en-IN');
}

// Helper: convert image to base64
function toDataUrl(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      const reader = new FileReader();
      reader.onloadend = function() {
        resolve(reader.result);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  });
}