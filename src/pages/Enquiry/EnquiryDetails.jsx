
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  Card,
  Container,
  Row,
  Col,
  Button,
  Form,
  InputGroup,
  Table,
  Modal,
  Spinner,
  Alert,
} from "react-bootstrap";
import {
  FaEdit,
  FaTrashAlt,
  FaUser,
  FaBuilding,
  FaPhone,
  FaCalendarAlt,
  FaClock,
  FaCheck,
  FaTimes,
  FaBoxOpen,
} from "react-icons/fa";
import { ApiURL, ImageApiURL } from "../../api";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import moment from "moment";

const EnquiryDetails = () => {
  const { id } = useParams();
  const [allProducts, setAllProducts] = useState([]);
  const [confirmed, setConfirmed] = useState({});
  const [search, setSearch] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [manpower, setManpower] = useState("");
  const [transport, setTransport] = useState("");
  const [discount, setDiscount] = useState("");
  const [gst, setGst] = useState("18");
  const [roundOff, setRoundOff] = useState("");
  const [enquiry, setEnquiry] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Add Product Modal State
  const [showAdd, setShowAdd] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState(1);

  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [inchargeName, setInchargeName] = useState("");
  const [inchargePhone, setInchargePhone] = useState("");

  // ✅ Inventory table states (Under Quotation)
  const [inventoryRows, setInventoryRows] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  const gstOptions = [
    { value: "0", label: "0%" },
    { value: "18", label: "18%" },
  ];

  // ✅ Safe display helpers
  const safeText = (v) => (typeof v === "string" ? v.trim() : "");
  const isValidText = (v) => safeText(v).length > 0;

  const displayClientName = isValidText(enquiry?.clientName)
    ? enquiry.clientName
    : isValidText(enquiry?.clientId?.name)
      ? enquiry.clientId.name
      : "N/A";

  const displayExecutiveName = isValidText(enquiry?.executivename)
    ? enquiry.executivename
    : isValidText(enquiry?.clientId?.executiveName)
      ? enquiry.clientId.executiveName
      : "N/A";

  const displayClientNo = isValidText(enquiry?.clientNo)
    ? enquiry.clientNo
    : isValidText(enquiry?.clientId?.phoneNumber)
      ? enquiry.clientId.phoneNumber
      : "N/A";

  useEffect(() => {
    try {
      fetchEnquiry();
      fetchAllProducts();
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (enquiry) {
      fetchFilteredInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry]);

  // ✅ Inventory filter call (also used to render Under Quotation table)
  const fetchFilteredInventory = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError("");

      const response = await axios.get(`${ApiURL}/inventory/filter`, {
        params: {
          startDate: enquiry?.enquiryDate,
          endDate: enquiry?.endDate,
          products: (enquiry?.products || []).map((p) => p.productId).join(","),
        },
      });

      let stockRows = response?.data?.stock || [];

      console.log("stockRows",stockRows)

      // Preserve order as in enquiry.products
      if (enquiry?.products?.length && stockRows?.length) {
        const orderMap = enquiry.products.map((p) => String(p.productId));
        stockRows = stockRows
          .slice()
          .sort(
            (a, b) =>
              orderMap.indexOf(String(a.productId)) -
              orderMap.indexOf(String(b.productId))
          );
      }

      setFilteredProducts(stockRows); // ✅ your confirm section uses this
      setInventoryRows(stockRows); // ✅ inventory table uses this
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventoryError(
        error?.response?.data?.message ||
        "Failed to fetch inventory. Please try again."
      );
      setFilteredProducts([]);
      setInventoryRows([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await axios.get(`${ApiURL}/product/quoteproducts`);
      if (res.status === 200) {
        setAllProducts(res.data.QuoteProduct || []);
      }
    } catch (error) {
      console.error("Error fetching all products:", error);
    }
  };

  const fetchEnquiry = async () => {
    try {
      const res = await axios.get(`${ApiURL}/enquiry/enquiry-details/${id}`);
      if (res.status === 200) {
        setEnquiry(res.data.enrichedResponse);
      }
    } catch (error) {
      console.error("Error fetching enquiry:", error);
    }
  };

  // ✅ Days diff for total calc
  const daysDiff = (() => {
    const start = enquiry?.enquiryDate
      ? moment(enquiry.enquiryDate, "DD-MM-YYYY", true)
      : null;
    const end = enquiry?.endDate
      ? moment(enquiry.endDate, "DD-MM-YYYY", true)
      : null;
    if (start && end && start.isValid() && end.isValid()) {
      return Math.max(1, end.diff(start, "days") + 1);
    }
    return 1;
  })();

  const totalAmount = enquiry?.products?.reduce(
    (sum, p) =>
      confirmed[p.productId] ? sum + p.qty * p.price * daysDiff : sum,
    0
  );

  const discountAmt = totalAmount * (Number(discount || 0) / 100);
  const totalBeforeCharges = totalAmount - discountAmt;
  const totalAfterCharges =
    totalBeforeCharges + Number(manpower || 0) + Number(transport || 0);
  const gstAmt = totalAfterCharges * (Number(gst || 0) / 100);
  const grandTotal = Math.round(
    totalAfterCharges + gstAmt + Number(roundOff || 0)
  );

  const isAnyProductInsufficient = filteredProducts.some((p) => {
    const orderQty =
      enquiry?.products?.find((ep) => String(ep.productId) === String(p.productId))
        ?.qty || 0;
    return orderQty > Number(p.availableStock || 0);
  });

  // Edit handlers
  const handleEdit = (productId) => {
    try {
      const product = enquiry?.products?.find((p) => p.productId === productId);
      if (product) {
        setEditIdx(productId);
        setEditQty(product.qty);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSave = (productId) => {
    try {
      let qty = Math.max(1, Number(editQty) || 1);

      const updatedProducts = enquiry.products.map((p) =>
        p.productId === productId ? { ...p, qty, total: qty * p.price } : p
      );

      setEnquiry((prev) => ({
        ...prev,
        products: updatedProducts,
      }));

      setEditIdx(null);
      setEditQty(1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditCancel = () => {
    setEditIdx(null);
    setEditQty(1);
  };

  // Confirm button handler
  const handleConfirm = (productId) => {
    setConfirmed((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Delete handler (local UI only - as your current code)
  const handleDelete = (productId) => {
    setEnquiry((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.productId !== productId),
    }));
    setConfirmed((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Add Product Modal handlers
  const handleShowAdd = () => {
    setShowAdd(true);
    setAddProductId("");
    setAddQty(1);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setAddProductId("");
    setAddQty(1);
  };

  // ✅ Modal options: filter out already-added ones
  const availableToAdd = allProducts.filter(
    (p) =>
      !(enquiry?.products || []).some(
        (ep) => String(ep.productId || ep._id) === String(p._id)
      )
  );

  const selectedAddProduct = allProducts.find(
    (p) => String(p._id) === String(addProductId)
  );

  const handleAddProduct = async () => {
    try {
      if (!selectedAddProduct) return;

      const qty = Math.max(1, Number(addQty) || 1);
      const existingIndex = (enquiry?.products || []).findIndex(
        (p) => String(p.productId) === String(selectedAddProduct._id)
      );

      let updatedProducts;

      if (existingIndex !== -1) {
        const existing = enquiry.products[existingIndex];
        const newQty = Number(existing.qty) + qty;
        updatedProducts = enquiry.products.map((p) =>
          String(p.productId) === String(selectedAddProduct._id)
            ? { ...p, qty: newQty, total: newQty * Number(existing.price) }
            : p
        );
      } else {
        const newProduct = {
          productId: selectedAddProduct._id,
          name: selectedAddProduct.ProductName || selectedAddProduct.name || "",
          stock: selectedAddProduct.ProductStock,
          qty,
          price: Number(selectedAddProduct.ProductPrice),
          total: qty * Number(selectedAddProduct.ProductPrice),
        };
        updatedProducts = [...(enquiry.products || []), newProduct];
      }

      const getId = (val) =>
        val && typeof val === "object" && val._id ? String(val._id) : String(val || "");

      const payload = {
        clientName: enquiry.clientName,
        clientId: getId(enquiry.clientId),
        executiveId: getId(enquiry.executiveId),
        executivename: enquiry.executivename || "",
        products: updatedProducts.map((p) => ({
          productId: p.productId,
          name: p.name,
          qty: p.qty,
          price: p.price,
          total: p.total,
        })),
        category: enquiry.category || "",
        discount: enquiry.discount || 0,
        GrandTotal: updatedProducts.reduce((s, p) => s + p.qty * p.price, 0),
        GST: enquiry.GST || 0,
        clientNo: enquiry.clientNo || "",
        address: enquiry.address || "",
        enquiryDate: enquiry.enquiryDate || "",
        endDate: enquiry.endDate || "",
        enquiryTime: enquiry.enquiryTime || "",
        placeaddress: enquiry.placeaddress || "",
      };

      setAddLoading(true);
      const res = await axios.put(
        `${ApiURL}/enquiry/update-enquiry/${id}`,
        payload,
        { headers: { "content-type": "application/json" } }
      );

      if (res.status === 200) {
        setEnquiry((prev) => ({ ...prev, products: updatedProducts }));
        toast.success("Product added successfully");
        setShowAdd(false);
        setAddProductId("");
        setAddQty(1);
      } else {
        toast.error("Failed to add product");
      }
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.error || e?.response?.data?.message || "Failed to add product"
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleCreateQuote = async () => {
    try {
      if (!enquiry) {
        alert("Enquiry data not loaded");
        return;
      }

      const confirmedProducts = enquiry?.products?.filter(
        (product) => confirmed[product?.productId]
      );

      setLoading(true);

      const config = {
        url: "/quotations/createQuotation",
        method: "post",
        baseURL: ApiURL,
        headers: { "content-type": "application/json" },
        data: {
          enquiryObjectId: enquiry._id,
          enquiryId: enquiry.enquiryId,
          userId: enquiry.userId,
          quoteTime: enquiry.enquiryTime,
          quoteDate: enquiry.enquiryDate,
          endDate: enquiry.endDate,
          clientId: enquiry.clientId,
          executiveId: enquiry.executiveId,
          clientName: enquiry.clientName,
          executivename: enquiry.executivename,
          workerAmt: 0,
          category: enquiry.category,
          followupStatus: enquiry.followupStatus || "",
          GST: Number(gst) || 0,
          GrandTotal: Number(grandTotal) || 0,
          adjustments: Number(roundOff) || 0,
          discount: Number(discount) || 0,
          status: "pending",
          termsandCondition: enquiry.termsandCondition || [],
          clientNo: enquiry?.clientNo || "",
          address: enquiry.address,
          labourecharge: Number(manpower) || 0,
          transportcharge: Number(transport) || 0,
          inchargeName: inchargeName || "",
          inchargePhone: inchargePhone || "",
          placeaddress: enquiry.placeaddress || "",
          slots: enquiry.slots || [
            {
              slotName: enquiry.enquiryTime,
              Products: confirmedProducts?.length ? confirmedProducts : enquiry.products,
              quoteDate: enquiry.enquiryDate,
              endDate: enquiry.endDate,
            },
          ],
        },
      };

      const response = await axios(config);
      if (response.status === 200) {
        toast.success("Quotation Created Successfully");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error creating quotation:", error);
      if (error.response) {
        alert(error.response.data.error || "Error creating quotation");
      } else {
        alert("An error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ helper to get icon from allProducts
  const getProductIconById = (productId) => {
    const prod = allProducts.find((p) => String(p._id) === String(productId));
    return prod?.ProductIcon || "";
  };

  const getProductNameById = (productId, fallbackName = "") => {
    const prod = allProducts.find((p) => String(p._id) === String(productId));
    return prod?.ProductName || fallbackName || "N/A";
  };

  return (
    <Container
      fluid
      className="py-4"
      style={{ background: "#f6f8fa", minHeight: "100vh" }}
    >
      <Row>
        {/* Left: Enquiry Details */}
        <Col md={5} lg={4}>
          <Card className="mb-4 shadow-sm" style={{ borderRadius: 16, fontSize: 13 }}>
            <Card.Body>
              <div className="mb-3 text-center">
                <FaBuilding size={28} color="#323D4F" />
                <h5 className="mt-2 mb-0" style={{ fontWeight: 700, fontSize: 18 }}>
                  {displayClientName}
                </h5>
              </div>
              <hr />
              <div className="mb-2 d-flex align-items-center">
                <FaUser className="me-2" />
                <span style={{ fontWeight: 600 }}>Executive:</span>
                <span className="ms-2">{displayExecutiveName}</span>
              </div>
              <div className="mb-2 d-flex align-items-center">
                <FaPhone className="me-2" />
                <span style={{ fontWeight: 600 }}>Contact:</span>
                <span className="ms-2">{displayClientNo}</span>
              </div>
              <div className="mb-2 d-flex align-items-center">
                <FaCalendarAlt className="me-2" />
                <span style={{ fontWeight: 600 }}>Enquiry Date:</span>
                <span className="ms-2">
                  {moment(enquiry?.createdAt).format("DD-MM-YYYY")}
                </span>
              </div>
              <div className="mb-2 d-flex align-items-center">
                <FaCalendarAlt className="me-2" />
                <span style={{ fontWeight: 600 }}>Delivery Date:</span>
                <span className="ms-2">{enquiry?.enquiryDate}</span>
              </div>
              <div className="mb-2 d-flex align-items-center">
                <FaCalendarAlt className="me-2" />
                <span style={{ fontWeight: 600 }}>Dismantle Date:</span>
                <span className="ms-2">{enquiry?.endDate}</span>
              </div>
              <div className="mb-2 d-flex align-items-center">
                <FaClock className="me-2" />
                <span style={{ fontWeight: 600 }}>Slot:</span>
                <span className="ms-2">{enquiry?.enquiryTime}</span>
              </div>
              <div className="mb-2">
                <span style={{ fontWeight: 600 }}>Address:</span>
                <div style={{ fontSize: 12, color: "#555" }}>{enquiry?.address}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right: Product Details */}
        <Col md={7} lg={8}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 style={{ fontWeight: 700, marginBottom: 0 }}>Products</h4>
            {enquiry?.status === "not send" && (
              <Button
                size="sm"
                style={{ backgroundColor: "#BD5525", border: "none" }}
                onClick={handleShowAdd}
              >
                Add Product
              </Button>
            )}
          </div>

          <Table
            bordered
            hover
            responsive
            size="sm"
            style={{ background: "#fff", fontSize: 13, marginTop: "20px" }}
          >
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Stock</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
             
                {enquiry?.status === "not send" && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {enquiry?.products?.map((p, idx) => {
                const stock =
                  allProducts.find((ap) => String(ap._id) === String(p.productId))
                    ?.ProductStock || p.stock;

                return (
                  <tr key={p._id || `${p.productId}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{p.name || p.productName || getProductNameById(p.productId)}</td>
                    <td>{stock}</td>
                    <td>
                      {editIdx === p.productId ? (
                        <Form.Control
                          type="number"
                          min={1}
                          value={editQty}
                          onChange={(e) => {
                            let val = e.target.value.replace(/^0+/, "");
                            setEditQty(val === "" ? "" : Math.max(1, Number(val)));
                          }}
                          style={{ width: 70, padding: "2px 6px", fontSize: 13 }}
                          autoFocus
                        />
                      ) : (
                        p.qty
                      )}
                    </td>
                    <td>₹{p.price}</td>
                    <td>₹{p.qty * p.price}</td>
              

                    {enquiry?.status === "not send" && (
                      <td>
                        {editIdx === p.productId ? (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              style={{ padding: "2px 6px", marginRight: 4 }}
                              onClick={() => handleEditSave(p.productId)}
                              disabled={confirmed[p.productId]}
                            >
                              <FaCheck />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              style={{ padding: "2px 6px" }}
                              onClick={handleEditCancel}
                              disabled={confirmed[p.productId]}
                            >
                              <FaTimes />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="link"
                              size="sm"
                              style={{ color: "#157347", padding: 0 }}
                              onClick={() => handleEdit(p.productId)}
                              disabled={confirmed[p.productId]}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              style={{ color: "#d00", padding: 0, marginLeft: 8 }}
                              onClick={() => handleDelete(p.productId)}
                              disabled={confirmed[p.productId]}
                            >
                              <FaTrashAlt />
                            </Button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {/* Confirm Products Section */}
          <Card className="shadow-sm mb-4" style={{ borderRadius: 14 }}>
            <Card.Body>
              <div className="mb-3" style={{ maxWidth: 320 }}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search product to confirm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </div>

              <Table
                bordered
                hover
                responsive
                size="sm"
                style={{ background: "#f9f9f9", fontSize: 13 }}
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Order Qty</th>
                    <th>Available</th>
                    <th>Status</th>
                    {enquiry?.status === "not send" && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        No products found.
                      </td>
                    </tr>
                  )}

                  {filteredProducts?.map((p, idx) => {
                    const orderQty =
                      enquiry?.products?.find(
                        (ap) => String(ap.productId) === String(p.productId)
                      )?.qty || 0;

                    const canConfirm =
                      Number(p.availableStock || 0) > 0 &&
                      orderQty <= Number(p.availableStock || 0);

                    return (
                      <tr key={p.productId}>
                        <td>{idx + 1}</td>
                        <td>{p.productName}</td>
                        <td>{orderQty}</td>
                        <td>{p.availableStock}</td>
                        <td>
                          {enquiry?.status === "not send" ? (
                            confirmed[p.productId] ? (
                              <span style={{ color: "#28a745", fontWeight: 600 }}>
                                Confirmed
                              </span>
                            ) : (
                              <span style={{ color: canConfirm ? "#007bff" : "#d00" }}>
                                {canConfirm ? "Pending" : "Insufficient"}
                              </span>
                            )
                          ) : (
                            <span style={{ color: "#6c757d", fontStyle: "italic" }}>
                              Sent
                            </span>
                          )}
                        </td>

                        {enquiry?.status === "not send" && (
                          <td>
                            <Button
                              variant={confirmed[p.productId] ? "success" : "outline-success"}
                              size="sm"
                              onClick={() => handleConfirm(p.productId)}
                              disabled={!canConfirm}
                            >
                              {confirmed[p.productId] ? "Confirmed" : "Confirm"}
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* ✅ Inventory Table (Under Quotation) */}
          <Card className="shadow-sm mb-4" style={{ borderRadius: 14 }}>
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center gap-2">
                  <FaBoxOpen />
                  <h5 style={{ margin: 0, fontWeight: 800 }}>Inventory </h5>
                </div>

                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={fetchFilteredInventory}
                  disabled={inventoryLoading}
                >
                  {inventoryLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              {inventoryError ? (
                <Alert variant="danger" className="mb-2">
                  {inventoryError}
                </Alert>
              ) : null}

              {inventoryLoading ? (
                <div className="py-4 text-center">
                  <Spinner animation="border" size="sm" />{" "}
                  <span className="ms-2">Loading inventory...</span>
                </div>
              ) : (
                <Table
                  bordered
                  hover
                  responsive
                  size="sm"
                  style={{ background: "#fff", fontSize: 13 }}
                >
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 70 }}>#</th>
                      <th>Product</th>
                      <th style={{ width: 90 }}>Icon</th>
                      <th style={{ width: 160 }}>Available Stock</th>
                      <th style={{ width: 160 }}>Under Quotations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRows?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          No inventory data found.
                        </td>
                      </tr>
                    ) : (
                      inventoryRows.map((row, idx) => {
                        const iconFile = getProductIconById(row.productId);
                        const iconUrl = iconFile ? `${ImageApiURL}/product/${iconFile}` : "";
                        const name = getProductNameById(row.productId, row.productName);

                        return (
                          <tr key={`${row.productId}-${idx}`}>
                            <td>{idx + 1}</td>

                            <td style={{ fontWeight: 600 }}>{name}</td>
                            <td>
                              {iconUrl ? (
                                <img
                                  src={iconUrl}
                                  alt={name}
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 10,
                                    objectFit: "cover",
                                    border: "1px solid #eee",
                                    background: "#fafafa",
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 10,
                                    background: "#f1f3f5",
                                    border: "1px solid #eee",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    color: "#666",
                                  }}
                                  title="No Icon"
                                >
                                  {String(name || "P").slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </td>
                            <td>
                              <span>
                                {row.availableStock}{console.log("row", row)}
                              </span>
                            </td>
                            <td style={row.availableStock < row.pendingQuotationQty ? { color: "red", fontWeight: 700 } : {}}>{row.pendingQuotationQty}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Product Modal */}
      <Modal show={showAdd} onHide={handleCloseAdd} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="addProductSelect">
              <Form.Label>Product Name</Form.Label>
              <Select
                options={availableToAdd?.map((p) => ({
                  value: String(p._id),
                  label: p.ProductName,
                }))}
                value={
                  addProductId
                    ? availableToAdd
                      ?.map((p) => ({
                        value: String(p._id),
                        label: p.ProductName,
                      }))
                      .find((opt) => String(opt.value) === String(addProductId))
                    : null
                }
                onChange={(selected) => {
                  setAddProductId(selected ? String(selected.value) : "");
                  setAddQty(1);
                }}
                isClearable
                placeholder="Search product..."
              />
            </Form.Group>

            <Row>
              <Col xs={6}>
                <Form.Group className="mb-3" controlId="addProductStock">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="text"
                    value={selectedAddProduct ? selectedAddProduct.ProductStock : 0}
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group className="mb-3" controlId="addProductQty">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    value={addQty}
                    disabled={!addProductId}
                    onChange={(e) => {
                      let val = e.target.value.replace(/^0+/, "");
                      setAddQty(val === "" ? "" : Math.max(1, Number(val)));
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={6}>
                <Form.Group className="mb-3" controlId="addProductPrice">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="text"
                    value={`₹${selectedAddProduct ? selectedAddProduct.ProductPrice : 0}`}
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group className="mb-3" controlId="addProductTotal">
                  <Form.Label>Total Price</Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      selectedAddProduct
                        ? `₹${(addQty ? addQty : 1) * selectedAddProduct.ProductPrice}`
                        : "₹0"
                    }
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            size="sm"
            disabled={!addProductId || !addQty || addQty < 1 || addLoading}
            onClick={handleAddProduct}
          >
            {addLoading ? "Adding..." : "Add"}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCloseAdd}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Charges section */}
      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #eee",
          zIndex: 100,
          padding: "12px 0",
          marginBottom: "60px",
        }}
      >
        <Container className="px-5">
          <Form>
            <Row className="align-items-end mb-2">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Manpower Cost/Labour Charge</Form.Label>
                  <Form.Control
                    type="number"
                    value={enquiry?.status === "sent" ? enquiry?.quotationData?.labourecharge : manpower}
                    onChange={(e) => setManpower(e.target.value)}
                    disabled={enquiry?.status === "sent"}
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Transport Charge</Form.Label>
                  <Form.Control
                    type="number"
                    value={enquiry?.status === "sent" ? enquiry?.quotationData?.transportcharge : transport}
                    onChange={(e) => setTransport(e.target.value)}
                    disabled={enquiry?.status === "sent"}
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Discount (%)</Form.Label>
                  <Form.Control
                    type="number"
                    value={enquiry?.status === "sent" ? enquiry?.quotationData?.discount : discount}
                    placeholder="Discount in percentage"
                    disabled={enquiry?.status === "sent"}
                    min={0}
                    onChange={(e) => {
                      const computedValue = Math.min(100, Number(e.target.value || 0));
                      setDiscount(computedValue);
                    }}
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>GST</Form.Label>
                  <Select
                    options={gstOptions}
                    value={
                      gstOptions.find(
                        (opt) =>
                          String(opt.value) ===
                          String(enquiry?.status === "sent" ? enquiry?.quotationData?.GST : gst)
                      ) || null
                    }
                    onChange={(opt) => setGst(opt ? opt.value : "")}
                    placeholder="Select GST"
                    isDisabled={true}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>
                    Grand Total <span style={{ color: "red" }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={enquiry?.status === "sent" ? enquiry?.quotationData?.GrandTotal : grandTotal}
                    readOnly
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Incharge Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={enquiry?.status === "sent" ? enquiry?.quotationData?.inchargeName : inchargeName}
                    onChange={(e) => setInchargeName(e.target.value)}
                    disabled={enquiry?.status === "sent"}
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Rent Angadi Point of Contact</Form.Label>
                  <Form.Control
                    type="number"
                    value={enquiry?.status === "sent" ? enquiry?.quotationData?.inchargePhone : inchargePhone}
                    onChange={(e) => setInchargePhone(e.target.value)}
                    disabled={enquiry?.status === "sent"}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Container>
      </div>

      {/* Fixed bottom create quote bar */}
      <div
        style={{
          position: "fixed",
          left: "20%",
          bottom: 0,
          width: "calc(100% - 20%)",
          background: "#fff",
          borderTop: "1px solid #eee",
          zIndex: 100,
          padding: "12px 0",
        }}
      >
        <Container className="px-5">
          <Row className="align-items-center">
            <Col xs={12} md={8} lg={10}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                Total Confirmed Amount:{" "}
                <span style={{ color: "#28a745" }}>
                  ₹ {enquiry?.status === "sent" ? enquiry?.quotationData?.GrandTotal : grandTotal}
                </span>
              </span>
            </Col>

            <Col xs={12} md={4} lg={2} className="text-end">
              {enquiry?.status === "not send" && (
                <Button
                  variant="success"
                  size="sm"
                  style={{ fontWeight: 600, background: "#BD5525", border: "#BD5525" }}
                  disabled={totalAmount === 0 || isAnyProductInsufficient || loading}
                  onClick={handleCreateQuote}
                >
                  {loading ? "Creating Quotation..." : "Create Quotation"}
                </Button>
              )}
            </Col>
          </Row>
        </Container>
      </div>
    </Container>
  );
};

export default EnquiryDetails;
