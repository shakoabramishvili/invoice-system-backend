import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Invoice } from '@prisma/client';

@Injectable()
export class PdfService {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  async generateInvoicePdf(invoice: any, templateName: string = 'default-invoice'): Promise<Buffer> {
    const html = await this.generateInvoiceHtml(invoice, templateName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Set a longer timeout for loading images
      await page.setDefaultNavigationTimeout(30000);

      // Load the HTML content and wait for network to be idle
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Wait a bit more for any images to fully load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => {
              img.onload = img.onerror = resolve;
            }))
        );
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private async generateInvoiceHtml(invoice: any, templateName: string): Promise<string> {
    // Load template
    const template = await this.loadTemplate(templateName);

    // Prepare template data
    const templateData = this.prepareTemplateData(invoice);

    // Render template
    return template(templateData);
  }

  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    // Load template file
    const templatePath = path.join(__dirname, 'templates', `${templateName}.template.html`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');

    // Compile template
    const template = Handlebars.compile(templateSource);

    // Cache it
    this.templateCache.set(templateName, template);

    return template;
  }

  private prepareTemplateData(invoice: any): any {
    // Helper function to format date as dd.mm.yyyy
    const formatDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const issueDate = formatDate(new Date(invoice.issueDate || invoice.createdAt));
    const dueDate = formatDate(new Date(invoice.dueDate));

    // Format discount label with type in brackets
    let discountLabel = 'Discount:';
    if (invoice.discountType === 'PERCENTAGE') {
      discountLabel = `Discount (${invoice.discountValue}%):`;
    } else if (invoice.discountType === 'FIXED_AMOUNT') {
      discountLabel = `Discount (${invoice.discountValue.toFixed(2)}):`;
    }

    // Format passengers
    const passengers = (invoice.passengers || []).map(p => ({
      gender: p.gender,
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate ? formatDate(new Date(p.birthDate)) : '',
      isMain: p.isMain,
    }));

    // Handle buyer logic for individuals without a registered buyer
    let buyer = invoice.buyer;
    let isBuyerFromPassenger = false;
    if (invoice.legalType === 'INDIVIDUAL' && !invoice.buyerId && passengers.length > 0) {
      // Find the main passenger
      const mainPassenger = passengers.find(p => p.isMain);
      if (mainPassenger) {
        // Create a buyer object from the main passenger
        buyer = {
          name: `${mainPassenger.firstName} ${mainPassenger.lastName}`,
          // Other fields will be null/empty as they don't apply to individual passengers
          taxId: null,
          contactPerson: null,
          email: null,
          phone: null,
          address: null,
          country: null,
        };
        isBuyerFromPassenger = true;
      }
    }

    // Format products
    const products = (invoice.products || []).map(p => {
      const departureDate = p.departureDate ? formatDate(new Date(p.departureDate)) : '';
      const arrivalDate = p.arrivalDate ? formatDate(new Date(p.arrivalDate)) : '';
      return {
        description: p.description,
        direction: p.direction || '',
        dates: `${departureDate} / ${arrivalDate}`,
        quantity: p.quantity,
        price: p.price.toFixed(2),
        total: p.total.toFixed(2),
      };
    });

    return {
      invoiceNumber: invoice.invoiceNumber,
      issueDate,
      dueDate,
      showLogo: invoice.showLogo,
      showStamp: invoice.showStamp,
      sellerLogo: invoice.seller?.logo || null,
      sellerStamp: invoice.seller?.stamp || null,
      seller: invoice.seller,
      buyer: buyer,
      isBuyerFromPassenger: isBuyerFromPassenger,
      hasPassengers: passengers.length > 0,
      passengers,
      products,
      subtotal: invoice.subtotal.toFixed(2),
      currencyFrom: invoice.currencyFrom,
      hasDiscount: invoice.discountAmount && invoice.discountAmount > 0,
      discountLabel,
      discountAmount: invoice.discountAmount ? invoice.discountAmount.toFixed(2) : '0.00',
      totalAfterDiscount: invoice.totalAfterDiscount.toFixed(2),
      hasCurrencyConversion: invoice.exchangeRate && invoice.exchangeRate > 0 && invoice.currencyTo && invoice.currencyTo !== invoice.currencyFrom,
      exchangeRate: invoice.exchangeRate && invoice.currencyTo && invoice.currencyFrom
        ? `1 ${invoice.currencyFrom} = ${invoice.exchangeRate.toFixed(3)} ${invoice.currencyTo}`
        : '',
      currencyTo: invoice.currencyTo || invoice.currencyFrom,
      grandTotal: invoice.grandTotal.toFixed(2),
      bank: invoice.bank,
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
    };
  }
}
