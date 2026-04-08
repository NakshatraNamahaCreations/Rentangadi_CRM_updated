
import { Link, useLocation } from "react-router-dom";
import {
  FaClipboardList,
  FaTags,
  FaBoxOpen,
  FaUserFriends,
  FaShoppingBag,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaFileContract,
  FaChartBar,
  FaChartLine,
  FaCog
} from "react-icons/fa";
import { MdDashboard, MdInventory, MdOutlineSupportAgent } from "react-icons/md";
import logo from "../assets/RentangadiLogo5.png";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ApiURL } from "../api";

const Sidebars = () => {
  const [userAccess, setUserAccess] = useState({});
  const location = useLocation();
  const token = sessionStorage.getItem("token");

  const menuItems = useMemo(
    () => [
      { key: "dashboard", name: "Dashboard", path: "/dashboard", icon: MdDashboard },
      { key: "master", name: "Master", path: "/master", icon: FaClipboardList },
      { key: "banner", name: "Banner", path: "/banner", icon: FaTags },
      { key: "productManagement", name: "Product Management", path: "/product-management", icon: FaBoxOpen },
      { key: "clients", name: "Clients", path: "/client", icon: FaUserFriends },
      { key: "enquiryCalendar", name: "Enquiry Calendar", path: "/enquiry-calender", icon: FaCalendarAlt },

      // ✅ Quotation Calendar should depend on quotation permission
      { key: "quotation", name: "Quotation Calendar", path: "/qt-calender", icon: FaCalendarAlt },

      { key: "enquiryList", name: "Enquiry List", path: "/enquiry-list", icon: MdOutlineSupportAgent },
      { key: "quotation", name: "Quotation", path: "/quotation", icon: FaFileInvoiceDollar },
      { key: "orders", name: "Orders", path: "/orders", icon: FaShoppingBag },
      { key: "termsAndConditions", name: "Terms & Conditions", path: "/terms-conditions", icon: FaFileContract },
      { key: "paymentReport", name: "Payment Report", path: "/payment-report", icon: FaChartBar },

      { key: "inventoryProductList", name: "Inventory Product List", path: "/inventory-product-list", icon: MdInventory },
      { key: "reports", name: "Reports", path: "/reports", icon: FaChartLine },
      { key: "damagedAndLost", name: "Damaged/Lost", path: "/damaged-products", icon: FaChartBar },
      { key: "settings", name: "Settings", path: "/settings", icon: FaCog },
    ],
    []
  );

  const safeParsePermissions = () => {
    try {
      const stored = sessionStorage.getItem("permissions");
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const perms = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;

      return perms && typeof perms === "object" ? perms : null;
    } catch (err) {
      console.error("safeParsePermissions error:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchAdminPermissions = async () => {
      try {
        // ✅ 1) read from session first
        const cached = safeParsePermissions();
        if (cached) {
          setUserAccess(cached);
          return;
        }

        // ✅ 2) fallback fetch from API
        const res = await axios.get(`${ApiURL}/admins/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const perms = res?.data?.admin?.permissions || {};

        sessionStorage.setItem(
          "permissions",
          JSON.stringify({
            data: perms,
          })
        );

        setUserAccess(perms);
      } catch (error) {
        console.error("fetchAdminPermissions error:", error);
      }
    };

    fetchAdminPermissions();
  }, [token]);

  // ✅ filter menu items by permissions
  const filtered = useMemo(() => {
    try {
      const perms = userAccess && typeof userAccess === "object" ? userAccess : {};
      return menuItems.filter((item) => Boolean(perms?.[item.key]));
    } catch (err) {
      console.error("menu filter error:", err);
      return [];
    }
  }, [menuItems, userAccess]);

  const isActiveLink = (path) => {
    try {
      return location.pathname.includes(path);
    } catch (err) {
      return false;
    }
  };

  return (
    <div
      className="flex-column flex-shrink-0 p-3 vh-100 position-fixed sidebar-scroll"
      style={{
        width: "210px",
        zIndex: 1,
        background: "#BD5525",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div className="w-100 d-flex justify-content-center" style={{ backgroundColor: "black" }}>
        <Link to="/dashboard">
          <img src={logo} alt="logo" style={{ width: "160px" }} className="mx-auto" />
        </Link>
      </div>

      <ul className="nav flex-column mt-2">
        {filtered.map((item, index) => (
          <li key={index} className="nav-item my-1">
            <Link
              to={item.path}
              className={`${isActiveLink(item.path) ? "custom-bg" : ""} nav-link d-flex align-items-center text-white`}
            >
              <item.icon className="me-2" />
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebars;
