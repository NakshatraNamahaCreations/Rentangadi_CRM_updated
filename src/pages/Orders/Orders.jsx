

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Container, Form, Table } from "react-bootstrap";
import { Calendar, momentLocalizer } from "react-big-calendar";
import { MdVisibility } from "react-icons/md";
import moment from "moment";
import { useNavigate, useSearchParams } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Pagination from "../../components/Pagination";
import axios from "axios";
import { ApiURL } from "../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const localizer = momentLocalizer(moment);
const PAGE_SIZE = 10;

const toDDMMYYYY = (d) => {
  try {
    if (!d || !(d instanceof Date) || isNaN(d)) return "";
    return moment(d).format("DD-MM-YYYY");
  } catch (e) {
    return "";
  }
};

const parseDDMMYYYYToDate = (str) => {
  try {
    if (!str) return null;
    const m = moment(str, "DD-MM-YYYY", true);
    if (!m.isValid()) return null;
    return m.toDate();
  } catch (e) {
    return null;
  }
};

const Orders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Only FILTERS + PAGE stored in URL (NOT view)
  const qParam = searchParams.get("q") || "";
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const pageParam = Number(searchParams.get("page") || "1");

  // ✅ View is always default Calendar on reload
  const [viewMode, setViewMode] = useState("calendar");

  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [fromDate, setFromDate] = useState(parseDDMMYYYYToDate(fromParam));
  const [toDate, setToDate] = useState(parseDDMMYYYYToDate(toParam));
  const [currentPage, setCurrentPage] = useState(
    Number.isFinite(pageParam) ? pageParam : 1
  );

  const setParam = (key, value) => {
    try {
      const next = new URLSearchParams(searchParams);
      if (!value) next.delete(key);
      else next.set(key, value);
      setSearchParams(next);
    } catch (e) {
      console.error(e);
    }
  };

  const setParamsBatch = (obj) => {
    try {
      const next = new URLSearchParams(searchParams);
      Object.entries(obj).forEach(([k, v]) => {
        if (!v) next.delete(k);
        else next.set(k, v);
      });
      setSearchParams(next);
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ Keep filter state synced with URL (browser back/forward)
  useEffect(() => {
    try {
      setSearchQuery(qParam);
      setFromDate(parseDDMMYYYYToDate(fromParam));
      setToDate(parseDDMMYYYYToDate(toParam));
      setCurrentPage(Number.isFinite(pageParam) ? pageParam : 1);
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, fromParam, toParam, pageParam]);

  // ✅ Fetch Orders once
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${ApiURL}/order/getallorder`);
        if (res.status === 200) {
          const transformed = (res.data.orderData || []).map((order) => {
            const slotsWithQuoteDates = (order.slots || []).map((slot) => ({
              ...slot,
              quoteDate: slot.quoteDate,
            }));

            return {
              ...order,
              companyName: order.clientName,
              executiveName: order.executivename,
              grandTotal: order.GrandTotal,
              bookingDate: order.createdAt,
              slots: slotsWithQuoteDates,
              address: order.Address,
              id: order._id,
              orderStatus: order.orderStatus,
            };
          });

          setOrders(transformed);
        } else {
          setOrders([]);
        }
      } catch (error) {
        setOrders([]);
      }
    };

    fetchOrders();
  }, []);

  // ✅ Filtered Orders (works for BOTH views)
  const filteredOrders = useMemo(() => {
    try {
      let data = [...orders];
      const query = (searchQuery || "").toLowerCase().trim();

      if (query) {
        data = data.filter(
          (order) =>
            (order.companyName || "").toLowerCase().includes(query) ||
            (order.executiveName || "").toLowerCase().includes(query) ||
            (order.address || "").toLowerCase().includes(query) ||
            (order.orderStatus || "").toLowerCase().includes(query)
        );
      }

      if (fromDate instanceof Date && !isNaN(fromDate)) {
        data = data.filter((order) =>
          (order.slots || []).some((slot) =>
            moment(slot.quoteDate, "DD-MM-YYYY").isSameOrAfter(
              moment(fromDate),
              "day"
            )
          )
        );
      }

      if (toDate instanceof Date && !isNaN(toDate)) {
        data = data.filter((order) =>
          (order.slots || []).some((slot) =>
            moment(slot.quoteDate, "DD-MM-YYYY").isSameOrBefore(
              moment(toDate),
              "day"
            )
          )
        );
      }

      return data;
    } catch (e) {
      return [];
    }
  }, [orders, searchQuery, fromDate, toDate]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // ✅ keep page in URL
  useEffect(() => {
    try {
      setParam("page", String(safePage));
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  // ✅ Calendar events based on filteredOrders
  const ordersCountByDate = useMemo(() => {
    try {
      return filteredOrders.reduce((acc, order) => {
        (order.slots || []).forEach((slot) => {
          const dateKey = moment(slot.quoteDate, "DD-MM-YYYY").format(
            "YYYY-MM-DD"
          );
          acc[dateKey] = acc[dateKey] || [];
          acc[dateKey].push(order);
        });
        return acc;
      }, {});
    } catch (e) {
      return {};
    }
  }, [filteredOrders]);

  const calendarEvents = useMemo(() => {
    try {
      return Object.entries(ordersCountByDate).map(([date, ordersArr]) => ({
        title: `Orders: ${ordersArr.length}`,
        start: new Date(date),
        end: new Date(date),
        allDay: true,
        orders: ordersArr,
        date,
      }));
    } catch (e) {
      return [];
    }
  }, [ordersCountByDate]);

  // const handleCalendarEventClick = (event) => {
  //   try {
  //     navigate(`/orders-by-date/${event.date}`);
  //   } catch (e) {
  //     console.error(e);
  //   }
  // };
const handleCalendarEventClick = (event) => {
  try {
    const query = (searchQuery || "").trim();
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    navigate(`/orders-by-date/${event.date}${qs}`);
  } catch (e) {
    console.error(e);
  }
};
  const eventStyleGetter = () => ({
    style: {
      backgroundColor: "#BD5525",
      color: "white",
      borderRadius: "4px",
      border: "none",
    },
  });

  // ✅ UI handlers
  const toggleView = () => {
    setViewMode((prev) => (prev === "calendar" ? "list" : "calendar"));
  };

  const onSearchChange = (val) => {
    setSearchQuery(val);
    setParamsBatch({ q: val || "", page: "1" });
  };

  const onFromChange = (date) => {
    setFromDate(date);
    setParamsBatch({ from: date ? toDDMMYYYY(date) : "", page: "1" });
  };

  const onToChange = (date) => {
    setToDate(date);
    setParamsBatch({ to: date ? toDDMMYYYY(date) : "", page: "1" });
  };

  const hasFilters = !!(searchQuery || fromDate || toDate);

  const clearFilters = () => {
    setSearchQuery("");
    setFromDate(null);
    setToDate(null);
    setParamsBatch({ q: "", from: "", to: "", page: "1" });
  };

  return (

    <Container className="my-4">
      <style>
        {`
      .orders-datepicker-popper {
        z-index: 99999 !important;
      }
      .orders-filter-card {
        overflow: visible !important;
        position: relative;
        z-index: 20;
      }
    `}
      </style>
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center">
          <h2 style={{ fontSize: "1.75rem" }}>Order Management</h2>
        </Card.Body>
      </Card>

      {/* ✅ Controls shown for BOTH views */}
      <Card
        className="shadow-sm mb-4 orders-filter-card"
        style={{ overflow: "visible", position: "relative", zIndex: 20 }}
      >
        <Card.Body>
          <div className="row align-items-center">
            <div className="col-md-3 mb-3 mb-md-0">
              <Form.Check
                type="switch"
                id="view-toggle"
                className="brand-switch"
                label={
                  viewMode === "calendar"
                    ? "Switch to List View"
                    : "Switch to Calendar View"
                }
                onChange={toggleView}
                checked={viewMode === "calendar"}
              />
            </div>

            <div className="col-md-3 mb-3 mb-md-0" style={{ position: "relative", zIndex: 30 }}>
              <DatePicker
                selected={fromDate}
                onChange={onFromChange}
                placeholderText="From Date"
                className="form-control form-control-sm"
                dateFormat="dd-MM-yyyy"
                isClearable
                popperClassName="orders-datepicker-popper"
                popperPlacement="bottom-start"
              />
            </div>

            <div className="col-md-3 mb-3 mb-md-0" style={{ position: "relative", zIndex: 30 }}>
              <DatePicker
                selected={toDate}
                onChange={onToChange}
                placeholderText="To Date"
                className="form-control form-control-sm"
                dateFormat="dd-MM-yyyy"
                isClearable
                popperClassName="orders-datepicker-popper"
                popperPlacement="bottom-start"
              />
            </div>

            <div className="col-md-3">
              <Form.Control
                type="text"
                placeholder="Search by Company, Executive, Address, Status"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                size="sm"
              />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            {hasFilters && (
              <Button variant="outline-danger" size="sm" onClick={clearFilters}>
                Clear Filter
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>


      {/* ✅ Content */}
      {viewMode === "calendar" ? (
        <Card className="shadow-sm p-3">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            views={["month", "week", "day", "agenda"]}
            popup
            selectable
            onSelectEvent={handleCalendarEventClick}
            eventPropGetter={eventStyleGetter}
          />
        </Card>
      ) : (
        <Card className="shadow-sm">
          <div className="table-responsive">
            <Table striped bordered hover className="mb-0" style={{ fontSize: "0.85rem" }}>
              <thead style={{ backgroundColor: "#f8f9fa" }}>
                <tr>
                  <th style={{ width: "10%" }}>Booking Date</th>
                  <th style={{ width: "15%" }}>Company Name</th>
                  <th style={{ width: "15%" }}>Executive Name</th>
                  <th style={{ width: "10%" }}>Grand Total</th>
                  <th style={{ width: "10%" }}>Event Date</th>
                  <th style={{ width: "25%" }}>Address</th>
                  <th style={{ width: "10%" }}>Status</th>
                  <th style={{ width: "10%" }} className="text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedOrders.map((order) => {
                  const quoteDate =
                    order.slots?.length > 0 ? order.slots[0].quoteDate : "";
                  return (
                    <tr key={order.id} style={{ verticalAlign: "middle" }}>
                      <td>{moment(order.bookingDate).format("DD-MM-YYYY")}</td>
                      <td>{order.companyName}</td>
                      <td>{order.executiveName}</td>
                      <td>{order.grandTotal}</td>
                      <td>{quoteDate}</td>
                      <td>{order.address}</td>
                      <td
                        style={{
                          color:
                            order.orderStatus === "Confirm"
                              ? "green"
                              : order.orderStatus === "cancelled"
                                ? "red"
                                : "black",
                          fontWeight: "600",
                        }}
                      >
                        {order.orderStatus}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-dark"
                          size="sm"
                          onClick={() => navigate(`/orders-details/${order.id}`)}
                          title="View"
                        >
                          <MdVisibility />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <Pagination
            totalItems={filteredOrders.length}
            pageSize={PAGE_SIZE}
            currentPage={safePage}
            onPageChange={(p) => {
              setCurrentPage(p);
              setParam("page", String(p));
            }}
          />
        </Card>
      )}
    </Container>
  );
};

export default Orders;
