
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ApiURL } from "../api";

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ delete states
  const [deletingId, setDeletingId] = useState(null);

  // ✅ current logged in email
  const currentUserEmail = useMemo(() => {
    try {
      return (sessionStorage.getItem("currentUserEmail") || "").toLowerCase().trim();
    } catch (e) {
      return "";
    }
  }, []);

  const ROOT_SUPER_ADMIN_EMAIL = "admin@gmail.com"; // ✅ cannot delete

  // ✅ keep ONLY these permissions
  const defaultPermissions = useMemo(
    () => ({
      master: false,
      banner: false,
      clients: false,
      damagedAndLost: false,
      dashboard: false,
      enquiryCalendar: false,
      enquiryList: false,
      inventoryProductList: false,
      orders: false,
      paymentReport: false,
      productManagement: false,
      quotation: false,
      refurbishmentReport: false,
      reports: false,
      termsAndConditions: false,
      settings: false,
    }),
    []
  );

  const makeAllPermissionsTrue = (base) => {
    try {
      const allTrue = {};
      Object.keys(base).forEach((k) => (allTrue[k] = true));
      return allTrue;
    } catch (err) {
      console.error("makeAllPermissionsTrue error:", err);
      return { ...base };
    }
  };

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    permissions: { ...defaultPermissions },
  });

  // ================= FETCH ADMINS =================
  const fetchAdmins = async () => {
    try {
      setLoadingList(true);
      const token = sessionStorage.getItem("token");

      const res = await axios.get(`${ApiURL}/admins-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAdmins(res.data.admins || []);
    } catch (error) {
      console.error(error.response?.data || error.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // ================= FORM HANDLERS =================
  const handleChange = (e) => {
    try {
      const { name, value } = e.target;

      if (name === "role") {
        if (value === "superAdmin") {
          setFormData((prev) => ({
            ...prev,
            role: value,
            permissions: makeAllPermissionsTrue(prev.permissions),
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            role: value,
          }));
        }
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: value }));
    } catch (err) {
      console.error("handleChange error:", err);
    }
  };

  const handlePermissionChange = (e) => {
    try {
      const { name, checked } = e.target;

      if (formData.role === "superAdmin") return;

      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [name]: checked,
        },
      }));
    } catch (err) {
      console.error("handlePermissionChange error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const token = sessionStorage.getItem("token");

      const cleanedPermissions = {
        ...formData.permissions,
        settings: Boolean(formData.permissions.settings),
      };

      const payload =
        formData.role === "superAdmin"
          ? { ...formData, permissions: makeAllPermissionsTrue(cleanedPermissions) }
          : { ...formData, permissions: cleanedPermissions };

      await axios.post(`${ApiURL}/adminSignUp`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFormData({
        email: "",
        password: "",
        role: "admin",
        permissions: { ...defaultPermissions },
      });

      setShowForm(false);
      fetchAdmins();
    } catch (error) {
      alert(error.response?.data?.error || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ================= DELETE ADMIN =================
  const canShowDelete = (admin) => {
    try {
      const email = (admin?.email || "").toLowerCase().trim();

      // 1) hide delete for root super admin
      if (email === ROOT_SUPER_ADMIN_EMAIL) return false;

      // 2) hide delete for currently logged in user
      if (currentUserEmail && email === currentUserEmail) return false;

      return true;
    } catch (e) {
      return false;
    }
  };

  const handleDeleteAdmin = async (admin) => {
    try {
      if (!admin?._id) return;

      const email = (admin?.email || "").toLowerCase().trim();

      // Safety checks even if UI hides it
      if (email === ROOT_SUPER_ADMIN_EMAIL) {
        alert("This Super Admin cannot be deleted.");
        return;
      }
      if (currentUserEmail && email === currentUserEmail) {
        alert("You cannot delete your own account.");
        return;
      }

      const ok = window.confirm(`Delete admin "${admin.email}"?`);
      if (!ok) return;

      setDeletingId(admin._id);

      // ✅ no token required (as per your requirement)
      await axios.delete(`${ApiURL}/admins/${admin._id}`);

      await fetchAdmins();
    } catch (err) {
      console.error("handleDeleteAdmin error:", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Failed to delete admin");
    } finally {
      setDeletingId(null);
    }
  };

  const roleBadgeClass = (role) => {
    try {
      if (role === "superAdmin") return "bg-danger";
      if (role === "warehouse") return "bg-warning text-dark";
      return "bg-primary";
    } catch (err) {
      console.error("roleBadgeClass error:", err);
      return "bg-secondary";
    }
  };

  const permLabel = (k) => {
    const map = {
      master: "Master",
      banner: "Banner",
      clients: "Clients",
      damagedAndLost: "Damaged/Lost",
      dashboard: "Dashboard",
      enquiryCalendar: "Enquiry Calendar",
      enquiryList: "Enquiry List",
      inventoryProductList: "Inventory Product List",
      orders: "Orders",
      paymentReport: "Payment Report",
      productManagement: "Product Management",
      quotation: "Quotation",
      refurbishmentReport: "Refurbishment Report",
      reports: "Reports",
      termsAndConditions: "Terms & Conditions",
      settings: "Settings",
    };
    return map[k] || k;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold">Admin Management</h4>
        <button className="btn btn-dark" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Back to List" : "Create Admin"}
        </button>
      </div>

      {showForm ? (
        <div className="card shadow p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Role</label>
              <select className="form-select" name="role" value={formData.role} onChange={handleChange}>
                <option value="admin">Admin</option>
                <option value="warehouse">Warehouse</option>
                <option value="superAdmin">Super Admin</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="fw-bold mb-2">Permissions</label>

              {formData.role === "superAdmin" && (
                <div className="alert alert-info py-2">
                  Super Admin has all permissions enabled automatically.
                </div>
              )}

              <div className="row">
                {Object.keys(defaultPermissions).map((perm) => (
                  <div className="col-md-4 mb-2" key={perm}>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        name={perm}
                        checked={Boolean(formData.permissions[perm])}
                        onChange={handlePermissionChange}
                        disabled={formData.role === "superAdmin"}
                      />
                      <label className="form-check-label">{permLabel(perm)}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? "Saving..." : "Save Admin"}
            </button>
          </form>
        </div>
      ) : (
        <div className="card shadow">
          <div className="table-responsive">
            <table className="table table-bordered table-striped mb-0">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th style={{ width: 140 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : admins.length > 0 ? (
                  admins.map((admin, index) => {
                    const showDelete = canShowDelete(admin);

                    return (
                      <tr key={admin._id}>
                        <td>{index + 1}</td>
                        <td>{admin.email}</td>
                        <td>
                          <span className={`badge ${roleBadgeClass(admin.role)}`}>{admin.role}</span>
                        </td>
                        <td>
                          {showDelete ? (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteAdmin(admin)}
                              disabled={deletingId === admin._id}
                            >
                              {deletingId === admin._id ? "Deleting..." : "Delete"}
                            </button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      No Admins Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
