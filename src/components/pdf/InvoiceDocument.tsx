// src/components/pdf/InvoiceDocument.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

interface InvoiceDetails {
  id: string;
  status: string;
  total: number;
  issueDate: string;
  order: {
    id: string;
    company: { name: string };
    lines: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      productVariant: {
        product: { name: string };
      };
    }>;
  };
}

// CORRECTIONS MANUELLES DANS TOUT LE BLOC STYLESHEET
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 60,
    paddingRight: 60,
    paddingBottom: 30,
    lineHeight: 1.5,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 5,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  companyAddress: {
    fontSize: 12,
    textAlign: 'right',
  },
  invoiceInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  clientInfo: {
    flexDirection: 'column',
  },
  invoiceDetails: {
    textAlign: 'right',
  },
  label: {
    color: '#4B5563',
  },
  table: {
    width: '100%',
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#AAAAAA',
    backgroundColor: '#F3F4F6',
    padding: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    padding: 5,
  },
  thDescription: { width: '60%', fontWeight: 'bold' },
  th: { width: '20%', textAlign: 'right', fontWeight: 'bold' },
  tdDescription: { width: '60%' },
  td: { width: '20%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: 'center',
    color: 'grey',
    fontSize: 10,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalContainer: {
      width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#111827',
    paddingTop: 8,
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export const InvoiceDocument = ({ invoice }: { invoice: InvoiceDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      <View style={styles.header}>
        <Text style={styles.headerText}>FACTURE</Text>
        <View style={styles.companyAddress}>
            <Text>WoodTrade Inc.</Text>
            <Text>123 Rue du Bois, 75000 Paris</Text>
        </View>
      </View>

      <View style={styles.invoiceInfoSection}>
        <View style={styles.clientInfo}>
          <Text style={styles.label}>Facturé à :</Text>
          <Text>{invoice.order.company.name}</Text>
        </View>
        <View style={styles.invoiceDetails}>
          <Text><Text style={styles.label}>Facture N°:</Text> #{invoice.id.substring(0, 8).toUpperCase()}</Text>
          {/* CORRECTION MANUELLE ICI */}
          <Text><Text style={styles.label}>Date:</Text> {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.thDescription}>Description</Text>
          <Text style={styles.th}>Qté</Text>
          <Text style={styles.th}>P.U.</Text>
          <Text style={styles.th}>Total</Text>
        </View>
        {invoice.order.lines.map(line => (
          <View style={styles.tableRow} key={line.id}>
            <Text style={styles.tdDescription}>{line.productVariant.product.name}</Text>
            <Text style={styles.td}>{line.quantity}</Text>
            <Text style={styles.td}>{line.unitPrice.toFixed(2)} €</Text>
            <Text style={styles.td}>{line.totalPrice.toFixed(2)} €</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sous-total</Text>
                <Text style={styles.totalValue}>{invoice.total.toFixed(2)} €</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
                <Text>Total</Text>
                <Text>{invoice.total.toFixed(2)} €</Text>
            </View>
        </View>
      </View>
      
      <Text style={styles.footer} fixed>
        Merci pour votre confiance.
      </Text>
    </Page>
  </Document>
);