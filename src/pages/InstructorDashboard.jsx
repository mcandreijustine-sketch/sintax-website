import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    onSnapshot
} from "firebase/firestore";
import {
    onValue,
    ref
} from "firebase/database";

import {
    auth,
    db,
    database
} from "../firebase";

import "../css/instructorDashboard.css";
import InstructorBar from "../components/InstructorBar";

function InstructorDashboard() {
    const [instructor, setInstructor] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [search, setSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        let unsubscribeStudentCollection = null;
        let realtimeListeners = [];

        const clearRealtimeListeners = () => {
            realtimeListeners.forEach(unsubscribe => {
                unsubscribe();
            });

            realtimeListeners = [];
        };

        const unsubscribeAuth = onAuthStateChanged(
            auth,
            async currentUser => {
                clearRealtimeListeners();

                if (unsubscribeStudentCollection) {
                    unsubscribeStudentCollection();
                    unsubscribeStudentCollection = null;
                }

                if (!currentUser) {
                    window.location.href = "/login";
                    return;
                }

                try {
                    setLoading(true);
                    setErrorMessage("");

                    const instructorReference = doc(
                        db,
                        "instructors",
                        currentUser.uid
                    );

                    const instructorSnapshot =
                        await getDoc(instructorReference);

                    if (!instructorSnapshot.exists()) {
                        setInstructor(null);
                        setStudents([]);
                        setLoading(false);

                        setErrorMessage(
                            "Instructor account was not found."
                        );

                        return;
                    }

                    const instructorData =
                        instructorSnapshot.data();

                    setInstructor({
                        id: instructorSnapshot.id,
                        ...instructorData
                    });

                    const studentsReference = collection(
                        db,
                        "instructors",
                        currentUser.uid,
                        "students"
                    );

                    unsubscribeStudentCollection = onSnapshot(
                        studentsReference,
                        snapshot => {
                            clearRealtimeListeners();

                            if (snapshot.empty) {
                                setStudents([]);
                                setLoading(false);
                                return;
                            }

                            const studentDataMap = new Map();

                            snapshot.docs.forEach(
                                studentDocument => {
                                    const studentData =
                                        studentDocument.data();

                                    studentDataMap.set(
                                        studentDocument.id,
                                        {
                                            id: studentDocument.id,
                                            ...studentData,
                                            xp: Number(
                                                studentData.xp || 0
                                            ),
                                            progress: Number(
                                                studentData.progress || 0
                                            )
                                        }
                                    );
                                }
                            );

                            setStudents(
                                Array.from(
                                    studentDataMap.values()
                                )
                            );

                            setLoading(false);

                            snapshot.docs.forEach(
                                studentDocument => {
                                    const studentUID =
                                        studentDocument.id;

                                    const firestoreStudent =
                                        studentDocument.data();

                                    const gameReference = ref(
                                        database,
                                        `users/${studentUID}`
                                    );

                                    const unsubscribeGame =
                                        onValue(
                                            gameReference,
                                            gameSnapshot => {
                                                const gameData =
                                                    gameSnapshot.val() || {};

                                                const updatedStudent = {
                                                    id: studentUID,
                                                    ...firestoreStudent,
                                                    ...gameData,
                                                    xp: Number(
                                                        gameData.xp ??
                                                        firestoreStudent.xp ??
                                                        0
                                                    ),
                                                    progress: Number(
                                                        gameData.progress ??
                                                        firestoreStudent.progress ??
                                                        0
                                                    )
                                                };

                                                studentDataMap.set(
                                                    studentUID,
                                                    updatedStudent
                                                );

                                                setStudents(
                                                    Array.from(
                                                        studentDataMap.values()
                                                    )
                                                );

                                                setSelectedStudent(
                                                    currentSelected => {
                                                        if (
                                                            currentSelected?.id ===
                                                            studentUID
                                                        ) {
                                                            return updatedStudent;
                                                        }

                                                        return currentSelected;
                                                    }
                                                );
                                            },
                                            error => {
                                                console.error(
                                                    "Student game data error:",
                                                    error
                                                );
                                            }
                                        );

                                    realtimeListeners.push(
                                        unsubscribeGame
                                    );
                                }
                            );
                        },
                        error => {
                            console.error(
                                "Student collection error:",
                                error
                            );

                            setStudents([]);
                            setLoading(false);

                            setErrorMessage(
                                error.message ||
                                "Unable to load students."
                            );
                        }
                    );
                } catch (error) {
                    console.error(
                        "Instructor dashboard error:",
                        error
                    );

                    setStudents([]);
                    setLoading(false);

                    setErrorMessage(
                        error.message ||
                        "Unable to load instructor dashboard."
                    );
                }
            }
        );

        return () => {
            unsubscribeAuth();

            if (unsubscribeStudentCollection) {
                unsubscribeStudentCollection();
            }

            clearRealtimeListeners();
        };
    }, []);

    useEffect(() => {
        if (!selectedStudent) {
            return;
        }

        const handleEscape = event => {
            if (event.key === "Escape") {
                setSelectedStudent(null);
            }
        };

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [selectedStudent]);

    const getStudentName = student => {
        if (student.fullName) {
            return student.fullName;
        }

        if (student.name) {
            return student.name;
        }

        if (student.email) {
            return student.email.split("@")[0];
        }

        return "Unknown Student";
    };

    const getInitial = student => {
        return getStudentName(student)
            .charAt(0)
            .toUpperCase();
    };

    const getInstructorInitial = () => {
        if (!instructor?.fullName) {
            return "I";
        }

        return instructor.fullName
            .charAt(0)
            .toUpperCase();
    };

    const getProgress = student => {
        const progress = Number(
            student.progress || 0
        );

        if (Number.isNaN(progress)) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(0, progress)
        );
    };

    const getLevel = student => {
        if (
            student.level !== undefined &&
            student.level !== null
        ) {
            return student.level;
        }

        return "—";
    };

    const filteredStudents = useMemo(() => {
        const value = search
            .trim()
            .toLowerCase();

        if (!value) {
            return students;
        }

        return students.filter(student => {
            const name = getStudentName(student)
                .toLowerCase();

            const email = String(
                student.email || ""
            ).toLowerCase();

            const studentNumber = String(
                student.studentNumber || ""
            ).toLowerCase();

            const section = String(
                student.section || ""
            ).toLowerCase();

            const yearLevel = String(
                student.yearLevel || ""
            ).toLowerCase();

            return (
                name.includes(value) ||
                email.includes(value) ||
                studentNumber.includes(value) ||
                section.includes(value) ||
                yearLevel.includes(value)
            );
        });
    }, [students, search]);

    const rankedStudents = useMemo(() => {
        return [...filteredStudents].sort(
            (firstStudent, secondStudent) =>
                Number(secondStudent.xp || 0) -
                Number(firstStudent.xp || 0)
        );
    }, [filteredStudents]);

    const allRankedStudents = useMemo(() => {
        return [...students].sort(
            (firstStudent, secondStudent) =>
                Number(secondStudent.xp || 0) -
                Number(firstStudent.xp || 0)
        );
    }, [students]);

    const totalStudents = students.length;

    const totalXp = students.reduce(
        (total, student) =>
            total + Number(student.xp || 0),
        0
    );

    const averageXp =
        totalStudents > 0
            ? Math.round(
                totalXp / totalStudents
            )
            : 0;

    const highestXp =
        totalStudents > 0
            ? Math.max(
                ...students.map(
                    student =>
                        Number(student.xp || 0)
                )
            )
            : 0;

    const averageProgress =
        totalStudents > 0
            ? Math.round(
                students.reduce(
                    (total, student) =>
                        total +
                        getProgress(student),
                    0
                ) / totalStudents
            )
            : 0;

    return (
        <div className="instructor-dashboard-page">
            <InstructorBar />

            <main className="instructor-dashboard-content">
                <header className="instructor-dashboard-header">
                    <div>
                        <h1>
                            Instructor Dashboard
                        </h1>

                        <p>
                            Monitor the progress of students
                            assigned to your account.
                        </p>
                    </div>

                    <div className="instructor-profile">
                        <div className="instructor-avatar">
                            {getInstructorInitial()}
                        </div>

                        <div className="instructor-profile-info">
                            <strong>
                                {instructor?.fullName ||
                                    "Instructor"}
                            </strong>

                            <span>
                                {instructor?.email ||
                                    "Student Progress Monitor"}
                            </span>
                        </div>
                    </div>
                </header>

                {errorMessage && (
                    <div className="student-error-message">
                        <strong>
                            Unable to load dashboard
                        </strong>

                        <p>
                            {errorMessage}
                        </p>
                    </div>
                )}

                <section className="instructor-stat-grid">
                    <div className="instructor-stat-card">
                        <span>
                            My Students
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : totalStudents}
                        </h2>

                        <p>
                            Students assigned to you
                        </p>
                    </div>

                    <div className="instructor-stat-card">
                        <span>
                            Average Progress
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : `${averageProgress}%`}
                        </h2>

                        <p>
                            Overall class progress
                        </p>
                    </div>

                    <div className="instructor-stat-card">
                        <span>
                            Average XP
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : averageXp.toLocaleString()}
                        </h2>

                        <p>
                            Average student XP
                        </p>
                    </div>

                    <div className="instructor-stat-card">
                        <span>
                            Highest XP
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : highestXp.toLocaleString()}
                        </h2>

                        <p>
                            Highest student XP
                        </p>
                    </div>
                </section>

                <section className="instructor-overview-grid">
                    <div className="instructor-panel">
                        <div className="instructor-panel-header">
                            <h2>
                                Class Progress Overview
                            </h2>

                            <p>
                                Overall performance of your
                                assigned students.
                            </p>
                        </div>

                        <div className="module-progress-list">
                            <div className="module-progress-item">
                                <div className="module-progress-header">
                                    <span>
                                        Average Progress
                                    </span>

                                    <strong>
                                        {averageProgress}%
                                    </strong>
                                </div>

                                <div className="module-progress-track">
                                    <div
                                        style={{
                                            width:
                                                `${averageProgress}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="module-progress-item">
                                <div className="module-progress-header">
                                    <span>
                                        Average XP
                                    </span>

                                    <strong>
                                        {averageXp.toLocaleString()} XP
                                    </strong>
                                </div>

                                <div className="module-progress-track">
                                    <div
                                        style={{
                                            width:
                                                highestXp > 0
                                                    ? `${Math.min(
                                                        100,
                                                        (
                                                            averageXp /
                                                            highestXp
                                                        ) *
                                                        100
                                                    )}%`
                                                    : "0%"
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="module-progress-item">
                                <div className="module-progress-header">
                                    <span>
                                        Total Class XP
                                    </span>

                                    <strong>
                                        {totalXp.toLocaleString()} XP
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="instructor-panel">
                        <div className="instructor-panel-header">
                            <h2>
                                Top Students
                            </h2>

                            <p>
                                Students with the highest XP.
                            </p>
                        </div>

                        <div className="top-ranking-list">
                            {loading ? (
                                <div className="top-ranking-empty">
                                    Loading students...
                                </div>
                            ) : allRankedStudents.length === 0 ? (
                                <div className="top-ranking-empty">
                                    No students assigned yet.
                                </div>
                            ) : (
                                allRankedStudents
                                    .slice(0, 3)
                                    .map(
                                        (
                                            student,
                                            index
                                        ) => (
                                            <div
                                                className="top-ranking-item"
                                                key={student.id}
                                            >
                                                <div
                                                    className={`ranking-number ranking-number-${
                                                        index + 1
                                                    }`}
                                                >
                                                    {index + 1}
                                                </div>

                                                <div className="top-ranking-details">
                                                    <strong>
                                                        {getStudentName(
                                                            student
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {Number(
                                                            student.xp ||
                                                            0
                                                        ).toLocaleString()}{" "}
                                                        XP
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )
                            )}
                        </div>
                    </div>
                </section>

                <section className="instructor-users-section">
                    <div className="instructor-users-header">
                        <div>
                            <h2>
                                Student Progress
                            </h2>

                            <p>
                                Monitor the progress of students
                                assigned to your account.
                            </p>
                        </div>

                        <div className="instructor-users-search">
                            <input
                                id="student-search"
                                name="studentSearch"
                                type="search"
                                placeholder="Search students..."
                                value={search}
                                onChange={event =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="instructor-users-table-container">
                        <table className="instructor-users-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Student Number</th>
                                    <th>Section</th>
                                    <th>Year Level</th>
                                    <th>Level</th>
                                    <th>XP</th>
                                    <th>Progress</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            className="instructor-table-message"
                                        >
                                            Loading students...
                                        </td>
                                    </tr>
                                ) : rankedStudents.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            className="instructor-table-message"
                                        >
                                            No students assigned
                                            to this instructor.
                                        </td>
                                    </tr>
                                ) : (
                                    rankedStudents.map(
                                        student => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div className="instructor-user-cell">
                                                        <div className="instructor-user-avatar">
                                                            {getInitial(
                                                                student
                                                            )}
                                                        </div>

                                                        <div className="instructor-user-info">
                                                            <strong>
                                                                {getStudentName(
                                                                    student
                                                                )}
                                                            </strong>

                                                            <span>
                                                                {student.email ||
                                                                    "No email"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="instructor-student-number">
                                                        {student.studentNumber ||
                                                            "—"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="instructor-section-badge">
                                                        {student.section ||
                                                            "—"}
                                                    </span>
                                                </td>

                                                <td>
                                                    {student.yearLevel ||
                                                        "—"}
                                                </td>

                                                <td>
                                                    <span className="instructor-level-badge">
                                                        {getLevel(
                                                            student
                                                        ) === "—"
                                                            ? "—"
                                                            : `Level ${getLevel(
                                                                student
                                                            )}`}
                                                    </span>
                                                </td>

                                                <td>
                                                    <strong className="instructor-xp-value">
                                                        {Number(
                                                            student.xp ||
                                                            0
                                                        ).toLocaleString()}{" "}
                                                        XP
                                                    </strong>
                                                </td>

                                                <td>
                                                    <div className="instructor-progress-cell">
                                                        <div className="instructor-progress-track">
                                                            <div
                                                                style={{
                                                                    width:
                                                                        `${getProgress(
                                                                            student
                                                                        )}%`
                                                                }}
                                                            />
                                                        </div>

                                                        <span>
                                                            {getProgress(
                                                                student
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                </td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        className="instructor-view-button"
                                                        onClick={() =>
                                                            setSelectedStudent(
                                                                student
                                                            )
                                                        }
                                                    >
                                                        View
                                                    </button>
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

            {selectedStudent && (
                <div
                    className="student-progress-modal-overlay"
                    onMouseDown={event => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setSelectedStudent(null);
                        }
                    }}
                >
                    <div className="student-progress-modal">
                        <div className="student-progress-modal-header">
                            <div className="modal-student-profile">
                                <div className="modal-student-avatar">
                                    {getInitial(
                                        selectedStudent
                                    )}
                                </div>

                                <div>
                                    <h2>
                                        {getStudentName(
                                            selectedStudent
                                        )}
                                    </h2>

                                    <p>
                                        {selectedStudent.email ||
                                            "No email available"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="close-progress-modal"
                                onClick={() =>
                                    setSelectedStudent(null)
                                }
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="student-information-grid">
                            <div className="student-information-card">
                                <span>
                                    Student Number
                                </span>

                                <strong>
                                    {selectedStudent.studentNumber ||
                                        "—"}
                                </strong>
                            </div>

                            <div className="student-information-card">
                                <span>
                                    Section
                                </span>

                                <strong>
                                    {selectedStudent.section ||
                                        "—"}
                                </strong>
                            </div>

                            <div className="student-information-card">
                                <span>
                                    Year Level
                                </span>

                                <strong>
                                    {selectedStudent.yearLevel ||
                                        "—"}
                                </strong>
                            </div>

                            <div className="student-information-card">
                                <span>
                                    Level
                                </span>

                                <strong>
                                    {getLevel(
                                        selectedStudent
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="modal-progress-stat-grid">
                            <div className="modal-progress-stat">
                                <span>
                                    Current XP
                                </span>

                                <strong>
                                    {Number(
                                        selectedStudent.xp ||
                                        0
                                    ).toLocaleString()}{" "}
                                    XP
                                </strong>
                            </div>

                            <div className="modal-progress-stat">
                                <span>
                                    Overall Progress
                                </span>

                                <strong>
                                    {getProgress(
                                        selectedStudent
                                    )}
                                    %
                                </strong>
                            </div>
                        </div>

                        <div className="student-overall-progress">
                            <div className="student-overall-progress-header">
                                <span>
                                    Overall Game Progress
                                </span>

                                <strong>
                                    {getProgress(
                                        selectedStudent
                                    )}
                                    %
                                </strong>
                            </div>

                            <div className="student-overall-progress-track">
                                <div
                                    style={{
                                        width:
                                            `${getProgress(
                                                selectedStudent
                                            )}%`
                                    }}
                                />
                            </div>
                        </div>

                        <div className="student-module-section">
                            <h3>
                                Module Progress
                            </h3>

                            {selectedStudent.modules &&
                            typeof selectedStudent.modules ===
                                "object" ? (
                                <div className="student-module-list">
                                    {Object.entries(
                                        selectedStudent.modules
                                    ).map(
                                        ([
                                            moduleName,
                                            moduleData
                                        ]) => {
                                            const rawProgress =
                                                typeof moduleData ===
                                                "object"
                                                    ? Number(
                                                        moduleData.progress ||
                                                        0
                                                    )
                                                    : Number(
                                                        moduleData ||
                                                        0
                                                    );

                                            const moduleProgress =
                                                Number.isNaN(
                                                    rawProgress
                                                )
                                                    ? 0
                                                    : Math.min(
                                                        100,
                                                        Math.max(
                                                            0,
                                                            rawProgress
                                                        )
                                                    );

                                            return (
                                                <div
                                                    className="student-module-item"
                                                    key={
                                                        moduleName
                                                    }
                                                >
                                                    <div className="student-module-header">
                                                        <span>
                                                            {
                                                                moduleName
                                                            }
                                                        </span>

                                                        <strong>
                                                            {
                                                                moduleProgress
                                                            }
                                                            %
                                                        </strong>
                                                    </div>

                                                    <div className="student-module-track">
                                                        <div
                                                            style={{
                                                                width:
                                                                    `${moduleProgress}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            ) : (
                                <div className="no-module-data">
                                    No module progress data
                                    available yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstructorDashboard;