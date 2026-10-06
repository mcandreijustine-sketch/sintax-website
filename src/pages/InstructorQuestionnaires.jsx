import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import InstructorBar from "../components/InstructorBar";
import "../css/InstructorQuestionnaires.css";

function InstructorQuestionnaires() {
    const API_URL =
        import.meta.env.VITE_API_URL || "";

    const navigate = useNavigate();

    const [questions, setQuestions] =
        useState([]);

    const [csvQuestions, setCsvQuestions] =
        useState([]);

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [importing, setImporting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [importResults, setImportResults] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [typeFilter, setTypeFilter] =
        useState("all");

    const [npcFilter, setNpcFilter] =
        useState("all");

    const [editingQuestion, setEditingQuestion] =
        useState(null);

    const [savingEdit, setSavingEdit] =
        useState(false);

    const getToken = async () => {
        if (!auth.currentUser) {
            throw new Error(
                "You must be logged in as an instructor."
            );
        }

        return auth.currentUser.getIdToken();
    };

    const loadQuestions = async () => {
        try {
            const token =
                await getToken();

            const response =
                await fetch(
                    `${API_URL}/api/questions`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load questions."
                );
            }

            setQuestions(
                Array.isArray(data.questions)
                    ? data.questions
                    : []
            );
        } catch (loadError) {
            console.error(loadError);

            setError(
                loadError.message ||
                "Unable to load questions."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                async user => {
                    if (!user) {
                        navigate("/login");
                        return;
                    }

                    try {
                        const userSnapshot =
                            await getDoc(
                                doc(
                                    db,
                                    "users",
                                    user.uid
                                )
                            );

                        if (
                            !userSnapshot.exists()
                        ) {
                            navigate("/login");
                            return;
                        }

                        const userData =
                            userSnapshot.data();

                        if (
                            userData.role !==
                            "instructor"
                        ) {
                            navigate("/login");
                            return;
                        }

                        if (
                            userData.status ===
                            "inactive"
                        ) {
                            navigate("/login");
                            return;
                        }

                        await loadQuestions();
                    } catch (
                        authError
                    ) {
                        console.error(
                            authError
                        );

                        setError(
                            "Unable to verify instructor account."
                        );

                        setLoading(false);
                    }
                }
            );

        return () =>
            unsubscribe();
    }, []);

    const parseCsvLine = line => {
        const values = [];

        let current = "";
        let insideQuotes = false;

        for (
            let index = 0;
            index < line.length;
            index += 1
        ) {
            const character =
                line[index];

            if (
                character === '"'
            ) {
                if (
                    insideQuotes &&
                    line[index + 1] ===
                    '"'
                ) {
                    current += '"';
                    index += 1;
                } else {
                    insideQuotes =
                        !insideQuotes;
                }
            } else if (
                character === "," &&
                !insideQuotes
            ) {
                values.push(
                    current.trim()
                );

                current = "";
            } else {
                current +=
                    character;
            }
        }

        values.push(
            current.trim()
        );

        return values;
    };

    const parseCsv = text => {
        const normalizedText =
            text
                .replace(
                    /^\uFEFF/,
                    ""
                )
                .replace(
                    /\r\n/g,
                    "\n"
                )
                .replace(
                    /\r/g,
                    "\n"
                );

        const rawLines =
            normalizedText.split("\n");

        const records = [];
        let currentRecord = "";
        let quoteCount = 0;

        rawLines.forEach(line => {
            if (currentRecord) {
                currentRecord +=
                    "\n";
            }

            currentRecord +=
                line;

            const quotes =
                (
                    line.match(
                        /"/g
                    ) || []
                ).length;

            quoteCount +=
                quotes;

            if (
                quoteCount % 2 ===
                0
            ) {
                if (
                    currentRecord.trim()
                ) {
                    records.push(
                        currentRecord
                    );
                }

                currentRecord = "";
                quoteCount = 0;
            }
        });

        if (
            currentRecord.trim()
        ) {
            records.push(
                currentRecord
            );
        }

        if (
            records.length <
            2
        ) {
            throw new Error(
                "The CSV file does not contain any question records."
            );
        }

        const headers =
            parseCsvLine(
                records[0]
            ).map(header =>
                header.trim()
            );

        const requiredHeaders = [
            "questionId",
            "npcId",
            "type",
            "question",
            "choiceA",
            "choiceB",
            "choiceC",
            "choiceD",
            "correctAnswer",
            "difficulty"
        ];

        const missingHeaders =
            requiredHeaders.filter(
                header =>
                    !headers.includes(
                        header
                    )
            );

        if (
            missingHeaders.length >
            0
        ) {
            throw new Error(
                `Missing CSV column(s): ${missingHeaders.join(", ")}`
            );
        }

        const parsedQuestions =
            records
                .slice(1)
                .map(record => {
                    const values =
                        parseCsvLine(
                            record
                        );

                    const row = {};

                    headers.forEach(
                        (
                            header,
                            index
                        ) => {
                            row[header] =
                                values[index] ??
                                "";
                        }
                    );

                    return row;
                })
                .filter(row =>
                    Object.values(
                        row
                    ).some(value =>
                        String(
                            value
                        ).trim()
                    )
                );

        if (
            parsedQuestions.length ===
            0
        ) {
            throw new Error(
                "No questions were found in the CSV file."
            );
        }

        return parsedQuestions;
    };

    const handleFileChange =
        event => {
            const file =
                event.target
                    .files?.[0];

            setMessage("");
            setError("");
            setImportResults([]);
            setCsvQuestions([]);

            if (!file) {
                setSelectedFile(
                    null
                );
                return;
            }

            if (
                !file.name
                    .toLowerCase()
                    .endsWith(".csv")
            ) {
                setSelectedFile(
                    null
                );

                setError(
                    "Please select a CSV file."
                );

                event.target.value =
                    "";

                return;
            }

            setSelectedFile(file);

            const reader =
                new FileReader();

            reader.onload =
                readerEvent => {
                    try {
                        const parsed =
                            parseCsv(
                                String(
                                    readerEvent
                                        .target
                                        .result ||
                                    ""
                                )
                            );

                        setCsvQuestions(
                            parsed
                        );
                    } catch (
                        parseError
                    ) {
                        setCsvQuestions(
                            []
                        );

                        setError(
                            parseError.message
                        );
                    }
                };

            reader.onerror =
                () => {
                    setError(
                        "Unable to read the CSV file."
                    );
                };

            reader.readAsText(
                file
            );
        };

    const handleImport =
        async () => {
            if (
                csvQuestions.length ===
                0
            ) {
                setError(
                    "Please select a valid CSV file first."
                );

                return;
            }

            setImporting(true);
            setError("");
            setMessage("");
            setImportResults([]);

            try {
                const token =
                    await getToken();

                const response =
                    await fetch(
                        `${API_URL}/api/import-questions`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`
                            },

                            body:
                                JSON.stringify({
                                    questions:
                                        csvQuestions
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Unable to import questions."
                    );
                }

                setImportResults(
                    Array.isArray(
                        data.results
                    )
                        ? data.results
                        : []
                );

                setMessage(
                    data.message ||
                    "Question import completed."
                );

                await loadQuestions();
            } catch (
                importError
            ) {
                console.error(
                    importError
                );

                setError(
                    importError.message ||
                    "Unable to import questions."
                );
            } finally {
                setImporting(false);
            }
        };

    const downloadTemplate =
        () => {
            const template = [
                [
                    "questionId",
                    "npcId",
                    "type",
                    "question",
                    "choiceA",
                    "choiceB",
                    "choiceC",
                    "choiceD",
                    "correctAnswer",
                    "difficulty"
                ].join(","),

                [
                    "Q001",
                    "npc_001",
                    "multiple_choice",
                    '"Which keyword is used to declare a class in Java?"',
                    "class",
                    "define",
                    "object",
                    "new",
                    "A",
                    "Easy"
                ].join(","),

                [
                    "Q002",
                    "npc_001",
                    "true_false",
                    '"Java is an object-oriented programming language."',
                    "",
                    "",
                    "",
                    "",
                    "True",
                    "Easy"
                ].join(","),

                [
                    "Q003",
                    "npc_002",
                    "identification",
                    '"What does JVM stand for?"',
                    "",
                    "",
                    "",
                    "",
                    '"Java Virtual Machine"',
                    "Medium"
                ].join(",")
            ].join("\n");

            const blob =
                new Blob(
                    [template],
                    {
                        type:
                            "text/csv;charset=utf-8;"
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
                "sintax-questionnaire-template.csv";

            document.body.appendChild(
                link
            );

            link.click();

            document.body.removeChild(
                link
            );

            URL.revokeObjectURL(
                url
            );
        };

    const handleDelete =
        async question => {
            const confirmed =
                window.confirm(
                    `Delete ${question.questionId}?`
                );

            if (!confirmed) {
                return;
            }

            setError("");
            setMessage("");

            try {
                const token =
                    await getToken();

                const response =
                    await fetch(
                        `${API_URL}/api/questions/${encodeURIComponent(
                            question.questionId
                        )}`,
                        {
                            method:
                                "DELETE",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Unable to delete question."
                    );
                }

                setMessage(
                    data.message
                );

                await loadQuestions();
            } catch (
                deleteError
            ) {
                setError(
                    deleteError.message ||
                    "Unable to delete question."
                );
            }
        };

    const handleEditChange =
        event => {
            const {
                name,
                value
            } = event.target;

            setEditingQuestion(
                previous => ({
                    ...previous,
                    [name]:
                        value
                })
            );
        };

    const handleSaveEdit =
        async event => {
            event.preventDefault();

            if (!editingQuestion) {
                return;
            }

            setSavingEdit(true);
            setError("");
            setMessage("");

            try {
                const token =
                    await getToken();

                const response =
                    await fetch(
                        `${API_URL}/api/questions/${encodeURIComponent(
                            editingQuestion
                                .questionId
                        )}`,
                        {
                            method:
                                "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`
                            },

                            body:
                                JSON.stringify({
                                    npcId:
                                        editingQuestion.npcId,

                                    type:
                                        editingQuestion.type,

                                    question:
                                        editingQuestion.question,

                                    choiceA:
                                        editingQuestion.choiceA ||
                                        "",

                                    choiceB:
                                        editingQuestion.choiceB ||
                                        "",

                                    choiceC:
                                        editingQuestion.choiceC ||
                                        "",

                                    choiceD:
                                        editingQuestion.choiceD ||
                                        "",

                                    correctAnswer:
                                        editingQuestion.correctAnswer,

                                    difficulty:
                                        editingQuestion.difficulty
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Unable to update question."
                    );
                }

                setEditingQuestion(
                    null
                );

                setMessage(
                    data.message
                );

                await loadQuestions();
            } catch (
                editError
            ) {
                setError(
                    editError.message ||
                    "Unable to update question."
                );
            } finally {
                setSavingEdit(false);
            }
        };

    const npcOptions =
        useMemo(
            () =>
                [
                    ...new Set(
                        questions
                            .map(
                                question =>
                                    question.npcId
                            )
                            .filter(
                                Boolean
                            )
                    )
                ].sort(),
            [questions]
        );

    const filteredQuestions =
        useMemo(
            () => {
                const query =
                    search
                        .trim()
                        .toLowerCase();

                return questions.filter(
                    item => {
                        const matchesSearch =
                            !query ||
                            String(
                                item.questionId ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||
                            String(
                                item.npcId ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||
                            String(
                                item.question ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                );

                        const matchesType =
                            typeFilter ===
                                "all" ||
                            item.type ===
                                typeFilter;

                        const matchesNpc =
                            npcFilter ===
                                "all" ||
                            item.npcId ===
                                npcFilter;

                        return (
                            matchesSearch &&
                            matchesType &&
                            matchesNpc
                        );
                    }
                );
            },
            [
                questions,
                search,
                typeFilter,
                npcFilter
            ]
        );

    const csvTypeCount =
        type =>
            csvQuestions.filter(
                question =>
                    String(
                        question.type ||
                        ""
                    )
                        .trim()
                        .toLowerCase()
                        .replace(
                            /[\s-]+/g,
                            "_"
                        ) === type
            ).length;

    const formatType =
        type => {
            if (
                type ===
                "multiple_choice"
            ) {
                return "Multiple Choice";
            }

            if (
                type ===
                "true_false"
            ) {
                return "True / False";
            }

            if (
                type ===
                "identification"
            ) {
                return "Identification";
            }

            return type || "-";
        };

    if (loading) {
        return (
            <>
                <InstructorBar />

                <main className="questionnaire-page">
                    <div className="questionnaire-loading">
                        Loading questionnaires...
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <InstructorBar />

            <main className="questionnaire-page">
                <section className="questionnaire-header">
                    <div>
                        <p className="questionnaire-eyebrow">
                            SINTAX Instructor
                        </p>

                        <h1>
                            Questionnaire Management
                        </h1>

                        <p>
                            Upload and manage the
                            questions that will be
                            displayed by NPCs in your
                            students' game.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="questionnaire-template-button"
                        onClick={
                            downloadTemplate
                        }
                    >
                        Download CSV Template
                    </button>
                </section>

                {message && (
                    <div className="questionnaire-message success">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="questionnaire-message error">
                        {error}
                    </div>
                )}

                <section className="questionnaire-upload-card">
                    <div className="questionnaire-card-heading">
                        <div>
                            <h2>
                                Upload Questionnaire
                            </h2>

                            <p>
                                Upload a CSV containing
                                Multiple Choice, True /
                                False, or Identification
                                questions.
                            </p>
                        </div>
                    </div>

                    <label className="questionnaire-file-box">
                        <span className="questionnaire-file-title">
                            Select CSV File
                        </span>

                        <span className="questionnaire-file-name">
                            {selectedFile
                                ? selectedFile.name
                                : "No CSV file selected"}
                        </span>

                        <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={
                                handleFileChange
                            }
                        />
                    </label>

                    {csvQuestions.length >
                        0 && (
                        <>
                            <div className="questionnaire-preview-stats">
                                <div>
                                    <strong>
                                        {
                                            csvQuestions.length
                                        }
                                    </strong>
                                    <span>
                                        Total Questions
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        {csvTypeCount(
                                            "multiple_choice"
                                        )}
                                    </strong>
                                    <span>
                                        Multiple Choice
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        {csvTypeCount(
                                            "true_false"
                                        )}
                                    </strong>
                                    <span>
                                        True / False
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        {csvTypeCount(
                                            "identification"
                                        )}
                                    </strong>
                                    <span>
                                        Identification
                                    </span>
                                </div>
                            </div>

                            <div className="questionnaire-preview">
                                <h3>
                                    CSV Preview
                                </h3>

                                <div className="questionnaire-table-wrapper">
                                    <table className="questionnaire-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    ID
                                                </th>
                                                <th>
                                                    NPC
                                                </th>
                                                <th>
                                                    Type
                                                </th>
                                                <th>
                                                    Question
                                                </th>
                                                <th>
                                                    Answer
                                                </th>
                                                <th>
                                                    Difficulty
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {csvQuestions
                                                .slice(
                                                    0,
                                                    10
                                                )
                                                .map(
                                                    (
                                                        question,
                                                        index
                                                    ) => (
                                                        <tr
                                                            key={`${question.questionId}-${index}`}
                                                        >
                                                            <td>
                                                                {
                                                                    question.questionId
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    question.npcId
                                                                }
                                                            </td>

                                                            <td>
                                                                {formatType(
                                                                    String(
                                                                        question.type ||
                                                                        ""
                                                                    )
                                                                        .trim()
                                                                        .toLowerCase()
                                                                        .replace(
                                                                            /[\s-]+/g,
                                                                            "_"
                                                                        )
                                                                )}
                                                            </td>

                                                            <td className="questionnaire-question-cell">
                                                                {
                                                                    question.question
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    question.correctAnswer
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    question.difficulty
                                                                }
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                        </tbody>
                                    </table>
                                </div>

                                {csvQuestions.length >
                                    10 && (
                                    <p className="questionnaire-preview-note">
                                        Showing the first
                                        10 of{" "}
                                        {
                                            csvQuestions.length
                                        }{" "}
                                        questions.
                                    </p>
                                )}
                            </div>

                            <div className="questionnaire-import-actions">
                                <button
                                    type="button"
                                    className="questionnaire-import-button"
                                    onClick={
                                        handleImport
                                    }
                                    disabled={
                                        importing
                                    }
                                >
                                    {importing
                                        ? "Importing..."
                                        : "Import Questions"}
                                </button>
                            </div>
                        </>
                    )}
                </section>

                {importResults.length >
                    0 && (
                    <section className="questionnaire-results-card">
                        <h2>
                            Import Results
                        </h2>

                        <div className="questionnaire-results-list">
                            {importResults.map(
                                (
                                    result,
                                    index
                                ) => (
                                    <div
                                        key={`${result.row}-${index}`}
                                        className={
                                            result.success
                                                ? "questionnaire-result success"
                                                : "questionnaire-result failed"
                                        }
                                    >
                                        <strong>
                                            Row{" "}
                                            {
                                                result.row
                                            }
                                            {result.questionId
                                                ? ` - ${result.questionId}`
                                                : ""}
                                        </strong>

                                        <span>
                                            {
                                                result.message
                                            }
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </section>
                )}

                <section className="questionnaire-list-card">
                    <div className="questionnaire-list-heading">
                        <div>
                            <h2>
                                Your Questions
                            </h2>

                            <p>
                                Only questions belonging
                                to your instructor
                                account are shown here.
                            </p>
                        </div>

                        <div className="questionnaire-total">
                            {questions.length}{" "}
                            Questions
                        </div>
                    </div>

                    <div className="questionnaire-filters">
                        <input
                            type="search"
                            placeholder="Search ID, NPC, or question..."
                            value={search}
                            onChange={
                                event =>
                                    setSearch(
                                        event.target
                                            .value
                                    )
                            }
                        />

                        <select
                            value={
                                typeFilter
                            }
                            onChange={
                                event =>
                                    setTypeFilter(
                                        event.target
                                            .value
                                    )
                            }
                        >
                            <option value="all">
                                All Types
                            </option>

                            <option value="multiple_choice">
                                Multiple Choice
                            </option>

                            <option value="true_false">
                                True / False
                            </option>

                            <option value="identification">
                                Identification
                            </option>
                        </select>

                        <select
                            value={
                                npcFilter
                            }
                            onChange={
                                event =>
                                    setNpcFilter(
                                        event.target
                                            .value
                                    )
                            }
                        >
                            <option value="all">
                                All NPCs
                            </option>

                            {npcOptions.map(
                                npcId => (
                                    <option
                                        key={
                                            npcId
                                        }
                                        value={
                                            npcId
                                        }
                                    >
                                        {npcId}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="questionnaire-table-wrapper">
                        <table className="questionnaire-table">
                            <thead>
                                <tr>
                                    <th>
                                        Question ID
                                    </th>
                                    <th>
                                        NPC ID
                                    </th>
                                    <th>
                                        Type
                                    </th>
                                    <th>
                                        Question
                                    </th>
                                    <th>
                                        Answer
                                    </th>
                                    <th>
                                        Difficulty
                                    </th>
                                    <th>
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredQuestions.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="questionnaire-empty"
                                        >
                                            No questions
                                            found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuestions.map(
                                        question => (
                                            <tr
                                                key={
                                                    question.questionId
                                                }
                                            >
                                                <td>
                                                    <strong>
                                                        {
                                                            question.questionId
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        question.npcId
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={`questionnaire-type-badge ${question.type}`}
                                                    >
                                                        {formatType(
                                                            question.type
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="questionnaire-question-cell">
                                                    {
                                                        question.question
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        question.correctAnswer
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        question.difficulty
                                                    }
                                                </td>

                                                <td>
                                                    <div className="questionnaire-actions">
                                                        <button
                                                            type="button"
                                                            className="questionnaire-edit-button"
                                                            onClick={() =>
                                                                setEditingQuestion(
                                                                    {
                                                                        ...question
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="questionnaire-delete-button"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    question
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
                </section>
            </main>

            {editingQuestion && (
                <div className="questionnaire-modal-overlay">
                    <div className="questionnaire-modal">
                        <div className="questionnaire-modal-header">
                            <div>
                                <h2>
                                    Edit Question
                                </h2>

                                <p>
                                    {
                                        editingQuestion.questionId
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                className="questionnaire-close-button"
                                onClick={() =>
                                    setEditingQuestion(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleSaveEdit
                            }
                        >
                            <div className="questionnaire-form-grid">
                                <label>
                                    Question ID
                                    <input
                                        type="text"
                                        value={
                                            editingQuestion.questionId
                                        }
                                        disabled
                                    />
                                </label>

                                <label>
                                    NPC ID
                                    <input
                                        type="text"
                                        name="npcId"
                                        value={
                                            editingQuestion.npcId ||
                                            ""
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Question Type
                                    <select
                                        name="type"
                                        value={
                                            editingQuestion.type ||
                                            "multiple_choice"
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    >
                                        <option value="multiple_choice">
                                            Multiple Choice
                                        </option>

                                        <option value="true_false">
                                            True /
                                            False
                                        </option>

                                        <option value="identification">
                                            Identification
                                        </option>
                                    </select>
                                </label>

                                <label>
                                    Difficulty
                                    <select
                                        name="difficulty"
                                        value={
                                            editingQuestion.difficulty ||
                                            "Easy"
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    >
                                        <option value="Easy">
                                            Easy
                                        </option>

                                        <option value="Medium">
                                            Medium
                                        </option>

                                        <option value="Hard">
                                            Hard
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <label className="questionnaire-full-field">
                                Question
                                <textarea
                                    name="question"
                                    value={
                                        editingQuestion.question ||
                                        ""
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    required
                                    rows="4"
                                />
                            </label>

                            {editingQuestion.type ===
                                "multiple_choice" && (
                                <div className="questionnaire-form-grid">
                                    <label>
                                        Choice A
                                        <input
                                            type="text"
                                            name="choiceA"
                                            value={
                                                editingQuestion.choiceA ||
                                                ""
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            required
                                        />
                                    </label>

                                    <label>
                                        Choice B
                                        <input
                                            type="text"
                                            name="choiceB"
                                            value={
                                                editingQuestion.choiceB ||
                                                ""
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            required
                                        />
                                    </label>

                                    <label>
                                        Choice C
                                        <input
                                            type="text"
                                            name="choiceC"
                                            value={
                                                editingQuestion.choiceC ||
                                                ""
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            required
                                        />
                                    </label>

                                    <label>
                                        Choice D
                                        <input
                                            type="text"
                                            name="choiceD"
                                            value={
                                                editingQuestion.choiceD ||
                                                ""
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            required
                                        />
                                    </label>
                                </div>
                            )}

                            <label className="questionnaire-full-field">
                                Correct Answer

                                {editingQuestion.type ===
                                "multiple_choice" ? (
                                    <select
                                        name="correctAnswer"
                                        value={
                                            editingQuestion.correctAnswer ||
                                            "A"
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    >
                                        <option value="A">
                                            A
                                        </option>

                                        <option value="B">
                                            B
                                        </option>

                                        <option value="C">
                                            C
                                        </option>

                                        <option value="D">
                                            D
                                        </option>
                                    </select>
                                ) : editingQuestion.type ===
                                  "true_false" ? (
                                    <select
                                        name="correctAnswer"
                                        value={
                                            editingQuestion.correctAnswer ||
                                            "True"
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    >
                                        <option value="True">
                                            True
                                        </option>

                                        <option value="False">
                                            False
                                        </option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        name="correctAnswer"
                                        value={
                                            editingQuestion.correctAnswer ||
                                            ""
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                        placeholder="Enter the accepted answer"
                                    />
                                )}
                            </label>

                            <div className="questionnaire-modal-actions">
                                <button
                                    type="button"
                                    className="questionnaire-cancel-button"
                                    onClick={() =>
                                        setEditingQuestion(
                                            null
                                        )
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="questionnaire-save-button"
                                    disabled={
                                        savingEdit
                                    }
                                >
                                    {savingEdit
                                        ? "Saving..."
                                        : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default InstructorQuestionnaires;