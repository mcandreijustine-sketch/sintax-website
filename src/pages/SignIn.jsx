import "../css/SignIn.css";
import logo from "../pics/logo.png";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FaEye, FaEyeSlash } from "react-icons/fa";

import { auth, db } from "../firebase";

import {
    createUserWithEmailAndPassword,
    signOut
} from "firebase/auth";

import {
    doc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";

function SignIn() {
    const navigate = useNavigate();

    const [studentNumber, setStudentNumber] = useState("");
    const [section, setSection] = useState("");
    const [yearLevel, setYearLevel] = useState("");
    const [gender, setGender] = useState("");
    const [otherGender, setOtherGender] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState("");
    const [showReminder, setShowReminder] = useState(true);
    const [registering, setRegistering] = useState(false);

    const passwordRules = {
        length:
            password.length >= 6 &&
            password.length <= 20,

        uppercase:
            /[A-Z]/.test(password),

        lowercase:
            /[a-z]/.test(password),

        special:
            /[!@#$%^&*(),.?":{}|<>]/.test(password),

        number:
            /[0-9]/.test(password)
    };

    const handleYearLevel = value => {
        if (value === "1") {
            setYearLevel("1st Year");
        } else if (value === "2") {
            setYearLevel("2nd Year");
        } else {
            setYearLevel("");
        }
    };

    const registerUser = async event => {
        event.preventDefault();

        if (
            yearLevel !== "1st Year" &&
            yearLevel !== "2nd Year"
        ) {
            alert(
                "Only 1st Year and 2nd Year students can register."
            );

            return;
        }

        if (
            !passwordRules.length ||
            !passwordRules.uppercase ||
            !passwordRules.lowercase ||
            !passwordRules.special ||
            !passwordRules.number
        ) {
            alert(
                "Please meet all password requirements."
            );

            return;
        }

        setRegistering(true);

        try {
            const normalizedEmail =
                email.trim().toLowerCase();

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    normalizedEmail,
                    password
                );

            const user = userCredential.user;

            await setDoc(
                doc(
                    db,
                    "users",
                    user.uid
                ),
                {
                    fullName:
                        fullName.trim(),

                    studentNumber:
                        studentNumber.trim(),

                    section:
                        section.trim(),

                    yearLevel,

                    gender:
                        gender === "Other"
                            ? otherGender.trim()
                            : gender,

                    email:
                        normalizedEmail,

                    role:
                        "student",

                    status:
                        "active",

                    createdAt:
                        serverTimestamp()
                }
            );

            await signOut(auth);

            alert(
                "Registration successful! You can now log in."
            );

            navigate(
                "/login",
                {
                    replace: true
                }
            );
        } catch (error) {
            if (
                error.code ===
                "auth/email-already-in-use"
            ) {
                alert(
                    "This email is already registered."
                );
            } else if (
                error.code ===
                "auth/invalid-email"
            ) {
                alert(
                    "Please enter a valid email address."
                );
            } else if (
                error.code ===
                "auth/weak-password"
            ) {
                alert(
                    "The password is too weak."
                );
            } else if (
                error.code ===
                "auth/network-request-failed"
            ) {
                alert(
                    "Network error. Please check your internet connection."
                );
            } else {
                alert(error.message);
            }
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="signin-container">

            {showReminder && (
                <div className="reminder-overlay">

                    <div
                        className="reminder-popup"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reminder-title"
                    >

                        <div className="reminder-icon">
                            !
                        </div>

                        <h2 id="reminder-title">
                            Student Reminder
                        </h2>

                        <p>
                            This website is only for
                            creating and registering your
                            SINTAX account.
                        </p>

                        <p>
                            After registration, please open
                            the SINTAX game to log in and
                            play using your registered
                            account.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setShowReminder(false)
                            }
                        >
                            I Understand
                        </button>

                    </div>

                </div>
            )}

            <Link
                to="/"
                className="back-button"
            >
                ←
            </Link>

            <div className="signin-box">

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

                <h2>
                    Registration
                </h2>

                <form onSubmit={registerUser}>

                    <div className="form-grid">

                        <input
                            type="text"
                            placeholder="Student Number"
                            value={studentNumber}
                            maxLength="15"
                            onChange={event =>
                                setStudentNumber(
                                    event.target.value.replace(
                                        /\D/g,
                                        ""
                                    )
                                )
                            }
                            required
                        />

                        <input
                            type="text"
                            placeholder="Section"
                            value={section}
                            maxLength="10"
                            onChange={event =>
                                setSection(
                                    event.target.value
                                )
                            }
                            required
                        />

                        <input
                            type="text"
                            placeholder="Year Level (1-2)"
                            maxLength="1"
                            value={
                                yearLevel === "1st Year"
                                    ? "1"
                                    : yearLevel ===
                                        "2nd Year"
                                      ? "2"
                                      : ""
                            }
                            onChange={event =>
                                handleYearLevel(
                                    event.target.value.replace(
                                        /[^1-2]/g,
                                        ""
                                    )
                                )
                            }
                            required
                        />

                        <select
                            value={gender}
                            onChange={event =>
                                setGender(
                                    event.target.value
                                )
                            }
                            required
                        >
                            <option value="">
                                Select Gender
                            </option>

                            <option value="Male">
                                Male
                            </option>

                            <option value="Female">
                                Female
                            </option>

                            <option value="Other">
                                Other
                            </option>
                        </select>

                        {gender === "Other" && (
                            <input
                                type="text"
                                placeholder="Enter Gender"
                                maxLength="20"
                                value={otherGender}
                                onChange={event =>
                                    setOtherGender(
                                        event.target.value
                                    )
                                }
                                required
                            />
                        )}

                        <input
                            className="full-width"
                            type="email"
                            placeholder="Student Email"
                            value={email}
                            onChange={event =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            autoComplete="email"
                            required
                        />

                        <input
                            className="full-width"
                            type="text"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={event =>
                                setFullName(
                                    event.target.value
                                )
                            }
                            autoComplete="name"
                            required
                        />

                        <div className="password-container full-width">

                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Password"
                                minLength="6"
                                maxLength="20"
                                value={password}
                                onChange={event =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="button"
                                className="show-button"
                                onClick={() =>
                                    setShowPassword(
                                        current =>
                                            !current
                                    )
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword
                                    ? <FaEyeSlash />
                                    : <FaEye />}
                            </button>

                            <div className="password-popup">

                                <p
                                    className={
                                        passwordRules.length
                                            ? "valid"
                                            : ""
                                    }
                                >
                                    {passwordRules.length
                                        ? "✔"
                                        : "○"}{" "}
                                    Require 6-20 characters
                                </p>

                                <p
                                    className={
                                        passwordRules.uppercase
                                            ? "valid"
                                            : ""
                                    }
                                >
                                    {passwordRules.uppercase
                                        ? "✔"
                                        : "○"}{" "}
                                    Require uppercase character
                                </p>

                                <p
                                    className={
                                        passwordRules.lowercase
                                            ? "valid"
                                            : ""
                                    }
                                >
                                    {passwordRules.lowercase
                                        ? "✔"
                                        : "○"}{" "}
                                    Require lowercase character
                                </p>

                                <p
                                    className={
                                        passwordRules.special
                                            ? "valid"
                                            : ""
                                    }
                                >
                                    {passwordRules.special
                                        ? "✔"
                                        : "○"}{" "}
                                    Require special character
                                </p>

                                <p
                                    className={
                                        passwordRules.number
                                            ? "valid"
                                            : ""
                                    }
                                >
                                    {passwordRules.number
                                        ? "✔"
                                        : "○"}{" "}
                                    Require numeric character
                                </p>

                            </div>

                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={registering}
                    >
                        {registering
                            ? "Registering..."
                            : "Register"}
                    </button>

                </form>

                <p className="register-text">
                    Already have an account?{" "}

                    <Link to="/login">
                        Login
                    </Link>
                </p>

            </div>

        </div>
    );
}

export default SignIn;