import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Table, Container, Form, Spinner } from "react-bootstrap";
import Pagination from "../../components/Pagination";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ApiURL, ImageApiURL } from "../../api";
import { MdVisibility } from "react-icons/md";

const ITEMS_PER_PAGE = 10;

const ProductManagement = () => {
  const navigate = useNavigate();
  const savedSearch = localStorage.getItem("productSearchQuery") || "";
  const [searchQuery, setSearchQuery] = useState(savedSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(savedSearch);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounce search: reset to page 1 whenever the user types
  useEffect(() => {
    localStorage.setItem("productSearchQuery", searchQuery);
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${ApiURL}/product/getinventoryproducts`
      );
      if (response.status === 200) {
        setAllProducts(response.data.ProductsData || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side multi-word search across name + key attributes.
  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allProducts;

    const normalize = (str) =>
      (str || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const words = normalize(q).split(" ").filter(Boolean);
    if (!words.length) return allProducts;

    return allProducts.filter((p) => {
      const text = normalize(
        `${p.ProductName || ""} ${p.ProductCategory || ""} ${p.ProductSubcategory || ""} ${p.Material || ""} ${p.seater || ""}`
      );
      return words.every((w) => text.includes(w));
    });
  }, [allProducts, debouncedSearch]);

  const totalItems = filteredProducts.length;

  // Current page slice.
  const products = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Clamp the page if the filtered list shrinks below the current page.
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (currentPage > pages) setCurrentPage(pages);
  }, [totalItems, currentPage]);

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you wanna delete?")) return;
    try {
      await axios.delete(`${ApiURL}/product/deleteProducts/${id}`);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllRows = (checked) => {
    const currentPageIds = products.map((p) => p._id);
    if (checked) {
      setSelectedRows([...new Set([...currentPageIds])]);
    } else {
      setSelectedRows(selectedRows.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm("Delete selected products?")) return;
    try {
      await Promise.all(
        selectedRows.map((id) => axios.delete(`${ApiURL}/product/deleteProducts/${id}`))
      );
      fetchProducts();
      setSelectedRows([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete selected products");
    }
  };

  return (
    <Container style={{ background: "#F4F4F4", paddingBlock: "20px" }}>
      <div className="d-flex justify-content-between mb-3">
        <div>
          <Form.Control
            type="text"
            placeholder="Search Product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="shadow-sm"
            style={{ width: "250px", fontSize: "12px" }}
          />
        </div>
        <div className="d-flex gap-2">
          <Button
            onClick={() => navigate("/add-product")}
            variant="primary"
            className="fw-bold rounded-1 shadow-lg"
            style={{ fontSize: "12px", padding: "6px 12px", background: "#BD5525", borderColor: "#BD5525" }}
          >
            + Add Product
          </Button>
          {selectedRows.length > 0 && (
            <Button
              variant="outline-danger"
              onClick={handleDeleteSelected}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              Delete {selectedRows.length} Selected
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <div className="table-responsive bg-white rounded-lg" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Table
            className="table table-hover align-middle"
            style={{ borderRadius: "8px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <thead className="text-white text-center" style={{ backgroundColor: "#323D4F", fontSize: "12px" }}>
              <tr>
                <th style={{ width: "5%" }}>
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAllRows(e.target.checked)}
                    checked={products.length > 0 && products.every((item) => selectedRows.includes(item._id))}
                  />
                </th>
                <th className="text-start" style={{ width: "15%" }}>Product Image</th>
                <th className="text-start" style={{ width: "20%" }}>Product Name</th>
                <th className="text-start" style={{ width: "10%" }}>Stock</th>
                <th className="text-start" style={{ width: "10%" }}>Pricing</th>
                <th className="text-start" style={{ width: "10%" }}>Seater</th>
                <th className="text-start" style={{ width: "10%" }}>Material</th>
                <th className="text-center" style={{ width: "15%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center">
                    <Spinner animation="border" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No Products found.</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="text-center hover-row">
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(product._id)}
                        onChange={() => handleSelectRow(product._id)}
                      />
                    </td>
                    <td>
                      <img
                        src={`${product.ProductIcon}`}
                        alt={product.ProductIcon}
                        style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px", fontSize: "12px" }}
                      />
                    </td>
                    <td className="fw-semibold text-start" style={{ fontSize: "12px" }}>
                      {product.ProductName}
                    </td>
                    <td className="text-start" style={{ fontSize: "12px" }}>
                      {product.ProductStock || "0"}
                    </td>
                    <td className="text-start" style={{ fontSize: "12px" }}>
                      {product.ProductPrice}
                    </td>
                    <td className="text-start" style={{ fontSize: "12px" }}>
                      {product.seater || "N/A"}
                    </td>
                    <td className="text-start" style={{ fontSize: "12px" }}>
                      {product.Material || "N/A"}
                    </td>
                    <td>
                      <Button
                        variant="outline-dark" size="sm" className="me-1 icon-btn"
                        style={{ padding: "4px 8px", fontSize: "10px" }}
                        onClick={() => navigate(`/product-details/${product._id}`)}
                      >
                        <MdVisibility />
                      </Button>
                      <Button
                        variant="outline-danger" size="sm" className="me-1 icon-btn"
                        style={{ padding: "4px 8px", fontSize: "10px" }}
                        onClick={() => handleDeleteProduct(product._id)}
                      >
                        <FaTrashAlt style={{ width: "12px", height: "12px" }} />
                      </Button>
                      <Button
                        variant="outline-success" size="sm" className="icon-btn"
                        style={{ padding: "4px 8px", fontSize: "10px" }}
                        onClick={() => navigate(`/edit-product/${product._id}`)}
                      >
                        <FaEdit style={{ width: "12px", height: "12px" }} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      <Pagination
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

    </Container>
  );
};

export default ProductManagement;
