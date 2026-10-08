
const express = require("express");
const cors = require("cors");
const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
    getFirestore,
    FieldValue,
    FieldPath
} = require("firebase-admin/firestore");

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require("./serviceAccountKey.json");

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const app = express();
const PORT = process.env.PORT || 5000;
const db = getFirestore();
const firebaseAuth = getAuth();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

const verifyToken = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required."
            });
        }

        const token = authorization.substring(7);
        const decodedToken = await firebaseAuth.verifyIdToken(token);

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
};

const getUserRecord = async uid => {
    const snapshot = await db.collection("users").doc(uid).get();

    if (!snapshot.exists) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    };
};

const verifyInstructor = async uid => {
    const instructorData = await getUserRecord(uid);

    if (!instructorData || instructorData.role !== "instructor") {
        return {
            allowed: false,
            status: 403,
            message: "Only instructors can manage questionnaires."
        };
    }

    if (instructorData.status === "inactive") {
        return {
            allowed: false,
            status: 403,
            message: "This instructor account is inactive."
        };
    }

    return {
        allowed: true,
        instructorData
    };
};

const normalizeQuestionType = value => {
    const type = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    if (
        type === "multiple_choice" ||
        type === "multiplechoice" ||
        type === "mcq"
    ) {
        return "multiple_choice";
    }

    if (
        type === "true_false" ||
        type === "truefalse" ||
        type === "tf"
    ) {
        return "true_false";
    }

    if (
        type === "identification" ||
        type === "identify"
    ) {
        return "identification";
    }

    return "";
};

const validateQuestion = question => {
    const questionId = String(question?.questionId || "").trim();
    const npcId = String(question?.npcId || "").trim();
    const type = normalizeQuestionType(question?.type);
    const questionText = String(question?.question || "").trim();
    const hint = String(question?.hint ?? "").trim();

    const choiceA = String(question?.choiceA || "").trim();
    const choiceB = String(question?.choiceB || "").trim();
    const choiceC = String(question?.choiceC || "").trim();
    const choiceD = String(question?.choiceD || "").trim();

    let correctAnswer = String(
        question?.correctAnswer || ""
    ).trim();

    const difficulty = String(
        question?.difficulty || "Easy"
    ).trim();

    if (
        !questionId ||
        !npcId ||
        !type ||
        !questionText ||
        !correctAnswer
    ) {
        return {
            valid: false,
            message:
                "questionId, npcId, type, question, and correctAnswer are required."
        };
    }

    if (!/^[A-Za-z0-9_-]+$/.test(questionId)) {
        return {
            valid: false,
            message:
                "questionId may only contain letters, numbers, underscores, and hyphens."
        };
    }

    if (!/^[A-Za-z0-9_-]+$/.test(npcId)) {
        return {
            valid: false,
            message:
                "npcId may only contain letters, numbers, underscores, and hyphens."
        };
    }

    const allowedDifficulties = [
        "easy",
        "medium",
        "hard"
    ];

    if (!allowedDifficulties.includes(difficulty.toLowerCase())) {
        return {
            valid: false,
            message: "Difficulty must be Easy, Medium, or Hard."
        };
    }

    if (type === "multiple_choice") {
        if (!choiceA || !choiceB || !choiceC || !choiceD) {
            return {
                valid: false,
                message:
                    "Multiple-choice questions require choiceA, choiceB, choiceC, and choiceD."
            };
        }

        correctAnswer = correctAnswer.toUpperCase();

        if (!["A", "B", "C", "D"].includes(correctAnswer)) {
            return {
                valid: false,
                message:
                    "Multiple-choice correctAnswer must be A, B, C, or D."
            };
        }
    }

    if (type === "true_false") {
        const answer = correctAnswer.toLowerCase();

        if (answer !== "true" && answer !== "false") {
            return {
                valid: false,
                message:
                    "True/False correctAnswer must be True or False."
            };
        }

        correctAnswer = answer === "true" ? "True" : "False";
    }

    const normalizedDifficulty =
        difficulty.charAt(0).toUpperCase() +
        difficulty.slice(1).toLowerCase();

    return {
        valid: true,
        data: {
            questionId,
            npcId,
            type,
            question: questionText,
            hint,
            choiceA: type === "multiple_choice" ? choiceA : "",
            choiceB: type === "multiple_choice" ? choiceB : "",
            choiceC: type === "multiple_choice" ? choiceC : "",
            choiceD: type === "multiple_choice" ? choiceD : "",
            correctAnswer,
            difficulty: normalizedDifficulty
        }
    };
};

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Sintax backend API is running."
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Sintax backend is running."
    });
});

app.post("/api/create-instructor", verifyToken, async (req, res) => {
    let createdUser = null;

    try {
        const adminData = await getUserRecord(req.user.uid);

        if (!adminData || adminData.role !== "admin") {
            return res.status(403).json({
                success: false,
                message:
                    "Only administrators can create instructor accounts."
            });
        }

        if (adminData.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "This administrator account is inactive."
            });
        }

        const fullName = String(req.body?.fullName || "").trim();
        const email = String(req.body?.email || "")
            .trim()
            .toLowerCase();
        const password = String(req.body?.password || "");
        const section = String(req.body?.section || "").trim();
        const gender = String(req.body?.gender || "").trim();
        const status = String(req.body?.status || "active")
            .trim()
            .toLowerCase();

        if (!fullName || !email || !password || !gender) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        if (status !== "active" && status !== "inactive") {
            return res.status(400).json({
                success: false,
                message: "Invalid account status."
            });
        }

        createdUser = await firebaseAuth.createUser({
            email,
            password,
            displayName: fullName,
            disabled: status === "inactive"
        });

        const instructorUID = createdUser.uid;
        const batch = db.batch();

        const userReference = db
            .collection("users")
            .doc(instructorUID);

        const instructorReference = db
            .collection("instructors")
            .doc(instructorUID);

        batch.set(userReference, {
            fullName,
            email,
            section,
            gender,
            studentNumber: "",
            yearLevel: "",
            role: "instructor",
            status,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: req.user.uid
        });

        batch.set(instructorReference, {
            fullName,
            email,
            section,
            gender,
            role: "instructor",
            status,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: req.user.uid
        });

        await batch.commit();

        return res.status(201).json({
            success: true,
            uid: instructorUID,
            message: "Instructor account created successfully."
        });
    } catch (error) {
        console.error("Create instructor error:", error);

        if (createdUser?.uid) {
            try {
                await firebaseAuth.deleteUser(createdUser.uid);
            } catch (cleanupError) {
                console.error(
                    "Instructor cleanup error:",
                    cleanupError
                );
            }
        }

        if (error.code === "auth/email-already-exists") {
            return res.status(409).json({
                success: false,
                message: "An account already uses this email address."
            });
        }

        if (error.code === "auth/invalid-email") {
            return res.status(400).json({
                success: false,
                message: "The email address is invalid."
            });
        }

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to create instructor account."
        });
    }
});

app.post("/api/import-students", verifyToken, async (req, res) => {
    try {
        const instructorUID = req.user.uid;
        const instructorData = await getUserRecord(instructorUID);

        if (!instructorData || instructorData.role !== "instructor") {
            return res.status(403).json({
                success: false,
                message:
                    "Only instructors can import student accounts."
            });
        }

        if (instructorData.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "This instructor account is inactive."
            });
        }

        const instructorReference = db
            .collection("instructors")
            .doc(instructorUID);

        const instructorSnapshot = await instructorReference.get();

        if (!instructorSnapshot.exists) {
            await instructorReference.set({
                fullName: instructorData.fullName || "",
                email: instructorData.email || "",
                section: instructorData.section || "",
                gender: instructorData.gender || "",
                role: "instructor",
                status: instructorData.status || "active",
                createdAt:
                    instructorData.createdAt ||
                    FieldValue.serverTimestamp()
            });
        }

        const password = String(req.body?.password || "");
        const students = req.body?.students;

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No student records were provided."
            });
        }

        if (students.length > 200) {
            return res.status(400).json({
                success: false,
                message:
                    "A maximum of 200 students can be imported at one time."
            });
        }

        const results = [];
        const emails = new Set();
        const studentNumbers = new Set();

        for (let index = 0; index < students.length; index += 1) {
            const row = students[index];
            const rowNumber = index + 2;
            let createdStudent = null;

            try {
                const fullName = String(row?.fullName || "").trim();
                const email = String(row?.email || "")
                    .trim()
                    .toLowerCase();
                const studentNumber = String(
                    row?.studentNumber || ""
                ).trim();
                const section = String(row?.section || "").trim();
                const yearLevel = String(row?.yearLevel || "").trim();
                const gender = String(row?.gender || "").trim();

                if (
                    !fullName ||
                    !email ||
                    !studentNumber ||
                    !section ||
                    !yearLevel ||
                    !gender
                ) {
                    results.push({
                        row: rowNumber,
                        success: false,
                        email,
                        message: "Missing required student information."
                    });
                    continue;
                }

                if (emails.has(email)) {
                    results.push({
                        row: rowNumber,
                        success: false,
                        email,
                        message: "Duplicate email in CSV file."
                    });
                    continue;
                }

                if (studentNumbers.has(studentNumber)) {
                    results.push({
                        row: rowNumber,
                        success: false,
                        email,
                        message:
                            "Duplicate student number in CSV file."
                    });
                    continue;
                }

                emails.add(email);
                studentNumbers.add(studentNumber);

                createdStudent = await firebaseAuth.createUser({
                    email,
                    password,
                    displayName: fullName,
                    disabled: false
                });

                const studentUID = createdStudent.uid;

                const studentData = {
                    fullName,
                    email,
                    studentNumber,
                    section,
                    yearLevel,
                    gender,
                    role: "student",
                    status: "active",
                    instructorId: instructorUID,
                    createdAt: FieldValue.serverTimestamp(),
                    createdBy: instructorUID
                };

                const batch = db.batch();

                batch.set(
                    db.collection("users").doc(studentUID),
                    studentData
                );

                batch.set(
                    db.collection("instructors")
                        .doc(instructorUID)
                        .collection("students")
                        .doc(studentUID),
                    studentData
                );

                await batch.commit();

                results.push({
                    row: rowNumber,
                    success: true,
                    uid: studentUID,
                    fullName,
                    email,
                    studentNumber,
                    message: "Account created successfully."
                });
            } catch (studentError) {
                console.error(
                    `Student row ${rowNumber}:`,
                    studentError
                );

                if (createdStudent?.uid) {
                    try {
                        await firebaseAuth.deleteUser(
                            createdStudent.uid
                        );
                    } catch (cleanupError) {
                        console.error(cleanupError);
                    }
                }

                let message =
                    studentError.message ||
                    "Unable to create student account.";

                if (
                    studentError.code ===
                    "auth/email-already-exists"
                ) {
                    message =
                        "An account already uses this email address.";
                }

                if (studentError.code === "auth/invalid-email") {
                    message = "The email address is invalid.";
                }

                results.push({
                    row: rowNumber,
                    success: false,
                    email: String(row?.email || ""),
                    message
                });
            }
        }

        const created = results.filter(
            result => result.success
        ).length;

        const failed = results.length - created;

        return res.json({
            success: failed === 0,
            total: results.length,
            created,
            failed,
            message:
                `${created} student account(s) created. ${failed} failed.`,
            results
        });
    } catch (error) {
        console.error("Import students error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to import students."
        });
    }
});

app.post("/api/import-questions", verifyToken, async (req, res) => {
    try {
        const instructorUID = req.user.uid;
        const access = await verifyInstructor(instructorUID);

        if (!access.allowed) {
            return res.status(access.status).json({
                success: false,
                message: access.message
            });
        }

        const instructorReference = db
            .collection("instructors")
            .doc(instructorUID);

        const instructorSnapshot = await instructorReference.get();

        if (!instructorSnapshot.exists) {
            await instructorReference.set({
                fullName: access.instructorData.fullName || "",
                email: access.instructorData.email || "",
                section: access.instructorData.section || "",
                gender: access.instructorData.gender || "",
                role: "instructor",
                status: access.instructorData.status || "active",
                createdAt:
                    access.instructorData.createdAt ||
                    FieldValue.serverTimestamp()
            });
        }

        const questions = req.body?.questions;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No question records were provided."
            });
        }

        if (questions.length > 500) {
            return res.status(400).json({
                success: false,
                message:
                    "A maximum of 500 questions can be imported at one time."
            });
        }

        const results = [];
        const questionIds = new Set();

        for (let index = 0; index < questions.length; index += 1) {
            const row = questions[index];
            const rowNumber = index + 2;

            try {
                const validation = validateQuestion(row);

                if (!validation.valid) {
                    results.push({
                        row: rowNumber,
                        success: false,
                        questionId: String(
                            row?.questionId || ""
                        ).trim(),
                        message: validation.message
                    });
                    continue;
                }

                const question = validation.data;

                if (questionIds.has(question.questionId)) {
                    results.push({
                        row: rowNumber,
                        success: false,
                        questionId: question.questionId,
                        message: "Duplicate questionId in CSV file."
                    });
                    continue;
                }

                questionIds.add(question.questionId);

                const questionReference = db
                    .collection("instructors")
                    .doc(instructorUID)
                    .collection("questions")
                    .doc(question.questionId);

                const existingQuestion =
                    await questionReference.get();

                if (existingQuestion.exists) {
                    results.push({
                        row: rowNumber,
                        success: false,
                        questionId: question.questionId,
                        message: "This questionId already exists."
                    });
                    continue;
                }

                await questionReference.set({
                    ...question,
                    instructorId: instructorUID,
                    createdBy: instructorUID,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                results.push({
                    row: rowNumber,
                    success: true,
                    questionId: question.questionId,
                    npcId: question.npcId,
                    type: question.type,
                    message: "Question imported successfully."
                });
            } catch (questionError) {
                console.error(
                    `Question row ${rowNumber}:`,
                    questionError
                );

                results.push({
                    row: rowNumber,
                    success: false,
                    questionId: String(
                        row?.questionId || ""
                    ).trim(),
                    message:
                        questionError.message ||
                        "Unable to import question."
                });
            }
        }

        const created = results.filter(
            result => result.success
        ).length;

        const failed = results.length - created;

        return res.json({
            success: failed === 0,
            total: results.length,
            created,
            failed,
            message:
                `${created} question(s) imported. ${failed} failed.`,
            results
        });
    } catch (error) {
        console.error("Import questions error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to import questions."
        });
    }
});

app.get("/api/questions", verifyToken, async (req, res) => {
    try {
        const instructorUID = req.user.uid;
        const access = await verifyInstructor(instructorUID);

        if (!access.allowed) {
            return res.status(access.status).json({
                success: false,
                message: access.message
            });
        }

        const questionsReference = db
            .collection("instructors")
            .doc(instructorUID)
            .collection("questions");

        const requestedLimit = req.query.limit;
        const cursor = String(req.query.cursor || "").trim();

        if (requestedLimit === undefined) {
            const snapshot = await questionsReference.get();

            const questions = snapshot.docs
                .map(document => ({
                    id: document.id,
                    ...document.data(),
                    hint: document.data().hint || ""
                }))
                .sort((first, second) =>
                    String(first.questionId || "").localeCompare(
                        String(second.questionId || "")
                    )
                );

            return res.json({
                success: true,
                total: questions.length,
                questions
            });
        }

        const pageSize = Number(requestedLimit);

        if (
            !Number.isInteger(pageSize) ||
            pageSize < 1 ||
            pageSize > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 100."
            });
        }

        if (
            cursor &&
            !/^[A-Za-z0-9_-]+$/.test(cursor)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination cursor."
            });
        }

        let query = questionsReference
            .orderBy(FieldPath.documentId())
            .limit(pageSize + 1);

        if (cursor) {
            query = query.startAfter(cursor);
        }

        const snapshot = await query.get();

        const hasMore = snapshot.docs.length > pageSize;
        const pageDocuments = snapshot.docs.slice(0, pageSize);

        const questions = pageDocuments.map(document => ({
            id: document.id,
            ...document.data(),
            hint: document.data().hint || ""
        }));

        const nextCursor =
            hasMore && pageDocuments.length > 0
                ? pageDocuments[pageDocuments.length - 1].id
                : null;

        return res.json({
            success: true,
            questions,
            pageSize,
            hasMore,
            nextCursor
        });
    } catch (error) {
        console.error("Get questions error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to load questions."
        });
    }
});

app.put(
    "/api/questions/:questionId",
    verifyToken,
    async (req, res) => {
        try {
            const instructorUID = req.user.uid;
            const access = await verifyInstructor(instructorUID);

            if (!access.allowed) {
                return res.status(access.status).json({
                    success: false,
                    message: access.message
                });
            }

            const questionId = String(
                req.params.questionId || ""
            ).trim();

            if (!questionId) {
                return res.status(400).json({
                    success: false,
                    message: "Question ID is required."
                });
            }

            const questionReference = db
                .collection("instructors")
                .doc(instructorUID)
                .collection("questions")
                .doc(questionId);

            const existingQuestion =
                await questionReference.get();

            if (!existingQuestion.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Question was not found."
                });
            }

            const validation = validateQuestion({
                ...req.body,
                questionId
            });

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }

            await questionReference.update({
                ...validation.data,
                instructorId: instructorUID,
                updatedAt: FieldValue.serverTimestamp()
            });

            return res.json({
                success: true,
                message: "Question updated successfully."
            });
        } catch (error) {
            console.error("Update question error:", error);

            return res.status(500).json({
                success: false,
                message:
                    error.message || "Unable to update question."
            });
        }
    }
);

app.delete(
    "/api/questions/:questionId",
    verifyToken,
    async (req, res) => {
        try {
            const instructorUID = req.user.uid;
            const access = await verifyInstructor(instructorUID);

            if (!access.allowed) {
                return res.status(access.status).json({
                    success: false,
                    message: access.message
                });
            }

            const questionId = String(
                req.params.questionId || ""
            ).trim();

            if (!questionId) {
                return res.status(400).json({
                    success: false,
                    message: "Question ID is required."
                });
            }

            const questionReference = db
                .collection("instructors")
                .doc(instructorUID)
                .collection("questions")
                .doc(questionId);

            const existingQuestion =
                await questionReference.get();

            if (!existingQuestion.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Question was not found."
                });
            }

            await questionReference.delete();

            return res.json({
                success: true,
                message: "Question deleted successfully."
            });
        } catch (error) {
            console.error("Delete question error:", error);

            return res.status(500).json({
                success: false,
                message:
                    error.message || "Unable to delete question."
            });
        }
    }
);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sintax backend running on port ${PORT}`);
});
