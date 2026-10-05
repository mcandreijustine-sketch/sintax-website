import { useState } from "react";
import { Link } from "react-router-dom";
import "../css/Navbar.css";
import logo from "../pics/logo.png";

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    const closeMenu = () => {
        setMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <Link to="/" className="brand" onClick={closeMenu}>
                <img
                    src={logo}
                    alt="SINTAX Logo"
                    className="nav-logo"
                />

                <h1 className="landing-logo-text">
                    SINTAX
                </h1>
            </Link>

            <button
                type="button"
                className="menu-button"
                onClick={() => setMenuOpen(current => !current)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
            >
                {menuOpen ? "×" : "☰"}
            </button>

            <div className={`nav-links ${menuOpen ? "mobile-open" : ""}`}>
                <Link to="/" onClick={closeMenu}>
                    Home
                </Link>

                <Link to="/about" onClick={closeMenu}>
                    About
                </Link>

                <Link to="/story" onClick={closeMenu}>
                    Story
                </Link>

                <Link to="/features" onClick={closeMenu}>
                    Features
                </Link>

                <Link to="/download" onClick={closeMenu}>
                    Download
                </Link>

                <Link
                    to="/login"
                    className="login-button"
                    onClick={closeMenu}
                >
                    Login
                </Link>
            </div>
        </nav>
    );
}

export default Navbar;