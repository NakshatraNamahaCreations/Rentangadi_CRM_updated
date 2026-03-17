import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Card, Row, Col, Button } from 'react-bootstrap';
import moment from 'moment';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import { ApiURL } from '../../api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ClientReports = () => {
  const [clients, setClients] = useState([]);
  const [clientMap, setClientMap] = useState({});
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: 'totalGrandTotal',
    direction: 'desc'
  });

  // Fetch clients for dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get(`${ApiURL}/client/getallClients`);
        console.log('fetchClients res data: ', res.data.Client);
        const clientOptions = res.data.Client.map((client) => ({
          value: client._id,
          label: client.clientName || client.name
        }));
        // Create a map of client IDs to names
        const clientNameMap = {};
        res.data.Client.forEach(client => {
          clientNameMap[client._id] = client.clientName || client.name;
        });
        setClientMap(clientNameMap);
        setClients([
          { value: 'ALL_CLIENTS', label: 'All Clients' },
          ...clientOptions
        ]);
      } catch (err) {
        setClients([]);
      }
    };
    fetchClients();
  }, []);

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Helper function to transform API response into client-wise data
  const transformResponse = (responseData) => {
    if (!responseData || !responseData.orders || responseData.orders.length === 0) {
      return [];
    }

    const clientData = {};

    responseData.orders.forEach(order => {
      const clientId = order.clientId;

      if (!clientData[clientId]) {
        clientData[clientId] = {
          _id: clientId,
          allProductsTotal: 0,
          totalDiscount: 0,
          totalRoundOff: 0,
          totalPayments: 0,
          invoices: []
        };
      }

      // clientData[clientId].totalRevenue += order.totalRevenue;
      clientData[clientId].allProductsTotal += order.allProductsTotal;
      clientData[clientId].totalDiscount += order.discountAmount;
      clientData[clientId].totalRoundOff += order.roundOff;
      clientData[clientId].totalPayments += order.totalPaid || 0;

      // console.log(`order: `, order);

      clientData[clientId].invoices.push({
        _id: order.orderId,
        invoiceDate: order.orderDate,
        invoiceNumber: order.orderId,
        executiveName: order.executiveName,
        Address: order.Address,
        orderTotal: order.totalAmount,
        amount: order.allProductsTotal,
        payments: order.totalPaid || 0,
        paymentsList: order.payments || []   // ✅ include full payments list

      });
    });

    return Object.values(clientData);
  };

  // Helper function to sort clients
  const sortClients = (clients) => {
    const { key, direction } = sortConfig;

    // Convert strings to numbers for sorting
    const sortKey = key === 'allProductsTotal' || key === 'totalDiscount' || key === 'totalRoundOff' || key === 'diff'
      ? (client) => Number(client[key])
      : (client) => client[key];

    return [...clients].sort((a, b) => {
      const aValue = sortKey(a);
      const bValue = sortKey(b);

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle column click
  const handleSort = (key) => {
    if (key === sortConfig.key) {
      // Toggle direction if same column is clicked
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Set new column and default to ascending
      setSortConfig({
        key,
        direction: 'asc'
      });
    }
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (key !== sortConfig.key) return null;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const handleClientSelect = (selectedOptions) => {
    if (!selectedOptions) {
      setSelectedClients([]);
      return;
    }
    // If "All Clients" is selected, select all except "All Clients"
    const isAllSelected = selectedOptions.some(opt => opt.value === "ALL_CLIENTS");
    if (isAllSelected) {
      setSelectedClients(
        clients
          .filter((opt) => opt.value !== "ALL_CLIENTS")
          .map((opt) => opt.value)
      );
    } else {
      setSelectedClients(selectedOptions.map((option) => option.value));
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);

      if (!selectedYear || !selectedMonth) {
        setLoading(false);
        return;
      }

      const token = sessionStorage.getItem("token");
      console.log('selectedClients: ', selectedClients, 'selectedYear: ', selectedYear, "selected month: ", selectedMonth);

      const response = await axios.post(`${ApiURL}/report/clientReportByMonth`, {
        year: selectedYear,
        month: selectedMonth,
        clientIds: selectedClients.includes('ALL_CLIENTS') ? [] : selectedClients
      }, {
        headers: {
          'Authorization': `Bearer ${token}` // Add token in the Authorization header
        }
      });

      console.clear();
      console.log('selectedYear: ', selectedYear, "selected month: ", selectedMonth, 'Report Data:', response.data.orders);

      console.log(`clientReportByMonth response.data: `, response.data);
      // console.log(`response.data.totalPayments: `, response.data.totalPayments);
      // Transform the response data into client-wise format
      const transformedData = transformResponse(response.data);
      setExpandedRows(new Set())
      setReportData(transformedData);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  // ✅ Export to Excel function
  // const exportToExcel = () => {
  // 	if (!reportData || reportData.length === 0) {
  // 		alert("No data available to export");
  // 		return;
  // 	}

  // 	// Prepare data for Excel
  // 	const worksheetData = reportData.map(client => ({
  // 		"Client Name": clientMap[client._id] || "Unknown Client",
  // 		"Products Total": client.allProductsTotal,
  // 		"Discount Total": client.totalDiscount,
  // 		"RoundOff Total": client.totalRoundOff,
  // 		"Net Total": client.allProductsTotal - client.totalDiscount - client.totalRoundOff,
  // 		"Payments": client.totalPayments,
  // 	}));

  // 	// Create a worksheet
  // 	const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // 	// Create a workbook and add worksheet
  // 	const workbook = XLSX.utils.book_new();
  // 	XLSX.utils.book_append_sheet(workbook, worksheet, "Client Reports");

  // 	// Save the file
  // 	const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  // 	const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  // 	saveAs(data, `ClientReports_${selectedYear}_${selectedMonth}.xlsx`);
  // };
  // ✅ Detailed Excel Export
  const exportToExcel = () => {
    if (!reportData || reportData.length === 0) {
      alert("No data available to export");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Loop through each client to create rows
    let excelRows = [];

    reportData.forEach(client => {
      const clientName = clientMap[client._id] || "Unknown Client";

      client.invoices.forEach(inv => {
        if (inv.paymentsList && inv.paymentsList.length > 0) {
          inv.paymentsList.forEach(pmt => {
            // {console.log(`inv: `, inv)}   
            excelRows.push({
              "Client Name": clientName,
              "Executive Name": inv.executiveName ||'N/A', // ✅ added here
              "Event Date": moment(inv.invoiceDate).format("DD/MM/YYYY"),
              "Orders (₹)": inv.orderTotal || 0,
              "Total Payments (₹)": inv.payments || 0,
              "Payment Amount (₹)": pmt.amount || 0,
              "Payment Remarks": pmt.remarks || "-",
              // "Payment Comments": pmt.comment || "-",
              "Address": inv.Address || "-",
            });
          });
        } else {
          // If no payments, still include row
          excelRows.push({
            "Client Name": clientName,
            "Executive Name": inv.executiveName ||'N/A', // ✅ added here
            "Event Date": moment(inv.invoiceDate).format("DD/MM/YYYY"),
            "Orders (₹)": inv.orderTotal || 0,
            "Total Payments (₹)": inv.payments || 0,
            "Payment Amount (₹)": "-",
            "Payment Remarks": "No payments",
            "Address": inv.Address || "-",
          });
        }
      });
    });

    // Create sheet
    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Auto-size columns
    const columnWidths = Object.keys(excelRows[0] || {}).map(key => ({
      wch: Math.max(key.length + 2, 15),
    }));
    worksheet["!cols"] = columnWidths;

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Client Payments");

    // Save the file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `ClientPayments_${selectedYear}_${selectedMonth}.xlsx`);
  };



  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row className="mb-3" style={{ padding: '16px' }}>
          <Col sm={4} className="mb-3">
            <h6 className="text-dark mb-2">Select Clients</h6>
            <Select
              isMulti
              options={clients}
              value={
                selectedClients.length === clients.length - 1 && clients.length > 1
                  ? clients
                  : clients.filter((client) => selectedClients.includes(client.value))
              }
              onChange={handleClientSelect}
              placeholder="Select clients"
              getOptionLabel={(e) => e.label}
              getOptionValue={(e) => e.value}
              styles={{
                valueContainer: (base) => ({
                  ...base,
                  maxHeight: 80,
                  overflowY: 'auto',
                  flexWrap: 'wrap',
                  padding: '8px'
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </Col>
          <Col sm={4} className="mb-3">
            <div className="d-flex flex-column">
              <label className="mb-2">Select Year</label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ width: '100%', height: '40px', padding: '8px' }}
              >
                <option value="">Select Year</option>
                {years.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col sm={4} className="mb-3">
            <div className="d-flex flex-column">
              <label className="mb-2">Select Month</label>
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: '100%', height: '40px', padding: '8px' }}
              >
                <option value="">Select Month</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col sm={2} className="d-flex align-items-end">
            <Button
              variant="primary"
              onClick={fetchReport}
              disabled={loading || !selectedYear || !selectedMonth}
              style={{
                width: '100%',
                backgroundColor: "#BD5525",
                border: "#BD5525",
                padding: '8px 16px',
                fontSize: '14px'
              }}
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </Col>
          {/* ✅ New Download Button */}
          <Col sm={2} className="d-flex align-items-end">
            <Button
              variant="success"
              onClick={exportToExcel}
              disabled={loading || !reportData || reportData.length === 0}
              style={{
                width: '100%',
                backgroundColor: "#228B22",
                border: "#228B22",
                padding: '8px 16px',
                fontSize: '14px'
              }}
            >
              Download Excel
            </Button>
          </Col>
        </Row>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Client Name {getSortIcon('clientName')}</th>
              <th onClick={() => handleSort('allProductsTotal')} style={{ width: '15%' }}>
                Products Total {getSortIcon('allProductsTotal')}
              </th>
              <th onClick={() => handleSort('totalDiscount')} style={{ width: '15%' }}>
                Discount Total {getSortIcon('totalDiscount')}
              </th>
              <th onClick={() => handleSort('totalRoundOff')} style={{ width: '15%' }}>
                RoundOff Total {getSortIcon('totalRoundOff')}
              </th>
              <th style={{ width: '15%' }}>
                Total
              </th>
              <th style={{ width: '15%' }}>
                Payments
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData && reportData.length > 0 ? (
              sortClients(reportData).map((clientData, index) => (
                <React.Fragment key={clientData._id}>
                  {/* {console.log('clientData: ', clientData)} */}
                  <tr onClick={() => toggleExpand(index)} style={{ cursor: 'pointer' }}>
                    <td style={{ width: '40%' }}>
                      {clientMap[clientData._id] || 'Unknown Client'}
                    </td>
                    <td style={{ width: '15%' }}>
                      ₹{clientData.allProductsTotal.toLocaleString()}
                    </td>
                    <td style={{ width: '15%' }}>
                      ₹{clientData.totalDiscount.toLocaleString()}
                    </td>
                    <td style={{ width: '15%' }}>
                      ₹{clientData.totalRoundOff.toLocaleString()}
                    </td>
                    <td style={{ width: '15%' }}>
                      ₹{(clientData.allProductsTotal - clientData.totalDiscount - clientData.totalRoundOff).toLocaleString()}
                    </td>
                    <td style={{ width: '15%' }}>
                      ₹{clientData.totalPayments}
                    </td>
                  </tr>
                  {/* {expandedRows.has(index) && (
										<tr>
											<td colSpan={4} style={{ padding: '10px' }}>
												<Table bordered>
													<thead>
														<tr>
															<th>Event Date</th>
															<th>Order Id</th>
															<th>Amount</th>
															<th>Payments</th>
														</tr>
													</thead>
													<tbody>
														{clientData.invoices?.map((invoice) => (
															<tr key={invoice._id}>									
																<td>{moment(invoice.invoiceDate).format('DD/MM/YYYY')}</td>
																<td>{invoice.invoiceNumber}</td>
																<td>₹{invoice.amount.toLocaleString()}</td>
																<td>₹{invoice.payments.toLocaleString()}</td>
															</tr>
														))}
													</tbody>
												</Table>
											</td>
										</tr>
									)} */}

                  {/* {expandedRows.has(index) && (
										<tr>
											<td colSpan={4} style={{ padding: '10px' }}>
												<Table bordered>
													<thead>
														<tr>
															<th>Event Date</th>
															<th>Order Id</th>
															<th>Amount</th>
															<th>Payments</th>
															<th>Payment Mode</th>
														</tr>
													</thead>
													<tbody>
														{clientData.invoices?.map((invoice) => (
															<React.Fragment key={invoice._id}>
																<tr>
																	<td>{moment(invoice.invoiceDate).format('DD/MM/YYYY')}</td>
																	<td>{invoice.invoiceNumber}</td>
																	<td>₹{invoice.amount.toLocaleString()}</td>
																	<td>₹{invoice.payments.toLocaleString()}</td>
																	<td>
																		{invoice.paymentsList && invoice.paymentsList.length > 0 ? (
																			<ul className="mb-0 ps-3">
																				{invoice.paymentsList.map((pmt) => (
																					<li key={pmt.paymentId}>
																						{moment(pmt.date).format('DD/MM/YYYY')}
																					</li>
																				))}
																			</ul>
																		) : (
																			<em>No payments</em>
																		)}
																	</td>
																</tr>
															</React.Fragment>
														))}

													</tbody>
												</Table>
											</td>
										</tr>
									)} */}
                  {expandedRows.has(index) && (
                    <tr>
                      <td colSpan={6} style={{ padding: '10px' }}>
                        <Table bordered>
                          <thead>
                            <tr>
                              <th>Event Date</th>
                              {/* <th>Order Id</th>*/}
                              {/* <th>Products</th> */}
                              <th>Executive</th>
                              <th>Address</th>
                              <th>Orders</th>
                              <th>Total Payments</th>
                              <th>Payment Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientData.invoices?.map((invoice) => (
                              <tr key={invoice._id}>
                                {/* {console.log(`invoice: `, invoice)} */}
                                <td>{moment(invoice.invoiceDate).format('DD/MM/YYYY')}</td>
                                {/* <td>{invoice.invoiceNumber}</td> */}
                                {/* <td>₹{invoice.amount.toLocaleString()}</td> */}
                                <td>₹{invoice.executiveName}</td>
                                {/* <td>₹{invoice.Address}</td> */}
                                <td>₹{invoice.Address?.slice(0, 30)}{invoice.Address?.length > 30 ? '...' : ''}</td>
                                <td>₹{invoice.orderTotal.toLocaleString()}</td>
                                <td>₹{invoice.payments.toLocaleString()}</td>
                                <td>
                                  {invoice.paymentsList && invoice.paymentsList.length > 0 ? (
                                    <Table size="sm" bordered responsive>
                                      <thead>
                                        <tr>
                                          {/* <th>Date</th> */}
                                          <th>Amount</th>
                                          {/* <th>Mode</th> */}
                                          <th>Remarks</th>
                                          {/* <th>Comment</th> */}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {invoice.paymentsList.map((pmt) => (
                                          <tr key={pmt.paymentId}>
                                            {/* <td>{moment(pmt.date).format("DD/MM/YYYY")}</td> */}
                                            <td>₹{pmt.amount}</td>
                                            {/* <td>{pmt.mode || "-"}</td> */}
                                            <td>{pmt.remarks || "-"}</td>
                                            {/* <td>{pmt.comment || "-"}</td> */}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  ) : (
                                    <em>No payments</em>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </td>
                    </tr>
                  )}

                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientReports;

