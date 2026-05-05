import React, { useState } from 'react';
import axios from 'axios';
import { Container, Table, Card, Row, Col, Button, Form, Spinner } from 'react-bootstrap';
import { ApiURL } from '../../api';
import toast from 'react-hot-toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from 'xlsx'; // ✅ Excel export library

const ProductReports = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'totalRevenue',
    direction: 'desc',
  });

  // 🔹 Fetch Report (GET with query params)
  const fetchReport = async () => {
    if (!fromDate || !toDate) return alert('Please select both From and To dates.');

    setLoading(true);
    setReportData(null);
    try {
      const formatDate = (date) =>
        date.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' format but keeps local time

      const fromStr = formatDate(fromDate);
      const toStr = formatDate(toDate);

      const { data } = await axios.get(`${ApiURL}/report/product-report-by-dates`, {
        params: { fromDate: fromStr, toDate: toStr },
      });
      console.log('Fetched report data:', data);

      setReportData(data);
    } catch (error) {
      toast.error(`Error fetching report: ${error?.response?.data?.message || 'Unknown error'}`);
      console.error('Error fetching report:', error);
      console.log('Error details:', error?.response?.data?.message);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Sorting logic
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key) => {
    if (key !== sortConfig.key) return null;
    return <span className="ms-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  const sortProducts = (products) => {
    const { key, direction } = sortConfig;
    return [...products].sort((a, b) => {
      const aVal = typeof a[key] === 'number' ? a[key] : a[key]?.toString().toLowerCase() || '';
      const bVal = typeof b[key] === 'number' ? b[key] : b[key]?.toString().toLowerCase() || '';
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // 🔹 Currency format
  const currencyFormat = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  // 🔹 Export to Excel
  const exportToExcel = () => {
    if (!reportData?.products) return;

    const ws = XLSX.utils.json_to_sheet(
      reportData.products.map((p) => ({
        'Product Name': p.name,
        'Total Revenue': currencyFormat(p.totalRevenue),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product Report');
    XLSX.writeFile(
      wb,
      `Product_Report_${reportData.fromDate}_${reportData.toDate}.xlsx`
    );
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-white fw-bold fs-5">
          Product Reports by Date Range
        </Card.Header>
        <Card.Body>
          {/* 🔹 Date Range Inputs */}
          <Row className="mb-4">
            <Col md={4}>
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                placeholderText="From Date"
                className="form-control"
                dateFormat="dd-MM-yyyy"
              // maxDate={toDate || new Date()}
              />
            </Col>
            <Col md={4}>
              <DatePicker
                selected={toDate}
                onChange={(date) => setToDate(date)}
                placeholderText="To Date"
                className="form-control"
                dateFormat="dd-MM-yyyy"
                minDate={fromDate}
              // maxDate={new Date()}
              />
            </Col>
            <Col md={4}>
              <Button
                variant="primary"
                className="w-100"
                onClick={fetchReport}
                disabled={loading || !fromDate || !toDate}
                style={{
                  backgroundColor: '#BD5525',
                  border: '#BD5525',
                  padding: '8px 16px',
                  fontSize: '14px',
                }}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Generate Report'}
              </Button>
            </Col>
          </Row>

          {/* 🔹 Export Button */}
          <Row className="mb-4">
            <Col md={12}>
              <Button
                variant="success"
                onClick={exportToExcel}
                disabled={loading || !reportData}
                style={{
                  backgroundColor: '#228B22',
                  borderColor: '#228B22',
                }}
              >
                Export to Excel
              </Button>
            </Col>
          </Row>

          {/* 🔹 Data Table */}
          <Table striped bordered responsive hover>
            <thead className="table-light">
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Product Name {getSortIcon('name')}
                </th>
                <th onClick={() => handleSort('totalRevenue')} style={{ cursor: 'pointer' }}>
                  Total Revenue {getSortIcon('totalRevenue')}
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && !reportData ? (
                <tr>
                  <td colSpan="2" className="text-center text-muted">
                    No data available. Please select date range.
                  </td>
                </tr>
              ) : (
                sortProducts(reportData?.products || []).map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{currencyFormat(p.totalRevenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          {/* 🔹 Summary */}
          {/* {reportData && (
              <div className="mt-3 fw-semibold">
                <div>Total Products: {reportData.totalProducts}</div>
                <div>Total Revenue: {currencyFormat(reportData.totalRevenue)}</div>
              </div>
            )} */}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProductReports;
