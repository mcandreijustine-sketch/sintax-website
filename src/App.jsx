import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import About from "./pages/About";
import Story from "./pages/Story";
import Features from "./pages/Features";
import Login from "./pages/Login";
import Download from "./pages/Download";

import AdminDashboard from "./pages/AdminDashboard";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorStudents from "./pages/InstructorStudents";
import InstructorSettings from "./pages/InstructorSettings";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Landing />}
                />

                <Route
                    path="/about"
                    element={<About />}
                />

                <Route
                    path="/story"
                    element={<Story />}
                />

                <Route
                    path="/features"
                    element={<Features />}
                />

                <Route
                    path="/download"
                    element={<Download />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Navigate to="/login" replace />}
                />

                <Route
                    path="/admin"
                    element={
                        <Navigate
                            to="/admin/dashboard"
                            replace
                        />
                    }
                />

                <Route
                    path="/admin/dashboard"
                    element={<AdminDashboard />}
                />

                <Route
                    path="/admin/users"
                    element={<Users />}
                />

                <Route
                    path="/admin/reports"
                    element={<Reports />}
                />

                <Route
                    path="/admin/settings"
                    element={<Settings />}
                />

                <Route
                    path="/instructor"
                    element={
                        <Navigate
                            to="/instructor/dashboard"
                            replace
                        />
                    }
                />

                <Route
                    path="/instructor/dashboard"
                    element={<InstructorDashboard />}
                />

                <Route
                    path="/instructor/students"
                    element={<InstructorStudents />}
                />

                <Route
                    path="/instructor/settings"
                    element={<InstructorSettings />}
                />

                <Route
                    path="*"
                    element={
                        <div
                            style={{
                                minHeight: "100vh",
                                background: "#0f172a",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                color: "white",
                                textAlign: "center",
                                padding: "20px"
                            }}
                        >
                            <h1>
                                404 - Page Not Found
                            </h1>
                        </div>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;