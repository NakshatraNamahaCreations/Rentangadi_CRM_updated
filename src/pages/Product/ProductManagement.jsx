import React, { useEffect, useState } from "react";
import { Button, Card, Table, Container, Form } from "react-bootstrap";
import Pagination from "../../components/Pagination";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ApiURL, ImageApiURL } from "../../api";
import { MdVisibility } from "react-icons/md";

const ProductManagement = () => {
  const navigate = useNavigate();
  const savedSearch = localStorage.getItem("productSearchQuery") || "";
  const [searchQuery, setSearchQuery] = useState(savedSearch);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);


  // ─────────────────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ApiURL}/product/getinventoryproducts`);
      if (response.status === 200) {
        setProducts(response.data.ProductsData);
        setFilteredProducts(response.data.ProductsData);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem("productSearchQuery", searchQuery);
    const filtered = products.filter((product) => {
      const searchWords = searchQuery.toLowerCase().split(" ").filter((w) => w.trim());
      const productWords = product.ProductName.toLowerCase().split(" ");
      const productWordsDesc = (product.ProductDesc || "").toLowerCase().split(" ");
      return searchWords.every(
        (sw) =>
          productWords.some((pw) => pw === sw || pw.startsWith(sw)) ||
          productWordsDesc.some((pw) => pw === sw || pw.startsWith(sw))
      );
    });
    setFilteredProducts(filtered);
    setCurrentPage(1);
    return () => {
      if (
        location.pathname !== "/product-management" &&
        !location.pathname.startsWith("/product-details/") &&
        !location.pathname.startsWith("/edit-product/")
      ) {
        setSearchQuery("");
        localStorage.removeItem("productSearchQuery");
      }
    };
  }, [searchQuery, products]);

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
    const currentPageIds = currentItems.map((p) => p._id);
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);


  // ─────────────────────────────────────────────────────────────────────────
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
                    checked={currentItems.length > 0 && currentItems.every((item) => selectedRows.includes(item._id))}
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
              {currentItems.map((product) => (
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
                      src={`${ImageApiURL}/product/${product.ProductIcon}`}
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
                    {/* View */}
                    <Button
                      variant="outline-dark" size="sm" className="me-1 icon-btn"
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => navigate(`/product-details/${product._id}`)}
                    >
                      <MdVisibility />
                    </Button>
                    {/* Delete */}
                    <Button
                      variant="outline-danger" size="sm" className="me-1 icon-btn"
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => handleDeleteProduct(product._id)}
                    >
                      <FaTrashAlt style={{ width: "12px", height: "12px" }} />
                    </Button>
                    {/* Edit */}
                    <Button
                      variant="outline-success" size="sm" className="icon-btn"
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => navigate(`/edit-product/${product._id}`)}
                    >
                      <FaEdit style={{ width: "12px", height: "12px" }} />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center">No Products found.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      <Pagination
        totalItems={filteredProducts.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

    </Container>
  );
};

export default ProductManagement;
