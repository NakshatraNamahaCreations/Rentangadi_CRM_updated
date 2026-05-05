import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Table, Container, Modal, Form } from "react-bootstrap";
import Pagination from "../../components/Pagination";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { MdVisibility } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ApiURL } from "../../api";

const PAGE_SIZE = 10;

const Client = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [viewClient, setViewClient] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Debounce search and reset to page 1 on query change
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${ApiURL}/client/getallClients`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        params: {
          limit: 10000,
        },
      });
      if (res.status === 200 && Array.isArray(res.data.Client)) {
        const mapped = res.data.Client.map((c) => ({
          companyName: c.name || "N/A",
          contactPersonNumber: c.phoneNumber || "N/A",
          email: c.email || "N/A",
          address: c.address || "N/A",
          executives: c.executives || [],
          _id: c._id,
        }));
        setClients(mapped);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  // Client-side search across name, phone, email, and address.
  const filteredClients = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.companyName, c.contactPersonNumber, c.email, c.address]
        .some((v) => (v || "").toString().toLowerCase().includes(q))
    );
  }, [clients, debouncedSearch]);

  const totalItems = filteredClients.length;

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  // Clamp the page if the filtered list shrinks below the current page.
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > pages) setCurrentPage(pages);
  }, [totalItems, currentPage]);

  // Handlers
  const handleDeleteClient = async (index) => {
    const client = paginatedClients[index];
    if (!client || !client._id) return;
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${ApiURL}/client/deleteClient/${client._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchClients();
      setSelectedRows((prev) => prev.filter((i) => i !== index));
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm("Are you sure you want to delete selected clients?"))
      return;
    const token = sessionStorage.getItem("token");
    for (const idx of selectedRows) {
      const client = paginatedClients[idx];
      if (client && client._id) {
        try {
          await axios.delete(`${ApiURL}/client/deleteClient/${client._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.error("Error deleting client:", error);
        }
      }
    }
    fetchClients();
    setSelectedRows([]);
  };

  const handleSelectRow = (index) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedClients.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedClients.map((_, index) => index));
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setSelectedRows([]);
  };

  const handleViewClient = (client) => {
    setViewClient(client);
    setShowViewModal(true);
  };

  const handleEditClient = (client) => {
    setEditClient(client);
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editClient || !editClient._id) return;
    console.log(`editClient: `, editClient);

    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      if (newPassword && newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      await axios.put(`${ApiURL}/client/editClient/${editClient._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        name: editClient.companyName,
        phoneNumber: editClient.contactPersonNumber,
        email: editClient.email,
        address: editClient.address,
        password: newPassword
      });

      // Update the local state
      setClients((prevClients) =>
        prevClients.map((client) =>
          client._id === editClient._id ? editClient : client
        )
      );
      setShowEditModal(false);
      window.location.reload()

      alert('Client updated successfully!');
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client. Please try again. ' + (error.response?.data?.error || 'Unknown error.'));
    } finally {
      setLoading(false)
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedRows([]);
  };

  return (
    <Container style={{ background: "#F4F4F4", paddingBlock: "20px" }}>
      <div className="d-flex justify-content-between mb-3">
        <Form.Control
          type="text"
          placeholder="Search Client"
          value={searchQuery}
          onChange={handleSearchChange}
          className="shadow-sm"
          style={{ width: "250px", fontSize: "12px" }}
        />
        <div className="d-flex gap-2">
          <Button
            onClick={() => navigate("/add-client")}
            variant="primary"
            className="fw-bold rounded-1 shadow-lg"
            style={{
              fontSize: "12px",
              padding: "6px 12px",
              background: "#BD5525",
              borderColor: "#BD5525",
            }}
          >
            + Add Client
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
        <div
          className="table-responsive bg-white rounded-lg"
          style={{ maxHeight: "65vh", overflowY: "auto" }}
        >
          <Table className="table table-hover align-middle">
            <thead
              className="text-white text-center"
              style={{ backgroundColor: "#323D4F", fontSize: "12px" }}
            >
              <tr>
                <th style={{ width: "5%" }}>
                  <input
                    type="checkbox"
                    checked={
                      paginatedClients.length > 0 &&
                      selectedRows.length === paginatedClients.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="text-start">Company Name</th>
                <th className="text-start">Phone Number</th>
                <th className="text-start">Address</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client, index) => (
                <tr key={client._id || index} className="text-center hover-row">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(index)}
                      onChange={() => handleSelectRow(index)}
                    />
                  </td>
                  <td
                    className="fw-semibold text-start"
                    style={{ fontSize: "12px" }}
                  >
                    {client.companyName}
                  </td>
                  <td className="text-start" style={{ fontSize: "12px" }}>
                    {client.contactPersonNumber || "-"}
                  </td>
                  <td className="text-start" style={{ fontSize: "12px" }}>
                    {client.address}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="outline-dark"
                      size="sm"
                      className="me-2 icon-btn"
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => handleViewClient(client)}
                    >
                      <FaEye />
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="me-2 icon-btn"
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => handleEditClient(client)}
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => handleDeleteClient(index)}
                    >
                      <FaTrashAlt />
                    </Button>
                  </td>
                </tr>
              ))}

              {paginatedClients.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    No Clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      <Pagination
        totalItems={totalItems}
        itemsPerPage={PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />

      {/* View Modal */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Client Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: "14px" }}>
          {viewClient && (
            <>
              <p>
                <strong>Company Name:</strong> {viewClient.companyName}
              </p>
              <p>
                <strong>Email:</strong> {viewClient.email || "N/A"}
              </p>
              <p>
                <strong>Address:</strong> {viewClient.address}
              </p>
              <hr />
              <h6>Executives:</h6>
              {viewClient.executives && viewClient.executives.length > 0 ? (
                viewClient.executives.map((exec, idx) => (
                  <p key={idx}>
                    👤 {exec.name} - 📞 {exec.phoneNumber || exec.phone}
                  </p>
                ))
              ) : (
                <p>No executives added.</p>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Client Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editClient && (
            <Form onSubmit={handleUpdateClient}>
              <Form.Group className="mb-3">
                <Form.Label>Company Name</Form.Label>
                <Form.Control
                  type="text"
                  value={editClient.companyName}
                  onChange={(e) => setEditClient({ ...editClient, companyName: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Contact Person Number</Form.Label>
                <Form.Control
                  type="tel"
                  value={editClient.contactPersonNumber}
                  onChange={(e) => setEditClient({ ...editClient, contactPersonNumber: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={editClient.email}
                  onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editClient.address}
                  onChange={(e) => setEditClient({ ...editClient, address: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </Form.Group>

              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Client"}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Client;
