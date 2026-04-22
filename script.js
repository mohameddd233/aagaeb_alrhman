// ========== بيانات التخزين المحلي ==========// ========== بيانات التخزين المحلي ==========
let users = JSON.parse(localStorage.getItem('users')) || [
    { 
        id: 1, 
        username: 'admin', 
        password: 'admin123', 
        role: 'مدير', 
        fullName: 'أحمد مدير النظام',
        permissions: ['all']
    },
    { 
        id: 2, 
        username: 'emp', 
        password: 'emp123', 
        role: 'موظف', 
        fullName: 'سارة الموظفة',
        permissions: ['pos', 'customers', 'customerList', 'invoiceSearch', 'notes']
    }
];

let branches = JSON.parse(localStorage.getItem('branches')) || [{ id: 1, name: 'الفرع الرئيسي - القاهرة' }];

// ========== ترقية المنتجات القديمة لنظام الدُفعات ==========
let products = JSON.parse(localStorage.getItem('products')) || [];

// دالة ترقية المنتجات القديمة إلى نظام الدُفعات
function upgradeProductsToBatches() {
    let needsSave = false;
    products.forEach(p => {
        if (!p.batches) {
            // تحويل المنتج القديم إلى نظام الدُفعات
            p.batches = [];
            if (p.stock > 0) {
                p.batches.push({
                    id: 1,
                    quantity: p.stock,
                    expiryDate: p.expiryDate || null,
                    purchaseDate: new Date().toISOString().split('T')[0],
                    purchasePrice: p.priceWholesale || 0
                });
            }
            needsSave = true;
        }
        // تحديث المخزون الإجمالي
        p.stock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
    });
    if (needsSave) {
        localStorage.setItem('products', JSON.stringify(products));
    }
}

if (products.length === 0) {
    products = [
        { 
            id: 1, 
            name: 'طعام قطط 2كجم', 
            priceWholesale: 75, 
            priceRetail: 85, 
            image: '🐱', 
            imageType: 'emoji',
            batches: [
                { id: 1, quantity: 10, expiryDate: '2025-06-01', purchaseDate: '2024-01-01', purchasePrice: 60 },
                { id: 2, quantity: 10, expiryDate: '2025-12-01', purchaseDate: '2024-03-01', purchasePrice: 65 }
            ]
        },
        { 
            id: 2, 
            name: 'طعام كلاب 3كجم', 
            priceWholesale: 100, 
            priceRetail: 120, 
            image: '🐕', 
            imageType: 'emoji',
            batches: [
                { id: 1, quantity: 8, expiryDate: '2025-08-15', purchaseDate: '2024-02-01', purchasePrice: 80 },
                { id: 2, quantity: 7, expiryDate: '2026-01-10', purchaseDate: '2024-04-01', purchasePrice: 85 }
            ]
        },
        { 
            id: 3, 
            name: 'مشط للكلاب', 
            priceWholesale: 25, 
            priceRetail: 35, 
            image: '🪮', 
            imageType: 'emoji',
            batches: [
                { id: 1, quantity: 30, expiryDate: '2027-01-01', purchaseDate: '2024-01-01', purchasePrice: 15 }
            ]
        },
        { 
            id: 4, 
            name: 'لعبة قطط', 
            priceWholesale: 18, 
            priceRetail: 25, 
            image: '🧸', 
            imageType: 'emoji',
            batches: [
                { id: 1, quantity: 40, expiryDate: '2027-01-01', purchaseDate: '2024-01-01', purchasePrice: 10 }
            ]
        },
        { 
            id: 5, 
            name: 'شنطة نقل قطط', 
            priceWholesale: 200, 
            priceRetail: 250, 
            image: '🎒', 
            imageType: 'emoji',
            batches: [
                { id: 1, quantity: 8, expiryDate: '2028-01-01', purchaseDate: '2024-01-01', purchasePrice: 150 }
            ]
        }
    ];
    products.forEach(p => p.stock = p.batches.reduce((s, b) => s + b.quantity, 0));
}

// تنفيذ الترقية
upgradeProductsToBatches();

let customers = JSON.parse(localStorage.getItem('customers')) || [];
let suppliers = JSON.parse(localStorage.getItem('suppliers')) || [
    { id: 1, name: 'مستلزمات الوفاء', address: 'القاهرة - شارع النيل', phone: '01001234567' },
    { id: 2, name: 'الشركة العربية للأعلاف', address: 'الإسكندرية', phone: '01234567890' }
];
let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
let returnedInvoices = JSON.parse(localStorage.getItem('returnedInvoices')) || [];
let purchaseInvoices = JSON.parse(localStorage.getItem('purchaseInvoices')) || [];
let stockMovements = JSON.parse(localStorage.getItem('stockMovements')) || [];
let notes = JSON.parse(localStorage.getItem('notes')) || [];

let currentUser = null;
let currentView = 'loginChoice';
let cart = [];
let purchaseCart = [];
let discountPercent = 0;
let purchaseDiscountPercent = 0;
let taxAmount = 0;
let paidAmount = 0;

const availablePermissions = [
    { id: 'pos', name: '📝 عمل فاتوره بيع' }, 
    { id: 'customers', name: '👤 تسجيل عميل' },
    { id: 'customerList', name: '📞 سجل العملاء' }, 
    { id: 'invoiceSearch', name: '🔍 استرجاع فاتورة بيع' },
    { id: 'stock', name: '📦 عرض المخزن' }, 
    { id: 'addProduct', name: '➕ إضافة منتج' },
    { id: 'allInvoices', name: '📑 سجل الفواتير' },
    { id: 'notes', name: '📝 الملحوظات' }
];

// ---------- دوال مساعدة للتاريخ ----------
function isExpiringSoon(expiryDate) {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    const today = new Date();
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(today.getMonth() + 2);
    return exp <= twoMonthsFromNow && exp >= today;
}

function isExpired(expiryDate) {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
}

function getExpiryStatus(expiryDate) {
    if (!expiryDate) return { text: '', class: '' };
    if (isExpired(expiryDate)) return { text: '⚠️ منتهي', class: 'expiry-danger' };
    if (isExpiringSoon(expiryDate)) return { text: '⏰ قريب', class: 'expiry-warning' };
    return { text: '✅ صالح', class: '' };
}

// ---------- دوال مساعدة ----------
function genId(arr) { return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1; }

function updateTotalStock() {
    products.forEach(p => {
        if (p.batches && p.batches.length > 0) {
            p.stock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
        } else {
            p.stock = 0;
        }
    });
}

function saveAll() {
    updateTotalStock();
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('branches', JSON.stringify(branches));
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
    localStorage.setItem('invoices', JSON.stringify(invoices));
    localStorage.setItem('returnedInvoices', JSON.stringify(returnedInvoices));
    localStorage.setItem('purchaseInvoices', JSON.stringify(purchaseInvoices));
    localStorage.setItem('stockMovements', JSON.stringify(stockMovements));
    localStorage.setItem('notes', JSON.stringify(notes));
}

function showMsg(text, isError = false) {
    let msg = document.createElement('div');
    msg.className = 'toast-msg';
    msg.innerText = text;
    msg.style.background = isError ? '#b85c1a' : '#2c5f2d';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2500);
}

function hasPermission(permission) {
    if (!currentUser) return false;
    if (currentUser.role === 'مدير') return true;
    if (currentUser.permissions && currentUser.permissions.includes('all')) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
}

function goToHome() {
    if (confirm('هل تريد تسجيل الخروج والعودة للصفحة الرئيسية؟')) {
        currentUser = null;
        currentView = 'loginChoice';
        render();
    }
}

// ========== دالة خصم من المخزون حسب FIFO (الأقدم صلاحية أولاً) ==========
function deductStockFIFO(productId, quantity) {
    let product = products.find(p => p.id === productId);
    if (!product) return false;
    
    if (!product.batches) {
        product.batches = [];
        return false;
    }
    
    // ترتيب الدُفعات حسب تاريخ الصلاحية (الأقدم أولاً)
    let sortedBatches = [...product.batches].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
    
    let remainingToDeduct = quantity;
    let deductedBatches = [];
    
    for (let batch of sortedBatches) {
        if (remainingToDeduct <= 0) break;
        
        if (batch.quantity > 0) {
            let deductFromBatch = Math.min(batch.quantity, remainingToDeduct);
            batch.quantity -= deductFromBatch;
            remainingToDeduct -= deductFromBatch;
            
            deductedBatches.push({
                batchId: batch.id,
                quantity: deductFromBatch,
                expiryDate: batch.expiryDate
            });
        }
    }
    
    // حذف الدُفعات الفارغة
    product.batches = product.batches.filter(b => b.quantity > 0);
    
    // تحديث المخزون الإجمالي
    product.stock = product.batches.reduce((s, b) => s + b.quantity, 0);
    
    saveAll();
    return { success: remainingToDeduct === 0, deductedBatches };
}

// ========== دالة إرجاع للمخزون ==========
function returnStockFIFO(productId, quantity, expiryDate = null) {
    let product = products.find(p => p.id === productId);
    if (!product) return false;
    
    if (!product.batches) {
        product.batches = [];
    }
    
    if (expiryDate) {
        let existingBatch = product.batches.find(b => b.expiryDate === expiryDate);
        if (existingBatch) {
            existingBatch.quantity += quantity;
        } else {
            product.batches.push({
                id: genId(product.batches),
                quantity: quantity,
                expiryDate: expiryDate,
                purchaseDate: new Date().toISOString().split('T')[0],
                purchasePrice: product.priceWholesale || 0
            });
        }
    } else {
        if (product.batches.length > 0) {
            product.batches.sort((a, b) => new Date(a.expiryDate || '9999') - new Date(b.expiryDate || '9999'));
            product.batches[0].quantity += quantity;
        } else {
            product.batches.push({
                id: 1,
                quantity: quantity,
                expiryDate: null,
                purchaseDate: new Date().toISOString().split('T')[0],
                purchasePrice: product.priceWholesale || 0
            });
        }
    }
    
    product.stock = product.batches.reduce((s, b) => s + b.quantity, 0);
    saveAll();
    return true;
}

function updateStockFromCart(cartItems, isReturn = false) {
    for (let item of cartItems) {
        if (isReturn) {
            returnStockFIFO(item.id, item.qty, item.expiryDate);
        } else {
            deductStockFIFO(item.id, item.qty);
        }
    }
    saveAll();
    checkProductAlerts();
}

function checkProductAlerts() {
    const today = new Date();
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(today.getMonth() + 2);
    
    products.forEach(product => {
        // فحص تواريخ الصلاحية لكل الدُفعات
        if (product.batches && product.batches.length > 0) {
            product.batches.forEach(batch => {
                if (batch.expiryDate) {
                    const expiryDate = new Date(batch.expiryDate);
                    if (expiryDate <= twoMonthsFromNow && expiryDate >= today) {
                        const existingAlert = notes.find(n => 
                            n.type === 'expiry_alert' && 
                            n.productId === product.id &&
                            n.batchId === batch.id &&
                            !n.read
                        );
                        
                        if (!existingAlert) {
                            notes.push({
                                id: genId(notes),
                                type: 'expiry_alert',
                                title: '⚠️ تنبيه صلاحية',
                                content: `المنتج "${product.name}" - دفعة ${batch.id} ستنتهي صلاحيتها في ${batch.expiryDate} (الكمية: ${batch.quantity})`,
                                productId: product.id,
                                batchId: batch.id,
                                productName: product.name,
                                date: new Date().toISOString(),
                                read: false,
                                from: 'system',
                                to: 'all'
                            });
                        }
                    }
                }
            });
        }
        
        // فحص المخزون المنخفض
        const totalStock = product.stock || 0;
        if (totalStock < 20) {
            const existingAlert = notes.find(n => 
                n.type === 'low_stock_alert' && 
                n.productId === product.id &&
                !n.read
            );
            
            if (!existingAlert) {
                notes.push({
                    id: genId(notes),
                    type: 'low_stock_alert',
                    title: '📉 تنبيه نقص مخزون',
                    content: `المنتج "${product.name}" مخزونه منخفض (${totalStock} قطعة فقط)`,
                    productId: product.id,
                    productName: product.name,
                    date: new Date().toISOString(),
                    read: false,
                    from: 'system',
                    to: 'all'
                });
            }
        }
    });
    
    saveAll();
}

function createSaleInvoice(customerPhone, customerName = '', cartItems = null, saleType = 'retail') {
    let itemsToUse = cartItems || cart;
    if (itemsToUse.length === 0) { showMsg('السلة فارغة!', true); return null; }
    
    let subtotal = itemsToUse.reduce((s, i) => s + (i.price * i.qty), 0);
    let discountValue = subtotal * (discountPercent / 100);
    let afterDiscount = subtotal - discountValue;
    let finalTotal = afterDiscount + taxAmount;
    let remaining = Math.max(0, paidAmount - finalTotal);
    
    let newId = genId(invoices);
    let invoice = {
        id: newId, 
        date: new Date().toLocaleString('ar-EG'),
        customerPhone, 
        customerName: customerName || 'نقدي',
        items: JSON.parse(JSON.stringify(itemsToUse)),
        subtotal: subtotal, 
        discountPercent: discountPercent,
        discountValue: discountValue,
        tax: taxAmount,
        paid: paidAmount,
        remaining: remaining,
        total: subtotal, 
        finalTotal: finalTotal,
        type: 'بيع', 
        saleType: saleType,
        createdBy: currentUser ? currentUser.fullName : 'غير معروف',
        isReturned: false
    };
    
    invoices.push(invoice);
    updateStockFromCart(itemsToUse, false);
    
    if (!cartItems) cart = [];
    discountPercent = 0;
    taxAmount = 0;
    paidAmount = 0;
    saveAll();
    showMsg(`✅ فاتورة رقم ${newId} تم تسجيلها`);
    return invoice;
}

function returnInvoice(invoiceId) {
    let invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) { showMsg('الفاتورة غير موجودة', true); return false; }
    if (invoice.isReturned) { showMsg('هذه الفاتورة مرتجعة بالفعل', true); return false; }
    
    for (let item of invoice.items) {
        returnStockFIFO(item.id, item.qty, item.expiryDate);
    }
    
    invoice.isReturned = true;
    invoice.returnedDate = new Date().toLocaleString('ar-EG');
    invoice.returnedBy = currentUser ? currentUser.fullName : 'غير معروف';
    
    let returnedCopy = JSON.parse(JSON.stringify(invoice));
    returnedCopy.id = genId(returnedInvoices);
    returnedCopy.originalInvoiceId = invoice.id;
    returnedInvoices.push(returnedCopy);
    
    saveAll();
    checkProductAlerts();
    showMsg(`✅ تم استرجاع الفاتورة رقم ${invoiceId} وتم إعادة المنتجات للمخزون`);
    return true;
}

// ========== طباعة الفاتورة ==========
function printInvoice(invoice) {
    let win = window.open('', '_blank');
    let itemsHtml = invoice.items.map(i => `
        <tr>
            <td>
                ${i.name}
                ${i.expiryDate ? `<br><small>انتهاء: ${i.expiryDate}</small>` : ''}
                ${i.saleType ? `<br><small>${i.saleType === 'wholesale' ? 'جملة' : 'قطاعي'}</small>` : ''}
            </td>
            <td>${i.qty}</td>
            <td>${i.price} ج.م</td>
            <td>${i.qty * i.price} ج.م</td>
        </tr>
    `).join('');
    
    let discountRow = invoice.discountValue ? `<tr><td colspan="3" style="text-align:left;">خصم ${invoice.discountPercent || 0}%</td><td>- ${invoice.discountValue} ج.م</td></tr>` : '';
    let taxRow = invoice.tax ? `<tr><td colspan="3" style="text-align:left;">ضريبة</td><td>${invoice.tax} ج.م</td></tr>` : '';
    let finalTotal = invoice.finalTotal || invoice.total;
    
    win.document.write(`
        <html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Cairo', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; margin: 0; padding: 20px; }
            .receipt { width: 320px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .receipt h3 { margin: 5px 0; color: #333; font-size: 1.2rem; }
            .receipt table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 0.75rem; }
            .receipt th { background: #f0e5d8; padding: 5px; border-bottom: 1px solid #ccc; }
            .receipt td { padding: 4px; border-bottom: 1px dashed #ddd; }
            .receipt .total-line { display: flex; justify-content: space-between; padding: 5px 0; font-weight: bold; border-top: 1px solid #000; margin-top: 5px; }
            .receipt .cashier { margin-top: 15px; font-size: 0.7rem; border-top: 1px dashed #ccc; padding-top: 10px; }
        </style></head><body>
        <div class="receipt">
            <div style="font-size:40px;">🐾</div>
            <h3>عجائب الرحمن</h3>
            <p style="font-size:0.7rem; margin:5px 0;">فاتورة رقم: ${invoice.id}<br>التاريخ: ${invoice.date}<br>العميل: ${invoice.customerName || 'نقدي'}<br>${invoice.customerPhone ? `📞 ${invoice.customerPhone}` : ''}</p>
            <table>
                <thead><tr><th>الصنف</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                <tbody>${itemsHtml}${discountRow}${taxRow}</tbody>
            </table>
            <div class="total-line"><span>الإجمالي</span><span>${finalTotal} ج.م</span></div>
            <div class="total-line"><span>المدفوع</span><span>${invoice.paid || 0} ج.م</span></div>
            <div class="total-line"><span>💰 الباقي للعميل</span><span>${invoice.remaining || 0} ج.م</span></div>
            <div class="cashier">الكاشير: ${invoice.createdBy || 'غير معروف'}<br>${invoice.isReturned ? '<span style="color:#b85c1a;">⚠️ فاتورة مرتجعة</span>' : 'شكراً لزيارتكم 🐾'}</div>
        </div>
        <script>window.print(); setTimeout(()=>window.close(),500);<\/script>
        </body></html>
    `);
    win.document.close();
}

// ========== عرض نافذة تفاصيل الفاتورة ==========
function showInvoiceDetailsDialog(invoice) {
    let itemsHtml = invoice.items.map(i => `
        <tr>
            <td>
                ${i.name}
                ${i.expiryDate ? `<br><small>انتهاء: ${i.expiryDate}</small>` : ''}
                ${i.saleType ? `<br><small>${i.saleType === 'wholesale' ? 'جملة' : 'قطاعي'}</small>` : ''}
            </td>
            <td>${i.qty}</td>
            <td>${i.price} ج.م</td>
            <td>${i.qty * i.price} ج.م</td>
        </tr>
    `).join('');

    let discountRow = invoice.discountValue
        ? `<tr><td colspan="3">خصم ${invoice.discountPercent || 0}%</td><td>- ${invoice.discountValue} ج.م</td></tr>`
        : '';
    
    let taxRow = invoice.tax
        ? `<tr><td colspan="3">ضريبة</td><td>${invoice.tax} ج.م</td></tr>`
        : '';

    let finalTotal = invoice.finalTotal || invoice.total;

    const overlay = document.createElement('div');
    overlay.className = 'invoice-overlay';
    overlay.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.5);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:3000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background:white;
        border-radius:20px;
        max-width:450px;
        width:90%;
        padding:20px;
        max-height:90vh;
        overflow-y:auto;
        position:relative;
    `;

    content.innerHTML = `
        <div class="compact-invoice" style="text-align:center;">
            <div style="font-size:40px;">🐾</div>
            <h3 style="margin:5px 0; color:#aa7b4b;">عجائب الرحمن</h3>
            <p style="font-size:0.75rem;">
                فاتورة رقم: ${invoice.id}<br>
                التاريخ: ${invoice.date}<br>
                العميل: ${invoice.customerName || 'نقدي'}
                ${invoice.customerPhone ? `<br>📞 ${invoice.customerPhone}` : ''}
            </p>
            <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
                <thead>
                    <tr style="background:#f0e5d8;">
                        <th>الصنف</th><th>العدد</th><th>السعر</th><th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    ${discountRow}
                    ${taxRow}
                </tbody>
            </table>
            <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #000;padding-top:5px;margin-top:5px;">
                <span>الإجمالي</span>
                <span>${finalTotal} ج.م</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;">
                <span>المدفوع</span>
                <span>${invoice.paid || 0} ج.م</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
                <span>💰 الباقي للعميل</span>
                <span>${invoice.remaining || 0} ج.م</span>
            </div>
            <p style="font-size:0.7rem;margin-top:10px;border-top:1px dashed #ccc;padding-top:10px;">
                الكاشير: ${invoice.createdBy || 'غير معروف'}<br>
                ${invoice.isReturned ? '⚠️ فاتورة مرتجعة' : 'شكراً لزيارتكم 🐾'}
            </p>
        </div>
        <div style="margin-top:15px;display:flex;gap:10px;">
            <button class="close-dialog-btn" style="flex:1; padding:12px; background:#e7d9cb; border:none; border-radius:40px; cursor:pointer;">إغلاق</button>
            <button class="print-dialog-btn" style="flex:1; padding:12px; background:#c7a86b; color:white; border:none; border-radius:40px; cursor:pointer;">🖨️ طباعة</button>
        </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const closeDialog = () => overlay.remove();
    content.querySelector('.close-dialog-btn')?.addEventListener('click', closeDialog);
    content.querySelector('.print-dialog-btn')?.addEventListener('click', () => { printInvoice(invoice); closeDialog(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
}

// ========== عرض منتجات الجملة ==========
function showWholesaleProductsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const productsGrid = products.map(p => `
        <div class="product-card-modal">
            <div class="product-image">
                ${p.image && p.image.startsWith('data:image') ? 
                    `<img src="${p.image}" alt="${p.name}">` : 
                    `<span style="font-size:50px;">${p.image || '🐾'}</span>`
                }
            </div>
            <h4 style="margin:10px 0; color:#8b6946;">${p.name}</h4>
            <div style="background:#d4e6f1; padding:10px; border-radius:10px; margin-top:10px;">
                <strong style="font-size:1.2rem; color:#2c5f8a;">${p.priceWholesale} ج.م</strong>
                <br><small>سعر الجملة</small>
            </div>
            ${(p.stock || 0) < 20 ? '<span class="alert-badge" style="display:inline-block; margin-top:10px;">⚠️ مخزون منخفض</span>' : ''}
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="width:90%; max-width:1200px;">
            <div class="modal-header">
                <h2 style="border:none; margin:0;">📦 منتجات الجملة</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="product-grid">${productsGrid}</div>
            <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                <button class="primary" onclick="printProductList('wholesale')">🖨️ طباعة PDF</button>
                <button onclick="this.closest('.modal-overlay').remove()">إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showRetailProductsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const productsGrid = products.map(p => `
        <div class="product-card-modal">
            <div class="product-image">
                ${p.image && p.image.startsWith('data:image') ? 
                    `<img src="${p.image}" alt="${p.name}">` : 
                    `<span style="font-size:50px;">${p.image || '🐾'}</span>`
                }
            </div>
            <h4 style="margin:10px 0; color:#8b6946;">${p.name}</h4>
            <div style="background:#fdebd0; padding:10px; border-radius:10px; margin-top:10px;">
                <strong style="font-size:1.2rem; color:#b85c1a;">${p.priceRetail} ج.م</strong>
                <br><small>سعر القطاعي</small>
            </div>
            ${(p.stock || 0) < 20 ? '<span class="alert-badge" style="display:inline-block; margin-top:10px;">⚠️ مخزون منخفض</span>' : ''}
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="width:90%; max-width:1200px;">
            <div class="modal-header">
                <h2 style="border:none; margin:0;">🛍️ منتجات القطاعي</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="product-grid">${productsGrid}</div>
            <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                <button class="primary" onclick="printProductList('retail')">🖨️ طباعة PDF</button>
                <button onclick="this.closest('.modal-overlay').remove()">إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.printProductList = function(type) {
    const productsList = products.map(p => ({
        name: p.name,
        price: type === 'wholesale' ? p.priceWholesale : p.priceRetail,
        image: p.image
    }));
    
    let win = window.open('', '_blank');
    let productsHtml = productsList.map(p => `
        <tr>
            <td>${p.image && p.image.startsWith('data:image') ? `<img src="${p.image}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">` : `<span style="font-size:30px;">${p.image || '🐾'}</span>`}</td>
            <td>${p.name}</td>
            <td>${p.price} ج.م</td>
        </tr>
    `).join('');
    
    win.document.write(`
        <html dir="rtl"><head><meta charset="UTF-8"><title>قائمة المنتجات</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body{font-family:'Cairo',sans-serif;padding:20px}h1{color:#8b6946;text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:12px;text-align:center}th{background:#f0e5d8}</style>
        </head><body><h1>قائمة المنتجات - ${type === 'wholesale' ? 'أسعار الجملة' : 'أسعار القطاعي'}</h1>
        <table><thead><tr><th>الصورة</th><th>المنتج</th><th>السعر</th></tr></thead><tbody>${productsHtml}</tbody></table>
        <script>window.onload=function(){window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>
    `);
    win.document.close();
};

function exportToExcel(data, filename, headers) {
    if (!data || data.length === 0) { showMsg('لا توجد بيانات للتصدير', true); return; }
    let wsData = [headers];
    data.forEach(row => { wsData.push(row); });
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showMsg(`✅ تم تصدير ${filename}.xlsx`);
}

// ========== عرض الصفحات ==========
function render() {
    const root = document.getElementById('root');
    if (currentView === 'loginChoice') {
        root.innerHTML = `<div class="login-container"><div class="card-modern login-card"><div class="logo-img" style="margin:0 auto 20px; width:80px; height:80px;"><span style="font-size:50px;">🐾</span></div><h2 style="border:none">عجائب الرحمن</h2><p style="margin-bottom:30px; color:#8b6946;">نظام إدارة متجر الحيوانات الأليفة</p><div style="display:flex; gap:20px; justify-content:center;"><button class="primary" id="choiceAdmin">👑 مدير</button><button class="primary" id="choiceEmployee">👤 موظف</button></div></div></div>`;
        document.getElementById('choiceAdmin')?.addEventListener('click', () => { currentView = 'loginForm'; render(); });
        document.getElementById('choiceEmployee')?.addEventListener('click', () => { currentView = 'loginForm'; render(); });
        return;
    }
    if (currentView === 'loginForm') {
        root.innerHTML = `<div class="login-container"><div class="card-modern login-card"><div style="margin:0 auto 20px;"><span style="font-size:70px;">🐾</span></div><h2 style="border:none">تسجيل الدخول</h2><input type="text" id="loginUser" placeholder="اسم المستخدم"><input type="password" id="loginPass" placeholder="كلمة المرور"><button class="primary" id="doLoginBtn" style="width:100%">🔐 دخول</button></div></div>`;
        document.getElementById('doLoginBtn')?.addEventListener('click', () => {
            let uname = document.getElementById('loginUser').value;
            let pwd = document.getElementById('loginPass').value;
            let found = users.find(u => u.username === uname && u.password === pwd);
            if (found) { 
                currentUser = found; 
                currentView = found.role === 'مدير' ? 'adminDashboard' : 'employeeDashboard'; 
                checkProductAlerts();
                render(); 
            }
            else showMsg('اسم المستخدم أو كلمة المرور غير صحيحة', true);
        });
        return;
    }
    if (currentView === 'adminDashboard') renderAdminPanel();
    if (currentView === 'employeeDashboard') renderEmployeePanel();
}

function renderAdminPanel() {
    const root = document.getElementById('root');
    root.innerHTML = `<div class="navbar"><div class="logo-area"><div class="logo-img"><span style="font-size:30px;">🐾</span></div><span class="site-title">عجائب الرحمن - المدير</span></div><div style="display:flex; gap:10px; align-items:center;"><div class="home-btn" id="homeBtn">🏠 الرئيسية</div><div class="user-badge">👑 ${currentUser.fullName} <button id="logoutBtn" style="background:#e6cfb5; margin-right:10px;">🚪 خروج</button></div></div></div><div class="app-container"><div class="menu-buttons" id="adminMenu"></div><div id="dynamicSection" class="card-modern">مرحباً بك في لوحة التحكم</div></div>`;
    const menuItems = ['users','branches','stock','addProduct','pos','invoiceSearch','allInvoices','customers','customerList','purchase','returnPurchase','purchaseInvoicesList','suppliers','suppliersList','finances','inventory','stockDistribution','notes'];
    const menuNames = { 
        users:'👥 المستخدمين', branches:'🏢 الفروع', stock:'📦 المخزن', addProduct:'➕ إضافة منتج', 
        pos:'📝 فاتورة بيع', invoiceSearch:'🔍 استرجاع فاتورة', allInvoices:'📑 سجل فواتير البيع', 
        customers:'👤 تسجيل عميل', customerList:'📞 سجل العملاء', purchase:'🛒 فاتورة شراء', 
        returnPurchase:'↩️ استرجاع شراء', purchaseInvoicesList:'📜 سجل المشتريات', 
        suppliers:'🏭 الموردين', suppliersList:'📇 سجل الموردين', finances:'💰 الماليات', 
        inventory:'📋 حركة المخزون', stockDistribution:'🚚 توزيع مخزون', notes:'📝 الملحوظات' 
    };
    let menuHtml = ''; 
    menuItems.forEach(item => { menuHtml += `<button data-section="${item}">${menuNames[item]}</button>`; });
    document.getElementById('adminMenu').innerHTML = menuHtml;
    document.getElementById('logoutBtn')?.addEventListener('click', () => { currentUser = null; currentView = 'loginChoice'; render(); });
    document.getElementById('homeBtn')?.addEventListener('click', goToHome);
    document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', (e) => loadSection(e.target.dataset.section)));
    loadSection('stock');
    setTimeout(() => addFooter(), 50);
}

function renderEmployeePanel() {
    const root = document.getElementById('root');
    root.innerHTML = `<div class="navbar"><div class="logo-area"><div class="logo-img"><span style="font-size:30px;">🐾</span></div><span class="site-title">عجائب الرحمن - ${currentUser.fullName}</span></div><div style="display:flex; gap:10px; align-items:center;"><div class="home-btn" id="homeBtn">🏠 الرئيسية</div><div class="user-badge">👤 ${currentUser.role} <button id="logoutBtn" style="background:#e6cfb5;">🚪 خروج</button></div></div></div><div class="app-container"><div class="menu-buttons" id="empMenu"></div><div id="dynamicSection" class="card-modern">مرحباً بك</div></div>`;
    const allEmpItems = { 'pos':'📝 فاتورة بيع', 'customers':'👤 تسجيل عميل', 'customerList':'📞 سجل العملاء', 'invoiceSearch':'🔍 استرجاع فاتورة', 'stock':'📦 عرض المخزن', 'addProduct':'➕ إضافة منتج', 'allInvoices':'📑 سجل الفواتير', 'notes':'📝 الملحوظات' };
    let perms = currentUser.permissions || [];
    let menuHtml = '';
    if (perms.includes('all')) {
        Object.keys(allEmpItems).forEach(k => menuHtml += `<button data-section="${k}">${allEmpItems[k]}</button>`);
    } else {
        perms.forEach(p => { if(allEmpItems[p]) menuHtml += `<button data-section="${p}">${allEmpItems[p]}</button>`; });
    }
    document.getElementById('empMenu').innerHTML = menuHtml || '<p style="color:#b85c1a;">⚠️ لا توجد صلاحيات</p>';
    document.getElementById('logoutBtn')?.addEventListener('click', () => { currentUser = null; currentView = 'loginChoice'; render(); });
    document.getElementById('homeBtn')?.addEventListener('click', goToHome);
    document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', (e) => loadSection(e.target.dataset.section)));
    if (hasPermission('pos')) loadSection('pos');
    else if (perms.length > 0 && !perms.includes('all')) loadSection(perms[0]);
    setTimeout(() => addFooter(), 50);
}

function loadSection(section) {
    const container = document.getElementById('dynamicSection');
    if (!container) return;
    if (!hasPermission(section) && !['branches','purchase','returnPurchase','purchaseInvoicesList','suppliers','suppliersList','finances','inventory','users','stockDistribution','notes'].includes(section)) {
        container.innerHTML = '<h2 style="color:#b85c1a;">⛔ غير مصرح لك بالوصول</h2>';
        return;
    }
    if (section === 'users') renderUsers(container);
    else if (section === 'branches') renderBranches(container);
    else if (section === 'stock') renderStock(container);
    else if (section === 'addProduct') renderAddProduct(container);
    else if (section === 'pos') renderPOS(container);
    else if (section === 'invoiceSearch') renderInvoiceSearch(container);
    else if (section === 'allInvoices') renderAllInvoices(container);
    else if (section === 'customers') renderAddCustomer(container);
    else if (section === 'customerList') renderCustomerList(container);
    else if (section === 'purchase') renderPurchase(container);
    else if (section === 'returnPurchase') renderReturnPurchase(container);
    else if (section === 'purchaseInvoicesList') renderPurchaseList(container);
    else if (section === 'suppliers') renderSuppliers(container);
    else if (section === 'suppliersList') renderSuppliersList(container);
    else if (section === 'finances') renderFinances(container);
    else if (section === 'inventory') renderInventory(container);
    else if (section === 'stockDistribution') renderStockDistribution(container);
    else if (section === 'notes') renderNotes(container);
}

// ========== دوال العرض ==========
function renderUsers(container) {
    container.innerHTML = `<h2>إدارة المستخدمين والصلاحيات</h2><div class="grid-2"><div><h3>إضافة / تعديل مستخدم</h3><input id="uname" placeholder="اسم المستخدم"><input id="ufullname" placeholder="الاسم الكامل"><input id="upass" placeholder="كلمة المرور" type="password"><select id="urole"><option value="موظف">موظف</option><option value="مدير">مدير</option></select><div class="permission-group" id="permissionsSection" style="display:none;"><h4>صلاحيات الموظف:</h4><div id="permissionsCheckboxes"></div></div><button class="primary" id="addUserBtn" style="margin-top:15px;">➕ إضافة مستخدم</button></div><div><h3>المستخدمين الحاليين</h3><div id="usersList"></div></div></div>`;
    function showPermissionsCheckboxes(selectedPerms = []) {
        let checkboxesHtml = availablePermissions.map(perm => `<label><input type="checkbox" value="${perm.id}" ${selectedPerms.includes(perm.id) ? 'checked' : ''} ${document.getElementById('urole')?.value === 'مدير' ? 'disabled' : ''}>${perm.name}</label>`).join('');
        document.getElementById('permissionsCheckboxes').innerHTML = checkboxesHtml;
    }
    document.getElementById('urole')?.addEventListener('change', (e) => {
        const permSection = document.getElementById('permissionsSection');
        if (e.target.value === 'مدير') permSection.style.display = 'none';
        else { permSection.style.display = 'block'; showPermissionsCheckboxes(); }
    });
    const listUsers = () => {
        let userListDiv = document.getElementById('usersList');
        if (userListDiv) userListDiv.innerHTML = users.map(u => `<div style="margin:15px 0; padding:15px; background:#fefaf5; border-radius:12px;"><div style="display:flex; justify-content:space-between;"><div><strong>${u.fullName}</strong> (${u.username})<br><small>الدور: ${u.role}</small><br><small>الصلاحيات: ${u.role === 'مدير' ? 'كل الصلاحيات' : (u.permissions || []).map(p => availablePermissions.find(ap => ap.id === p)?.name || p).join(' - ')}</small></div><div><button class="primary editUserBtn" data-id="${u.id}">✏️</button><button class="danger deleteUserBtn" data-id="${u.id}">🗑️</button></div></div></div>`).join('');
        document.querySelectorAll('.deleteUserBtn').forEach(btn => { btn.addEventListener('click', () => { if (confirm('حذف المستخدم؟')) { users = users.filter(u => u.id != btn.dataset.id); saveAll(); listUsers(); showMsg('تم الحذف'); } }); });
        document.querySelectorAll('.editUserBtn').forEach(btn => { btn.addEventListener('click', () => { let userId = +btn.dataset.id; let user = users.find(u => u.id === userId); if (user) { document.getElementById('uname').value = user.username; document.getElementById('ufullname').value = user.fullName; document.getElementById('upass').value = user.password; document.getElementById('urole').value = user.role; if (user.role === 'موظف') { document.getElementById('permissionsSection').style.display = 'block'; showPermissionsCheckboxes(user.permissions || []); } let addBtn = document.getElementById('addUserBtn'); addBtn.textContent = '✏️ تحديث المستخدم'; addBtn.dataset.editId = userId; } }); });
    };
    document.getElementById('addUserBtn')?.addEventListener('click', () => {
        let un = document.getElementById('uname').value, fn = document.getElementById('ufullname').value, up = document.getElementById('upass').value, ur = document.getElementById('urole').value;
        let selectedPerms = [];
        if (ur === 'موظف') document.querySelectorAll('#permissionsCheckboxes input:checked').forEach(cb => selectedPerms.push(cb.value));
        if (un && up && fn) {
            let editId = document.getElementById('addUserBtn').dataset.editId;
            if (editId) {
                let user = users.find(u => u.id == editId);
                if (user) { user.username = un; user.fullName = fn; user.password = up; user.role = ur; user.permissions = ur === 'مدير' ? ['all'] : selectedPerms; }
                delete document.getElementById('addUserBtn').dataset.editId;
                document.getElementById('addUserBtn').textContent = '➕ إضافة مستخدم';
                showMsg('تم التحديث');
            } else {
                users.push({ id: genId(users), username: un, fullName: fn, password: up, role: ur, permissions: ur === 'مدير' ? ['all'] : selectedPerms });
                showMsg('تمت الإضافة');
            }
            saveAll(); listUsers();
            document.getElementById('uname').value = ''; document.getElementById('ufullname').value = ''; document.getElementById('upass').value = ''; document.getElementById('urole').value = 'موظف'; document.getElementById('permissionsSection').style.display = 'none';
        } else showMsg('أكمل البيانات', true);
    });
    listUsers();
}

function renderBranches(container) {
    container.innerHTML = `<h2>الفروع</h2><input id="branchName" placeholder="اسم الفرع"><button class="primary" id="addBranchBtn">➕ إضافة</button><div id="branchesList" style="margin-top:20px;"></div>`;
    const list = () => { document.getElementById('branchesList').innerHTML = branches.map(b => `<div style="margin:10px 0; padding:10px; background:#fefaf5; border-radius:10px; display:flex; justify-content:space-between;">${b.name} <button class="danger" data-id="${b.id}">حذف</button></div>`).join(''); document.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', () => { branches = branches.filter(b => b.id != btn.dataset.id); saveAll(); list(); })); };
    document.getElementById('addBranchBtn')?.addEventListener('click', () => { let n = document.getElementById('branchName').value; if (n) { branches.push({ id: genId(branches), name: n }); saveAll(); list(); document.getElementById('branchName').value = ''; } });
    list();
}

function showPriceEditModal(product) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="price-edit-modal">
            <div class="modal-header"><h3>✏️ تعديل أسعار: ${product.name}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
            <div class="price-comparison"><h4>💰 الأسعار الحالية</h4><p>سعر الجملة: <strong>${product.priceWholesale} ج.م</strong></p><p>سعر القطاعي: <strong>${product.priceRetail} ج.م</strong></p></div>
            <div><label>سعر الجملة الجديد</label><input type="number" id="editWholesalePrice" value="${product.priceWholesale}" min="0" step="0.01"><label>سعر القطاعي الجديد</label><input type="number" id="editRetailPrice" value="${product.priceRetail}" min="0" step="0.01"></div>
            <div style="display:flex; gap:10px; margin-top:25px;"><button class="primary" id="savePriceEditBtn">💾 حفظ</button><button class="danger" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('savePriceEditBtn')?.addEventListener('click', () => {
        const newWholesale = parseFloat(document.getElementById('editWholesalePrice').value) || 0;
        const newRetail = parseFloat(document.getElementById('editRetailPrice').value) || 0;
        if (newWholesale <= 0 || newRetail <= 0) { showMsg('الأسعار يجب أن تكون أكبر من صفر', true); return; }
        product.priceWholesale = newWholesale; product.priceRetail = newRetail;
        saveAll(); showMsg(`✅ تم تحديث أسعار ${product.name}`); modal.remove(); renderStock(document.getElementById('dynamicSection'));
    });
}

function renderStock(container) {
    updateTotalStock();
    container.innerHTML = `<h2>المخزن والمنتجات</h2>
    <div style="display:flex; gap:10px; margin-bottom:20px;">
        <button class="primary" id="showWholesaleBtn">📦 منتجات الجملة</button>
        <button class="primary" id="showRetailBtn">🛍️ منتجات القطاعي</button>
    </div>
    <div class="flex-wrap"><input id="searchProduct" placeholder="بحث باسم المنتج" style="flex:1"><button class="primary" id="clearSearchBtn">مسح</button></div>
    <div id="stockTableContainer"></div>`;
    
    const renderTable = (filteredProducts) => {
        const tableContainer = document.getElementById('stockTableContainer');
        if (filteredProducts.length === 0) { tableContainer.innerHTML = '<p style="text-align:center; margin-top:30px;">🔍 ابحث عن منتج</p>'; return; }
        
        tableContainer.innerHTML = `<table><thead><tr><th>الصورة</th><th>المنتج</th><th>سعر الجملة</th><th>سعر القطاعي</th><th>الكمية</th><th>الدُفعات</th><th>تعديل</th>${hasPermission('addProduct') ? '<th>حذف</th>' : ''}</tr></thead><tbody id="stockTableBody"></tbody></table>`;
        
        const tbody = document.getElementById('stockTableBody');
        tbody.innerHTML = filteredProducts.map(p => {
            let batchesHtml = '';
            if (p.batches && p.batches.length > 0) {
                batchesHtml = p.batches.map(b => {
                    const status = getExpiryStatus(b.expiryDate);
                    return `<div style="display:flex; justify-content:space-between; padding:3px; background:white; border-radius:5px; margin:2px 0;">
                        <span>${b.quantity} قطعة</span>
                        <span class="${status.class}">${b.expiryDate || '-'} ${status.text}</span>
                    </div>`;
                }).join('');
            }
            
            return `<tr>
                <td>${p.image && p.image.startsWith('data:image') ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : `<span style="font-size:30px;">${p.image || '🐾'}</span>`}</td>
                <td>${p.name} ${(p.stock || 0) < 20 ? '<span style="color:#b85c1a;">⚠️</span>' : ''}</td>
                <td>${p.priceWholesale} ج.م</td>
                <td>${p.priceRetail} ج.م</td>
                <td>${p.stock || 0}</td>
                <td>${batchesHtml || '<small>لا توجد دُفعات</small>'}</td>
                <td><button class="info editPriceBtn" data-id="${p.id}">✏️</button></td>
                ${hasPermission('addProduct') ? `<td><button class="danger deleteProductBtn" data-id="${p.id}">🗑️</button></td>` : ''}
            </tr>`;
        }).join('');
        
        document.querySelectorAll('.editPriceBtn').forEach(btn => btn.addEventListener('click', () => { const p = products.find(p => p.id === +btn.dataset.id); if (p) showPriceEditModal(p); }));
        if (hasPermission('addProduct')) {
            document.querySelectorAll('.deleteProductBtn').forEach(btn => btn.addEventListener('click', () => { if (confirm('حذف المنتج؟')) { products = products.filter(p => p.id != btn.dataset.id); saveAll(); renderStock(container); } }));
        }
    };

    renderTable([]);
    document.getElementById('showWholesaleBtn')?.addEventListener('click', showWholesaleProductsModal);
    document.getElementById('showRetailBtn')?.addEventListener('click', showRetailProductsModal);
    document.getElementById('searchProduct').addEventListener('input', (e) => renderTable(products.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()))));
    document.getElementById('clearSearchBtn').addEventListener('click', () => { document.getElementById('searchProduct').value = ''; renderTable([]); });
}

function renderAddProduct(container) {
    if (!hasPermission('addProduct')) { container.innerHTML = '<h2 style="color:#b85c1a;">⛔ غير مصرح</h2>'; return; }
    container.innerHTML = `<h2>إضافة منتج جديد</h2><div class="grid-2"><div><input id="pName" placeholder="اسم المنتج"><input id="pPriceWholesale" placeholder="سعر الجملة" type="number"><input id="pPriceRetail" placeholder="سعر القطاعي" type="number"><input id="pStock" placeholder="الكمية الأولية" type="number"><input id="pExpiryDate" type="date"><div><input type="file" id="pImage" accept="image/*"><div id="imagePreview"></div></div><button class="primary" id="saveProduct">💾 حفظ</button></div><div><h3>نصائح</h3><p>- الكمية الأولية ستضاف كدفعة أولى</p></div></div>`;
    
    document.getElementById('pImage')?.addEventListener('change', function(e) { 
        let file = e.target.files[0]; 
        if (file) { 
            let reader = new FileReader(); 
            reader.onload = (e) => document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" style="max-width:150px; border-radius:12px;">`; 
            reader.readAsDataURL(file); 
        } 
    });
    
    document.getElementById('saveProduct')?.addEventListener('click', () => {
        let n = document.getElementById('pName').value;
        let pw = +document.getElementById('pPriceWholesale').value;
        let pr = +document.getElementById('pPriceRetail').value;
        let st = +document.getElementById('pStock').value || 0;
        let expDate = document.getElementById('pExpiryDate').value;
        let imageFile = document.getElementById('pImage').files[0];
        
        if (n && pw && pr) {
            const createProduct = (img) => {
                const newId = genId(products);
                products.push({ 
                    id: newId, name: n, priceWholesale: pw, priceRetail: pr, 
                    image: img, imageType: imageFile ? 'file' : 'emoji',
                    batches: st > 0 ? [{ id: 1, quantity: st, expiryDate: expDate || null, purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: pw }] : []
                });
                updateTotalStock();
                saveAll(); checkProductAlerts();
                showMsg('✅ تمت الإضافة'); 
                renderStock(document.getElementById('dynamicSection')); 
            };
            if (imageFile) { let reader = new FileReader(); reader.onload = (e) => createProduct(e.target.result); reader.readAsDataURL(imageFile); }
            else createProduct('🐾');
        } else showMsg('الاسم والأسعار مطلوبة', true);
    });
}

function renderPOS(container) {
    let cartHtml = cart.map((item, idx) => `<div class="cart-item"><span>${item.image?.startsWith('data:image') ? `<img src="${item.image}" style="width:30px;height:30px;border-radius:6px;">` : item.image || '🐾'} ${item.name} <span class="price-badge ${item.saleType === 'wholesale' ? 'price-wholesale' : 'price-retail'}">${item.saleType === 'wholesale' ? 'جملة' : 'قطاعي'}</span> x${item.qty}</span><span>${item.price * item.qty} ج.م</span><button class="danger removeFromCartBtn" data-idx="${idx}">🗑️</button></div>`).join('');
    
    let subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let discountValue = subtotal * (discountPercent / 100);
    let finalTotal = subtotal - discountValue + taxAmount;
    let remaining = Math.max(0, paidAmount - finalTotal);
    
    container.innerHTML = `<h2>نقطة البيع</h2><div class="grid-2"><div><h3>المنتجات</h3><input id="searchProductPOS" placeholder="🔍 بحث..."><div class="grid-3" id="productsContainer"></div></div><div><h3>السلة</h3><div id="cartItems">${cartHtml || '🛒 فارغة'}</div><div class="flex-between"><strong>الإجمالي: ${subtotal} ج.م</strong>${cart.length ? '<button class="danger" id="clearCartBtn">🗑️ تفريغ</button>' : ''}</div>
    <div><label>خصم %</label><input id="discountInput" type="number" value="${discountPercent}"></div>
    <div><label>ضريبة</label><input id="taxInput" type="number" value="${taxAmount}"></div>
    <div><label>مدفوع</label><input id="paidInput" type="number" value="${paidAmount}"></div>
    <div><strong>الإجمالي النهائي: ${finalTotal.toFixed(2)} ج.م</strong></div>
    <div><strong>الباقي: ${remaining.toFixed(2)} ج.م</strong></div>
    <input id="custPhone" placeholder="📱 رقم العميل *"><input id="custName" placeholder="الاسم">
    <button class="primary" id="finalizeBtn" ${cart.length === 0 ? 'disabled' : ''}>✅ إنهاء</button></div></div>`;

    const renderProducts = (search = '') => {
        document.getElementById('productsContainer').innerHTML = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => {
            let qtyInCart = cart.filter(i => i.id === p.id).reduce((s, i) => s + i.qty, 0);
            return `<div class="product-card"><div>${p.image?.startsWith('data:image') ? `<img src="${p.image}" style="width:50px;">` : p.image || '🐾'}</div><strong>${p.name}</strong><br>
            <span class="price-wholesale">جملة: ${p.priceWholesale}</span> <span class="price-retail">قطاعي: ${p.priceRetail}</span><br>
            <small>المخزون: ${p.stock || 0}</small><br>
            <button class="addToCartBtn" data-id="${p.id}" data-type="wholesale" ${(p.stock || 0) - qtyInCart <= 0 ? 'disabled' : ''}>جملة</button>
            <button class="addToCartBtn" data-id="${p.id}" data-type="retail" ${(p.stock || 0) - qtyInCart <= 0 ? 'disabled' : ''}>قطاعي</button></div>`;
        }).join('');
        document.querySelectorAll('.addToCartBtn').forEach(btn => btn.addEventListener('click', () => {
            let pid = +btn.dataset.id, saleType = btn.dataset.type, prod = products.find(p => p.id === pid);
            if (!prod) return;
            let price = saleType === 'wholesale' ? prod.priceWholesale : prod.priceRetail;
            if (cart.filter(i => i.id === pid).reduce((s, i) => s + i.qty, 0) + 1 > (prod.stock || 0)) { showMsg('المخزون غير كاف', true); return; }
            let exist = cart.find(i => i.id === pid && i.saleType === saleType);
            if (exist) exist.qty++; else {
                let oldestBatch = prod.batches?.filter(b => b.quantity > 0).sort((a,b) => new Date(a.expiryDate||'9999') - new Date(b.expiryDate||'9999'))[0];
                cart.push({ id: prod.id, name: prod.name, price, qty: 1, image: prod.image, saleType, expiryDate: oldestBatch?.expiryDate || null });
            }
            renderPOS(container);
        }));
    };

    document.getElementById('searchProductPOS').addEventListener('input', (e) => renderProducts(e.target.value));
    document.getElementById('discountInput').addEventListener('input', (e) => { discountPercent = parseFloat(e.target.value) || 0; renderPOS(container); });
    document.getElementById('taxInput').addEventListener('input', (e) => { taxAmount = parseFloat(e.target.value) || 0; renderPOS(container); });
    document.getElementById('paidInput').addEventListener('input', (e) => { paidAmount = parseFloat(e.target.value) || 0; renderPOS(container); });
    document.getElementById('clearCartBtn')?.addEventListener('click', () => { cart = []; discountPercent = taxAmount = paidAmount = 0; renderPOS(container); });
    document.querySelectorAll('.removeFromCartBtn').forEach(btn => btn.addEventListener('click', () => { cart.splice(+btn.dataset.idx, 1); renderPOS(container); }));
    document.getElementById('finalizeBtn')?.addEventListener('click', () => {
        let phone = document.getElementById('custPhone').value.trim(), name = document.getElementById('custName').value.trim();
        if (!phone) { showMsg('رقم العميل مطلوب', true); return; }
        if (paidAmount < finalTotal) { showMsg('المدفوع أقل من الإجمالي', true); return; }
        let inv = createSaleInvoice(phone, name, cart);
        if (inv) { printInvoice(inv); cart = []; discountPercent = taxAmount = paidAmount = 0; renderPOS(container); }
    });
    renderProducts();
}

function renderInvoiceSearch(container) {
    if (!hasPermission('invoiceSearch')) { container.innerHTML = '<h2>⛔ غير مصرح</h2>'; return; }
    container.innerHTML = `<h2>استرجاع فاتورة</h2><div class="flex-wrap"><input id="searchInvoiceId" placeholder="رقم الفاتورة"><input id="searchPhone" placeholder="رقم العميل"><select id="invoiceFilter"><option value="all">الكل</option><option value="active">نشطة</option><option value="returned">مرتجعة</option></select><button class="primary" id="searchBtn">🔍 بحث</button><button id="resetSearchBtn">عرض الكل</button></div><div id="searchResult"></div>`;
    
    function displayInvoices(list) {
        document.getElementById('searchResult').innerHTML = list.length ? list.map(i => `<div style="padding:15px; background:#fefaf5; margin:10px 0; border-radius:10px; ${i.isReturned ? 'opacity:0.7;' : ''}"><div><strong>فاتورة #${i.id}</strong><br>العميل: ${i.customerName || i.customerPhone}<br>الإجمالي: ${i.finalTotal || i.total} ج.م<br>التاريخ: ${i.date}</div><div><button class="printInv primary" data-inv='${JSON.stringify(i)}'>🖨️</button>${!i.isReturned ? `<button class="returnInv warning" data-id="${i.id}">↩️ استرجاع</button>` : ''}<button class="detailsInv" data-inv='${JSON.stringify(i)}'>📋</button></div></div>`).join('') : '<p>لا توجد فواتير</p>';
        document.querySelectorAll('.printInv').forEach(btn => btn.addEventListener('click', () => printInvoice(JSON.parse(btn.dataset.inv))));
        document.querySelectorAll('.returnInv').forEach(btn => btn.addEventListener('click', () => { if (confirm('استرجاع الفاتورة؟')) { returnInvoice(+btn.dataset.id); displayInvoices(invoices); } }));
        document.querySelectorAll('.detailsInv').forEach(btn => btn.addEventListener('click', () => showInvoiceDetailsDialog(JSON.parse(btn.dataset.inv))));
    }
    
    document.getElementById('searchBtn')?.addEventListener('click', () => {
        let results = invoices;
        let filter = document.getElementById('invoiceFilter').value;
        if (filter === 'active') results = results.filter(i => !i.isReturned);
        else if (filter === 'returned') results = results.filter(i => i.isReturned);
        let id = document.getElementById('searchInvoiceId').value;
        if (id) results = results.filter(i => i.id == id);
        let phone = document.getElementById('searchPhone').value;
        if (phone) results = results.filter(i => i.customerPhone?.includes(phone));
        displayInvoices(results);
    });
    document.getElementById('resetSearchBtn')?.addEventListener('click', () => { document.getElementById('searchInvoiceId').value = ''; document.getElementById('searchPhone').value = ''; document.getElementById('invoiceFilter').value = 'all'; displayInvoices(invoices); });
    displayInvoices(invoices);
}

function renderAllInvoices(container) {
    if (!hasPermission('allInvoices')) { container.innerHTML = '<h2>⛔ غير مصرح</h2>'; return; }
    let list = [...invoices];
    container.innerHTML = `<h2>سجل فواتير البيع</h2><button class="primary" id="exportSalesBtn">📊 تصدير Excel</button><div class="flex-wrap"><input id="searchInvId" placeholder="رقم الفاتورة"><input id="searchInvPhone" placeholder="رقم العميل"><select id="invFilter"><option value="all">الكل</option><option value="active">نشطة</option><option value="returned">مرتجعة</option></select><button id="searchInvBtn" class="primary">🔍</button><button id="resetInvBtn">عرض الكل</button></div><div id="invoicesList">${list.length ? `<table><thead><tr><th>رقم</th><th>العميل</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${list.map(i => `<tr><td>${i.id}</td><td>${i.customerName||'-'}</td><td>${i.finalTotal||i.total}</td><td>${i.date}</td><td>${i.isReturned?'مرتجعة':'نشطة'}</td><td><button class="printInv primary" data-inv='${JSON.stringify(i)}'>🖨️</button>${!i.isReturned?`<button class="returnInv warning" data-id="${i.id}">↩️</button>`:''}<button class="detailsInv" data-inv='${JSON.stringify(i)}'>📋</button></td></tr>`).join('')}</tbody></table>` : '<p>لا توجد فواتير</p>'}</div>`;
    
    const filter = () => {
        let filtered = list;
        let f = document.getElementById('invFilter')?.value || 'all';
        if (f === 'active') filtered = filtered.filter(i => !i.isReturned);
        else if (f === 'returned') filtered = filtered.filter(i => i.isReturned);
        let id = document.getElementById('searchInvId')?.value;
        if (id) filtered = filtered.filter(i => i.id == id);
        let phone = document.getElementById('searchInvPhone')?.value;
        if (phone) filtered = filtered.filter(i => i.customerPhone?.includes(phone));
        document.getElementById('invoicesList').innerHTML = filtered.length ? `<table><thead><tr><th>رقم</th><th>العميل</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${filtered.map(i => `<tr><td>${i.id}</td><td>${i.customerName||'-'}</td><td>${i.finalTotal||i.total}</td><td>${i.date}</td><td>${i.isReturned?'مرتجعة':'نشطة'}</td><td><button class="printInv primary" data-inv='${JSON.stringify(i)}'>🖨️</button>${!i.isReturned?`<button class="returnInv warning" data-id="${i.id}">↩️</button>`:''}<button class="detailsInv" data-inv='${JSON.stringify(i)}'>📋</button></td></tr>`).join('')}</tbody></table>` : '<p>لا توجد نتائج</p>';
        attachEvents();
    };
    
    const attachEvents = () => {
        document.querySelectorAll('.printInv').forEach(btn => btn.addEventListener('click', () => printInvoice(JSON.parse(btn.dataset.inv))));
        document.querySelectorAll('.returnInv').forEach(btn => btn.addEventListener('click', () => { if (confirm('استرجاع؟')) { returnInvoice(+btn.dataset.id); renderAllInvoices(container); } }));
        document.querySelectorAll('.detailsInv').forEach(btn => btn.addEventListener('click', () => showInvoiceDetailsDialog(JSON.parse(btn.dataset.inv))));
    };
    
    document.getElementById('exportSalesBtn')?.addEventListener('click', () => exportToExcel(list.map(i => [i.id, i.customerName||'-', i.customerPhone||'-', i.finalTotal||i.total, i.date, i.isReturned?'مرتجعة':'نشطة']), 'سجل_المبيعات', ['رقم','العميل','الهاتف','الإجمالي','التاريخ','الحالة']));
    document.getElementById('searchInvBtn')?.addEventListener('click', filter);
    document.getElementById('resetInvBtn')?.addEventListener('click', () => { document.getElementById('searchInvId').value = ''; document.getElementById('searchInvPhone').value = ''; document.getElementById('invFilter').value = 'all'; filter(); });
    attachEvents();
}

function renderAddCustomer(container) {
    if (!hasPermission('customers')) { container.innerHTML = '<h2>⛔ غير مصرح</h2>'; return; }
    container.innerHTML = `<h2>تسجيل عميل</h2><input id="cName" placeholder="الاسم"><input id="cPhone" placeholder="الهاتف"><input id="cAddress" placeholder="العنوان"><button class="primary" id="saveCustBtn">💾 حفظ</button>`;
    document.getElementById('saveCustBtn')?.addEventListener('click', () => { 
        let n = document.getElementById('cName').value, p = document.getElementById('cPhone').value, a = document.getElementById('cAddress').value; 
        if (n && p) { customers.push({ id: genId(customers), name: n, phone: p, address: a }); saveAll(); showMsg('✅ تم التسجيل'); 
        document.getElementById('cName').value = ''; document.getElementById('cPhone').value = ''; document.getElementById('cAddress').value = ''; } 
        else showMsg('الاسم والهاتف مطلوبان', true); 
    });
}

function renderCustomerList(container) {
    if (!hasPermission('customerList')) { container.innerHTML = '<h2>⛔ غير مصرح</h2>'; return; }
    container.innerHTML = `<h2>سجل العملاء</h2><button class="primary" id="exportCustomersBtn">📊 تصدير Excel</button><div class="flex-wrap"><input id="searchCust" placeholder="بحث"><button id="searchCustBtn">🔍</button><button id="resetCustBtn">عرض الكل</button></div><div id="custResult"></div>`;
    const show = (list) => { document.getElementById('custResult').innerHTML = list.length ? `<table><thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>حذف</th></tr></thead><tbody>${list.map((c,i) => `<tr><td>${i+1}</td><td>${c.name}</td><td>${c.phone}</td><td>${c.address||'-'}</td><td><button class="danger deleteCustBtn" data-id="${c.id}">🗑️</button></td></tr>`).join('')}</tbody></table>` : '<p>لا يوجد عملاء</p>';
        document.querySelectorAll('.deleteCustBtn').forEach(btn => btn.addEventListener('click', () => { if (confirm('حذف؟')) { customers = customers.filter(c => c.id != btn.dataset.id); saveAll(); show(customers); } })); };
    document.getElementById('exportCustomersBtn')?.addEventListener('click', () => exportToExcel(customers.map(c => [c.name, c.phone, c.address||'-']), 'العملاء', ['الاسم','الهاتف','العنوان']));
    document.getElementById('searchCustBtn')?.addEventListener('click', () => { let q = document.getElementById('searchCust').value.toLowerCase(); show(q ? customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : customers); });
    document.getElementById('resetCustBtn')?.addEventListener('click', () => { document.getElementById('searchCust').value = ''; show(customers); });
    show(customers);
}

// ========== فاتورة الشراء المعدلة ==========
function renderPurchase(container) {
    let purchaseCartHtml = purchaseCart.map((item, idx) => {
        const status = getExpiryStatus(item.expiryDate);
        return `<div class="cart-item"><div><strong>${item.name}</strong><br><small>${item.qty} × ${item.price} ج.م</small><br><small class="${status.class}">📅 ${item.expiryDate || 'بدون'} ${status.text}</small></div><span>${item.price * item.qty} ج.م</span><button class="danger removeFromPurchaseCartBtn" data-idx="${idx}">🗑️</button></div>`;
    }).join('');

    let subtotal = purchaseCart.reduce((s, i) => s + i.price * i.qty, 0);
    let discountValue = subtotal * (purchaseDiscountPercent / 100);
    let finalTotal = subtotal - discountValue + taxAmount;
    let remaining = finalTotal - paidAmount;

    container.innerHTML = `<h2>🛒 فاتورة شراء</h2><div class="grid-2"><div><h3>المورد</h3><select id="supSelect">${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select><h3>المنتجات</h3><div class="grid-3">${products.map(p => `<div class="product-card"><div>${p.image?.startsWith('data:image')?`<img src="${p.image}" style="width:50px;">`:p.image||'🐾'}</div><strong>${p.name}</strong><br><small>المخزون: ${p.stock||0}</small><br><button class="primary openPurchaseModalBtn" data-id="${p.id}" data-name="${p.name}" data-price="${p.priceWholesale}">➕ إضافة</button></div>`).join('')}</div></div>
    <div><h3>سلة المشتريات</h3><div id="purchaseCartItems">${purchaseCartHtml || '🛒 فارغة'}</div>
    <div><strong>الإجمالي: ${subtotal} ج.م</strong>${purchaseCart.length ? '<button class="danger" id="clearPurchaseCartBtn">🗑️ تفريغ</button>' : ''}</div>
    <div><label>خصم %</label><input id="purchaseDiscountInput" type="number" value="${purchaseDiscountPercent}"></div>
    <div><label>ضريبة</label><input id="purchaseTaxInput" type="number" value="${taxAmount}"></div>
    <div><label>مدفوع</label><input id="purchasePaidInput" type="number" value="${paidAmount}"></div>
    <div><strong>الإجمالي: ${finalTotal.toFixed(2)} ج.م</strong></div>
    <div><strong>المتبقي: ${remaining.toFixed(2)} ج.م</strong></div>
    <button class="primary" id="commitPurchaseBtn" ${purchaseCart.length === 0 ? 'disabled' : ''}>✅ تسجيل</button></div></div>

    <div id="addToPurchaseModal" class="modal-overlay" style="display:none;"><div class="modal-content" style="max-width:500px;"><div class="modal-header"><h3 id="modalProductName">إضافة منتج</h3><button class="modal-close" onclick="closePurchaseModal()">✕</button></div>
    <input type="hidden" id="modalProductId"><label>الكمية</label><input type="number" id="modalPurchaseQty" min="1" value="1"><label>سعر الشراء</label><input type="number" id="modalPurchasePrice" min="0" step="0.01"><label>📅 تاريخ الصلاحية</label><input type="date" id="modalExpiryDate"><div style="display:flex; gap:10px; margin-top:20px;"><button class="primary" id="confirmAddToPurchaseBtn">➕ إضافة</button><button class="danger" onclick="closePurchaseModal()">إلغاء</button></div></div></div>`;

    window.closePurchaseModal = () => document.getElementById('addToPurchaseModal').style.display = 'none';

    document.querySelectorAll('.openPurchaseModalBtn').forEach(btn => btn.addEventListener('click', () => {
        document.getElementById('modalProductId').value = btn.dataset.id;
        document.getElementById('modalProductName').textContent = btn.dataset.name;
        document.getElementById('modalPurchasePrice').value = btn.dataset.price;
        document.getElementById('modalPurchaseQty').value = 1;
        const d = new Date(); d.setFullYear(d.getFullYear() + 1);
        document.getElementById('modalExpiryDate').value = d.toISOString().split('T')[0];
        document.getElementById('addToPurchaseModal').style.display = 'flex';
    }));

    document.getElementById('confirmAddToPurchaseBtn')?.addEventListener('click', () => {
        let pid = +document.getElementById('modalProductId').value;
        let qty = +document.getElementById('modalPurchaseQty').value;
        let price = +document.getElementById('modalPurchasePrice').value;
        let exp = document.getElementById('modalExpiryDate').value;
        if (!qty || qty <= 0 || !price || price <= 0) { showMsg('أدخل قيماً صحيحة', true); return; }
        let prod = products.find(p => p.id === pid);
        if (prod) {
            purchaseCart.push({ id: prod.id, name: prod.name, price, qty, expiryDate: exp || null, image: prod.image });
            closePurchaseModal();
            renderPurchase(container);
        }
    });

    document.querySelectorAll('.removeFromPurchaseCartBtn').forEach(btn => btn.addEventListener('click', () => { purchaseCart.splice(+btn.dataset.idx, 1); renderPurchase(container); }));
    document.getElementById('clearPurchaseCartBtn')?.addEventListener('click', () => { purchaseCart = []; purchaseDiscountPercent = taxAmount = paidAmount = 0; renderPurchase(container); });
    
    const updateTotals = () => {
        let s = purchaseCart.reduce((sum, i) => sum + i.price * i.qty, 0);
        let d = s * (purchaseDiscountPercent / 100);
        let f = s - d + taxAmount;
        document.getElementById('purchaseSubtotalDisplay') && (document.getElementById('purchaseSubtotalDisplay').textContent = s);
        document.getElementById('purchaseFinalTotalDisplay') && (document.getElementById('purchaseFinalTotalDisplay').textContent = f.toFixed(2));
        document.getElementById('purchaseRemainingDisplay') && (document.getElementById('purchaseRemainingDisplay').textContent = (f - paidAmount).toFixed(2));
    };

    document.getElementById('purchaseDiscountInput')?.addEventListener('input', e => { purchaseDiscountPercent = parseFloat(e.target.value) || 0; updateTotals(); });
    document.getElementById('purchaseTaxInput')?.addEventListener('input', e => { taxAmount = parseFloat(e.target.value) || 0; updateTotals(); });
    document.getElementById('purchasePaidInput')?.addEventListener('input', e => { paidAmount = parseFloat(e.target.value) || 0; updateTotals(); });

    document.getElementById('commitPurchaseBtn')?.addEventListener('click', () => {
        if (purchaseCart.length === 0) return;
        let supId = +document.getElementById('supSelect').value, sup = suppliers.find(s => s.id === supId);
        
        for (let item of purchaseCart) {
            let prod = products.find(p => p.id === item.id);
            if (prod) {
                if (!prod.batches) prod.batches = [];
                prod.batches.push({ id: genId(prod.batches), quantity: item.qty, expiryDate: item.expiryDate, purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: item.price });
                stockMovements.push({ id: genId(stockMovements), type: 'إيداع', productId: prod.id, productName: prod.name, quantity: item.qty, source: `مورد: ${sup?.name}`, date: new Date().toISOString().split('T')[0], recordedBy: currentUser?.fullName || '-', expiryDate: item.expiryDate });
            }
        }
        
        let s = purchaseCart.reduce((sum, i) => sum + i.price * i.qty, 0);
        let d = s * (purchaseDiscountPercent / 100);
        let f = s - d + taxAmount;
        
        purchaseInvoices.push({ id: genId(purchaseInvoices), supplierId: supId, supplier: sup?.name, date: new Date().toLocaleString(), items: JSON.parse(JSON.stringify(purchaseCart)), subtotal: s, discountPercent: purchaseDiscountPercent, discountValue: d, tax: taxAmount, paid: paidAmount, remaining: f - paidAmount, total: f });
        
        updateTotalStock();
        saveAll();
        checkProductAlerts();
        purchaseCart = []; purchaseDiscountPercent = taxAmount = paidAmount = 0;
        showMsg('✅ تم تسجيل فاتورة الشراء');
        renderPurchase(container);
    });
}

function renderReturnPurchase(container) {
    container.innerHTML = `<h2>استرجاع فاتورة شراء</h2><input id="returnSearchId" placeholder="رقم الفاتورة"><button class="primary" id="returnSearchBtn">🔍 بحث</button><div id="returnPurchaseResult"></div>`;
    const display = (list) => {
        document.getElementById('returnPurchaseResult').innerHTML = list.length ? `<table><thead><tr><th>رقم</th><th>المورد</th><th>التاريخ</th><th>الإجمالي</th><th>إجراء</th></tr></thead><tbody>${list.map(p => `<tr><td>${p.id}</td><td>${p.supplier}</td><td>${p.date}</td><td>${p.total}</td><td><button class="danger returnPurchaseBtn" data-id="${p.id}">↩️ استرجاع</button></td></tr>`).join('')}</tbody></table>` : '<p>لا توجد فواتير</p>';
        document.querySelectorAll('.returnPurchaseBtn').forEach(btn => btn.addEventListener('click', () => {
            if (confirm('استرجاع الفاتورة؟')) {
                let inv = purchaseInvoices.find(p => p.id === +btn.dataset.id);
                if (inv?.items) {
                    for (let item of inv.items) {
                        let prod = products.find(p => p.id === item.id);
                        if (prod?.batches) {
                            let batch = prod.batches.find(b => b.expiryDate === item.expiryDate);
                            if (batch) batch.quantity = Math.max(0, batch.quantity - item.qty);
                            prod.batches = prod.batches.filter(b => b.quantity > 0);
                        }
                    }
                }
                purchaseInvoices = purchaseInvoices.filter(p => p.id !== +btn.dataset.id);
                updateTotalStock();
                saveAll();
                display(purchaseInvoices);
            }
        }));
    };
    document.getElementById('returnSearchBtn')?.addEventListener('click', () => { let id = document.getElementById('returnSearchId').value; display(id ? purchaseInvoices.filter(p => p.id == id) : purchaseInvoices); });
    display(purchaseInvoices);
}

function renderPurchaseList(container) {
    container.innerHTML = `<h2>سجل فواتير الشراء</h2><button class="primary" id="exportPurchaseBtn">📊 تصدير Excel</button>${purchaseInvoices.length ? `<table><thead><tr><th>رقم</th><th>المورد</th><th>التاريخ</th><th>الإجمالي</th><th>حذف</th></tr></thead><tbody>${purchaseInvoices.map(p => `<tr><td>${p.id}</td><td>${p.supplier}</td><td>${p.date}</td><td>${p.total}</td><td><button class="danger deletePurchaseBtn" data-id="${p.id}">🗑️</button></td></tr>`).join('')}</tbody></table>` : '<p>لا توجد فواتير</p>'}`;
    document.getElementById('exportPurchaseBtn')?.addEventListener('click', () => exportToExcel(purchaseInvoices.map(p => [p.id, p.supplier, p.date, p.total]), 'المشتريات', ['رقم','المورد','التاريخ','الإجمالي']));
    container.addEventListener('click', (e) => {
        let del = e.target.closest('.deletePurchaseBtn');
        if (del && confirm('حذف؟')) {
            let inv = purchaseInvoices.find(p => p.id === +del.dataset.id);
            if (inv?.items) for (let item of inv.items) { let prod = products.find(p => p.id === item.id); if (prod?.batches) { let batch = prod.batches.find(b => b.expiryDate === item.expiryDate); if (batch) batch.quantity = Math.max(0, batch.quantity - item.qty); prod.batches = prod.batches.filter(b => b.quantity > 0); } }
            purchaseInvoices = purchaseInvoices.filter(p => p.id !== +del.dataset.id);
            updateTotalStock();
            saveAll();
            renderPurchaseList(container);
        }
    });
}

function renderSuppliers(container) {
    container.innerHTML = `<h2>الموردين</h2><input id="supName" placeholder="الاسم"><input id="supPhone" placeholder="الهاتف"><input id="supAddr" placeholder="العنوان"><button class="primary" id="addSupBtn">➕ إضافة</button><div id="suppliersUl"></div>`;
    const list = () => { document.getElementById('suppliersUl').innerHTML = suppliers.map(s => `<div style="padding:10px; background:#fefaf5; margin:5px 0; display:flex; justify-content:space-between;">${s.name} - ${s.phone} <button class="danger deleteSupBtn" data-id="${s.id}">🗑️</button></div>`).join(''); document.querySelectorAll('.deleteSupBtn').forEach(btn => btn.addEventListener('click', () => { suppliers = suppliers.filter(s => s.id != btn.dataset.id); saveAll(); list(); })); };
    document.getElementById('addSupBtn')?.addEventListener('click', () => { let n = document.getElementById('supName').value, p = document.getElementById('supPhone').value, a = document.getElementById('supAddr').value; if (n) { suppliers.push({ id: genId(suppliers), name: n, phone: p, address: a }); saveAll(); list(); document.getElementById('supName').value = ''; document.getElementById('supPhone').value = ''; document.getElementById('supAddr').value = ''; } });
    list();
}

function renderSuppliersList(container) {
    container.innerHTML = `<h2>سجل الموردين</h2>${suppliers.length ? `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th></tr></thead><tbody>${suppliers.map(s => `<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.address||'-'}</td></tr>`).join('')}</tbody></table>` : '<p>لا يوجد موردين</p>'}`;
}

function renderFinances(container) {
    updateTotalStock();
    let stockValueWholesale = products.reduce((s, p) => s + (p.priceWholesale||0) * (p.stock||0), 0);
    let stockValueRetail = products.reduce((s, p) => s + (p.priceRetail||0) * (p.stock||0), 0);
    let totalSales = invoices.filter(i => !i.isReturned).reduce((s, i) => s + (i.finalTotal||i.total||0), 0);
    let totalPurchases = purchaseInvoices.reduce((s, i) => s + (i.total||0), 0);
    
    container.innerHTML = `<h2>💰 الماليات</h2>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:15px;">
        <div style="background:#667eea; color:white; padding:20px; border-radius:15px;"><h4>المبيعات</h4><p style="font-size:2rem;">${totalSales.toLocaleString()} ج.م</p></div>
        <div style="background:#f093fb; color:white; padding:20px; border-radius:15px;"><h4>المشتريات</h4><p style="font-size:2rem;">${totalPurchases.toLocaleString()} ج.م</p></div>
        <div style="background:${totalSales-totalPurchases>=0?'#4facfe':'#fa709a'}; color:white; padding:20px; border-radius:15px;"><h4>الصافي</h4><p style="font-size:2rem;">${(totalSales-totalPurchases).toLocaleString()} ج.م</p></div>
    </div>
    <div style="margin-top:20px;"><h3>قيمة المخزون</h3><p>بسعر الجملة: ${stockValueWholesale.toLocaleString()} ج.م</p><p>بسعر القطاعي: ${stockValueRetail.toLocaleString()} ج.م</p></div>`;
}

function renderInventory(container) {
    let totalIn = stockMovements.filter(m => m.type === 'إيداع').reduce((s, m) => s + m.quantity, 0);
    let totalOut = stockMovements.filter(m => m.type === 'سحب').reduce((s, m) => s + m.quantity, 0);
    container.innerHTML = `<h2>حركة المخزون</h2><button class="primary" id="exportMovementsBtn">📊 تصدير Excel</button>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:15px;"><div style="background:#e8f5e9; padding:15px;"><h3>إيداع</h3><p>${totalIn}</p></div><div style="background:#fff3e0; padding:15px;"><h3>سحب</h3><p>${totalOut}</p></div><div style="background:#e3f2fd; padding:15px;"><h3>صافي</h3><p>${totalIn-totalOut}</p></div></div>
    ${stockMovements.length ? `<table><thead><tr><th>التاريخ</th><th>النوع</th><th>المنتج</th><th>الكمية</th><th>تاريخ الصلاحية</th><th>المصدر</th></tr></thead><tbody>${stockMovements.map(m => `<tr><td>${m.date}</td><td>${m.type}</td><td>${m.productName}</td><td>${m.quantity}</td><td>${m.expiryDate||'-'}</td><td>${m.source||m.destination||'-'}</td></tr>`).join('')}</tbody></table>` : '<p>لا توجد حركة</p>'}`;
    document.getElementById('exportMovementsBtn')?.addEventListener('click', () => exportToExcel(stockMovements.map(m => [m.date, m.type, m.productName, m.quantity, m.expiryDate||'-', m.source||m.destination||'-']), 'حركة_المخزون', ['التاريخ','النوع','المنتج','الكمية','الصلاحية','المصدر']));
}

function renderStockDistribution(container) {
    container.innerHTML = `<h2>توزيع مخزون</h2><select id="distBranch">${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}</select><select id="distProduct">${products.map(p => `<option value="${p.id}">${p.name} (${p.stock||0})</option>`).join('')}</select><input id="distQty" type="number" placeholder="الكمية"><input id="distDate" type="date" value="${new Date().toISOString().split('T')[0]}"><button class="primary" id="distributeBtn">تأكيد</button>`;
    document.getElementById('distributeBtn')?.addEventListener('click', () => {
        let branch = branches.find(b => b.id === +document.getElementById('distBranch').value);
        let product = products.find(p => p.id === +document.getElementById('distProduct').value);
        let qty = +document.getElementById('distQty').value;
        if (!qty || qty <= 0 || qty > (product.stock||0)) { showMsg('كمية غير صحيحة', true); return; }
        deductStockFIFO(product.id, qty);
        stockMovements.push({ id: genId(stockMovements), type: 'سحب', productId: product.id, productName: product.name, quantity: qty, destination: `توزيع - ${branch.name}`, date: document.getElementById('distDate').value, recordedBy: currentUser?.fullName || '-' });
        saveAll();
        showMsg(`✅ تم التوزيع`);
        renderStockDistribution(container);
    });
}

function renderNotes(container) {
    checkProductAlerts();
    let userNotes = notes.filter(n => n.to === 'all' || n.to === currentUser?.username || n.from === currentUser?.username);
    let unread = userNotes.filter(n => !n.read).length;
    container.innerHTML = `<h2>📝 الملحوظات ${unread ? `<span class="alert-badge">${unread} جديدة</span>` : ''}</h2>
    <div class="notes-container"><div><h3>إرسال</h3><select id="noteTo"><option value="all">الجميع</option>${users.filter(u => u.id !== currentUser?.id).map(u => `<option value="${u.username}">${u.fullName}</option>`).join('')}</select><input id="noteTitle" placeholder="العنوان"><textarea id="noteContent" placeholder="المحتوى"></textarea><button class="primary" id="sendNoteBtn">📨 إرسال</button></div>
    <div>${userNotes.sort((a,b) => new Date(b.date) - new Date(a.date)).map(n => `<div class="note-card" style="${!n.read?'border-right-color:#f39c12':''}"><strong>${n.title}</strong> ${n.type?.includes('alert')?'🔔':''}<p>${n.content}</p><small>من: ${n.from||'النظام'}</small><div>${!n.read?`<button class="primary markReadBtn" data-id="${n.id}">✓ قرأت</button>`:''}<button class="danger deleteNoteBtn" data-id="${n.id}">🗑️</button></div></div>`).join('')}</div></div>`;
    
    document.getElementById('sendNoteBtn')?.addEventListener('click', () => {
        let to = document.getElementById('noteTo').value, title = document.getElementById('noteTitle').value, content = document.getElementById('noteContent').value;
        if (title && content) { notes.push({ id: genId(notes), type: 'user_note', title, content, date: new Date().toISOString(), read: false, from: currentUser?.username, to }); saveAll(); renderNotes(container); }
    });
    container.addEventListener('click', (e) => {
        let mark = e.target.closest('.markReadBtn'); if (mark) { let n = notes.find(n => n.id === +mark.dataset.id); if (n) { n.read = true; saveAll(); renderNotes(container); } }
        let del = e.target.closest('.deleteNoteBtn'); if (del && confirm('حذف؟')) { notes = notes.filter(n => n.id !== +del.dataset.id); saveAll(); renderNotes(container); }
    });
}

function addFooter() {
    const old = document.querySelector('.footer'); if (old) old.remove();
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `<div class="footer-content"><div class="footer-copyright"><span>© ${new Date().getFullYear()}</span> <span class="highlight">عجائب الرحمن</span> | <span class="developer-name">Mo23</span></div></div>`;
    document.querySelector('.app-container')?.insertAdjacentElement('afterend', footer);
}

// بدء التشغيل
render();
checkProductAlerts();