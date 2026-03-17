import React, { useEffect, useState } from "react";
import { Button, Card, Container, Table } from "react-bootstrap";
import { MdVisibility } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Pagination from "../../components/Pagination";
import axios from "axios";
import { ApiURL } from "../../api";

const QuotationByDate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { date, quotations } = location.state || {};  // Get quotations data

  const [selectedQuotations, setSelectedQuotations] = useState([]); // Track selected rows
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // If navigated directly, show a message
  if (!date || !quotations) {
    return (
      <Container className="my-4">
        <Card className="shadow-sm mb-4">
          <Card.Body>
            <h5>No quotation data found for this date.</h5>
            <Button
              size="sm"
              style={{
                backgroundColor: "#323D4F",
                border: "none",
                transition: "background 0.2s",
              }}
              onClick={() => navigate("/qt-calender")}
              className="add-btn"
            >
              Back to Calendar
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = quotations.slice(indexOfFirstItem, indexOfLastItem);

  const handleSelectRow = (id) => {
    setSelectedQuotations((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuotations.length === currentItems.length) {
      setSelectedQuotations([]); // Deselect all if already all are selected
    } else {
      setSelectedQuotations(currentItems.map((q) => q._id)); // Select all current page items
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm("Are you sure you want to delete selected quotations?"))
      return;
    for (const id of selectedQuotations) {
      try {
        await axios.delete(`${ApiURL}/quotations/deleteQuotation/${id}`);
      } catch (err) {
        alert("Failed to delete some quotations.");
      }
    }
    // Update the quotations state after deletion
    setSelectedQuotations([]);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this quotation?");
    if (confirmDelete) {
      try {
        const response = await axios.delete(`${ApiURL}/quotations/deleteQuotation/${id}`);
        if (response.status === 200) {
          window.location.reload();
          alert("Successfully Deleted");
        }
      } catch (error) {
        alert("Quotation Not Deleted");
        console.error("Error deleting the quotation:", error);
      }
    }
  };

  return (
    <Container className="my-4">
      <Card className="shadow-sm mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            Quotations on {date}
          </h5>
          <Button
            size="sm"
            style={{
              backgroundColor: "#323D4F",
              border: "none",
              transition: "background 0.2s",
            }}
            onClick={() => navigate("/qt-calender")}
            className="add-btn"
          >
            Back to Calendar
          </Button>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {/* Display Delete Selected Button only when there are selected rows */}
          {selectedQuotations.length > 0 && (
            <div className="text-end mb-3">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDeleteSelected}
                style={{ marginBottom: "20px" }}
              >
                Delete {selectedQuotations.length} Selected Quotations
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
                      checked={selectedQuotations.length === currentItems.length}
                      onChange={handleSelectAll} // Select/Deselect all items
                    />
                  </th>
                  <th style={{ width: "10%" }}>S.No.</th>
                  <th style={{ width: "10%" }}>Event Date</th>
                  <th style={{ width: "12%" }}>Time Slot</th>
                  <th style={{ width: "18%" }}>Client Name</th>
                  <th style={{ width: "15%" }}>Executive Name</th>
                  <th style={{ width: "15%" }}>Status</th>
                  <th style={{ width: "10%" }}>GrandTotal</th>
                  <th style={{ width: "12%" }} className="text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((quote, idx) => (
                    <tr key={quote._id || quote.id || idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedQuotations.includes(quote._id)} // Individual row selection
                          onChange={() => handleSelectRow(quote._id)} // Select/unselect individual row
                        />
                      </td>
                      <td>{idx + 1}</td>
                      <td>{quote.quoteDate}</td>
                      <td>{quote.quoteTime}</td>
                      <td>{quote.clientName}</td>
                      <td>{quote.executivename || "-"}</td>
                      <td>{quote.status === "send" ? "Confirm" : quote.status || "-"}</td>
                      <td>{quote.GrandTotal}</td>
                      <td className="text-center">
                        <Button
                          variant="outline-dark"
                          size="sm"
                          className="icon-btn"
                          style={{ padding: "4px 8px", fontSize: "10px" }}
                          onClick={() =>
                            navigate(`/quotation-details/${quote._id}`, {
                              state: { quotationId: quote._id },
                            })
                          }
                        >
                          <MdVisibility />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(quote._id)}
                          style={{ padding: "4px 8px", fontSize: "10px" }}
                        >
                          <FaTrashAlt />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center text-muted">
                      No quotations found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Pagination
        totalItems={quotations.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </Container>
  );
};

export default QuotationByDate;
