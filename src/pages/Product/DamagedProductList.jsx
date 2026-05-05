
import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Form, Modal, Container, Row, Col } from "react-bootstrap";
import { FaPlus, FaSearch, FaDownload } from "react-icons/fa";
import axios from "axios";
import { ApiURL } from "../../api";
import { toast } from "react-hot-toast";
import Pagination from "../../components/Pagination";
import Select from "react-select";

// ✅ NEW: Excel export
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const DamagedProductList = () => {
  const [damagedProducts, setDamagedProducts] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [products, setProducts] = useState([]);
  const [availableToAdd, setAvailableToAdd] = useState([]);
  const [selectedAddProduct, setSelectedAddProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [damagedCount, setDamagedCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);
  const [repairDescription, setRepairDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    (async () => {
      await fetchDamagedProducts();
      await fetchQuoteProducts();
    })();
  }, []);

  const fetchDamagedProducts = async () => {
    try {
      setLoadingList(true);
      const res = await axios.get(`${ApiURL}/product/damaged-products`);
      setDamagedProducts(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Error fetching damaged products:", err);
      toast.error("Failed to fetch damaged products");
    } finally {
      setLoadingList(false);
    }
  };

  const fetchQuoteProducts = async () => {
    try {
      const response = await axios.get(`${ApiURL}/product/quoteproducts`);
      const list = response.data?.QuoteProduct || [];
      setProducts(list);
      setAvailableToAdd(list);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    }
  };

  const handleProductSelect = (selected) => {
    if (selected) {
      const product = availableToAdd.find((p) => p._id === selected.value);
      setSelectedAddProduct(product);
      setDamagedCount(Number(product?.repairCount || 0));
      setLostCount(Number(product?.lostCount || 0));
      setRepairDescription(product?.repairDescription || "");
    } else {
      setSelectedAddProduct(null);
      setDamagedCount(0);
      setLostCount(0);
      setRepairDescription("");
    }
  };

  const handleAddDamaged = async () => {
    try {
      if (!selectedAddProduct) {
        toast.error("Please select a product");
        return;
      }

      const repair = Math.max(0, Number(damagedCount) || 0);
      const lost = Math.max(0, Number(lostCount) || 0);

      setSaving(true);

      const response = await axios.post(`${ApiURL}/product/damaged-products`, {
        productId: selectedAddProduct._id,
        repairCount: repair,
        lostCount: lost,
        repairDescription: repairDescription?.trim() || "",
      });

      if (response.status === 200) {
        toast.success("Damaged/Lost product saved successfully");
        setShowAddModal(false);
        handleCloseAdd();
        await fetchDamagedProducts();
      }
    } catch (error) {
      console.error("Error adding damaged product:", error);
      toast.error(error?.response?.data?.error || "Failed to save damaged/lost product");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setSelectedAddProduct(null);
    setDamagedCount(0);
    setLostCount(0);
    setRepairDescription("");
  };

  const filteredDamaged = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return damagedProducts;

    return damagedProducts.filter((p) => {
      const name = (p.ProductName || "").toLowerCase();
      const cat = (p.ProductCategory || "").toLowerCase();
      const sub = (p.ProductSubcategory || "").toLowerCase();
      return name.includes(q) || cat.includes(q) || sub.includes(q);
    });
  }, [damagedProducts, searchTerm]);

  const totalItems = filteredDamaged.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPageItems = filteredDamaged.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ✅ NEW: Download full data as Excel
  const handleDownloadExcel = () => {
    try {
      if (!damagedProducts || damagedProducts.length === 0) {
        toast.error("No data to download");
        return;
      }

      const rows = damagedProducts.map((p, i) => ({
        "S.No": i + 1,
        "Product Name": p.ProductName || "",
        "Stock": safeNum(p.ProductStock),
        // "Stock Available": safeNum(p.StockAvailable),
        "Lost": safeNum(p.lostCount),
        "To Repair": safeNum(p.repairCount),
        "Price": safeNum(p.ProductPrice),
        "Description": p.repairDescription || "",
        // "Category": p.ProductCategory || "",
        // "Sub Category": p.ProductSubcategory || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DamagedProducts");

      // ✅ Make columns readable width
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 40 },
        { wch: 14 },
        // { wch: 16 },
        { wch: 8 },
        { wch: 10 },
        { wch: 10 },
        { wch: 40 },
        // { wch: 18 },
        // { wch: 18 },
      ];

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileName = `Damaged_Lost_Products_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      saveAs(blob, fileName);
      toast.success("Excel downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download excel");
    }
  };

  return (
    <Container style={{ background: "#F4F4F4", paddingBlock: "20px" }}>
      <Row className="mb-3 align-items-center">
        <Col md={6}>
          <div style={{ position: "relative", width: 320, maxWidth: "100%" }}>
            <FaSearch style={{ position: "absolute", top: 11, left: 10, opacity: 0.6 }} />
            <Form.Control
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name"
              style={{ paddingLeft: 34 }}
            />
          </div>
        </Col>

        <Col md={6} className="d-flex justify-content-end gap-2">
          {/* ✅ NEW: Download Excel */}
          <Button
            variant="outline-dark"
            onClick={handleDownloadExcel}
            disabled={loadingList || damagedProducts.length === 0}
            style={{ whiteSpace: "nowrap" }}
          >
            <FaDownload className="me-2" />
            Download Sheet
          </Button>

          <Button
            variant="primary"
            style={{
              backgroundColor: "#BD5525",
              border: "none",
              color: "white",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus className="me-2" />
            Add Damaged/Lost Product
          </Button>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table bordered hover>
          <thead className="table-light">
            <tr>
              <th style={{ width: 70 }}>#</th>
              <th style={{ width: 400 }}>Product Name</th>
              <th style={{ width: 100 }}>Stock</th>
              {/* <th style={{ width: 120 }}>Stock Available</th> */}
              <th style={{ width: 100 }}>Lost</th>
              <th style={{ width: 110 }}>To Repair</th>
              <th style={{ width: 100 }}>Price</th>
              <th>Description</th>
            </tr>
          </thead>

          <tbody>
            {loadingList ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : currentPageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No damaged products found.
                </td>
              </tr>
            ) : (
              currentPageItems.map((p, idx) => (
                <tr key={p._id}>
                  <td>{startIndex + idx + 1}</td>
                  <td>{p.ProductName}</td>
                  <td>{safeNum(p.ProductStock)}</td>
                  {/* <td>{safeNum(p.StockAvailable)}</td> */}
                  <td>{safeNum(p.lostCount)}</td>
                  <td>{safeNum(p.repairCount)}</td>
                  <td>₹{safeNum(p.ProductPrice)}</td>
                  <td style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>
                    {p.repairDescription || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Add Modal */}
      <Modal show={showAddModal} onHide={handleCloseAdd} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Add Damaged/Lost Product</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="addProductSelect">
              <Form.Label>Product Name</Form.Label>
              <Select
                options={availableToAdd.map((p) => ({ value: p._id, label: p.ProductName }))}
                value={
                  selectedAddProduct
                    ? { value: selectedAddProduct._id, label: selectedAddProduct.ProductName }
                    : null
                }
                onChange={handleProductSelect}
                isClearable
                placeholder="Search product..."
              />
            </Form.Group>

            {selectedAddProduct && (
              <>
                <Row>
                  <Col xs={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category</Form.Label>
                      <Form.Control type="text" value={selectedAddProduct.ProductCategory || ""} disabled />
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Total Qty</Form.Label>
                      <Form.Control type="text" value={selectedAddProduct.qty || ""} disabled />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={repairDescription}
                        onChange={(e) => setRepairDescription(e.target.value)}
                        placeholder="Enter repair/damage description..."
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Damaged Count (To Repair)</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        value={damagedCount}
                        onChange={(e) => setDamagedCount(Math.max(0, Number(e.target.value) || 0))}
                      />
                      <Form.Text className="text-muted">
                        Current repair count: {selectedAddProduct.repairCount || 0}
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col xs={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Lost Count</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        value={lostCount}
                        onChange={(e) => setLostCount(Math.max(0, Number(e.target.value) || 0))}
                      />
                      <Form.Text className="text-muted">
                        Current lost count: {selectedAddProduct.lostCount || 0}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAdd} disabled={saving}>
            Close
          </Button>

          <Button
            variant="primary"
            onClick={handleAddDamaged}
            disabled={!selectedAddProduct || saving}
            style={{ backgroundColor: "#BD5525", border: "none" }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}
    </Container>
  );
};

export default DamagedProductList;
