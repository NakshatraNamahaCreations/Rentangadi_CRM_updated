import React, { useState, useEffect } from "react";
import { Button, Card, Container, Form, Table, Spinner } from "react-bootstrap";
import { FaTrashAlt, FaEdit } from "react-icons/fa";
import { MdVisibility } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ApiURL } from "../../api";
import Pagination from "../../components/Pagination";
import { toast } from "react-hot-toast";

const EnquiryList = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // General search query
  const [selectedEnquiries, setSelectedEnquiries] = useState([]); // Track selected rows
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEnquiries = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${ApiURL}/Enquiry/getallEnquiry`);
        console.log(`getallEnquiry res.data: `, res.data);
        if (res.status === 200) {
          setEnquiries(res.data);
        }
      } catch (error) {
        console.error("Error fetching enquiries:", error);
      }
      setLoading(false);
    };
    fetchEnquiries();
  }, []);

  // Filter logic based on general search query
  const filtered = enquiries.filter(
    (e) =>
      (e.enquiryId && String(e.enquiryId).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.clientName && e.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.GrandTotal && e.GrandTotal.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.executivename && e.executivename.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.enquiryDate && e.enquiryDate.includes(searchQuery))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete?");
    if (confirmDelete) {
      try {
        const response = await axios.delete(
          `${ApiURL}/Enquiry/deleteEnquiry/${id}`
        );
        if (response.status === 200) {
          setEnquiries((prev) => prev.filter((enq) => enq._id !== id));
          toast.success("Successfully Deleted");
        }
      } catch (error) {
        toast.error("Enquiry Not Deleted");
        console.error("Error deleting the Enquiry:", error);
      }
    }
  };

  const handleSelectRow = (id) => {
    setSelectedEnquiries((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Handle 'Select All' checkbox toggle
  const handleSelectAll = () => {
    if (selectedEnquiries.length === currentItems.length && currentItems.length > 0) {
      setSelectedEnquiries([]); // Deselect all if already all are selected
    } else {
      setSelectedEnquiries(currentItems.map((e) => e._id)); // Select all current page items
    }
  };


  const handleDeleteSelected = async () => {
    if (!window.confirm("Are you sure you want to delete selected enquiries?"))
      return;
    for (const id of selectedEnquiries) {
      try {
        await axios.delete(`${ApiURL}/Enquiry/deleteEnquiry/${id}`);
      } catch (err) {
        toast.error("Failed to delete some enquiries.");
      }
    }
    setEnquiries((prev) =>
      prev.filter((enquiry) => !selectedEnquiries.includes(enquiry._id))
    );
    setSelectedEnquiries([]);
  };

  return (
    <Container className="my-4">
      <Card className="shadow-sm mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            Enquiry List
          </h5>

          <Button
            size="sm"
            style={{
              backgroundColor: "#BD5525",
              border: "none",
              transition: "background 0.2s",
            }}
            onClick={() => navigate("/add-new-enquiry")}
            className="add-btn"
          >
            Create Enquiry
          </Button>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {/* Search Bar */}
          <div className="mb-3">
            <Form.Control
              size="sm"
              style={{ fontSize: "0.92rem", maxWidth: 300 }}
              placeholder="Search by Enquiry Id, Company, Executive, or Date"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Display Delete Selected Button only when there are selected rows */}
          {selectedEnquiries.length > 0 && (
            <div className="text-end mb-3">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDeleteSelected}
                style={{ marginBottom: "20px" }}
              >
                Delete {selectedEnquiries.length} Selected Enquiries
              </Button>
            </div>
          )}

          <div className="table-responsive">
            <Table
              striped
              bordered
              hover
              className="mb-0"
              style={{ fontSize: "0.82rem" }}
            >
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  <th style={{ width: "5%" }}>
                    <input
                      type="checkbox"
                      checked={selectedEnquiries.length === currentItems.length && currentItems.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: "10%" }}>Enquiry Id</th>
                  <th style={{ width: "12%" }}>Enquiry Date</th>
                  <th style={{ width: "12%" }}>Time</th>
                  <th style={{ width: "18%" }}>Company Name</th>
                  <th style={{ width: "15%" }}>Executive Name</th>
                  <th style={{ width: "10%" }}>GrandTotal</th>
                  <th style={{ width: "10%" }} className="text-center">Status</th>
                  <th style={{ width: "10%" }} className="text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center">
                      <Spinner animation="border" />
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center">
                      No enquiries found.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((enq) => (
                    <tr key={enq._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEnquiries.includes(enq._id)}
                          onChange={() => handleSelectRow(enq._id)}
                        />
                      </td>
                      <td>{enq.enquiryId}</td>
                      <td>{enq.enquiryDate}</td>
                      <td>{enq.enquiryTime}</td>
                      <td>{enq.clientName}</td>
                      <td>{enq.executivename}</td>
                      <td>{enq.GrandTotal}</td>
                      <td className="text-center">
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 12,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "#fff",
                            backgroundColor: enq.status === "sent" ? "#28a745" : "#f0ad4e",
                          }}
                        >
                          {enq.status === "sent" ? "Confirmed" : "Pending"}
                        </span>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          style={{ padding: "4px 8px", fontSize: "10px" }}
                          onClick={() => navigate(`/edit-enquiry/${enq._id}`)}
                          title="Edit"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="me-2"
                          style={{ padding: "4px 8px", fontSize: "10px" }}
                          onClick={() => handleDelete(enq._id)}
                        >
                          <FaTrashAlt />
                        </Button>
                        <Button
                          variant="outline-dark"
                          size="sm"
                          className="icon-btn"
                          style={{ padding: "4px 8px", fontSize: "10px" }}
                          onClick={() => navigate(`/enquiry-details/${enq._id}`)}
                        >
                          <MdVisibility />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Pagination
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </Container>
  );
};

export default EnquiryList;
