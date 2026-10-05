import "../css/users.css";

import AdminBar from "../components/AdminBar";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    auth,
    db
} from "../firebase";

import {
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    updateDoc
} from "firebase/firestore";

function Users() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState("");

    const [selectedUser, setSelectedUser] = useState(null);
    const [editingUser, setEditingUser] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);

    const usersPerPage = 10;

    const [instructorForm, setInstructorForm] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        gender: "",
        status: "active"
    });

    const [showInstructorPassword, setShowInstructorPassword] =
        useState(false);

    const [creatingInstructor, setCreatingInstructor] =
        useState(false);

    const [instructorMessage, setInstructorMessage] =
        useState("");

    const [instructorError, setInstructorError] =
        useState("");

    useEffect(() => {
        let unsubscribeUsers;

        const unsubscribeAuth = onAuthStateChanged(
            auth,
            async currentUser => {
                if (!currentUser) {
                    window.location.href = "/login";
                    return;
                }

                try {
                    const adminSnapshot = await getDoc(
                        doc(
                            db,
                            "users",
                            currentUser.uid
                        )
                    );

                    if (
                        !adminSnapshot.exists() ||
                        adminSnapshot.data().role !== "admin"
                    ) {
                        await signOut(auth);

                        window.location.href = "/login";

                        return;
                    }

                    setAuthorized(true);

                    unsubscribeUsers = onSnapshot(
                        collection(
                            db,
                            "users"
                        ),
                        snapshot => {
                            const userList =
                                snapshot.docs
                                    .map(userDocument => ({
                                        id: userDocument.id,
                                        ...userDocument.data()
                                    }))
                                    .sort(
                                        (
                                            firstUser,
                                            secondUser
                                        ) => {
                                            const firstDate =
                                                firstUser
                                                    .createdAt
                                                    ?.toMillis?.() ||
                                                0;

                                            const secondDate =
                                                secondUser
                                                    .createdAt
                                                    ?.toMillis?.() ||
                                                0;

                                            return (
                                                secondDate -
                                                firstDate
                                            );
                                        }
                                    );

                            setUsers(userList);
                            setLoading(false);
                        },
                        snapshotError => {
                            setError(
                                snapshotError.message
                            );

                            setLoading(false);
                        }
                    );
                } catch (authError) {
                    setError(
                        authError.message
                    );

                    setLoading(false);
                }
            }
        );

        return () => {
            unsubscribeAuth();

            if (unsubscribeUsers) {
                unsubscribeUsers();
            }
        };
    }, []);

    const totals = useMemo(() => {
        return {
            users: users.length,

            students: users.filter(
                user =>
                    user.role === "student"
            ).length,

            instructors: users.filter(
                user =>
                    user.role === "instructor"
            ).length,

            administrators: users.filter(
                user =>
                    user.role === "admin"
            ).length
        };
    }, [users]);

    const filteredUsers = useMemo(() => {
        const keyword =
            search
                .trim()
                .toLowerCase();

        return users.filter(user => {
            const fullName =
                String(
                    user.fullName || ""
                ).toLowerCase();

            const email =
                String(
                    user.email || ""
                ).toLowerCase();

            const studentNumber =
                String(
                    user.studentNumber || ""
                ).toLowerCase();

            const section =
                String(
                    user.section || ""
                ).toLowerCase();

            const yearLevel =
                String(
                    user.yearLevel || ""
                ).toLowerCase();

            const matchesSearch =
                !keyword ||
                fullName.includes(keyword) ||
                email.includes(keyword) ||
                studentNumber.includes(keyword) ||
                section.includes(keyword) ||
                yearLevel.includes(keyword);

            const matchesFilter =
                filter === "all" ||
                user.role === filter ||
                user.status === filter;

            return (
                matchesSearch &&
                matchesFilter
            );
        });
    }, [
        users,
        search,
        filter
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredUsers.length /
                usersPerPage
        )
    );

    const paginatedUsers =
        useMemo(() => {
            const startIndex =
                (currentPage - 1) *
                usersPerPage;

            const endIndex =
                startIndex +
                usersPerPage;

            return filteredUsers.slice(
                startIndex,
                endIndex
            );
        }, [
            filteredUsers,
            currentPage
        ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        filter
    ]);

    useEffect(() => {
        if (
            currentPage >
            totalPages
        ) {
            setCurrentPage(
                totalPages
            );
        }
    }, [
        currentPage,
        totalPages
    ]);

    const formatDate = value => {
        if (!value) {
            return "Not available";
        }

        if (
            typeof value.toDate ===
            "function"
        ) {
            return value
                .toDate()
                .toLocaleString();
        }

        const date =
            new Date(value);

        return Number.isNaN(
            date.getTime()
        )
            ? "Not available"
            : date.toLocaleString();
    };

    const formatValue = (
        key,
        value
    ) => {
        if (
            key === "createdAt" ||
            key === "lastPlayedAt"
        ) {
            return formatDate(
                value
            );
        }

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Not available";
        }

        if (
            typeof value ===
            "object"
        ) {
            return JSON.stringify(
                value
            );
        }

        return String(value);
    };

    const openEditModal = user => {
        setEditingUser({
            ...user,

            fullName:
                user.fullName || "",

            email:
                user.email || "",

            studentNumber:
                user.studentNumber || "",

            section:
                user.section || "",

            yearLevel:
                user.yearLevel || "",

            gender:
                user.gender || "",

            role:
                user.role ||
                "student",

            status:
                user.status ||
                "active"
        });
    };

    const closeEditModal = () => {
        setEditingUser(null);
    };

    const handleEditChange =
        event => {
            const {
                name,
                value
            } = event.target;

            setEditingUser(
                previous => ({
                    ...previous,
                    [name]: value
                })
            );
        };

    const saveUser =
        async event => {
            event.preventDefault();

            if (!editingUser) {
                return;
            }

            try {
                await updateDoc(
                    doc(
                        db,
                        "users",
                        editingUser.id
                    ),
                    {
                        fullName:
                            editingUser
                                .fullName
                                .trim(),

                        email:
                            editingUser
                                .email
                                .trim()
                                .toLowerCase(),

                        studentNumber:
                            editingUser
                                .studentNumber
                                .trim(),

                        section:
                            editingUser
                                .section
                                .trim(),

                        yearLevel:
                            editingUser
                                .yearLevel
                                .trim(),

                        gender:
                            editingUser
                                .gender
                                .trim(),

                        role:
                            editingUser.role,

                        status:
                            editingUser.status
                    }
                );

                setEditingUser(
                    null
                );

                alert(
                    "User information updated successfully."
                );
            } catch (
                updateError
            ) {
                alert(
                    updateError.message
                );
            }
        };

    const deleteUser =
        async user => {
            if (
                user.id ===
                auth.currentUser?.uid
            ) {
                alert(
                    "You cannot delete your own administrator document."
                );

                return;
            }

            const userName =
                user.fullName ||
                user.email ||
                "this user";

            const confirmed =
                window.confirm(
                    `Delete ${userName} from Firestore?`
                );

            if (!confirmed) {
                return;
            }

            try {
                await deleteDoc(
                    doc(
                        db,
                        "users",
                        user.id
                    )
                );

                if (
                    selectedUser?.id ===
                    user.id
                ) {
                    setSelectedUser(
                        null
                    );
                }

                if (
                    editingUser?.id ===
                    user.id
                ) {
                    setEditingUser(
                        null
                    );
                }

                alert(
                    "User document deleted successfully."
                );
            } catch (
                deleteError
            ) {
                alert(
                    deleteError.message
                );
            }
        };

    const handleInstructorChange =
        event => {
            const {
                name,
                value
            } = event.target;

            setInstructorForm(
                previous => ({
                    ...previous,
                    [name]: value
                })
            );

            setInstructorError("");
            setInstructorMessage("");
        };

    const createInstructor =
        async event => {
            event.preventDefault();

            setInstructorError("");
            setInstructorMessage("");

            const fullName =
                instructorForm
                    .fullName
                    .trim();

            const email =
                instructorForm
                    .email
                    .trim()
                    .toLowerCase();

            const password =
                instructorForm.password;

            const confirmPassword =
                instructorForm
                    .confirmPassword;

            if (!fullName) {
                setInstructorError(
                    "Please enter the instructor's full name."
                );

                return;
            }

            if (!email) {
                setInstructorError(
                    "Please enter the instructor's email."
                );

                return;
            }

            if (
                password.length <
                6
            ) {
                setInstructorError(
                    "Password must contain at least 6 characters."
                );

                return;
            }

            if (
                password !==
                confirmPassword
            ) {
                setInstructorError(
                    "Passwords do not match."
                );

                return;
            }

            if (
                !instructorForm.gender
            ) {
                setInstructorError(
                    "Please select a gender."
                );

                return;
            }

            if (
                !auth.currentUser
            ) {
                setInstructorError(
                    "Administrator session was not found."
                );

                return;
            }

            setCreatingInstructor(
                true
            );

            try {
                const idToken =
                    await auth.currentUser.getIdToken();

                const response =
                    await fetch(
                        "/api/create-instructor",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${idToken}`
                            },

                            body:
                                JSON.stringify(
                                    {
                                        fullName,
                                        email,
                                        password,

                                        gender:
                                            instructorForm.gender,

                                        status:
                                            instructorForm.status
                                    }
                                )
                        }
                    );

                const data =
                    await response
                        .json()
                        .catch(
                            () => ({})
                        );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        data.message ||
                            data.error ||
                            "Unable to create instructor account."
                    );
                }

                setInstructorForm({
                    fullName: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                    gender: "",
                    status: "active"
                });

                setShowInstructorPassword(
                    false
                );

                setInstructorMessage(
                    "Instructor account created successfully."
                );
            } catch (
                createError
            ) {
                setInstructorError(
                    createError.message ||
                        "Unable to create instructor account."
                );
            } finally {
                setCreatingInstructor(
                    false
                );
            }
        };

    const goToPage = page => {
        if (
            page >= 1 &&
            page <= totalPages
        ) {
            setCurrentPage(
                page
            );
        }
    };

    const getVisiblePages = () => {
        const pages = [];

        const maxVisiblePages =
            5;

        if (
            totalPages <=
            maxVisiblePages
        ) {
            for (
                let page = 1;
                page <=
                totalPages;
                page++
            ) {
                pages.push(page);
            }

            return pages;
        }

        let startPage =
            Math.max(
                1,
                currentPage - 2
            );

        const endPage =
            Math.min(
                totalPages,
                startPage +
                    maxVisiblePages -
                    1
            );

        if (
            endPage -
                startPage +
                1 <
            maxVisiblePages
        ) {
            startPage =
                Math.max(
                    1,
                    endPage -
                        maxVisiblePages +
                        1
                );
        }

        for (
            let page =
                startPage;
            page <= endPage;
            page++
        ) {
            pages.push(page);
        }

        return pages;
    };

    if (loading) {
        return (
            <div className="users-loading">
                Loading users...
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="users-loading">
                Access denied.
            </div>
        );
    }

    return (
        <div className="users-page">
            <AdminBar />

            <main className="users-content">
                <header className="users-header">
                    <div>
                        <h1>
                            Users Management
                        </h1>

                        <p>
                            View and manage students,
                            instructors and administrators.
                        </p>
                    </div>
                </header>

                {error && (
                    <div className="users-error">
                        {error}
                    </div>
                )}

                <section className="users-stats">
                    <div className="user-stat-card">
                        <h2>
                            {totals.users}
                        </h2>

                        <span>
                            Total Users
                        </span>
                    </div>

                    <div className="user-stat-card card-blue">
                        <h2>
                            {totals.students}
                        </h2>

                        <span>
                            Students
                        </span>
                    </div>

                    <div className="user-stat-card card-orange">
                        <h2>
                            {totals.instructors}
                        </h2>

                        <span>
                            Instructors
                        </span>
                    </div>

                    <div className="user-stat-card card-red">
                        <h2>
                            {totals.administrators}
                        </h2>

                        <span>
                            Administrators
                        </span>
                    </div>
                </section>

                <div className="users-management-grid">
                    <section className="users-list-section">
                        <div className="section-title">
                            <div>
                                <h2>
                                    User Accounts
                                </h2>

                                <p>
                                    Search, filter and manage registered users.
                                </p>
                            </div>
                        </div>

                        <div className="table-toolbar">
                            <input
                                type="search"
                                placeholder="Search name, email, student number or section"
                                value={search}
                                onChange={
                                    event =>
                                        setSearch(
                                            event
                                                .target
                                                .value
                                        )
                                }
                            />

                            <select
                                value={filter}
                                onChange={
                                    event =>
                                        setFilter(
                                            event
                                                .target
                                                .value
                                        )
                                }
                            >
                                <option value="all">
                                    All Users
                                </option>

                                <option value="student">
                                    Students
                                </option>

                                <option value="instructor">
                                    Instructors
                                </option>

                                <option value="admin">
                                    Administrators
                                </option>

                                <option value="active">
                                    Active
                                </option>

                                <option value="inactive">
                                    Inactive
                                </option>
                            </select>
                        </div>

                        <div className="users-table-wrapper">
                            <div className="table-container">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                Full Name
                                            </th>

                                            <th>
                                                Email
                                            </th>

                                            <th>
                                                Student Number
                                            </th>

                                            <th>
                                                Section
                                            </th>

                                            <th>
                                                Year Level
                                            </th>

                                            <th>
                                                Gender
                                            </th>

                                            <th>
                                                Role
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Registered
                                            </th>

                                            <th>
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredUsers.length ===
                                        0 ? (
                                            <tr>
                                                <td
                                                    colSpan="10"
                                                    className="empty-users"
                                                >
                                                    No users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedUsers.map(
                                                user => (
                                                    <tr
                                                        key={
                                                            user.id
                                                        }
                                                    >
                                                        <td>
                                                            {user.fullName ||
                                                                "Not available"}
                                                        </td>

                                                        <td>
                                                            {user.email ||
                                                                "Not available"}
                                                        </td>

                                                        <td>
                                                            {user.studentNumber ||
                                                                "Not available"}
                                                        </td>

                                                        <td>
                                                            {user.section ||
                                                                "Not available"}
                                                        </td>

                                                        <td>
                                                            {user.yearLevel ||
                                                                "Not available"}
                                                        </td>

                                                        <td>
                                                            {user.gender ||
                                                                "Not available"}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`role role-${
                                                                    user.role ||
                                                                    "unknown"
                                                                }`}
                                                            >
                                                                {user.role ||
                                                                    "Unknown"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`status ${
                                                                    user.status ||
                                                                    "active"
                                                                }`}
                                                            >
                                                                {user.status ||
                                                                    "Active"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {formatDate(
                                                                user.createdAt
                                                            )}
                                                        </td>

                                                        <td>
                                                            <div className="table-actions">
                                                                <button
                                                                    type="button"
                                                                    className="view-btn"
                                                                    onClick={() =>
                                                                        setSelectedUser(
                                                                            user
                                                                        )
                                                                    }
                                                                >
                                                                    View
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="edit-btn"
                                                                    onClick={() =>
                                                                        openEditModal(
                                                                            user
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="delete-btn"
                                                                    onClick={() =>
                                                                        deleteUser(
                                                                            user
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredUsers.length >
                                0 && (
                                <div className="pagination">
                                    <div className="pagination-info">
                                        Showing{" "}
                                        {(currentPage -
                                            1) *
                                            usersPerPage +
                                            1}
                                        {" - "}
                                        {Math.min(
                                            currentPage *
                                                usersPerPage,
                                            filteredUsers.length
                                        )}
                                        {" of "}
                                        {
                                            filteredUsers.length
                                        }{" "}
                                        users
                                    </div>

                                    <div className="pagination-controls">
                                        <button
                                            type="button"
                                            disabled={
                                                currentPage ===
                                                1
                                            }
                                            onClick={() =>
                                                goToPage(
                                                    currentPage -
                                                        1
                                                )
                                            }
                                        >
                                            Previous
                                        </button>

                                        {getVisiblePages().map(
                                            page => (
                                                <button
                                                    type="button"
                                                    key={
                                                        page
                                                    }
                                                    className={
                                                        currentPage ===
                                                        page
                                                            ? "pagination-page active-page"
                                                            : "pagination-page"
                                                    }
                                                    onClick={() =>
                                                        goToPage(
                                                            page
                                                        )
                                                    }
                                                >
                                                    {
                                                        page
                                                    }
                                                </button>
                                            )
                                        )}

                                        <button
                                            type="button"
                                            disabled={
                                                currentPage ===
                                                totalPages
                                            }
                                            onClick={() =>
                                                goToPage(
                                                    currentPage +
                                                        1
                                                )
                                            }
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="create-instructor-panel">
                        <div className="instructor-panel-header">
                            <div className="instructor-icon">
                                +
                            </div>

                            <div>
                                <h2>
                                    Create Instructor
                                </h2>

                                <p>
                                    Register a new instructor account for the system.
                                </p>
                            </div>
                        </div>

                        {instructorError && (
                            <div className="instructor-form-error">
                                {
                                    instructorError
                                }
                            </div>
                        )}

                        {instructorMessage && (
                            <div className="instructor-form-success">
                                {
                                    instructorMessage
                                }
                            </div>
                        )}

                        <form
                            className="create-instructor-form"
                            onSubmit={
                                createInstructor
                            }
                        >
                            <label>
                                Full Name

                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Instructor full name"
                                    value={
                                        instructorForm.fullName
                                    }
                                    onChange={
                                        handleInstructorChange
                                    }
                                    autoComplete="name"
                                    required
                                />
                            </label>

                            <label>
                                Email Address

                                <input
                                    type="email"
                                    name="email"
                                    placeholder="instructor@email.com"
                                    value={
                                        instructorForm.email
                                    }
                                    onChange={
                                        handleInstructorChange
                                    }
                                    autoComplete="off"
                                    required
                                />
                            </label>

                            <label>
                                Gender

                                <select
                                    name="gender"
                                    value={
                                        instructorForm.gender
                                    }
                                    onChange={
                                        handleInstructorChange
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
                            </label>

                            <label>
                                Status

                                <select
                                    name="status"
                                    value={
                                        instructorForm.status
                                    }
                                    onChange={
                                        handleInstructorChange
                                    }
                                >
                                    <option value="active">
                                        Active
                                    </option>

                                    <option value="inactive">
                                        Inactive
                                    </option>
                                </select>
                            </label>

                            <label>
                                Password

                                <input
                                    type={
                                        showInstructorPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    placeholder="Minimum 6 characters"
                                    value={
                                        instructorForm.password
                                    }
                                    onChange={
                                        handleInstructorChange
                                    }
                                    autoComplete="new-password"
                                    minLength="6"
                                    required
                                />
                            </label>

                            <label>
                                Confirm Password

                                <input
                                    type={
                                        showInstructorPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="confirmPassword"
                                    placeholder="Confirm password"
                                    value={
                                        instructorForm.confirmPassword
                                    }
                                    onChange={
                                        handleInstructorChange
                                    }
                                    autoComplete="new-password"
                                    minLength="6"
                                    required
                                />
                            </label>

                            <label className="show-password">
                                <input
                                    type="checkbox"
                                    checked={
                                        showInstructorPassword
                                    }
                                    onChange={
                                        event =>
                                            setShowInstructorPassword(
                                                event
                                                    .target
                                                    .checked
                                            )
                                    }
                                />

                                <span>
                                    Show password
                                </span>
                            </label>

                            <div className="instructor-role-box">
                                <span>
                                    Account Role
                                </span>

                                <strong>
                                    Instructor
                                </strong>
                            </div>

                            <button
                                type="submit"
                                className="create-instructor-btn"
                                disabled={
                                    creatingInstructor
                                }
                            >
                                {creatingInstructor
                                    ? "Creating Account..."
                                    : "Create Instructor Account"}
                            </button>
                        </form>
                    </aside>
                </div>
            </main>

            {selectedUser && (
                <div
                    className="user-modal-overlay"
                    onClick={() =>
                        setSelectedUser(
                            null
                        )
                    }
                >
                    <div
                        className="user-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="user-details-title"
                        onClick={
                            event =>
                                event.stopPropagation()
                        }
                    >
                        <button
                            type="button"
                            className="modal-close"
                            onClick={() =>
                                setSelectedUser(
                                    null
                                )
                            }
                        >
                            ×
                        </button>

                        <h2 id="user-details-title">
                            User Information
                        </h2>

                        <div className="user-details">
                            {Object.entries(
                                selectedUser
                            ).map(
                                ([
                                    key,
                                    value
                                ]) => (
                                    <div
                                        className="user-detail"
                                        key={
                                            key
                                        }
                                    >
                                        <strong>
                                            {
                                                key
                                            }
                                        </strong>

                                        <span>
                                            {formatValue(
                                                key,
                                                value
                                            )}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editingUser && (
                <div
                    className="user-modal-overlay"
                    onClick={
                        closeEditModal
                    }
                >
                    <div
                        className="user-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-user-title"
                        onClick={
                            event =>
                                event.stopPropagation()
                        }
                    >
                        <button
                            type="button"
                            className="modal-close"
                            onClick={
                                closeEditModal
                            }
                        >
                            ×
                        </button>

                        <h2 id="edit-user-title">
                            Edit User
                        </h2>

                        <form
                            className="edit-user-form"
                            onSubmit={
                                saveUser
                            }
                        >
                            <label>
                                Full Name

                                <input
                                    type="text"
                                    name="fullName"
                                    value={
                                        editingUser.fullName
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </label>

                            <label>
                                Email

                                <input
                                    type="email"
                                    name="email"
                                    value={
                                        editingUser.email
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </label>

                            <label>
                                Student Number

                                <input
                                    type="text"
                                    name="studentNumber"
                                    value={
                                        editingUser.studentNumber
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </label>

                            <label>
                                Section

                                <input
                                    type="text"
                                    name="section"
                                    value={
                                        editingUser.section
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </label>

                            <label>
                                Year Level

                                <input
                                    type="text"
                                    name="yearLevel"
                                    value={
                                        editingUser.yearLevel
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </label>

                            <label>
                                Gender

                                <select
                                    name="gender"
                                    value={
                                        editingUser.gender
                                    }
                                    onChange={
                                        handleEditChange
                                    }
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
                            </label>

                            <label>
                                Role

                                <select
                                    name="role"
                                    value={
                                        editingUser.role
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                >
                                    <option value="student">
                                        Student
                                    </option>

                                    <option value="instructor">
                                        Instructor
                                    </option>

                                    <option value="admin">
                                        Administrator
                                    </option>
                                </select>
                            </label>

                            <label>
                                Status

                                <select
                                    name="status"
                                    value={
                                        editingUser.status
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                >
                                    <option value="active">
                                        Active
                                    </option>

                                    <option value="inactive">
                                        Inactive
                                    </option>
                                </select>
                            </label>

                            <button
                                type="submit"
                                className="save-user-btn"
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;