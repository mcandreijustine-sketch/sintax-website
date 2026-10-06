import "../css/settings.css";
import AdminBar from "../components/AdminBar";

import { useEffect, useState } from "react";

import { auth, db } from "../firebase";

import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "firebase/auth";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    Timestamp
} from "firebase/firestore";

function Settings() {
    const [systemName, setSystemName] = useState("SINTAX: Secret Code");
    const [version, setVersion] = useState("Version 1.0");

    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [allowStudentRegistration, setAllowStudentRegistration] =
        useState(true);

    const [enableInstructorAccounts, setEnableInstructorAccounts] =
        useState(true);

    const [loading, setLoading] = useState(true);
    const [savingSystem, setSavingSystem] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [savingSecurity, setSavingSecurity] = useState(false);

    const [backingUp, setBackingUp] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settingsSnapshot = await getDoc(
                    doc(db, "settings", "system")
                );

                if (settingsSnapshot.exists()) {
                    const settings = settingsSnapshot.data();

                    setSystemName(
                        settings.systemName || "SINTAX: Secret Code"
                    );

                    setVersion(
                        settings.version || "Version 1.0"
                    );

                    setAllowStudentRegistration(
                        settings.allowStudentRegistration ?? true
                    );

                    setEnableInstructorAccounts(
                        settings.enableInstructorAccounts ?? true
                    );
                }

                const currentUser = auth.currentUser;

                if (currentUser) {
                    setAdminEmail(
                        currentUser.email || ""
                    );

                    const adminSnapshot = await getDoc(
                        doc(
                            db,
                            "users",
                            currentUser.uid
                        )
                    );

                    if (adminSnapshot.exists()) {
                        const adminData =
                            adminSnapshot.data();

                        setAdminFullName(
                            adminData.fullName ||
                            adminData.fullname ||
                            adminData.name ||
                            ""
                        );

                        setAdminEmail(
                            adminData.email ||
                            currentUser.email ||
                            ""
                        );
                    }
                }
            } catch (loadError) {
                console.error(
                    "Settings loading error:",
                    loadError
                );

                setError(
                    loadError.message
                );
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const showMessage = text => {
        setMessage(text);
        setError("");

        window.setTimeout(() => {
            setMessage("");
        }, 4000);
    };

    const showError = text => {
        setError(text);
        setMessage("");
    };

    const saveSystemSettings = async event => {
        event.preventDefault();

        setSavingSystem(true);

        try {
            await setDoc(
                doc(
                    db,
                    "settings",
                    "system"
                ),
                {
                    systemName:
                        systemName.trim(),

                    version,

                    updatedAt:
                        serverTimestamp(),

                    updatedBy:
                        auth.currentUser?.uid ||
                        ""
                },
                {
                    merge: true
                }
            );

            showMessage(
                "System information saved successfully."
            );
        } catch (saveError) {
            console.error(
                "System settings error:",
                saveError
            );

            showError(
                saveError.message
            );
        } finally {
            setSavingSystem(false);
        }
    };

    const saveProfileInformation = async event => {
        event.preventDefault();

        const currentUser =
            auth.currentUser;

        if (!currentUser) {
            showError(
                "No administrator is currently logged in."
            );

            return;
        }

        const fullName =
            adminFullName.trim();

        if (!fullName) {
            showError(
                "Please enter your full name."
            );

            return;
        }

        setSavingProfile(true);

        try {
            await setDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                ),
                {
                    fullName,

                    email:
                        currentUser.email ||
                        adminEmail,

                    updatedAt:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );

            setAdminFullName(
                fullName
            );

            showMessage(
                "Profile information updated successfully."
            );
        } catch (profileError) {
            console.error(
                "Profile update error:",
                profileError
            );

            showError(
                profileError.message
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const changeAdministratorPassword = async event => {
        event.preventDefault();

        const currentUser =
            auth.currentUser;

        if (
            !currentUser ||
            !currentUser.email
        ) {
            showError(
                "No administrator is currently logged in."
            );

            return;
        }

        if (!currentPassword) {
            showError(
                "Please enter your current password."
            );

            return;
        }

        if (!newPassword) {
            showError(
                "Please enter a new password."
            );

            return;
        }

        if (newPassword.length < 6) {
            showError(
                "The new password must contain at least 6 characters."
            );

            return;
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            showError(
                "New password and confirm password do not match."
            );

            return;
        }

        if (
            currentPassword ===
            newPassword
        ) {
            showError(
                "Your new password must be different from your current password."
            );

            return;
        }

        setChangingPassword(true);

        try {
            const credential =
                EmailAuthProvider.credential(
                    currentUser.email,
                    currentPassword
                );

            await reauthenticateWithCredential(
                currentUser,
                credential
            );

            await updatePassword(
                currentUser,
                newPassword
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            showMessage(
                "Password changed successfully."
            );
        } catch (passwordError) {
            console.error(
                "Password change error:",
                passwordError
            );

            if (
                passwordError.code ===
                    "auth/invalid-credential" ||
                passwordError.code ===
                    "auth/wrong-password"
            ) {
                showError(
                    "Your current password is incorrect."
                );
            } else if (
                passwordError.code ===
                "auth/weak-password"
            ) {
                showError(
                    "The new password is too weak."
                );
            } else if (
                passwordError.code ===
                "auth/requires-recent-login"
            ) {
                showError(
                    "Please log out and log in again before changing your password."
                );
            } else if (
                passwordError.code ===
                "auth/too-many-requests"
            ) {
                showError(
                    "Too many attempts. Please wait before trying again."
                );
            } else {
                showError(
                    passwordError.message
                );
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const saveSecuritySettings = async event => {
        event.preventDefault();

        setSavingSecurity(true);

        try {
            await setDoc(
                doc(
                    db,
                    "settings",
                    "system"
                ),
                {
                    allowStudentRegistration,

                    enableInstructorAccounts,

                    updatedAt:
                        serverTimestamp(),

                    updatedBy:
                        auth.currentUser?.uid ||
                        ""
                },
                {
                    merge: true
                }
            );

            showMessage(
                "Security settings saved successfully."
            );
        } catch (saveError) {
            console.error(
                "Security settings error:",
                saveError
            );

            showError(
                saveError.message
            );
        } finally {
            setSavingSecurity(false);
        }
    };

    const serializeValue = value => {
        if (value instanceof Timestamp) {
            return {
                __type: "timestamp",
                seconds: value.seconds,
                nanoseconds: value.nanoseconds
            };
        }

        if (Array.isArray(value)) {
            return value.map(
                item => serializeValue(item)
            );
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            const result = {};

            Object.entries(value).forEach(
                ([key, item]) => {
                    result[key] =
                        serializeValue(item);
                }
            );

            return result;
        }

        return value;
    };

    const deserializeValue = value => {
        if (Array.isArray(value)) {
            return value.map(
                item => deserializeValue(item)
            );
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            if (
                value.__type ===
                "timestamp"
            ) {
                return new Timestamp(
                    value.seconds,
                    value.nanoseconds
                );
            }

            const result = {};

            Object.entries(value).forEach(
                ([key, item]) => {
                    result[key] =
                        deserializeValue(item);
                }
            );

            return result;
        }

        return value;
    };

    const backupCollection = async collectionName => {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    collectionName
                )
            );

        const documents = {};

        snapshot.forEach(
            documentSnapshot => {
                documents[
                    documentSnapshot.id
                ] = serializeValue(
                    documentSnapshot.data()
                );
            }
        );

        return documents;
    };

    const backupInstructorData = async () => {
        const instructorsSnapshot =
            await getDocs(
                collection(
                    db,
                    "instructors"
                )
            );

        const instructors = {};

        for (
            const instructorDocument
            of instructorsSnapshot.docs
        ) {
            const instructorId =
                instructorDocument.id;

            const studentsSnapshot =
                await getDocs(
                    collection(
                        db,
                        "instructors",
                        instructorId,
                        "students"
                    )
                );

            const questionsSnapshot =
                await getDocs(
                    collection(
                        db,
                        "instructors",
                        instructorId,
                        "questions"
                    )
                );

            const students = {};
            const questions = {};

            studentsSnapshot.forEach(
                studentDocument => {
                    students[
                        studentDocument.id
                    ] = serializeValue(
                        studentDocument.data()
                    );
                }
            );

            questionsSnapshot.forEach(
                questionDocument => {
                    questions[
                        questionDocument.id
                    ] = serializeValue(
                        questionDocument.data()
                    );
                }
            );

            instructors[instructorId] = {
                data: serializeValue(
                    instructorDocument.data()
                ),
                students,
                questions
            };
        }

        return instructors;
    };

    const backupDatabase = async () => {
        const currentUser =
            auth.currentUser;

        if (!currentUser) {
            showError(
                "No administrator is currently logged in."
            );

            return;
        }

        setBackingUp(true);

        try {
            const users =
                await backupCollection(
                    "users"
                );

            const settings =
                await backupCollection(
                    "settings"
                );

            const instructors =
                await backupInstructorData();

            const backup = {
                backupType:
                    "SINTAX_FIRESTORE_DATABASE",

                backupVersion: 1,

                exportedAt:
                    new Date().toISOString(),

                exportedBy:
                    currentUser.uid,

                database: {
                    users,
                    settings,
                    instructors
                }
            };

            const file =
                new Blob(
                    [
                        JSON.stringify(
                            backup,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            "application/json"
                    }
                );

            const downloadUrl =
                URL.createObjectURL(
                    file
                );

            const downloadLink =
                document.createElement(
                    "a"
                );

            const date =
                new Date();

            const fileDate =
                `${date.getFullYear()}-` +
                `${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}-` +
                `${String(
                    date.getDate()
                ).padStart(2, "0")}`;

            downloadLink.href =
                downloadUrl;

            downloadLink.download =
                `sintax-database-backup-${fileDate}.json`;

            document.body.appendChild(
                downloadLink
            );

            downloadLink.click();

            document.body.removeChild(
                downloadLink
            );

            URL.revokeObjectURL(
                downloadUrl
            );

            showMessage(
                "Database backup downloaded successfully."
            );
        } catch (backupError) {
            console.error(
                "Database backup error:",
                backupError
            );

            showError(
                backupError.message ||
                "Unable to backup the database."
            );
        } finally {
            setBackingUp(false);
        }
    };

    const restoreDocuments = async (
        collectionName,
        documents
    ) => {
        if (
            !documents ||
            typeof documents !== "object"
        ) {
            return;
        }

        for (
            const [documentId, data]
            of Object.entries(documents)
        ) {
            await setDoc(
                doc(
                    db,
                    collectionName,
                    documentId
                ),
                deserializeValue(data),
                {
                    merge: false
                }
            );
        }
    };

    const restoreInstructorData = async instructors => {
        if (
            !instructors ||
            typeof instructors !== "object"
        ) {
            return;
        }

        for (
            const [instructorId, instructor]
            of Object.entries(instructors)
        ) {
            await setDoc(
                doc(
                    db,
                    "instructors",
                    instructorId
                ),
                deserializeValue(
                    instructor.data || {}
                ),
                {
                    merge: false
                }
            );

            if (instructor.students) {
                for (
                    const [studentId, studentData]
                    of Object.entries(
                        instructor.students
                    )
                ) {
                    await setDoc(
                        doc(
                            db,
                            "instructors",
                            instructorId,
                            "students",
                            studentId
                        ),
                        deserializeValue(
                            studentData
                        ),
                        {
                            merge: false
                        }
                    );
                }
            }

            if (instructor.questions) {
                for (
                    const [questionId, questionData]
                    of Object.entries(
                        instructor.questions
                    )
                ) {
                    await setDoc(
                        doc(
                            db,
                            "instructors",
                            instructorId,
                            "questions",
                            questionId
                        ),
                        deserializeValue(
                            questionData
                        ),
                        {
                            merge: false
                        }
                    );
                }
            }
        }
    };

    const restoreDatabase = event => {
        const selectedFile =
            event.target.files?.[0];

        if (!selectedFile) {
            return;
        }

        const currentUser =
            auth.currentUser;

        if (!currentUser) {
            showError(
                "No administrator is currently logged in."
            );

            event.target.value = "";
            return;
        }

        const confirmed =
            window.confirm(
                "Restore this database backup? Existing documents with the same IDs will be replaced with the backup data."
            );

        if (!confirmed) {
            event.target.value = "";
            return;
        }

        const reader =
            new FileReader();

        setRestoring(true);

        reader.onload =
            async loadEvent => {
                try {
                    const backup =
                        JSON.parse(
                            loadEvent.target.result
                        );

                    if (
                        backup.backupType !==
                        "SINTAX_FIRESTORE_DATABASE"
                    ) {
                        throw new Error(
                            "Invalid SINTAX database backup file."
                        );
                    }

                    if (
                        !backup.database ||
                        typeof backup.database !==
                            "object"
                    ) {
                        throw new Error(
                            "The backup file does not contain database data."
                        );
                    }

                    await restoreDocuments(
                        "users",
                        backup.database.users
                    );

                    await restoreDocuments(
                        "settings",
                        backup.database.settings
                    );

                    await restoreInstructorData(
                        backup.database.instructors
                    );

                    const settingsSnapshot =
                        await getDoc(
                            doc(
                                db,
                                "settings",
                                "system"
                            )
                        );

                    if (
                        settingsSnapshot.exists()
                    ) {
                        const settings =
                            settingsSnapshot.data();

                        setSystemName(
                            settings.systemName ||
                            "SINTAX: Secret Code"
                        );

                        setVersion(
                            settings.version ||
                            "Version 1.0"
                        );

                        setAllowStudentRegistration(
                            settings.allowStudentRegistration ??
                            true
                        );

                        setEnableInstructorAccounts(
                            settings.enableInstructorAccounts ??
                            true
                        );
                    }

                    const adminSnapshot =
                        await getDoc(
                            doc(
                                db,
                                "users",
                                currentUser.uid
                            )
                        );

                    if (
                        adminSnapshot.exists()
                    ) {
                        const adminData =
                            adminSnapshot.data();

                        setAdminFullName(
                            adminData.fullName ||
                            adminData.fullname ||
                            adminData.name ||
                            ""
                        );

                        setAdminEmail(
                            adminData.email ||
                            currentUser.email ||
                            ""
                        );
                    }

                    showMessage(
                        "Database restored successfully."
                    );
                } catch (
                    restoreError
                ) {
                    console.error(
                        "Database restore error:",
                        restoreError
                    );

                    showError(
                        restoreError.message ||
                        "Unable to restore the database."
                    );
                } finally {
                    setRestoring(false);

                    event.target.value =
                        "";
                }
            };

        reader.onerror = () => {
            setRestoring(false);

            showError(
                "Unable to read the selected backup file."
            );

            event.target.value = "";
        };

        reader.readAsText(
            selectedFile
        );
    };

    if (loading) {
        return (
            <div className="settings-loading">
                Loading settings...
            </div>
        );
    }

    return (
        <div className="settings-page">
            <AdminBar />

            <main className="settings-content">
                <div className="settings-header">
                    <h1>
                        System Settings
                    </h1>

                    <p>
                        Configure the SINTAX Learning Management System.
                    </p>
                </div>

                {message && (
                    <div className="settings-message">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="settings-error">
                        {error}
                    </div>
                )}

                <div className="settings-grid">
                    <form
                        className="settings-card"
                        onSubmit={
                            saveSystemSettings
                        }
                    >
                        <h2>
                            System Information
                        </h2>

                        <label htmlFor="system-name">
                            System Name
                        </label>

                        <input
                            id="system-name"
                            type="text"
                            value={systemName}
                            onChange={event =>
                                setSystemName(
                                    event.target.value
                                )
                            }
                            required
                        />

                        <label htmlFor="system-version">
                            Version
                        </label>

                        <input
                            id="system-version"
                            type="text"
                            value={version}
                            disabled
                        />

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={
                                savingSystem
                            }
                        >
                            {savingSystem
                                ? "Saving..."
                                : "Save Changes"}
                        </button>
                    </form>

                    <form
                        className="settings-card"
                        onSubmit={
                            saveProfileInformation
                        }
                    >
                        <h2>
                            Profile Information
                        </h2>

                        <label htmlFor="admin-full-name">
                            Full Name
                        </label>

                        <input
                            id="admin-full-name"
                            type="text"
                            placeholder="Enter your full name"
                            value={
                                adminFullName
                            }
                            onChange={event =>
                                setAdminFullName(
                                    event.target.value
                                )
                            }
                            required
                        />

                        <label htmlFor="admin-email">
                            Email
                        </label>

                        <input
                            id="admin-email"
                            type="email"
                            value={adminEmail}
                            readOnly
                        />

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={
                                savingProfile
                            }
                        >
                            {savingProfile
                                ? "Saving..."
                                : "Save Profile"}
                        </button>
                    </form>

                    <form
                        className="settings-card"
                        onSubmit={
                            changeAdministratorPassword
                        }
                    >
                        <h2>
                            Change Password
                        </h2>

                        <label htmlFor="current-password">
                            Current Password
                        </label>

                        <input
                            id="current-password"
                            type="password"
                            placeholder="Enter your current password"
                            value={
                                currentPassword
                            }
                            onChange={event =>
                                setCurrentPassword(
                                    event.target.value
                                )
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
                            placeholder="Enter your new password"
                            value={
                                newPassword
                            }
                            onChange={event =>
                                setNewPassword(
                                    event.target.value
                                )
                            }
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />

                        <label htmlFor="confirm-password">
                            Confirm New Password
                        </label>

                        <input
                            id="confirm-password"
                            type="password"
                            placeholder="Confirm your new password"
                            value={
                                confirmPassword
                            }
                            onChange={event =>
                                setConfirmPassword(
                                    event.target.value
                                )
                            }
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={
                                changingPassword
                            }
                        >
                            {changingPassword
                                ? "Changing Password..."
                                : "Change Password"}
                        </button>
                    </form>

                    <form
                        className="settings-card"
                        onSubmit={
                            saveSecuritySettings
                        }
                    >
                        <h2>
                            Security
                        </h2>

                        <div className="setting-option">
                            <label htmlFor="student-registration">
                                Allow Student Registration
                            </label>

                            <input
                                id="student-registration"
                                type="checkbox"
                                checked={
                                    allowStudentRegistration
                                }
                                onChange={event =>
                                    setAllowStudentRegistration(
                                        event.target.checked
                                    )
                                }
                            />
                        </div>

                        <div className="setting-option">
                            <label htmlFor="instructor-accounts">
                                Enable Instructor Accounts
                            </label>

                            <input
                                id="instructor-accounts"
                                type="checkbox"
                                checked={
                                    enableInstructorAccounts
                                }
                                onChange={event =>
                                    setEnableInstructorAccounts(
                                        event.target.checked
                                    )
                                }
                            />
                        </div>

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={
                                savingSecurity
                            }
                        >
                            {savingSecurity
                                ? "Saving..."
                                : "Save Security Settings"}
                        </button>
                    </form>

                    <div className="settings-card">
                        <h2>
                            Database Backup & Restore
                        </h2>

                        <p>
                            Download a backup of the SINTAX Firestore database or restore data from a previous backup.
                        </p>

                        <button
                            type="button"
                            className="backup-btn"
                            onClick={
                                backupDatabase
                            }
                            disabled={
                                backingUp ||
                                restoring
                            }
                        >
                            {backingUp
                                ? "Backing Up Database..."
                                : "Backup Database"}
                        </button>

                        <label
                            htmlFor="restore-database"
                            className={
                                restoring
                                    ? "restore-btn disabled"
                                    : "restore-btn"
                            }
                        >
                            {restoring
                                ? "Restoring Database..."
                                : "Restore Database"}
                        </label>

                        <input
                            id="restore-database"
                            className="restore-file-input"
                            type="file"
                            accept=".json,application/json"
                            onChange={
                                restoreDatabase
                            }
                            disabled={
                                backingUp ||
                                restoring
                            }
                        />

                        <p className="backup-note">
                            Backup includes users, instructors, instructor students, questionnaires, and system settings.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Settings;