import React, { useState, useEffect, useMemo } from "react";
import { Card, Container, Spinner, } from "react-bootstrap";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { ApiURL } from "../../api";  // Adjust this import if needed

const localizer = momentLocalizer(moment);

const QuotationCalendar = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch quotations from API
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setLoading(true);

        const res = await axios.get(`${ApiURL}/quotations/getallquotations`);
        console.log("Quotations:", res.data.quoteData);
        if (res.status === 200) {
          setQuotations(res.data.quoteData || []);
        }
      } catch (error) {
        console.error("Error fetching quotation data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotations();
  }, []);

  // Group quotations by date (DD-MM-YYYY)
  const quotationsCountByDate = useMemo(() => {
    const map = {};
    quotations.forEach((quote) => {
      // quote.quotationDate is DD-MM-YYYY
      const [dd, mm, yyyy] = (quote.quoteDate || "").split("-");
      if (!dd || !mm || !yyyy) return;
      const dateKey = `${yyyy}-${mm}-${dd}`; // for Date parsing
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(quote);
    });
    return map;
  }, [quotations]);

  // Calendar events: one per date
  const calendarEvents = Object.entries(quotationsCountByDate).map(
    ([date, quotes]) => ({
      title: `Quotations: ${quotes.length}`,
      start: new Date(date),
      end: new Date(date),
      allDay: true,
      quotations: quotes,
      date,
    })
  );

  // Color events
  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: "#BD5525",  // Example: green background for quotations
      color: "white",
      borderRadius: "4px",
      border: "none",
    },
  });

  // On event click, go to /quotations-by-date/:date and pass data
  const handleCalendarEventClick = (event) => {
    // Convert YYYY-MM-DD to DD-MM-YYYY
    const [yyyy, mm, dd] = event.date.split("-");
    const ddmmyyyy = `${dd}-${mm}-${yyyy}`;
    const quotationsForDate = quotationsCountByDate[event.date] || [];
    navigate(`/quotations-by-date/${ddmmyyyy}`, {
      state: { date: ddmmyyyy, quotations: quotationsForDate },
    });
  };


  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Card className="shadow-sm">
        <Card.Body>
          <div style={{ minHeight: 500 }}>
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
          </div>
          <div style={{ fontSize: 13, marginTop: 16, color: "#888" }}>
            <b>Note:</b> Click on a calendar event to view all quotations for that day.
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default QuotationCalendar;
