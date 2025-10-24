// prisma/seed.ts
import { PrismaClient, Role, SupplierInvoiceStatus, SupplierPaymentStatus, InvoiceStatus, PaymentStatus, CreditNoteStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to create a product with a single variant, price, and initial inventory
async function createProduct(productData: {
  name: string;
  sku: string;
  family: string;
  variant: { unit: string };
  price: number;
  qty: number;
}) {
  const product = await prisma.product.create({
    data: {
      name: productData.name,
      sku: productData.sku,
      family: productData.family,
      variants: {
        create: {
          unit: productData.variant.unit,
          prices: { create: { price: productData.price } },
          inventories: { create: { quantity: productData.qty } },
        },
      },
    },
    include: {
      variants: true,
    },
  });
  return product.variants[0];
}

async function main() {
  console.log("🌱 Start seeding all test data...");

  // 1. --- CLEAN UP OLD DATA ---
  console.log("🔥 Deleting old data...");
  await prisma.supplierPaymentAllocation.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.creditNoteAllocation.deleteMany({});
  await prisma.supplierInvoiceLine.deleteMany({});
  await prisma.orderLine.deleteMany({});
  await prisma.returnOrderLine.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.creditNote.deleteMany({});
  await prisma.returnOrder.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.customerOrder.deleteMany({});
  await prisma.supplierInvoice.deleteMany({});
  await prisma.supplierPayment.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.price.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.cashMovement.deleteMany({});
  await prisma.cashRegisterSession.deleteMany({});
  await prisma.cashRegister.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.supplierContact.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✅ Old data deleted.");

  // 2. --- CREATE CORE DATA ---
  console.log("👤 Creating test users...");
  const accountantUser = await prisma.user.create({
    data: {
      id: 'clxshm3z10000111122223333',
      email: 'compta@woodtrade.com',
      name: 'Alain Comptable',
      role: Role.ACCOUNTANT,
    },
  });
  const adminUser = await prisma.user.create({
    data: {
      id: 'clxshm3z10000111122224444',
      email: 'admin@woodtrade.com',
      name: 'Jeanne Admin',
      role: Role.ADMIN,
    },
  });
  console.log("✅ Users created.");

  console.log("📦 Creating products...");
  const productPlanche = await createProduct({ name: "Planche de Sapin 27x200", sku: "P-SAP-27", family: "Bois de Construction", variant: { unit: "pièce" }, price: 25.00, qty: 100 });
  const productVis = await createProduct({ name: "Vis à bois Inox 5x80 (Boîte de 100)", sku: "VIS-INOX-580", family: "Quincaillerie", variant: { unit: "boîte" }, price: 22.50, qty: 300 });
  const productPanneau = await createProduct({ name: "Panneau OSB 3 18mm", sku: "PAN-OSB-18", family: "Panneaux", variant: { unit: "m2" }, price: 15.75, qty: 250 });
  const productPoutre = await createProduct({ name: "Poutre Lamellé-collé 100x300", sku: "P-LAM-100", family: "Bois de Structure", variant: { unit: "pièce" }, price: 120.00, qty: 20 });
  console.log("✅ Products created.");

  // 3. --- CREATE SUPPLIERS & PURCHASING DATA ---
  console.log("🚚 Creating suppliers and purchasing scenarios...");
  const supplierScierie = await prisma.supplier.create({ data: { name: 'Scierie des Ardennes', category: 'Bois Massif', contacts: { create: { firstName: 'Luc', lastName: 'Dubois' } } } });
  const supplierQuincaillerie = await prisma.supplier.create({ data: { name: 'Quincaillerie Pro Distribution', category: 'Visserie & Colles', contacts: { create: { firstName: 'Sophie', lastName: 'Martin' } } } });
  
  await prisma.supplierInvoice.create({ data: { supplierId: supplierScierie.id, invoiceNumber: 'SA-2025-001', status: SupplierInvoiceStatus.UNPAID, subtotal: 500.00, total: 500.00, invoiceDate: new Date('2025-08-10'), dueDate: new Date('2025-09-10'), lines: { create: { productVariantId: productPlanche.id, quantity: 25, unitPrice: 20.00, totalPrice: 500.00, receivedQuantity: 25 } } } });
  const partialInvoice = await prisma.supplierInvoice.create({ data: { supplierId: supplierScierie.id, invoiceNumber: 'SA-2025-002', status: SupplierInvoiceStatus.PARTIALLY_PAID, subtotal: 2000.00, total: 2000.00, invoiceDate: new Date('2025-09-20'), dueDate: new Date('2025-10-20'), lines: { create: { productVariantId: productPanneau.id, quantity: 160, unitPrice: 12.50, totalPrice: 2000.00, receivedQuantity: 100 } } } });
  const partialPayment = await prisma.supplierPayment.create({ data: { supplierId: supplierScierie.id, amount: 1200.00, method: 'TRANSFER', status: SupplierPaymentStatus.FULLY_ALLOCATED } });
  await prisma.supplierPaymentAllocation.create({ data: { paymentId: partialPayment.id, invoiceId: partialInvoice.id, amountAllocated: 1200.00 } });
  const paidInvoice = await prisma.supplierInvoice.create({ data: { supplierId: supplierQuincaillerie.id, invoiceNumber: 'QPD-5910', status: SupplierInvoiceStatus.PAID, subtotal: 180.00, total: 180.00, invoiceDate: new Date('2025-09-01'), dueDate: new Date('2025-10-01'), lines: { create: { productVariantId: productVis.id, quantity: 10, unitPrice: 18.00, totalPrice: 180.00, receivedQuantity: 10 } } } });
  const fullPayment = await prisma.supplierPayment.create({ data: { supplierId: supplierQuincaillerie.id, amount: 180.00, method: 'TRANSFER', status: SupplierPaymentStatus.FULLY_ALLOCATED } });
  await prisma.supplierPaymentAllocation.create({ data: { paymentId: fullPayment.id, invoiceId: paidInvoice.id, amountAllocated: 180.00 } });
  await prisma.supplierInvoice.create({ data: { supplierId: supplierScierie.id, invoiceNumber: 'SA-2025-003-VOID', status: SupplierInvoiceStatus.VOID, subtotal: 150.00, total: 150.00, invoiceDate: new Date('2025-09-25'), dueDate: new Date('2025-10-25'), } });
  await prisma.supplierPayment.createMany({ data: [{ supplierId: supplierScierie.id, amount: 500.00, method: 'TRANSFER', status: SupplierPaymentStatus.AVAILABLE }, { supplierId: supplierQuincaillerie.id, amount: 100.00, method: 'CHECK', status: SupplierPaymentStatus.AVAILABLE }] });
  
  const supplierMecaBois = await prisma.supplier.create({ data: { name: 'Meca-Bois SARL', category: 'Panneaux & Dérivés', contacts: { create: { firstName: 'Jean', lastName: 'Valjean' } } } });
  await prisma.supplierInvoice.createMany({ data: [{ supplierId: supplierMecaBois.id, invoiceNumber: 'MB-001', status: SupplierInvoiceStatus.UNPAID, subtotal: 450.00, total: 450.00, invoiceDate: new Date('2025-09-10'), dueDate: new Date('2025-10-10') }, { supplierId: supplierMecaBois.id, invoiceNumber: 'MB-002', status: SupplierInvoiceStatus.UNPAID, subtotal: 320.50, total: 320.50, invoiceDate: new Date('2025-09-15'), dueDate: new Date('2025-10-15') }, { supplierId: supplierMecaBois.id, invoiceNumber: 'MB-003', status: SupplierInvoiceStatus.UNPAID, subtotal: 800.00, total: 800.00, invoiceDate: new Date('2025-09-25'), dueDate: new Date('2025-10-25') }] });
  await prisma.supplierPayment.create({ data: { supplierId: supplierMecaBois.id, amount: 1000.00, method: 'TRANSFER', status: SupplierPaymentStatus.AVAILABLE } });
  console.log("✅ Suppliers and purchasing data created.");

  // 4. --- CREATE CUSTOMERS & SALES DATA ---
  console.log("👥 Creating customers and sales scenarios...");
  
  // CORRECTIF : Ajout de 'include' pour récupérer les contacts créés
  const customerArtisan = await prisma.company.create({ 
    data: { name: 'Menuiserie Artisanale Dubois', category: 'Artisan', contacts: { create: { firstName: 'Pierre', lastName: 'Dubois', email: 'pierre.dubois@email.com' } } },
    include: { contacts: true }
  });
  const customerParticulier = await prisma.company.create({ 
    data: { name: 'Projet Rénovation Mme. Durand', category: 'Particulier', contacts: { create: { firstName: 'Marie', lastName: 'Durand', email: 'marie.d@email.com' } } },
    include: { contacts: true }
  });
  
  // Scenario 1: Fully Paid Invoice
  const orderPaid = await prisma.customerOrder.create({ data: { companyId: customerParticulier.id, contactId: customerParticulier.contacts[0].id, userId: adminUser.id, subtotal: 250.00, grandTotal: 250.00, status: 'DELIVERED', lines: { create: { productVariantId: productPlanche.id, quantity: 10, unitPrice: 25.00, totalPrice: 250.00 } } } });
  const invoicePaid = await prisma.invoice.create({ data: { orderId: orderPaid.id, status: InvoiceStatus.PAID, subtotal: 250.00, total: 250.00, dueDate: new Date('2025-09-30') } });
  const paymentForPaid = await prisma.payment.create({ data: { companyId: customerParticulier.id, amount: 250.00, method: 'CARD', status: PaymentStatus.FULLY_ALLOCATED } });
  await prisma.paymentAllocation.create({ data: { paymentId: paymentForPaid.id, invoiceId: invoicePaid.id, amountAllocated: 250.00 } });

  // Scenario 2: Partially Paid Invoice + Overdue
  const orderPartial = await prisma.customerOrder.create({ data: { companyId: customerArtisan.id, contactId: customerArtisan.contacts[0].id, userId: adminUser.id, subtotal: 1125.00, grandTotal: 1125.00, status: 'DELIVERED', lines: { create: { productVariantId: productVis.id, quantity: 50, unitPrice: 22.50, totalPrice: 1125.00 } } } });
  const invoicePartial = await prisma.invoice.create({ data: { orderId: orderPartial.id, status: InvoiceStatus.PARTIALLY_PAID, subtotal: 1125.00, total: 1125.00, issueDate: new Date('2025-08-15'), dueDate: new Date('2025-09-15') } });
  const paymentForPartial = await prisma.payment.create({ data: { companyId: customerArtisan.id, amount: 700.00, method: 'TRANSFER', status: PaymentStatus.FULLY_ALLOCATED } });
  await prisma.paymentAllocation.create({ data: { paymentId: paymentForPartial.id, invoiceId: invoicePartial.id, amountAllocated: 700.00 } });
  
  // Scenario 3: Unpaid Invoice
  const orderUnpaid = await prisma.customerOrder.create({ data: { companyId: customerArtisan.id, contactId: customerArtisan.contacts[0].id, userId: adminUser.id, subtotal: 600.00, grandTotal: 600.00, status: 'DELIVERED', lines: { create: { productVariantId: productPoutre.id, quantity: 5, unitPrice: 120.00, totalPrice: 600.00 } } } });
  await prisma.invoice.create({ data: { orderId: orderUnpaid.id, status: InvoiceStatus.UNPAID, subtotal: 600.00, total: 600.00, issueDate: new Date('2025-09-20'), dueDate: new Date('2025-10-20') } });

  // Scenario 4: Available payments and credit notes for testing
  await prisma.payment.create({ data: { companyId: customerArtisan.id, amount: 300.00, method: 'TRANSFER', status: PaymentStatus.AVAILABLE } });
  await prisma.creditNote.create({ data: { companyId: customerArtisan.id, initialAmount: 150.00, remainingAmount: 150.00, reason: 'Geste commercial', status: CreditNoteStatus.AVAILABLE } });
  
  // Scenario 5: Dedicated Customer for Reconciliation test
  // CORRECTIF : Ajout de 'include' pour récupérer les contacts créés
  const customerReconcile = await prisma.company.create({ 
    data: { name: 'Construct SARL', category: 'Constructeur', contacts: { create: { firstName: 'Bob', lastName: 'Le Bricoleur' } } },
    include: { contacts: true }
  });
  const orderReconcile1 = await prisma.customerOrder.create({ data: { companyId: customerReconcile.id, contactId: customerReconcile.contacts[0].id, userId: adminUser.id, subtotal: 157.50, grandTotal: 157.50, status: 'DELIVERED', lines: { create: { productVariantId: productPanneau.id, quantity: 10, unitPrice: 15.75, totalPrice: 157.50 } } } });
  const orderReconcile2 = await prisma.customerOrder.create({ data: { companyId: customerReconcile.id, contactId: customerReconcile.contacts[0].id, userId: adminUser.id, subtotal: 45.00, grandTotal: 45.00, status: 'DELIVERED', lines: { create: { productVariantId: productVis.id, quantity: 2, unitPrice: 22.50, totalPrice: 45.00 } } } });
  await prisma.invoice.createMany({ data: [
    { orderId: orderReconcile1.id, status: InvoiceStatus.UNPAID, subtotal: 157.50, total: 157.50, issueDate: new Date('2025-09-01'), dueDate: new Date('2025-10-01') },
    { orderId: orderReconcile2.id, status: InvoiceStatus.UNPAID, subtotal: 45.00, total: 45.00, issueDate: new Date('2025-09-05'), dueDate: new Date('2025-10-05') },
  ]});
  await prisma.payment.create({ data: { companyId: customerReconcile.id, amount: 500.00, method: 'TRANSFER', status: PaymentStatus.AVAILABLE } });
  console.log("✅ Customers and sales data created.");


  console.log("🎉 Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
