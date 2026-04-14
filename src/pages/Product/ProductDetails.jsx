import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Container, Row, Col, Form, Spinner } from "react-bootstrap";
import axios from "axios";
import toast from "react-hot-toast";
import { FaTimes, FaPlus } from "react-icons/fa";
import { ApiURL, ImageApiURL } from "../../api";

const COLOR_OPTIONS = [
  { label: "Select Color", value: "" },
  { label: "Red",          value: "Red",          hex: "#e53935" },
  { label: "Blue",         value: "Blue",          hex: "#1e88e5" },
  { label: "Green",        value: "Green",         hex: "#43a047" },
  { label: "Yellow",       value: "Yellow",        hex: "#fdd835" },
  { label: "Black",        value: "Black",         hex: "#212121" },
  { label: "White",        value: "White",         hex: "#f5f5f5" },
  { label: "Brown",        value: "Brown",         hex: "#6d4c41" },
  { label: "Grey",         value: "Grey",          hex: "#757575" },
  { label: "Orange",       value: "Orange",        hex: "#fb8c00" },
  { label: "Pink",         value: "Pink",          hex: "#e91e63" },
  { label: "Purple",       value: "Purple",        hex: "#8e24aa" },
  { label: "Beige",        value: "Beige",         hex: "#d7ccc8" },
];

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Color image state ────────────────────────────────────────────────────
  const [colorImages, setColorImages]     = useState([]);   // saved images from DB
  const [selectedFiles, setSelectedFiles] = useState([]);   // File[]
  const [colorLabels, setColorLabels]     = useState([]);   // string[]
  const [previews, setPreviews]           = useState([]);   // blob URL[]
  const [uploading, setUploading]         = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ApiURL}/product/product-details/${id}`);
      if (res.status === 200 && res.data.product) {
        setProduct(res.data.product);
        setColorImages(res.data.product.images || []);
      }
    } catch {
      setProduct(null);
    }
    setLoading(false);
  };

  // ── File picker ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setColorLabels(files.map(() => ""));
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleColorChange = (idx, value) => {
    setColorLabels((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setColorLabels((prev)  => prev.filter((_, i) => i !== idx));
    setPreviews((prev)     => prev.filter((_, i) => i !== idx));
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Select at least one image");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("productImages", file));
      formData.append("colors", JSON.stringify(colorLabels));

      const res = await axios.post(
        `${ApiURL}/product/addProductImages/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setColorImages(res.data.images || []);
      setSelectedFiles([]);
      setColorLabels([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Images uploaded successfully");
    } catch {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  // ── Delete saved image ───────────────────────────────────────────────────
  const handleDeleteImage = async (public_id) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await axios.delete(`${ApiURL}/product/deleteProductImage/${id}`, {
        data: { public_id },
      });
      setColorImages((prev) => prev.filter((img) => img.public_id !== public_id));
      toast.success("Image deleted");
    } catch {
      toast.error("Failed to delete image");
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Container className="my-5">
        <Card className="shadow-lg border-0 rounded-4 p-5 text-center">
          <h5>Loading product details...</h5>
        </Card>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="my-5">
        <Card className="shadow-lg border-0 rounded-4 p-5 text-center">
          <h5>Product not found.</h5>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      {/* ── Product Info Card ──────────────────────────────────────────── */}
      <Card className="shadow-sm border-0 rounded-4 mb-4">
        <div
          className="py-3 px-4 rounded-top d-flex align-items-center justify-content-between"
          style={{ background: "linear-gradient(90deg, #323D4F, rgb(154,155,156))", color: "#fff" }}
        >
          <h5 className="mb-0">Product Details</h5>
          <Button size="sm" variant="light" onClick={() => navigate(-1)} style={{ fontSize: "12px" }}>
            ← Back
          </Button>
        </div>
        <Card.Body className="p-4">
          <Row>
            <Col md={3} className="text-center mb-4 mb-md-0">
              <img
                src={`${ImageApiURL}/product/${product.ProductIcon}`}
                alt={product.ProductName}
                style={{ width: "180px", height: "180px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e0e0e0" }}
              />
            </Col>
            <Col md={9}>
              <Row>
                {[
                  ["Product Name",  product.ProductName],
                  ["Category",      product.ProductCategory],
                  ["Subcategory",   product.ProductSubcategory],
                  ["Stock",         product.ProductStock],
                  ["Price",         product.ProductPrice],
                  ["Seater",        product.seater      || "N/A"],
                  ["Material",      product.Material    || "N/A"],
                  ["Color",         product.Color       || "N/A"],
                  ["Size & Weight", product.ProductSize || "N/A"],
                  ["Quantity",      product.qty         || "N/A"],
                  ["Min Quantity",  product.minqty      || "N/A"],
                  ["Description",   product.ProductDesc || "N/A"],
                ].map(([label, value]) => (
                  <Col xs={12} md={6} key={label} className="mb-2">
                    <div style={{ fontSize: "13px" }}>
                      <span className="text-muted">{label}: </span>
                      <strong>{value}</strong>
                    </div>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── Color Images Card ──────────────────────────────────────────── */}
      <Card className="shadow-sm border-0 rounded-4">
        <div
          className="py-3 px-4 rounded-top"
          style={{ background: "#323D4F", color: "#fff" }}
        >
          <h5 className="mb-0" style={{ fontSize: "15px" }}>Color Images</h5>
        </div>
        <Card.Body className="p-4">

          {/* Saved images grid */}
          {colorImages.length > 0 ? (
            <div className="mb-4">
              <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                {colorImages.length} image{colorImages.length > 1 ? "s" : ""} saved
              </p>
              <div className="d-flex flex-wrap gap-3">
                {colorImages.map((img, idx) => (
                  <div
                    key={img.public_id || idx}
                    style={{
                      position: "relative",
                      width: "130px",
                      borderRadius: "8px",
                      overflow: "visible",
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.color || `color-${idx}`}
                      style={{
                        width: "130px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        display: "block",
                      }}
                    />
                    {/* Color label badge */}
                    {img.color && (
                      <div
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          fontSize: "11px",
                          textAlign: "center",
                          padding: "2px 6px",
                          borderRadius: "0 0 8px 8px",
                          marginTop: "-2px",
                        }}
                      >
                        {img.color}
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteImage(img.public_id)}
                      title="Delete image"
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        background: "#dc3545",
                        border: "none",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        color: "#fff",
                        fontSize: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted mb-4" style={{ fontSize: "13px" }}>
              No color images added yet.
            </p>
          )}

          <hr />

          {/* Upload section */}
          <p className="fw-semibold mb-3" style={{ fontSize: "14px" }}>
            <FaPlus className="me-1" style={{ fontSize: "12px" }} />
            Add Color Images
          </p>

          <Form.Group className="mb-3">
            <Form.Control
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ fontSize: "13px", maxWidth: "400px" }}
            />
            <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
              Select one or more images. Optionally enter a color name for each.
            </Form.Text>
          </Form.Group>

          {/* Preview grid for newly selected files */}
          {previews.length > 0 && (
            <div className="d-flex flex-wrap gap-3 mb-4">
              {previews.map((src, idx) => (
                <div key={idx} style={{ width: "130px" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt={`preview-${idx}`}
                      style={{
                        width: "130px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "2px dashed #BD5525",
                      }}
                    />
                    <button
                      onClick={() => removeSelectedFile(idx)}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        background: "#dc3545",
                        border: "none",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        color: "#fff",
                        fontSize: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <Form.Select
                    value={colorLabels[idx] || ""}
                    onChange={(e) => handleColorChange(idx, e.target.value)}
                    style={{ fontSize: "11px", marginTop: "5px", padding: "3px 6px" }}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Form.Select>
                  {/* Color dot indicator */}
                  {colorLabels[idx] && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                      <span
                        style={{
                          width: "12px", height: "12px", borderRadius: "50%",
                          background: COLOR_OPTIONS.find((c) => c.value === colorLabels[idx])?.hex || "#ccc",
                          border: "1px solid #aaa", display: "inline-block", flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "10px", color: "#555" }}>{colorLabels[idx]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            style={{
              background: "#BD5525",
              borderColor: "#BD5525",
              fontSize: "13px",
              padding: "6px 20px",
            }}
          >
            {uploading ? (
              <><Spinner animation="border" size="sm" className="me-2" />Uploading…</>
            ) : (
              `Upload${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}`
            )}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProductDetails;
