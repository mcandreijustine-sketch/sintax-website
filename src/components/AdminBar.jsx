import "../css/AdminBar.css";
import logo from "../pics/logo.png";
import { Link } from "react-router-dom";

function AdminBar() {
  return (
    <nav className="admin-navbar">

      <div className="admin-brand">

        <img
          src={logo}
          alt="SINTAX Logo"
          className="admin-logo"
        />

        <h1 className="admin-logo-text">
          SINTAX
        </h1>

      </div>

      <div className="admin-links">

        <Link to="/admin/dashboard">
          Dashboard
        </Link>

        <Link to="/admin/users">
          Users
        </Link>

        <Link to="/admin/reports">
          Reports
        </Link>

        <Link to="/admin/settings">
          Settings
        </Link>

        <Link
          to="/login"
          className="logout-button"
        >
           Logout
        </Link>

      </div>

    </nav>
  );
}

export default AdminBar;