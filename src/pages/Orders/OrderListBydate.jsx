
import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Card, Container } from "react-bootstrap";
import { MdVisibility } from "react-icons/md";
import moment from "moment";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ApiURL } from "../../api";

const DISPLAY_DATE_FORMAT = "DD-MM-YYYY";

const OrderListBydate = () => {
  const navigate = useNavigate();
  const { date } = useParams(); // YYYY-MM-DD
  const { state } = useLocation();

  // ✅ read q from URL (preferred)
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") || "";

  // ✅ fallback to location.state if provided
  const qFromState = state?.searchQuery || "";

  // ✅ final query (url has priority)
  const searchQuery = (qFromUrl || qFromState || "").trim();

  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrdersForDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, searchQuery]);

  const fetchOrdersForDate = async (selectedDate) => {
    try {
      const res = await axios.get(`${ApiURL}/order/getallorder`);
      if (res.status === 200) {
        const allOrders = res.data.orderData || [];

        // ✅ Filter orders by slot.quoteDate matching the selected date
        let filteredOrders = allOrders.filter((order) =>
          order.slots?.some(
            (slot) =>
              moment(slot.quoteDate, "DD-MM-YYYY").format("YYYY-MM-DD") === selectedDate
          )
        );

        // ✅ Apply search only if provided
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filteredOrders = filteredOrders.filter((order) => {
            const company = (order.clientName || "").toLowerCase();
            const exec = (order.executivename || "").toLowerCase();
            const addr = (order.Address || "").toLowerCase();
            const status = (order.orderStatus || "").toLowerCase();
            return (
              company.includes(q) ||
              exec.includes(q) ||
              addr.includes(q) ||
              status.includes(q)
            );
          });
        }

        const formattedOrders = filteredOrders.map((order) => {
          const quoteDate =
            order.slots && order.slots.length > 0 ? order.slots[0].quoteDate : "";

          return {
            id: order._id,
            companyName: order.clientName || "",
            executiveName: order.executivename || "",
            grandTotal: order.GrandTotal || 0,
            bookingDate: order.createdAt,
            deliveryDate: quoteDate,
            address: order.Address || "",
            status: order.orderStatus || "",
          };
        });

        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const navigateToDetails = (_id) => {
    navigate(`/orders-details/${_id}`, { state: { id: _id } });
  };

  return (
    <Container className="my-4">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <h5 className="mb-1">
            Orders with Quote Date:{" "}
            {date && moment(date).format(DISPLAY_DATE_FORMAT)}
          </h5>

          {/* ✅ show active filter info */}
          {searchQuery ? (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Filter applied: <b>{searchQuery}</b>
            </div>
          ) : null}

          <div className="table-responsive mt-3">
            <Table
              striped
              hover
              bordered
              className="mb-0"
              style={{ fontSize: "0.85rem" }}
            >
              <thead style={{ backgroundColor: "#f8f9fa" }}>
                <tr>
                  <th style={{ width: "15%" }}>Booking Date</th>
                  <th style={{ width: "15%" }}>Company Name</th>
                  <th style={{ width: "15%" }}>Executive Name</th>
                  <th style={{ width: "10%" }}>Grand Total</th>
                  <th style={{ width: "10%" }}>Event Date</th>
                  <th style={{ width: "25%" }}>Address</th>
                  <th style={{ width: "10%" }}>Status</th>
                  <th style={{ width: "5%" }} className="text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} style={{ verticalAlign: "middle" }}>
                      <td>
                        {moment(order.bookingDate).format(DISPLAY_DATE_FORMAT)}
                      </td>
                      <td>{order.companyName}</td>
                      <td>{order.executiveName}</td>
                      <td>{order.grandTotal}</td>
                      <td>{order.deliveryDate}</td>
                      <td>{order.address}</td>
                      <td
                        style={{
                          color:
                            order.status === "Confirm"
                              ? "green"
                              : order.status === "cancelled"
                                ? "red"
                                : "black",
                          fontWeight: 600,
                        }}
                      >
                        {order.status}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-dark"
                          size="sm"
                          onClick={() => navigateToDetails(order.id)}
                        >
                          <MdVisibility />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default OrderListBydate;
