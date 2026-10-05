import "../css/settings.css";
import AdminBar from "../components/AdminBar";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateEmail,
    updatePassword
} from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";

function Settings() {
    const [systemName, setSystemName] = useState("SINTAX: Secret Code");
    const [version, setVersion] = useState("Version 1.0");
    const [adminEmail, setAdminEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [allowStudentRegistration, setAllowStudentRegistration] = useState(true);
    const [enableInstructorAccounts, setEnableInstructorAccounts] = useState(true);
    const [loading, setLoading] = useState(true);
    const [savingSystem, setSavingSystem] = useState(false);
    const [savingSecurity, setSavingSecurity] = useState(false);
    const [updatingAccount, setUpdatingAccount] = useState(false);
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

                if (auth.currentUser) {
                    setAdminEmail(auth.currentUser.email || "");
                }
            } catch (loadError) {
                setError(loadError.message);
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
                doc(db, "settings", "system"),
                {
                    systemName: systemName.trim(),
                    version,
                    updatedAt: serverTimestamp(),
                    updatedBy: auth.currentUser?.uid || ""
                },
                {
                    merge: true
                }
            );

            showMessage("System information saved successfully.");
        } catch (saveError) {
            showError(saveError.message);
        } finally {
            setSavingSystem(false);
        }
    };

    const saveSecuritySettings = async event => {
        event.preventDefault();
        setSavingSecurity(true);

        try {
            await setDoc(
                doc(db, "settings", "system"),
                {
                    allowStudentRegistration,
                    enableInstructorAccounts,
                    updatedAt: serverTimestamp(),
                    updatedBy: auth.currentUser?.uid || ""
                },
                {
                    merge: true
                }
            );

            showMessage("Security settings saved successfully.");
        } catch (saveError) {
            showError(saveError.message);
        } finally {
            setSavingSecurity(false);
        }
    };

    const updateAdministratorAccount = async event => {
        event.preventDefault();

        const currentUser = auth.currentUser;

        if (!currentUser || !currentUser.email) {
            showError("No administrator is currently logged in.");
            return;
        }

        if (!currentPassword) {
            showError("Enter your current password.");
            return;
        }

        if (newPassword && newPassword.length < 6) {
            showError("The new password must contain at least 6 characters.");
            return;
        }

        setUpdatingAccount(true);

        try {
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                currentPassword
            );

            await reauthenticateWithCredential(
                currentUser,
                credential
            );

            const normalizedEmail = adminEmail.trim().toLowerCase();

            if (
                normalizedEmail &&
                normalizedEmail !== currentUser.email
            ) {
                await updateEmail(
                    currentUser,
                    normalizedEmail
                );

                await setDoc(
                    doc(db, "users", currentUser.uid),
                    {
                        email: normalizedEmail
                    },
                    {
                        merge: true
                    }
                );
            }

            if (newPassword) {
                await updatePassword(
                    currentUser,
                    newPassword
                );
            }

            setCurrentPassword("");
            setNewPassword("");

            showMessage("Administrator account updated successfully.");
        } catch (accountError) {
            showError(accountError.message);
        } finally {
            setUpdatingAccount(false);
        }
    };

    const backupData = async () => {
        try {
            const settingsSnapshot = await getDoc(
                doc(db, "settings", "system")
            );

            const backup = {
                exportedAt: new Date().toISOString(),
                settings: settingsSnapshot.exists()
                    ? settingsSnapshot.data()
                    : {}
            };

            const file = new Blob(
                [JSON.stringify(backup, null, 2)],
                {
                    type: "application/json"
                }
            );

            const downloadUrl = URL.createObjectURL(file);
            const downloadLink = document.createElement("a");

            downloadLink.href = downloadUrl;
            downloadLink.download = `sintax-settings-backup-${Date.now()}.json`;
            downloadLink.click();

            URL.revokeObjectURL(downloadUrl);

            showMessage("Settings backup downloaded successfully.");
        } catch (backupError) {
            showError(backupError.message);
        }
    };

    const restoreBackup = event => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) {
            return;
        }

        const reader = new FileReader();

        reader.onload = async loadEvent => {
            try {
                const backup = JSON.parse(loadEvent.target.result);
                const restoredSettings = backup.settings;

                if (!restoredSettings) {
                    throw new Error("Invalid backup file.");
                }

                await setDoc(
                    doc(db, "settings", "system"),
                    {
                        ...restoredSettings,
                        restoredAt: serverTimestamp(),
                        restoredBy: auth.currentUser?.uid || ""
                    },
                    {
                        merge: true
                    }
                );

                setSystemName(
                    restoredSettings.systemName || "SINTAX: Secret Code"
                );

                setVersion(
                    restoredSettings.version || "Version 1.0"
                );

                setAllowStudentRegistration(
                    restoredSettings.allowStudentRegistration ?? true
                );

                setEnableInstructorAccounts(
                    restoredSettings.enableInstructorAccounts ?? true
                );

                showMessage("Settings restored successfully.");
            } catch (restoreError) {
                showError(
                    restoreError.message || "Unable to restore the backup."
                );
            }

            event.target.value = "";
        };

        reader.readAsText(selectedFile);
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
                    <h1>System Settings</h1>

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
                        onSubmit={saveSystemSettings}
                    >
                        <h2>🖥 System Information</h2>

                        <label htmlFor="system-name">
                            System Name
                        </label>

                        <input
                            id="system-name"
                            type="text"
                            value={systemName}
                            onChange={event =>
                                setSystemName(event.target.value)
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
                            disabled={savingSystem}
                        >
                            {savingSystem
                                ? "Saving..."
                                : "Save Changes"}
                        </button>
                    </form>

                    <form
                        className="settings-card"
                        onSubmit={updateAdministratorAccount}
                    >
                        <h2>👤 Administrator Account</h2>

                        <label htmlFor="admin-email">
                            Email
                        </label>

                        <input
                            id="admin-email"
                            type="email"
                            value={adminEmail}
                            onChange={event =>
                                setAdminEmail(event.target.value)
                            }
                            required
                        />

                        <label htmlFor="current-password">
                            Current Password
                        </label>

                        <input
                            id="current-password"
                            type="password"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={event =>
                                setCurrentPassword(event.target.value)
                            }
                            required
                        />

                        <label htmlFor="new-password">
                            New Password
                        </label>

                        <input
                            id="new-password"
                            type="password"
                            placeholder="Leave blank to keep current password"
                            minLength="6"
                            value={newPassword}
                            onChange={event =>
                                setNewPassword(event.target.value)
                            }
                        />

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={updatingAccount}
                        >
                            {updatingAccount
                                ? "Updating..."
                                : "Update Account"}
                        </button>
                    </form>

                    <form
                        className="settings-card"
                        onSubmit={saveSecuritySettings}
                    >
                        <h2>🔒 Security</h2>

                        <div className="setting-option">
                            <label htmlFor="student-registration">
                                Allow Student Registration
                            </label>

                            <input
                                id="student-registration"
                                type="checkbox"
                                checked={allowStudentRegistration}
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
                                checked={enableInstructorAccounts}
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
                            disabled={savingSecurity}
                        >
                            {savingSecurity
                                ? "Saving..."
                                : "Save Security Settings"}
                        </button>
                    </form>

                    <div className="settings-card">
                        <h2>💾 Backup & Restore</h2>

                        <p>
                            Download or restore the system settings.
                        </p>

                        <button
                            type="button"
                            className="backup-btn"
                            onClick={backupData}
                        >
                            Backup Settings
                        </button>

                        <label
                            htmlFor="restore-backup"
                            className="restore-btn"
                        >
                            Restore Backup
                        </label>

                        <input
                            id="restore-backup"
                            className="restore-file-input"
                            type="file"
                            accept="application/json"
                            onChange={restoreBackup}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Settings;