import "../css/instructorStudents.css";
import InstructorBar from "../components/InstructorBar";

import {
    useEffect,
    useMemo,
    useRef,
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
    doc,
    getDoc,
    onSnapshot
} from "firebase/firestore";

import {
    useNavigate
} from "react-router-dom";

function InstructorStudents() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState("");
    const [sectionFilter, setSectionFilter] =
        useState("all");
    const [statusFilter, setStatusFilter] =
        useState("all");

    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");

    const [selectedFile, setSelectedFile] =
        useState(null);
    const [csvStudents, setCsvStudents] =
        useState([]);
    const [csvError, setCsvError] =
        useState("");

    const [
        studentPassword,
        setStudentPassword
    ] = useState("");

    const [
        confirmStudentPassword,
        setConfirmStudentPassword
    ] = useState("");

    const [
        showPassword,
        setShowPassword
    ] = useState(false);

    const [importing, setImporting] =
        useState(false);
    const [
        importMessage,
        setImportMessage
    ] = useState("");
    const [
        importResults,
        setImportResults
    ] = useState([]);

    useEffect(() => {
        let unsubscribeStudents = null;

        const unsubscribeAuth =
            onAuthStateChanged(
                auth,
                async currentUser => {
                    if (!currentUser) {
                        navigate("/login");
                        return;
                    }

                    try {
                        setLoading(true);
                        setError("");

                        const userSnapshot =
                            await getDoc(
                                doc(
                                    db,
                                    "users",
                                    currentUser.uid
                                )
                            );

                        if (
                            !userSnapshot.exists()
                        ) {
                            await signOut(auth);
                            navigate("/login");
                            return;
                        }

                        const userData =
                            userSnapshot.data();

                        if (
                            userData.role !==
                            "instructor"
                        ) {
                            await signOut(auth);
                            navigate("/login");
                            return;
                        }

                        if (
                            userData.status ===
                            "inactive"
                        ) {
                            await signOut(auth);
                            navigate("/login");
                            return;
                        }

                        const studentsReference =
                            collection(
                                db,
                                "instructors",
                                currentUser.uid,
                                "students"
                            );

                        unsubscribeStudents =
                            onSnapshot(
                                studentsReference,
                                snapshot => {
                                    const studentList =
                                        snapshot.docs
                                            .map(
                                                studentDocument => {
                                                    const data =
                                                        studentDocument.data();

                                                    return {
                                                        id:
                                                            studentDocument.id,

                                                        name:
                                                            data.fullName ||
                                                            "Unknown Student",

                                                        email:
                                                            data.email ||
                                                            "No email",

                                                        number:
                                                            data.studentNumber ||
                                                            "Not available",

                                                        section:
                                                            data.section ||
                                                            "Not assigned",

                                                        yearLevel:
                                                            data.yearLevel ||
                                                            "Not assigned",

                                                        gender:
                                                            data.gender ||
                                                            "Not specified",

                                                        status:
                                                            data.status ||
                                                            "active"
                                                    };
                                                }
                                            )
                                            .sort(
                                                (
                                                    firstStudent,
                                                    secondStudent
                                                ) =>
                                                    firstStudent.name.localeCompare(
                                                        secondStudent.name
                                                    )
                                            );

                                    setStudents(
                                        studentList
                                    );

                                    setError("");
                                    setLoading(false);
                                },
                                snapshotError => {
                                    console.error(
                                        "Students snapshot error:",
                                        snapshotError
                                    );

                                    setStudents([]);

                                    setError(
                                        snapshotError.message ||
                                        "Unable to load students."
                                    );

                                    setLoading(false);
                                }
                            );
                    } catch (pageError) {
                        console.error(
                            "Instructor students error:",
                            pageError
                        );

                        setStudents([]);

                        setError(
                            pageError.message ||
                            "Unable to load students."
                        );

                        setLoading(false);
                    }
                }
            );

        return () => {
            unsubscribeAuth();

            if (unsubscribeStudents) {
                unsubscribeStudents();
            }
        };
    }, [navigate]);

    const sections = useMemo(() => {
        return [
            ...new Set(
                students
                    .map(
                        student =>
                            student.section
                    )
                    .filter(
                        section =>
                            section &&
                            section !==
                                "Not assigned"
                    )
            )
        ].sort();
    }, [students]);

    const filteredStudents =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return students.filter(
                student => {
                    const matchesSearch =
                        !keyword ||
                        student.name
                            .toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        student.email
                            .toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        student.number
                            .toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        student.section
                            .toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        student.yearLevel
                            .toLowerCase()
                            .includes(
                                keyword
                            );

                    const matchesSection =
                        sectionFilter ===
                            "all" ||
                        student.section ===
                            sectionFilter;

                    const matchesStatus =
                        statusFilter ===
                            "all" ||
                        student.status
                            .toLowerCase() ===
                            statusFilter;

                    return (
                        matchesSearch &&
                        matchesSection &&
                        matchesStatus
                    );
                }
            );
        }, [
            students,
            search,
            sectionFilter,
            statusFilter
        ]);

    const summary = useMemo(() => {
        const activeStudents =
            students.filter(
                student =>
                    student.status
                        .toLowerCase() ===
                    "active"
            ).length;

        const inactiveStudents =
            students.filter(
                student =>
                    student.status
                        .toLowerCase() ===
                    "inactive"
            ).length;

        return {
            total: students.length,
            active: activeStudents,
            inactive: inactiveStudents
        };
    }, [students]);

    const parseCsv = text => {
        const rows = [];
        let row = [];
        let value = "";
        let insideQuotes = false;

        const normalizedText =
            text
                .replace(/^\uFEFF/, "")
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n");

        for (
            let index = 0;
            index <
            normalizedText.length;
            index += 1
        ) {
            const character =
                normalizedText[index];

            if (character === '"') {
                if (
                    insideQuotes &&
                    normalizedText[
                        index + 1
                    ] === '"'
                ) {
                    value += '"';
                    index += 1;
                } else {
                    insideQuotes =
                        !insideQuotes;
                }

                continue;
            }

            if (
                character === "," &&
                !insideQuotes
            ) {
                row.push(value.trim());
                value = "";
                continue;
            }

            if (
                character === "\n" &&
                !insideQuotes
            ) {
                row.push(value.trim());

                if (
                    row.some(
                        cell =>
                            cell.trim() !== ""
                    )
                ) {
                    rows.push(row);
                }

                row = [];
                value = "";
                continue;
            }

            value += character;
        }

        row.push(value.trim());

        if (
            row.some(
                cell =>
                    cell.trim() !== ""
            )
        ) {
            rows.push(row);
        }

        if (rows.length < 2) {
            throw new Error(
                "The CSV file does not contain student records."
            );
        }

        const headers =
            rows[0].map(
                header =>
                    header.trim()
            );

        const requiredHeaders = [
            "fullName",
            "email",
            "studentNumber",
            "section",
            "yearLevel",
            "gender"
        ];

        const missingHeaders =
            requiredHeaders.filter(
                requiredHeader =>
                    !headers.includes(
                        requiredHeader
                    )
            );

        if (
            missingHeaders.length > 0
        ) {
            throw new Error(
                `Missing CSV columns: ${missingHeaders.join(
                    ", "
                )}`
            );
        }

        const parsedStudents =
            rows
                .slice(1)
                .map(
                    (
                        values,
                        index
                    ) => {
                        const student = {};

                        headers.forEach(
                            (
                                header,
                                headerIndex
                            ) => {
                                student[
                                    header
                                ] =
                                    values[
                                        headerIndex
                                    ] || "";
                            }
                        );

                        return {
                            ...student,
                            csvRow:
                                index + 2
                        };
                    }
                );

        if (
            parsedStudents.length === 0
        ) {
            throw new Error(
                "No student records were found in the CSV file."
            );
        }

        return parsedStudents;
    };

    const handleFileChange =
        async event => {
            const file =
                event.target.files?.[0];

            setCsvError("");
            setImportMessage("");
            setImportResults([]);
            setCsvStudents([]);

            if (!file) {
                setSelectedFile(null);
                return;
            }

            if (
                !file.name
                    .toLowerCase()
                    .endsWith(".csv")
            ) {
                setSelectedFile(null);

                setCsvError(
                    "Please select a CSV file."
                );

                event.target.value = "";

                return;
            }

            try {
                const text =
                    await file.text();

                const parsedStudents =
                    parseCsv(text);

                setSelectedFile(file);
                setCsvStudents(
                    parsedStudents
                );
            } catch (fileError) {
                console.error(
                    "CSV error:",
                    fileError
                );

                setSelectedFile(null);
                setCsvStudents([]);

                setCsvError(
                    fileError.message ||
                    "Unable to read the CSV file."
                );

                event.target.value = "";
            }
        };

    const handleImportStudents =
        async () => {
            setCsvError("");
            setImportMessage("");
            setImportResults([]);

            if (
                csvStudents.length === 0
            ) {
                setCsvError(
                    "Please select a valid CSV file first."
                );

                return;
            }

            if (!studentPassword) {
                setCsvError(
                    "Please enter the password for the student accounts."
                );

                return;
            }

            if (
                studentPassword.length < 6
            ) {
                setCsvError(
                    "Password must contain at least 6 characters."
                );

                return;
            }

            if (
                studentPassword !==
                confirmStudentPassword
            ) {
                setCsvError(
                    "The passwords do not match."
                );

                return;
            }

            if (!auth.currentUser) {
                setCsvError(
                    "Instructor session was not found."
                );

                return;
            }

            setImporting(true);

            try {
                const idToken =
                    await auth.currentUser
                        .getIdToken();

                const response =
                    await fetch(
                        "/api/import-students",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${idToken}`
                            },

                            body:
                                JSON.stringify({
                                    password:
                                        studentPassword,

                                    students:
                                        csvStudents.map(
                                            student => ({
                                                fullName:
                                                    student.fullName,

                                                email:
                                                    student.email,

                                                studentNumber:
                                                    student.studentNumber,

                                                section:
                                                    student.section,

                                                yearLevel:
                                                    student.yearLevel,

                                                gender:
                                                    student.gender
                                            })
                                        )
                                })
                        }
                    );

                const data =
                    await response
                        .json()
                        .catch(
                            () => ({})
                        );

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Unable to import students."
                    );
                }

                setImportResults(
                    data.results || []
                );

                setImportMessage(
                    data.message ||
                    "Student import completed."
                );

                if (
                    Number(
                        data.failed || 0
                    ) === 0
                ) {
                    setSelectedFile(null);
                    setCsvStudents([]);

                    setStudentPassword("");
                    setConfirmStudentPassword("");
                    setShowPassword(false);

                    if (
                        fileInputRef.current
                    ) {
                        fileInputRef.current.value =
                            "";
                    }
                }
            } catch (
                importError
            ) {
                console.error(
                    "Import error:",
                    importError
                );

                setCsvError(
                    importError.message ||
                    "Unable to import students."
                );
            } finally {
                setImporting(false);
            }
        };

    const downloadTemplate = () => {
        const template = [
            "fullName,email,studentNumber,section,yearLevel,gender",
            "Juan Dela Cruz,juan@example.com,2627-58341,Linux,1st Year,Male",
            "Maria Santos,maria@example.com,2627-19473,Microsoft,1st Year,Female"
        ].join("\n");

        const blob =
            new Blob(
                [template],
                {
                    type:
                        "text/csv;charset=utf-8"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            "sintax-student-template.csv";

        document.body.appendChild(
            link
        );

        link.click();

        document.body.removeChild(
            link
        );

        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="instructor-students-loading">
                Loading students...
            </div>
        );
    }

    return (
        <div className="instructor-students-page">
            <InstructorBar />

            <main className="instructor-students-content">
                <header className="students-page-header">
                    <h1>
                        Students
                    </h1>

                    <p>
                        Create and manage
                        student accounts assigned
                        to your instructor account.
                    </p>
                </header>

                {error && (
                    <div className="students-error">
                        {error}
                    </div>
                )}

                <section className="student-import-section">
                    <div className="student-import-header">
                        <div>
                            <h2>
                                Import Students
                            </h2>

                            <p>
                                Upload a CSV file and
                                create student login
                                accounts.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="download-template-button"
                            onClick={
                                downloadTemplate
                            }
                        >
                            Download CSV Template
                        </button>
                    </div>

                    <div className="csv-requirements">
                        <div className="csv-requirements-header">
                            <span>
                                Required CSV Columns
                            </span>

                            <small>
                                Password is entered
                                separately below.
                            </small>
                        </div>

                        <div className="csv-column-list">
                            <code>
                                fullName
                            </code>

                            <code>
                                email
                            </code>

                            <code>
                                studentNumber
                            </code>

                            <code>
                                section
                            </code>

                            <code>
                                yearLevel
                            </code>

                            <code>
                                gender
                            </code>
                        </div>
                    </div>

                    <div className="student-import-password">
                        <div className="import-password-header">
                            <div>
                                <h3>
                                    Student Account
                                    Password
                                </h3>

                                <p>
                                    Enter one initial
                                    password. Every
                                    student account in
                                    the selected CSV
                                    will use this
                                    password.
                                </p>
                            </div>

                            <span className="same-password-badge">
                                Same password for all
                            </span>
                        </div>

                        <div className="import-password-fields">
                            <div className="import-password-field">
                                <label htmlFor="student-password">
                                    Password
                                </label>

                                <input
                                    id="student-password"
                                    name="studentPassword"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Enter password"
                                    value={
                                        studentPassword
                                    }
                                    onChange={
                                        event =>
                                            setStudentPassword(
                                                event.target.value
                                            )
                                    }
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="import-password-field">
                                <label htmlFor="confirm-student-password">
                                    Confirm Password
                                </label>

                                <input
                                    id="confirm-student-password"
                                    name="confirmStudentPassword"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Confirm password"
                                    value={
                                        confirmStudentPassword
                                    }
                                    onChange={
                                        event =>
                                            setConfirmStudentPassword(
                                                event.target.value
                                            )
                                    }
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <label className="show-import-password">
                            <input
                                type="checkbox"
                                checked={
                                    showPassword
                                }
                                onChange={
                                    event =>
                                        setShowPassword(
                                            event.target.checked
                                        )
                                }
                            />

                            <span>
                                Show password
                            </span>
                        </label>
                    </div>

                    <div className="csv-upload-area">
                        <input
                            ref={fileInputRef}
                            id="student-csv"
                            type="file"
                            accept=".csv,text/csv"
                            onChange={
                                handleFileChange
                            }
                        />

                        <label
                            htmlFor="student-csv"
                            className="csv-file-button"
                        >
                            Choose CSV File
                        </label>

                        <div className="csv-file-information">
                            {selectedFile ? (
                                <>
                                    <strong>
                                        {
                                            selectedFile.name
                                        }
                                    </strong>

                                    <span>
                                        {
                                            csvStudents.length
                                        }{" "}
                                        student
                                        {csvStudents.length ===
                                        1
                                            ? ""
                                            : "s"}{" "}
                                        detected
                                    </span>
                                </>
                            ) : (
                                <>
                                    <strong>
                                        No CSV file
                                        selected
                                    </strong>

                                    <span>
                                        Select your
                                        completed student
                                        CSV file.
                                    </span>
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            className="import-students-button"
                            disabled={
                                importing ||
                                csvStudents.length ===
                                    0 ||
                                !studentPassword ||
                                !confirmStudentPassword
                            }
                            onClick={
                                handleImportStudents
                            }
                        >
                            {importing
                                ? "Creating Accounts..."
                                : csvStudents.length >
                                  0
                                ? `Import ${csvStudents.length} Student Account${
                                      csvStudents.length ===
                                      1
                                          ? ""
                                          : "s"
                                  }`
                                : "Import Student Accounts"}
                        </button>
                    </div>

                    {selectedFile &&
                        csvStudents.length >
                            0 && (
                            <div className="csv-ready-message">
                                <div className="csv-ready-icon">
                                    ✓
                                </div>

                                <div>
                                    <strong>
                                        CSV Ready
                                    </strong>

                                    <span>
                                        {
                                            csvStudents.length
                                        }{" "}
                                        student account
                                        {csvStudents.length ===
                                        1
                                            ? ""
                                            : "s"}{" "}
                                        ready to be
                                        created.
                                    </span>
                                </div>
                            </div>
                        )}

                    {csvError && (
                        <div className="csv-error-message">
                            {csvError}
                        </div>
                    )}

                    {importMessage && (
                        <div className="csv-success-message">
                            {importMessage}
                        </div>
                    )}

                    {importResults.length >
                        0 && (
                        <div className="import-results">
                            <div className="import-results-header">
                                <h3>
                                    Import Results
                                </h3>

                                <span>
                                    {
                                        importResults.filter(
                                            result =>
                                                result.success
                                        ).length
                                    }{" "}
                                    successful /{" "}
                                    {
                                        importResults.length
                                    }{" "}
                                    total
                                </span>
                            </div>

                            <div className="import-results-list">
                                {importResults.map(
                                    (
                                        result,
                                        index
                                    ) => (
                                        <div
                                            key={`${result.row}-${index}`}
                                            className={
                                                result.success
                                                    ? "import-result success"
                                                    : "import-result failed"
                                            }
                                        >
                                            <span className="import-result-row">
                                                Row{" "}
                                                {
                                                    result.row
                                                }
                                            </span>

                                            <strong>
                                                {result.email ||
                                                    "No email"}
                                            </strong>

                                            <small>
                                                {result.success
                                                    ? "Account created successfully."
                                                    : result.message ||
                                                      "Account creation failed."}
                                            </small>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <section className="students-summary">
                    <div>
                        <strong>
                            {summary.total}
                        </strong>

                        <span>
                            My Students
                        </span>
                    </div>

                    <div>
                        <strong>
                            {summary.active}
                        </strong>

                        <span>
                            Active Students
                        </span>
                    </div>

                    <div>
                        <strong>
                            {summary.inactive}
                        </strong>

                        <span>
                            Inactive Students
                        </span>
                    </div>
                </section>

                <section className="students-table-section">
                    <div className="students-table-header">
                        <div>
                            <h2>
                                My Students
                            </h2>

                            <p>
                                Student accounts
                                assigned to your
                                instructor account.
                            </p>
                        </div>

                        <span className="students-count-badge">
                            {
                                filteredStudents.length
                            }{" "}
                            student
                            {filteredStudents.length ===
                            1
                                ? ""
                                : "s"}
                        </span>
                    </div>

                    <div className="students-toolbar">
                        <input
                            id="student-search"
                            name="studentSearch"
                            type="search"
                            placeholder="Search by name, email, student number, section..."
                            value={search}
                            onChange={
                                event =>
                                    setSearch(
                                        event.target.value
                                    )
                            }
                        />

                        <select
                            id="section-filter"
                            name="sectionFilter"
                            value={
                                sectionFilter
                            }
                            onChange={
                                event =>
                                    setSectionFilter(
                                        event.target.value
                                    )
                            }
                        >
                            <option value="all">
                                All Sections
                            </option>

                            {sections.map(
                                section => (
                                    <option
                                        key={
                                            section
                                        }
                                        value={
                                            section
                                        }
                                    >
                                        {
                                            section
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        <select
                            id="status-filter"
                            name="statusFilter"
                            value={
                                statusFilter
                            }
                            onChange={
                                event =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                            }
                        >
                            <option value="all">
                                All Status
                            </option>

                            <option value="active">
                                Active
                            </option>

                            <option value="inactive">
                                Inactive
                            </option>
                        </select>
                    </div>

                    <div className="students-table-wrapper">
                        <table className="students-data-table">
                            <thead>
                                <tr>
                                    <th>
                                        Student
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
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredStudents.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="students-empty"
                                        >
                                            {students.length ===
                                            0
                                                ? "No students have been created yet."
                                                : "No students match your search or filters."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(
                                        student => (
                                            <tr
                                                key={
                                                    student.id
                                                }
                                            >
                                                <td>
                                                    <div className="student-identity">
                                                        <div>
                                                            {student.name
                                                                .charAt(
                                                                    0
                                                                )
                                                                .toUpperCase()}
                                                        </div>

                                                        <span>
                                                            <strong>
                                                                {
                                                                    student.name
                                                                }
                                                            </strong>

                                                            <small>
                                                                {
                                                                    student.email
                                                                }
                                                            </small>
                                                        </span>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="student-number-text">
                                                        {
                                                            student.number
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="student-section-badge">
                                                        {
                                                            student.section
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    {
                                                        student.yearLevel
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        student.gender
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={`student-status ${student.status.toLowerCase()}`}
                                                    >
                                                        {
                                                            student.status
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default InstructorStudents;