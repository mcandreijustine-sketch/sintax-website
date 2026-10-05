import "../css/instructorSettings.css";
import InstructorBar from "../components/InstructorBar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    signOut,
    updatePassword
} from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";

function InstructorSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingPreferences, setSavingPreferences] = useState(false);
    const [savingDisplay, setSavingDisplay] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [profile, setProfile] = useState({
        fullName: "",
        email: "",
        department: ""
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [preferences, setPreferences] = useState({
        showStudentRankings: true,
        showInactiveStudents: true,
        progressNotifications: false
    });

    const [displaySettings, setDisplaySettings] = useState({
        studentsPerPage: "10",
        defaultSection: "all"
    });

    const [sections, setSections] = useState([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(
            auth,
            async currentUser => {
                if (!currentUser) {
                    navigate("/instructor-login");
                    return;
                }

                try {
                    const instructorReference = doc(
                        db,
                        "users",
                        currentUser.uid
                    );

                    const instructorSnapshot = await getDoc(
                        instructorReference
                    );

                    if (
                        !instructorSnapshot.exists() ||
                        instructorSnapshot.data().role !== "instructor"
                    ) {
                        await signOut(auth);
                        navigate("/instructor-login");
                        return;
                    }

                    const data = instructorSnapshot.data();
                    const savedPreferences = data.preferences || {};
                    const savedDisplaySettings =
                        data.displaySettings || {};

                    setProfile({
                        fullName: data.fullName || "",
                        email: currentUser.email || data.email || "",
                        department:
                            data.department ||
                            data.section ||
                            ""
                    });

                    setPreferences({
                        showStudentRankings:
                            savedPreferences.showStudentRankings ?? true,
                        showInactiveStudents:
                            savedPreferences.showInactiveStudents ?? true,
                        progressNotifications:
                            savedPreferences.progressNotifications ?? false
                    });

                    setDisplaySettings({
                        studentsPerPage: String(
                            savedDisplaySettings.studentsPerPage || "10"
                        ),
                        defaultSection:
                            savedDisplaySettings.defaultSection || "all"
                    });

                    const instructorSections =
                        data.assignedSections ||
                        data.sections ||
                        [];

                    if (Array.isArray(instructorSections)) {
                        setSections(
                            instructorSections.filter(Boolean)
                        );
                    } else if (data.section) {
                        setSections([data.section]);
                    }

                    setLoading(false);
                } catch (loadError) {
                    setError(loadError.message);
                    setLoading(false);
                }
            }
        );

        return () => unsubscribeAuth();
    }, [navigate]);

    const clearMessages = () => {
        setMessage("");
        setError("");
    };

    const saveProfile = async event => {
        event.preventDefault();
        clearMessages();

        if (!auth.currentUser) {
            setError("You are not currently signed in.");
            return;
        }

        if (!profile.fullName.trim()) {
            setError("Full name is required.");
            return;
        }

        setSavingProfile(true);

        try {
            await setDoc(
                doc(db, "users", auth.currentUser.uid),
                {
                    fullName: profile.fullName.trim(),
                    email: auth.currentUser.email || profile.email,
                    department: profile.department.trim(),
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );

            setProfile(currentProfile => ({
                ...currentProfile,
                email:
                    auth.currentUser?.email ||
                    currentProfile.email
            }));

            setMessage("Profile information saved successfully.");
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const changePassword = async event => {
        event.preventDefault();
        clearMessages();

        const currentUser = auth.currentUser;

        if (!currentUser || !currentUser.email) {
            setError("You are not currently signed in.");
            return;
        }

        if (!passwordForm.currentPassword) {
            setError("Enter your current password.");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setError(
                "The new password must contain at least 6 characters."
            );
            return;
        }

        if (
            passwordForm.newPassword !==
            passwordForm.confirmPassword
        ) {
            setError("The new passwords do not match.");
            return;
        }

        if (
            passwordForm.currentPassword ===
            passwordForm.newPassword
        ) {
            setError(
                "The new password must be different from the current password."
            );
            return;
        }

        setSavingPassword(true);

        try {
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                passwordForm.currentPassword
            );

            await reauthenticateWithCredential(
                currentUser,
                credential
            );

            await updatePassword(
                currentUser,
                passwordForm.newPassword
            );

            await setDoc(
                doc(db, "users", currentUser.uid),
                {
                    passwordUpdatedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });

            setMessage("Password updated successfully.");
        } catch (passwordError) {
            if (
                passwordError.code ===
                "auth/invalid-credential"
            ) {
                setError("The current password is incorrect.");
            } else if (
                passwordError.code ===
                "auth/wrong-password"
            ) {
                setError("The current password is incorrect.");
            } else if (
                passwordError.code ===
                "auth/weak-password"
            ) {
                setError("The new password is too weak.");
            } else if (
                passwordError.code ===
                "auth/too-many-requests"
            ) {
                setError(
                    "Too many attempts. Please try again later."
                );
            } else {
                setError(
                    passwordError.message ||
                    "Unable to update the password."
                );
            }
        } finally {
            setSavingPassword(false);
        }
    };

    const savePreferences = async () => {
        clearMessages();

        if (!auth.currentUser) {
            setError("You are not currently signed in.");
            return;
        }

        setSavingPreferences(true);

        try {
            await setDoc(
                doc(db, "users", auth.currentUser.uid),
                {
                    preferences,
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );

            setMessage(
                "Dashboard preferences saved successfully."
            );
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSavingPreferences(false);
        }
    };

    const saveDisplaySettings = async () => {
        clearMessages();

        if (!auth.currentUser) {
            setError("You are not currently signed in.");
            return;
        }

        setSavingDisplay(true);

        try {
            await setDoc(
                doc(db, "users", auth.currentUser.uid),
                {
                    displaySettings: {
                        studentsPerPage: Number(
                            displaySettings.studentsPerPage
                        ),
                        defaultSection:
                            displaySettings.defaultSection
                    },
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );

            setMessage(
                "Display settings saved successfully."
            );
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSavingDisplay(false);
        }
    };

    if (loading) {
        return (
            <div className="instructor-settings-loading">
                Loading settings...
            </div>
        );
    }

    return (
        <div className="instructor-settings-page">
            <InstructorBar />

            <main className="instructor-settings-content">
                <header className="instructor-settings-header">
                    <h1>Instructor Settings</h1>

                    <p>
                        Manage your profile, account and dashboard preferences.
                    </p>
                </header>

                {message && (
                    <div className="instructor-settings-message">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="instructor-settings-error">
                        {error}
                    </div>
                )}

                <div className="instructor-settings-grid">
                    <form
                        className="instructor-settings-card"
                        onSubmit={saveProfile}
                    >
                        <h2>Profile Information</h2>

                        <label htmlFor="instructor-name">
                            Full Name
                        </label>

                        <input
                            id="instructor-name"
                            type="text"
                            value={profile.fullName}
                            onChange={event =>
                                setProfile({
                                    ...profile,
                                    fullName: event.target.value
                                })
                            }
                            required
                        />

                        <label htmlFor="instructor-email">
                            Email Address
                        </label>

                        <input
                            id="instructor-email"
                            type="email"
                            value={profile.email}
                            readOnly
                        />

                        <small className="instructor-settings-note">
                            Your sign-in email cannot be changed from this page.
                        </small>

                        <label htmlFor="instructor-department">
                            Department
                        </label>

                        <input
                            id="instructor-department"
                            type="text"
                            value={profile.department}
                            onChange={event =>
                                setProfile({
                                    ...profile,
                                    department:
                                        event.target.value
                                })
                            }
                        />

                        <button
                            type="submit"
                            className="instructor-save-btn"
                            disabled={savingProfile}
                        >
                            {savingProfile
                                ? "Saving..."
                                : "Save Profile"}
                        </button>
                    </form>

                    <form
                        className="instructor-settings-card"
                        onSubmit={changePassword}
                    >
                        <h2>Change Password</h2>

                        <label htmlFor="current-password">
                            Current Password
                        </label>

                        <input
                            id="current-password"
                            type="password"
                            placeholder="Enter current password"
                            value={
                                passwordForm.currentPassword
                            }
                            onChange={event =>
                                setPasswordForm({
                                    ...passwordForm,
                                    currentPassword:
                                        event.target.value
                                })
                            }
                            autoComplete="current-password"
                            required
                        />

                        <label htmlFor="new-password">
                            New Password
                        </label>

                        <input
                            id="new-password"
                            type="password"
                            placeholder="Enter new password"
                            value={passwordForm.newPassword}
                            onChange={event =>
                                setPasswordForm({
                                    ...passwordForm,
                                    newPassword:
                                        event.target.value
                                })
                            }
                            minLength="6"
                            autoComplete="new-password"
                            required
                        />

                        <label htmlFor="confirm-password">
                            Confirm Password
                        </label>

                        <input
                            id="confirm-password"
                            type="password"
                            placeholder="Confirm new password"
                            value={
                                passwordForm.confirmPassword
                            }
                            onChange={event =>
                                setPasswordForm({
                                    ...passwordForm,
                                    confirmPassword:
                                        event.target.value
                                })
                            }
                            minLength="6"
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="submit"
                            className="instructor-save-btn"
                            disabled={savingPassword}
                        >
                            {savingPassword
                                ? "Updating..."
                                : "Update Password"}
                        </button>
                    </form>

                    <section className="instructor-settings-card">
                        <h2>Dashboard Preferences</h2>

                        <div className="instructor-setting-option">
                            <div>
                                <strong>
                                    Show Student Rankings
                                </strong>

                                <span>
                                    Display rankings on the dashboard.
                                </span>
                            </div>

                            <input
                                type="checkbox"
                                checked={
                                    preferences.showStudentRankings
                                }
                                onChange={event =>
                                    setPreferences({
                                        ...preferences,
                                        showStudentRankings:
                                            event.target.checked
                                    })
                                }
                            />
                        </div>

                        <div className="instructor-setting-option">
                            <div>
                                <strong>
                                    Show Inactive Students
                                </strong>

                                <span>
                                    Include inactive students in reports.
                                </span>
                            </div>

                            <input
                                type="checkbox"
                                checked={
                                    preferences.showInactiveStudents
                                }
                                onChange={event =>
                                    setPreferences({
                                        ...preferences,
                                        showInactiveStudents:
                                            event.target.checked
                                    })
                                }
                            />
                        </div>

                        <div className="instructor-setting-option">
                            <div>
                                <strong>
                                    Progress Notifications
                                </strong>

                                <span>
                                    Receive updates about student progress.
                                </span>
                            </div>

                            <input
                                type="checkbox"
                                checked={
                                    preferences.progressNotifications
                                }
                                onChange={event =>
                                    setPreferences({
                                        ...preferences,
                                        progressNotifications:
                                            event.target.checked
                                    })
                                }
                            />
                        </div>

                        <button
                            type="button"
                            className="instructor-save-btn"
                            onClick={savePreferences}
                            disabled={savingPreferences}
                        >
                            {savingPreferences
                                ? "Saving..."
                                : "Save Preferences"}
                        </button>
                    </section>

                    <section className="instructor-settings-card">
                        <h2>Display Settings</h2>

                        <label htmlFor="items-per-page">
                            Students Per Page
                        </label>

                        <select
                            id="items-per-page"
                            value={
                                displaySettings.studentsPerPage
                            }
                            onChange={event =>
                                setDisplaySettings({
                                    ...displaySettings,
                                    studentsPerPage:
                                        event.target.value
                                })
                            }
                        >
                            <option value="10">
                                10 students
                            </option>

                            <option value="20">
                                20 students
                            </option>

                            <option value="50">
                                50 students
                            </option>
                        </select>

                        <label htmlFor="default-section">
                            Default Section
                        </label>

                        <select
                            id="default-section"
                            value={
                                displaySettings.defaultSection
                            }
                            onChange={event =>
                                setDisplaySettings({
                                    ...displaySettings,
                                    defaultSection:
                                        event.target.value
                                })
                            }
                        >
                            <option value="all">
                                All Sections
                            </option>

                            {sections.map(section => (
                                <option
                                    key={section}
                                    value={section}
                                >
                                    {section}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="instructor-save-btn"
                            onClick={saveDisplaySettings}
                            disabled={savingDisplay}
                        >
                            {savingDisplay
                                ? "Saving..."
                                : "Save Display Settings"}
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default InstructorSettings;