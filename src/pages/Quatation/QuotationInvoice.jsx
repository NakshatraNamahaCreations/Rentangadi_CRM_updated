import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { ApiURL, ImageApiURL } from "../../api";
import { Container, Row, Col, Table, Button } from "react-bootstrap";
import axios from 'axios';
import QuotationDetails from "./QuotationDetails";
import { fmt, safeNumber } from "../../utils/numberUtils";
import { parseDate } from "../../utils/parseDates";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { safeImageToBase64 } from "../../utils/createPdf";

const BRAND = [189, 85, 37]; // #BD5525

const QuotationInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const invoiceRef = useRef();
  const { id } = useParams(); // ✅ get quotation ID from URL

  const [quotation, setQuotation] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);



  // const quotation = location.state?.quotation;
  // quotation.discount = 0
  // const items = location.state?.items || [];
  // const items = quotation?.slots[0]?.Products
  const productDates = location.state?.productDates || {};

  // console.log(`quotation from state: `, quotation);
  // console.log(`items from state: `, items);

  // if (!quotation) {
  //   return (
  //     <div className="container my-5">
  //       <h3>No Quotation Data Provided</h3>
  //       <button className="btn btn-primary" onClick={() => navigate(-1)}>
  //         Go Back
  //       </button>
  //     </div>
  //   );
  // }

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${ApiURL}/quotations/getquotation/${id}`);
        console.log(`Fetched quote: `, res.data.quoteData);
        const quoteData = res.data.quoteData;

        // Calculate days and total for each product
        const enrichedItems = (quoteData.slots?.[0]?.Products || []).map(prod => {
          const start = parseDate(prod.productQuoteDate || quoteData.quoteDate);
          const end = parseDate(prod.productEndDate || quoteData.endDate);

          let days = 1;
          if (start && end) {
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            days = isNaN(diff) || diff < 1 ? 1 : diff;
          }

          const price = Number(prod.price) || 0;
          const qty = Number(prod.quantity) || 0;
          const total = price * qty * days;

          return {
            ...prod,
            days,
            pricePerUnit: price,
            amount: total,
          };
        });

        quoteData.slots[0].Products = enrichedItems

        // console.log(`quotation slots[0] prods `, quoteData.slots[0].Products);

        const productsTotal = enrichedItems.reduce(
          (sum, item) => sum + ((item.pricePerUnit || 0) * (item.quantity || 0) * (item.days || 1)),
          0
        );
        const transport = Number(quoteData.transportcharge || 0);
        const manpower = Number(quoteData.labourecharge || 0);
        const discountPercent = Number(quoteData.discount || 0);
        const gstPercent = Number(quoteData.GST || 0);

        // Calculate totals in the new order
        const discountAmt = discountPercent ? (discountPercent / 100 * productsTotal) : 0;
        const afterDiscount = productsTotal - discountAmt;
        const totalWithCharges = afterDiscount + transport + manpower;

        const allSubTotal = totalWithCharges + safeNumber(quoteData?.refurbishment);
        const gstAmt = gstPercent ? (gstPercent / 100 * allSubTotal) : 0;
        // const finalTotal = Math.round(allSubTotal + gstAmt);
        const finalTotal = allSubTotal + gstAmt;

        const enrichedQuote = ({ ...quoteData, allProductsTotal: productsTotal, discountAmt, afterDiscount, totalWithCharges, allSubTotal, gstAmt, finalTotal })

        console.log({ allProductsTotal: productsTotal, discountAmt, afterDiscount, totalWithCharges, gstAmt, finalTotal, gstPercent });

        setQuotation(enrichedQuote);
        setItems(enrichedItems);
      } catch (error) {
        console.error("Error fetching quotation:", error);
        setQuotation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);


  // ✅ Early return for loading or missing data
  if (loading)
    return (
      <div className="container my-5">
        <h4>Loading Quotation Invoice...</h4>
      </div>
    );

  if (!quotation)
    return (
      <div className="container my-5">
        <h4>No quotation found</h4>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );



  // // Calculate products total
  // // const productsTotal = items.reduce((sum, item) => sum + (item.amount * item.days || 0), 0);
  // const productsTotal = items.reduce(
  //   (sum, item) => sum + ((item.pricePerUnit || 0) * (item.quantity || 0) * (item.days || 1)),
  //   0
  // );
  // console.log(`productsTotal: `, productsTotal);

  // const transport = Number(quotation.transportcharge || 0);
  // const manpower = Number(quotation.labourecharge || 0);
  // const discountPercent = Number(quotation.discount || 0);
  // const gstPercent = Number(quotation.GST || 0);

  // // Calculate totals in the new order
  // const discountAmt = discountPercent ? (discountPercent / 100 * productsTotal) : 0;
  // const afterDiscount = productsTotal - discountAmt;
  // const totalWithCharges = afterDiscount + transport + manpower;
  // const allSubTotal = totalWithCharges + quotation?.refurbishment;
  // const gstAmt = gstPercent ? (gstPercent / 100 * allSubTotal) : 0;
  // const finalTotal = Math.round(totalWithCharges + gstAmt);

  const makeSafe = (val, fallback = "NA") => {
    if (!val && val !== 0) return fallback;
    return String(val)
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 120) || fallback;
  };

  // build filename from an array of parts and return with extension
  const buildFilename = (parts = [], ext = "pdf") => {
    const name = parts.map((p) => makeSafe(p)).join("-").replace(/_+/g, "_");
    return `${name}.${ext}`;
  };

  // =====================
  // Helpers
  // =====================

  // ---------- Helpers ----------
  const fmtIN = (n) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n) || 0);
  const money = (n) => `INR ${fmtIN(n)}`; // ✅ no font needed


  function addFooter(doc) {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      // doc.text(`Page ${i} of ${pages} • Generated by Rent Angadi`, w - 180, h - 12);
    }
  }

  // ---------- PDF Generator ----------
  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = { left: 40, right: 40 };
      const usableWidth = pageWidth - margins.left - margins.right;
      let y = 40;

      // ---------------------------
      // TITLE
      // ---------------------------
      doc.setFontSize(16);
      doc.text("Quotation", pageWidth / 2, y, { align: "center" });
      y += 25;

      // ---------------------------
      // HEADER TABLE
      // ---------------------------
      const colWidths = [
        usableWidth * 0.22,
        usableWidth * 0.28,
        usableWidth * 0.22,
        usableWidth * 0.28,
      ];

      autoTable(doc, {
        body: [
          ["Company Name", quotation.clientName || "—", "Client Name", quotation.executivename || "—"],
          ["Slot", quotation.quoteTime || "—", "Venue", quotation.address || "—"],
          ["Delivery Date", quotation.quoteDate || "—", "Dismantle Date", quotation.endDate || "—"],
          ["Incharge Name", quotation.inchargeName || "N/A", "Rent Angadi Point of Contact", quotation.inchargePhone || "N/A"],
        ],
        startY: y,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 4,
          valign: "middle",
          lineColor: [180, 180, 180],
        },
        head: [],
        margin: margins,
        tableWidth: usableWidth,
        columnStyles: {
          0: { cellWidth: colWidths[0], fontStyle: "bold" },
          1: { cellWidth: colWidths[1] },
          2: { cellWidth: colWidths[2], fontStyle: "bold" },
          3: { cellWidth: colWidths[3] },
        },
      });

      // --------------------------------------------------
      // PRODUCT TABLE WITH NON-COMPRESSED PNG IMAGES
      // --------------------------------------------------
      const rows = await Promise.all(
        items.map(async (p, i) => {
          const url = p.ProductIcon ? `${ImageApiURL}/product/${p.ProductIcon}` : null;
          // const img64 = url ? await imageToBase64PNG(url) : null;
          const img64 = url ? await safeImageToBase64(url, 80) : null;


          return [
            i + 1,
            p.productName,
            p.productSlot || quotation.quoteTime,
            img64, // PNG image
            money(p.pricePerUnit || 0),
            p.quantity,
            p.days,
            money((p.pricePerUnit || 0) * (p.quantity || 0) * (p.days || 1)),
          ];
        })
      );

      autoTable(doc, {
        head: [["#", "Product", "Slot", "Image", "Price", "Qty", "Days", "Amount"]],
        body: rows,
        startY: doc.lastAutoTable.finalY + 20,
        theme: "grid",

        rowPageBreak: "avoid",
        pageBreak: "auto",

        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: BRAND,
          textColor: 0,
        },

        headStyles: {
          fillColor: BRAND,
          textColor: 255,
          minCellHeight: 24,
        },

        didParseCell(data) {
          if (data.row.section === "body") {
            data.cell.styles.minCellHeight = 70;
          }
          if (data.column.index === 3) data.cell.text = "";
        },

        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 140 },
          2: { cellWidth: 95 },
          3: { cellWidth: 65, halign: "center" }, // IMAGE CELL
          4: { cellWidth: 60 },
          5: { cellWidth: 35 },
          6: { cellWidth: 35 },
          7: { cellWidth: 70 },
        },

        didDrawCell(data) {
          if (
            data.row.section === "body" &&
            data.column.index === 3 &&
            typeof data.cell.raw === "string" &&
            data.cell.raw.startsWith("data:image")
          ) {
            const img = data.cell.raw;
            const { x, y, width, height } = data.cell;

            const imgSize = 50;
            const cx = x + (width - imgSize) / 2;
            const cy = y + (height - imgSize) / 2;

            doc.addImage(img, "PNG", cx, cy, imgSize, imgSize);
          }
        },
      });

      // ---------------------------
      // SUMMARY SECTION
      // ---------------------------
      const S = (v) => money(v ?? 0);
      const summaryRows = [];

      // Build summary rows
      if (quotation.discount && Number(quotation.discount) !== 0) {
        summaryRows.push(
          ["Total Amount before discount", S(quotation.allProductsTotal)],
          [`Discount (${quotation.discount}%)`, `-${S(quotation.discountAmt)}`],
          ["Total Amount After Discount", S(quotation.afterDiscount)]
        );
      } else {
        summaryRows.push(["Total Amount", S(quotation.allProductsTotal)]);
      }

      summaryRows.push(
        ["Transportation", S(quotation.transportcharge)],
        ["Manpower", S(quotation.labourecharge)],
        ["Reupholstery", S(quotation.refurbishment || 0)],
        ["Sub Total", S(quotation.allSubTotal)]
      );

      if (quotation.GST && Number(quotation.GST) > 0) {
        summaryRows.push([`GST (${quotation.GST}%)`, S(quotation.gstAmt)]);
      }

      summaryRows.push(["Grand Total", S(quotation.finalTotal)]);

      // // --------------------------------------
      // // SAFETY: Prevent autoTable crash
      // // --------------------------------------
      // if (summaryRows.length === 0) {
      //   summaryRows.push(["Grand Total", S(quotation.finalTotal)]);
      // }

      // ---------------------------
      // SMART PAGE FIT LOGIC
      // ---------------------------

      const headerHeight = 25;
      const rowHeight = 20;
      const minRequired = headerHeight + rowHeight; // header + 1 row

      let summaryStartY = doc.lastAutoTable.finalY + 20;
      const bottomMargin = 40;

      // If AT LEAST 1 row cannot fit → add new page
      const canFitOneRow =
        summaryStartY + minRequired <= pageHeight - bottomMargin;

      if (!canFitOneRow) {
        doc.addPage();
        summaryStartY = 40; // RESET startY to top of new page
      }

      // ---------------------------
      // RENDER SUMMARY TABLE
      // ---------------------------
      autoTable(doc, {
        head: [["Description", "Amount"]],
        body: summaryRows,
        startY: summaryStartY,   // IMPORTANT: Use corrected startY
        theme: "grid",
        showHead: "everyPage",

        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: BRAND,
          textColor: 0,
        },

        headStyles: {
          fillColor: BRAND,
          textColor: 255,
          minCellHeight: 20,
        },

        columnStyles: {
          1: { halign: "right" },
        },
      });



      // ---------------------------
      // NOTES
      // ---------------------------
      let noteY = doc.lastAutoTable.finalY + 35;
      const noteHeight = 5 * 15 + 40;

      if (noteY + noteHeight > pageHeight - 40) {
        doc.addPage();
        noteY = 40;
      }

      doc.setFontSize(10);
      doc.text("Notes:", 40, noteY);

      const notes = [
        "1. Additional elements would be charged on actuals, transportation would be additional.",
        "2. 100% Payment for confirmation of event.",
        "3. Costing is merely for estimation purposes. Requirements are blocked post payment in full.",
        "4. If inventory is not reserved with payments, we are not committed to keep it.",
        "5. The nature of the rental industry that our furniture is frequently moved and transported, which can lead to scratches on glass, minor chipping of paintwork, & minor stains etc. We ask you to visit the warehouse to inspect blocked furniture if you wish.",
      ];

      let currentY = noteY + 15;
      const wrapWidth = 500;

      notes.forEach((line) => {
        const split = doc.splitTextToSize(line, wrapWidth);
        doc.text(split, 60, currentY);
        currentY += split.length * 12;
      });


      addFooter(doc);

      const filename = buildFilename([
        formatDateToMonthName(quotation.quoteDate),
        formatDateToMonthName(quotation.endDate),
        quotation?.executivename,
        quotation?.address,
        quotation?.clientName,
      ]);

      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  const formatDateToMonthName = (dateString) => {
    if (!dateString) return '';
    const [day, month, year] = dateString.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day} ${months[month - 1].slice(0, 3)} `;
  };

  return (
    <div className="container my-5">
      <Button
        onClick={handleDownloadPDF}
        variant="success"
        className="my-1 d-flex ms-auto" // ms-auto will push the button to the right
      >
        Download Quotation
      </Button>
      <div className="no-print" ref={invoiceRef} style={{ background: "#fff", padding: 24, borderRadius: 0, fontFamily: "Arial, sans-serif" }}>
        <h2 style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Quotation</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Company Name</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.clientName}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Client Name</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.executivename}</td>
            </tr>
            <tr>
              {/* <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Occasion</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.occasion}</td> */}
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Slot</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.quoteTime}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Venue</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.address}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Delivery Date</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.quoteDate}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Dismantle Date</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.endDate}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>InchargeName</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.inchargeName || "N/A"}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Rent Angadi Point of Contact</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.inchargePhone || "N/A"}</td>
            </tr>
            <tr>
              {/* <td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 600 }}>Additional Logistics Support</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{quotation.additionalLogisticsSupport}</td> */}
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#BD5525', color: '#fff' }}>
            <tr>
              <th style={{ border: "1px solid #666", padding: 8, width: '50px' }}>S.No</th>
              <th style={{ border: "1px solid #666", padding: 8 }}>Product Name</th>
              <th style={{ border: "1px solid #666", padding: 8 }}>Slot</th>
              <th style={{ border: "1px solid #666", padding: 8, width: '80px' }}>Image</th>
              <th style={{ border: "1px solid #666", padding: 8 }}>Price per Unit</th>
              <th style={{ border: "1px solid #666", padding: 8 }}>No of units</th>
              <th style={{ border: "1px solid #666", padding: 8 }}>No of days</th>
              <th style={{ border: "1px solid #666", padding: 8, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #666", padding: 8 }}>{idx + 1}</td>
                <td style={{ border: "1px solid #666", padding: 8 }}>{product.productName}</td>
                {/* <td style={{ border: "1px solid #666", padding: 8 }}>{productDates[product.productId]?.productSlot || quotation?.quoteTime}</td> */}
                <td style={{ border: "1px solid #666", padding: 8 }}>{product.productSlot || quotation?.quoteTime}</td>
                <td style={{ border: "1px solid #666", padding: 8 }}>
                  {product.ProductIcon && (
                    <img
                      src={`${ImageApiURL}/product/${product.ProductIcon}`}
                      alt={product.productName}
                      style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                    />
                  )}
                </td>
                {/* {console.log(`${idx} product: `, product)} */}
                {/* {console.log(`"${ImageApiURL}/product/${product.ProductIcon}"`)} */}
                <td style={{ border: "1px solid #666", padding: 8 }}>{product.price}</td>
                <td style={{ border: "1px solid #666", padding: 8 }}>{product.quantity}</td>
                <td style={{ border: "1px solid #666", padding: 8 }}>{product.days}</td>
                <td style={{ border: "1px solid #666", padding: 8, textAlign: "right" }}>{product.pricePerUnit * product.quantity * product.days}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>{quotation?.discount != 0 ? "Total Amount before discount" : "Total amount"}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                {console.log(`quotation?.allProductsTotal: `, quotation?.allProductsTotal)}
                {/* ₹{quotation?.discount != 0 ? quotation?.allProductsTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 }) : productsTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })} */}
                ₹{fmt(quotation?.allProductsTotal)}
              </td>
            </tr>
            {quotation?.discount != 0 && (
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Discount ({quotation?.discount}%)</td>
                <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                  -₹{fmt(quotation?.discountAmt)}
                </td>
              </tr>
            )}
            {quotation?.discount != 0 && (<tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Total Amount After Discount</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                ₹{fmt(quotation?.afterDiscount)}
              </td>
            </tr>)}
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Transportation</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                ₹{fmt(quotation?.transportcharge)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Manpower Charge</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                ₹{fmt(quotation?.labourecharge)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Reupholestry</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                ₹{fmt(quotation?.refurbishment)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Sub-Total</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                ₹{fmt(quotation?.allSubTotal)}
              </td>
            </tr>
            {quotation?.GST != 0 && quotation?.GST > 0 && (
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>GST ({quotation?.GST}%)</td>
                <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                  ₹{fmt(quotation?.gstAmt)}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold", backgroundColor: "#f8f9fa" }}>Grand Total</td>
              <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right", backgroundColor: "#f8f9fa" }}>
                ₹{fmt(quotation.finalTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: "11px", marginTop: 30 }}>
          <strong>Note:</strong>
          <ol style={{ paddingLeft: 16 }}>
            <li>Additional elements would be charged on actuals, transportation would be additional.</li>
            <li>100% Payment for confirmation of event.</li>
            <li>Costing is merely for estimation purposes. Requirements are blocked post payment in full.</li>
            <li>If inventory is not reserved with payments, we are not committed to keep it.</li>
            <li><strong>The nature of the rental industry that our furniture is frequently moved and transported, which can lead to scratches on glass, minor chipping of paintwork, & minor stains etc. We ask you to visit the warehouse to inspect blocked furniture if you wish.</strong></li>
          </ol>
        </div>

        {/* <div style={{ textAlign: 'right', marginTop: 20 }}> */}
        {/* <button className="btn btn-primary" onClick={handleDownloadPDF}>Download PDF</button> */}
        {/* </div> */}
      </div>
    </div>
  );
};

export default QuotationInvoice;
