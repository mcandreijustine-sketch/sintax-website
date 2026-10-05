import "../css/InstructorBar.css";
import logo from "../pics/logo.png";
import { Link } from "react-router-dom";

function InstructorBar() {
    return (
        <nav className="instructor-navbar">
            <div className="instructor-brand">
                <img
                    src={logo}
                    alt="SINTAX Logo"
                    className="instructor-logo"
                />

                <h1 className="instructor-logo-text">
                    SINTAX
                </h1>
            </div>

            <div className="instructor-links">
                <Link to="/instructor/dashboard">
                     Dashboard
                </Link>

                <Link to="/instructor/students">
                     Students
                </Link>

                <Link to="/instructor/settings">
                     Settings
                </Link>

                <Link
                    to="/login"
                    className="instructor-logout-button"
                >
                     Logout
                </Link>
            </div>
        </nav>
    );
}

export default InstructorBar;