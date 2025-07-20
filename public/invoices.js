// invoices.js - Professional Invoice Management System
class InvoiceManager {
    constructor() {
      this.invoicesList = document.getElementById('invoices-list');
      this.init();
    }
  
    async init() {
      try {
        await this.renderInvoices();
      } catch (error) {
        console.error('InvoiceManager initialization failed:', error);
        this.showError('Failed to initialize invoice system');
      }
    }
  
    // Format date in Indian locale
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        return isNaN(d) ? dateStr : d.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        });
      } catch {
        return dateStr;
      }
    }
  
    // Format currency in Indian Rupees
    formatCurrency(amount) {
      const num = typeof amount === 'string' 
        ? parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
        : Number(amount) || 0;
      return `₹${num.toLocaleString('en-IN')}`;
    }
  
    // Render all invoices
    async renderInvoices() {
      this.showLoading();
      
      try {
        const snapshot = await db.collection('invoices')
          .orderBy('createdAt', 'desc')
          .get();
  
        if (snapshot.empty) {
          this.showEmptyState();
          return;
        }
  
        const invoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        this.renderInvoiceList(invoices);
        this.setupEventListeners(invoices);
      } catch (err) {
        console.error('Error loading invoices:', err);
        this.showError('Failed to load invoices. Please try again.');
      }
    }
  
    showLoading() {
      this.invoicesList.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      `;
    }
  
    showEmptyState() {
      this.invoicesList.innerHTML = `
        <div class="empty-state">
          <i class="icon">📄</i>
          <h3>No Invoices Found</h3>
          <p>There are no invoices to display at this time.</p>
        </div>
      `;
    }
  
    showError(message) {
      this.invoicesList.innerHTML = `
        <div class="error-state">
          <i class="icon">⚠️</i>
          <h3>Error Loading Invoices</h3>
          <p>${message}</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;
      
      this.invoicesList.querySelector('.retry-btn')
        .addEventListener('click', () => this.renderInvoices());
    }
  
    renderInvoiceList(invoices) {
      this.invoicesList.innerHTML = `
        <div class="invoice-list-header">
          <h2>Invoices</h2>
          <span class="count-badge">${invoices.length} invoices</span>
        </div>
        <div class="invoice-list-container">
          ${invoices.map((invoice, idx) => this.renderInvoiceCard(invoice, idx)).join('')}
        </div>
      `;
    }
  
    renderInvoiceCard(invoice, idx) {
      const grandTotal = Number(invoice.totalAmount) || 0;
      const paid = Number(invoice.paidAmount) || 0;
      const balance = grandTotal - paid;
      return `
        <div class="invoice-card" data-id="${invoice.id}">
          <div class="invoice-info">
            <div class="invoice-meta">
              <span class="invoice-number">#${invoice.invoiceNumber ? invoice.invoiceNumber : 'N/A'}</span>
            </div>
            <h3 class="customer-name">${(invoice.customer && invoice.customer.name) || 'Unnamed Customer'}</h3>
            <div class="invoice-amount">${this.formatCurrency(invoice.totalAmount)}</div>
          </div>
          <div class="invoice-actions">
            <button class="action-btn view-btn" data-idx="${idx}">
              <i class="icon">👁️</i> View
            </button>
            <button class="action-btn download-btn" data-idx="${idx}">
              <i class="icon">📥</i> PDF
            </button>
            <button class="action-btn edit-btn" data-idx="${idx}">
              <i class="icon">✏️</i> Edit
            </button>
            ${balance > 0 ? `<button class="action-btn clear-balance-btn" data-idx="${idx}"><i class="icon">✔️</i> Clear Balance</button>` : ''}
          </div>
        </div>
      `;
    }
  
    setupEventListeners(invoices) {
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          this.showInvoiceModal(invoices[idx]);
        });
      });

      document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          await this.downloadInvoicePDF(invoices[idx], btn);
        });
      });

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          this.showEditModal(invoices[idx]);
        });
      });

      document.querySelectorAll('.clear-balance-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          this.showClearBalanceModal(invoices[idx]);
        });
      });

      document.querySelectorAll('.invoice-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = card.querySelector('.view-btn').dataset.idx;
          this.showInvoiceModal(invoices[idx]);
        });
      });
    }

    showClearBalanceModal(invoice) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close" aria-label="Close">&times;</button>
          <header class="modal-header">
            <h2>Clear Balance for Invoice #${invoice.invoiceNumber || invoice.id || 'N/A'}</h2>
          </header>
          <form class="clear-balance-form modal-body">
            <div class="detail-row">
              <label>Paid Amount:</label>
              <input type="number" name="paidAmount" min="0" step="0.01" value="${invoice.totalAmount}" required style="width:100%;padding:0.7rem 1rem;border:2px solid #e0e0e0;border-radius:12px;font-size:1.05rem;margin-top:0.35rem;margin-bottom:0.7rem;background:#f6fbf8;">
            </div>
            <div class="detail-row">
              <label>Due Cleared Date:</label>
              <input type="date" name="dueClearedDate" value="${new Date().toISOString().slice(0,10)}" required style="width:100%;padding:0.7rem 1rem;border:2px solid #e0e0e0;border-radius:12px;font-size:1.05rem;margin-top:0.35rem;margin-bottom:0.7rem;background:#f6fbf8;">
            </div>
            <footer class="modal-footer">
              <button class="btn save-btn" type="submit"><i class="icon">✔️</i> Mark as Cleared</button>
            </footer>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => e.target === modal && modal.remove());
      const form = modal.querySelector('.clear-balance-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const paidAmount = parseFloat(form.paidAmount.value);
        const clearedAmount = paidAmount;
        const clearedDate = form.dueClearedDate.value;
        try {
          await db.collection('invoices').doc(invoice.id).update({
            paidAmount,
            clearedAmount,
            clearedDate
          });
          alert('Balance marked as cleared!');
          modal.remove();
          this.renderInvoices();
        } catch (err) {
          alert('Failed to update invoice.');
        }
      });
    }
    showEditModal(invoice) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = this.getEditModalHTML(invoice);
      document.body.appendChild(modal);

      // Inline style for modal input fields
      this.styleModalInputs(modal);

      modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => e.target === modal && modal.remove());

      const form = modal.querySelector('.edit-invoice-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        // Build updated invoice object
        const updated = {
          customer: {
            name: formData.get('customerName'),
            phone: formData.get('customerPhone'),
            email: formData.get('customerEmail'),
            address: formData.get('customerAddress'),
            city: formData.get('customerCity'),
            zip: formData.get('customerZip')
          },
          totalAmount: parseFloat(formData.get('totalAmount')),
          paidAmount: parseFloat(formData.get('paidAmount')),
          paymentMethod: formData.get('paymentMethod'),
          upidNumber: formData.get('upidNumber'),
          upidDate: formData.get('upidDate'),
          upidRecipient: formData.get('upidRecipient')
        };
        try {
          await db.collection('invoices').doc(invoice.id).update(updated);
          alert('Invoice updated successfully!');
          modal.remove();
          this.renderInvoices();
        } catch (err) {
          alert('Failed to update invoice.');
        }
      });
    }

    // Inline style function for modal input fields
    styleModalInputs(modal) {
      const inputs = modal.querySelectorAll('input[type="text"], input[type="email"], input[type="date"], input[type="number"]');
      inputs.forEach(function(input) {
        input.style.width = "100%";
        input.style.padding = "0.7rem 1rem";
        input.style.border = "2px solid #e0e0e0";
        input.style.borderRadius = "12px";
        input.style.fontSize = "1.05rem";
        input.style.marginTop = "0.35rem";
        input.style.marginBottom = "0.7rem";
        input.style.background = "#f6fbf8";
        input.style.transition = "border-color 0.2s, box-shadow 0.2s, background 0.2s";
        input.style.boxShadow = "0 2px 8px rgba(39, 174, 96, 0.06)";
        input.style.color = "#212529";
        input.addEventListener('focus', function() {
          input.style.outline = "none";
          input.style.borderColor = "#27ae60";
          input.style.background = "#fff";
          input.style.boxShadow = "0 0 0 2px rgba(39, 174, 96, 0.12)";
        });
        input.addEventListener('blur', function() {
          input.style.borderColor = "#e0e0e0";
          input.style.background = "#f6fbf8";
          input.style.boxShadow = "0 2px 8px rgba(39, 174, 96, 0.06)";
        });
      });
    }

    getEditModalHTML(invoice) {
      const inputStyle = `width:100%;padding:0.7rem 1rem;border:2px solid #e0e0e0;border-radius:12px;font-size:1.05rem;margin-top:0.35rem;margin-bottom:0.7rem;background:#f6fbf8;transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;box-shadow:0 2px 8px rgba(39,174,96,0.06);color:#212529;`;
      const inputFocus = `onfocus="this.style.outline='none';this.style.borderColor='#27ae60';this.style.background='#fff';this.style.boxShadow='0 0 0 2px rgba(39,174,96,0.12)';" onblur="this.style.borderColor='#e0e0e0';this.style.background='#f6fbf8';this.style.boxShadow='0 2px 8px rgba(39,174,96,0.06)';"`;
      const c = invoice.customer || {};
      return `
        <div class="modal-content">
          <button class="modal-close" aria-label="Close">&times;</button>
          <header class="modal-header">
            <h2>Edit Invoice #${invoice.invoiceNumber || invoice.id || 'N/A'}</h2>
          </header>
          <form class="edit-invoice-form modal-body">
            <section class="modal-section">
              <h3 class="section-title">Customer Details</h3>
              <div class="section-content">
                <div class="detail-row"><label>Name: <input name="customerName" value="${c.name || ''}" required style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>Phone: <input name="customerPhone" value="${c.phone || ''}" required style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>Email: <input name="customerEmail" value="${c.email || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>Address: <input name="customerAddress" value="${c.address || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>City: <input name="customerCity" value="${c.city || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>Zip: <input name="customerZip" value="${c.zip || ''}" style="${inputStyle}" ${inputFocus}></label></div>
              </div>
            </section>
            <section class="modal-section">
              <h3 class="section-title">Payment Details</h3>
              <div class="section-content">
                <div class="detail-row"><label>Total Amount: <input name="totalAmount" type="number" value="${invoice.totalAmount || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>Paid Amount: <input name="paidAmount" type="number" value="${invoice.paidAmount || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>Payment Method: <input name="paymentMethod" value="${invoice.paymentMethod || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>UPI Number: <input name="upidNumber" value="${invoice.upidNumber || ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>UPI Date: <input name="upidDate" type="date" value="${invoice.upidDate ? new Date(invoice.upidDate).toISOString().slice(0,10) : ''}" style="${inputStyle}" ${inputFocus}></label></div>
                <div class="detail-row"><label>UPI Recipient: <input name="upidRecipient" value="${invoice.upidRecipient || ''}" style="${inputStyle}" ${inputFocus}></label></div>
              </div>
            </section>
            <footer class="modal-footer">
              <button class="btn save-btn" type="submit">
                <i class="icon">💾</i> Save Changes
              </button>
            </footer>
          </form>
        </div>
      `;
    }
  
    showInvoiceModal(invoice) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = this.getModalHTML(invoice);
      document.body.appendChild(modal);
      
      modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => e.target === modal && modal.remove());
      
      modal.querySelector('.download-pdf-btn').addEventListener('click', async (e) => {
        await this.downloadInvoicePDF(invoice, e.target);
      });
    }
  
    getModalHTML(invoice) {
      return `
        <div class="modal-content">
          <button class="modal-close" aria-label="Close">&times;</button>
          <header class="modal-header">
            <h2>Invoice #${invoice.invoiceNumber || invoice.id || 'N/A'}</h2>
            <div class="invoice-status">
              <span class="date">${this.formatDate(invoice.createdAt)}</span>
              <span class="amount">${this.formatCurrency(invoice.totalAmount)}</span>
            </div>
          </header>
          <div class="modal-body">
            ${this.renderModalSection('Customer Details', this.getCustomerDetailsHTML(invoice))}
            ${this.renderModalSection('Products', this.getProductsTableHTML(invoice))}
            ${this.renderModalSection('Totals & Payment', this.getTotalsAndPaymentHTML(invoice))}
          </div>
          <footer class="modal-footer">
            <button class="btn download-pdf-btn">
              <i class="icon">📥</i> Download PDF
            </button>
          </footer>
        </div>
      `;
    }
  
    renderModalSection(title, content) {
      return `
        <section class="modal-section">
          <h3 class="section-title">${title}</h3>
          <div class="section-content">${content}</div>
        </section>
      `;
    }
  
    getCustomerDetailsHTML(invoice) {
      const c = invoice.customer || {};
      return `
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${c.name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Contact:</span>
          <span class="detail-value">${c.phone || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${c.email || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span class="detail-value">
            ${[c.address, c.city, c.zip].filter(Boolean).join(', ') || 'N/A'}
          </span>
        </div>
      `;
    }
  

    // Modern product table for modal
    getProductsTableHTML(invoice) {
      if (!Array.isArray(invoice.products) || invoice.products.length === 0) {
        return '<div>No products in this invoice.</div>';
      }
      let html = `<div class="responsive-table-wrapper"><table class="product-table-modal"><thead><tr>
        <th>S.No</th><th>Name</th><th>Unit</th><th>Price</th><th>Qty</th><th>Subtotal</th>
      </tr></thead><tbody>`;
      invoice.products.forEach((p, idx) => {
        html += `<tr>
          <td>${idx + 1}</td>
          <td>${p.name || ''}</td>
          <td>${p.unit || ''}</td>
          <td>${this.formatCurrency(p.price)}</td>
          <td>${p.quantity || ''}</td>
          <td>${this.formatCurrency(p.subtotal)}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
      return html;
    }

    // Modern totals and payment section for modal
    getTotalsAndPaymentHTML(invoice) {
      // Calculate totals
      let totalProducts = 0, subtotal = 0;
      if (Array.isArray(invoice.products)) {
        invoice.products.forEach(p => {
          totalProducts += Number(p.quantity) || 0;
          subtotal += Number(p.subtotal) || 0;
        });
      }
      const grandTotal = Number(invoice.totalAmount) || subtotal;
      const paid = Number(invoice.paidAmount) || 0;
      const balance = grandTotal - paid;
      return `
        <div class="totals-list">
          <div class="detail-row"><span class="detail-label">Total Products:</span><span class="detail-value">${totalProducts}</span></div>
          <div class="detail-row"><span class="detail-label">Subtotal:</span><span class="detail-value">${this.formatCurrency(subtotal)}</span></div>
          <div class="detail-row"><span class="detail-label">Grand Total:</span><span class="detail-value">${this.formatCurrency(grandTotal)}</span></div>
          <div class="detail-row"><span class="detail-label">Paid Amount:</span><span class="detail-value">${this.formatCurrency(paid)}</span></div>
          <div class="detail-row"><span class="detail-label">Balance Due:</span><span class="detail-value">${this.formatCurrency(balance)}</span></div>
        </div>
        <div class="payment-details-list">
          <div class="detail-row"><span class="detail-label">Payment Method:</span><span class="detail-value">${invoice.paymentMethod || 'N/A'}</span></div>
          ${invoice.paymentMethod && invoice.paymentMethod.toLowerCase().includes('upi') ? `
            <div class="detail-row"><span class="detail-label">UPI Number:</span><span class="detail-value">${invoice.upidNumber || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">UPI Date:</span><span class="detail-value">${this.formatDate(invoice.upidDate)}</span></div>
            <div class="detail-row"><span class="detail-label">UPI Recipient:</span><span class="detail-value">${invoice.upidRecipient || 'N/A'}</span></div>
          ` : ''}
        </div>
      `;
    }

    getEquipmentHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Other Systems:</span>
          <span class="detail-value">${(invoice.otherSystems || []).join(', ') || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Details:</span>
          <span class="detail-value">${invoice.details || 'N/A'}</span>
        </div>
      `;
    }

    getPaymentHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Advance Paid:</span>
          <span class="detail-value">${this.formatCurrency(invoice.advanceAmount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Amount:</span>
          <span class="detail-value">${this.formatCurrency(invoice.totalAmount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${invoice.paymentMethod || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">UPI Number:</span>
          <span class="detail-value">${invoice.upidNumber || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">UPI Date:</span>
          <span class="detail-value">${this.formatDate(invoice.upidDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">UPI Recipient:</span>
          <span class="detail-value">${invoice.upidRecipient || 'N/A'}</span>
        </div>
      `;
    }

    getOtherInfoHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Referral Name:</span>
          <span class="detail-value">${invoice.referralName || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Reference:</span>
          <span class="detail-value">${invoice.reference || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Created At:</span>
          <span class="detail-value">${invoice.createdAt && invoice.createdAt.toDate ? this.formatDate(invoice.createdAt.toDate()) : 'N/A'}</span>
        </div>
      `;
    }
  
    async downloadInvoicePDF(invoice, btnEl = null) {
      if (!window.generatePremiumPDF) {
        console.error('PDF generator not available');
        return;
      }
  
      const btn = btnEl;
      const originalText = btn?.innerHTML;
      
      try {
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Generating...';
        }
  
        const pdfBlob = await window.generatePremiumPDF(invoice);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `Invoice_${invoice.bookingNumber || ''}_${invoice.contactName || 'customer'}.pdf`;
        a.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          a.remove();
        }, 100);
      } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new InvoiceManager();
  });