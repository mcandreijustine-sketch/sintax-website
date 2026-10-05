import "../css/login.css";
import logo from "../pics/logo.png";

import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { auth, db } from "../firebase";

import {
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc
} from "firebase/firestore";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const loginUser = async (e) => {

    e.preventDefault();

    try {

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {

        alert("User record not found.");

        await signOut(auth);

        return;

      }

      const userData = userSnap.data();

      console.log("User Data:", userData);

      if (userData.role === "admin") {

        alert("Welcome Admin!");

        window.location.href = "/admin/dashboard";

      }

      else if (userData.role === "instructor") {

        alert("Welcome Instructor!");

        window.location.href = "/instructor/dashboard";

      }

      else {

        alert("Access Denied! Only Admins and Instructors can log in.");

        await signOut(auth);

      }

    } catch (error) {

      alert(error.message);

    }

  };

  return (
    <div className="signin-container">
        <Link to="/" className="back-button">
            ←
        </Link>

        <div className="login-layout">
            <div className="login-reminder">
                <div className="reminder-symbol">!</div>
                <h2>Website Login Reminder</h2>
                <p>
                    Only administrators and instructors are allowed to log in to this website.
                </p>
                <p>
                    Students must register their account here, then use the SINTAX game to log in and play.
                </p>
            </div>

            <div className="signin-box login-box">
                <div className="logo-container">
                    <img
                        src={logo}
                        alt="Sintax Logo"
                        className="logo"
                    />

                    <h1 className="logo-text">
                        SINTAX
                    </h1>
                </div>

                <h2>Login</h2>

                <form onSubmit={loginUser}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <div className="password-container">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <button
                            type="button"
                            className="show-button"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    <button type="submit">
                        Login
                    </button>
                </form>

                <p className="register-text">
                    Don't have an account?{" "}
                    <Link to="/register">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    </div>
);

}

export default Login;