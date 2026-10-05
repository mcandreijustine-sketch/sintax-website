const express = require("express");
const cors = require("cors");

const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");

const {
    getFirestore,
    FieldValue
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

const PORT =
    process.env.PORT ||
    5000;

const db =
    getFirestore();

const firebaseAuth =
    getAuth();

app.use(
    cors({
        origin: true
    })
);

app.use(
    express.json({
        limit: "5mb"
    })
);

const verifyToken =
    async (
        req,
        res,
        next
    ) => {
        try {
            const authorization =
                req.headers.authorization ||
                "";

            if (
                !authorization.startsWith(
                    "Bearer "
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Authentication token is required."
                    });
            }

            const token =
                authorization.substring(7);

            const decodedToken =
                await firebaseAuth
                    .verifyIdToken(token);

            req.user =
                decodedToken;

            next();
        } catch (error) {
            console.error(
                "Authentication error:",
                error
            );

            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Invalid or expired authentication token."
                });
        }
    };

const getUserRecord =
    async uid => {
        const snapshot =
            await db
                .collection("users")
                .doc(uid)
                .get();

        if (!snapshot.exists) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data()
        };
    };

app.get(
    "/",
    (
        req,
        res
    ) => {
        res.json({
            success: true,
            message:
                "Sintax backend API is running."
        });
    }
);

app.get(
    "/api/health",
    (
        req,
        res
    ) => {
        res.json({
            success: true,
            message:
                "Sintax backend is running."
        });
    }
);

app.post(
    "/api/create-instructor",
    verifyToken,
    async (
        req,
        res
    ) => {
        let createdUser =
            null;

        try {
            const adminData =
                await getUserRecord(
                    req.user.uid
                );

            if (
                !adminData ||
                adminData.role !== "admin"
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Only administrators can create instructor accounts."
                    });
            }

            if (
                adminData.status ===
                "inactive"
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "This administrator account is inactive."
                    });
            }

            const fullName =
                String(
                    req.body?.fullName ||
                    ""
                ).trim();

            const email =
                String(
                    req.body?.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    req.body?.password ||
                    ""
                );

            const section =
                String(
                    req.body?.section ||
                    ""
                ).trim();

            const gender =
                String(
                    req.body?.gender ||
                    ""
                ).trim();

            const status =
                String(
                    req.body?.status ||
                    "active"
                )
                    .trim()
                    .toLowerCase();

            if (
                !fullName ||
                !email ||
                !password ||
                !gender
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Please complete all required fields."
                    });
            }

            if (
                password.length <
                6
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Password must contain at least 6 characters."
                    });
            }

            if (
                status !== "active" &&
                status !== "inactive"
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid account status."
                    });
            }

            createdUser =
                await firebaseAuth
                    .createUser({
                        email,
                        password,
                        displayName:
                            fullName,
                        disabled:
                            status ===
                            "inactive"
                    });

            const instructorUID =
                createdUser.uid;

            const batch =
                db.batch();

            const userReference =
                db
                    .collection("users")
                    .doc(
                        instructorUID
                    );

            const instructorReference =
                db
                    .collection(
                        "instructors"
                    )
                    .doc(
                        instructorUID
                    );

            batch.set(
                userReference,
                {
                    fullName,
                    email,
                    section,
                    gender,
                    studentNumber: "",
                    yearLevel: "",
                    role:
                        "instructor",
                    status,
                    createdAt:
                        FieldValue
                            .serverTimestamp(),
                    createdBy:
                        req.user.uid
                }
            );

            batch.set(
                instructorReference,
                {
                    fullName,
                    email,
                    section,
                    gender,
                    role:
                        "instructor",
                    status,
                    createdAt:
                        FieldValue
                            .serverTimestamp(),
                    createdBy:
                        req.user.uid
                }
            );

            await batch.commit();

            return res
                .status(201)
                .json({
                    success: true,
                    uid:
                        instructorUID,
                    message:
                        "Instructor account created successfully."
                });
        } catch (error) {
            console.error(
                "Create instructor error:",
                error
            );

            if (
                createdUser?.uid
            ) {
                try {
                    await firebaseAuth
                        .deleteUser(
                            createdUser.uid
                        );
                } catch (
                    cleanupError
                ) {
                    console.error(
                        "Instructor cleanup error:",
                        cleanupError
                    );
                }
            }

            if (
                error.code ===
                "auth/email-already-exists"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "An account already uses this email address."
                    });
            }

            if (
                error.code ===
                "auth/invalid-email"
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "The email address is invalid."
                    });
            }

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        error.message ||
                        "Unable to create instructor account."
                });
        }
    }
);

app.post(
    "/api/import-students",
    verifyToken,
    async (
        req,
        res
    ) => {
        try {
            const instructorUID =
                req.user.uid;

            const instructorData =
                await getUserRecord(
                    instructorUID
                );

            if (
                !instructorData ||
                instructorData.role !==
                "instructor"
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Only instructors can import student accounts."
                    });
            }

            if (
                instructorData.status ===
                "inactive"
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "This instructor account is inactive."
                    });
            }

            const instructorReference =
                db
                    .collection(
                        "instructors"
                    )
                    .doc(
                        instructorUID
                    );

            const instructorSnapshot =
                await instructorReference
                    .get();

            if (
                !instructorSnapshot.exists
            ) {
                await instructorReference
                    .set({
                        fullName:
                            instructorData.fullName ||
                            "",
                        email:
                            instructorData.email ||
                            "",
                        section:
                            instructorData.section ||
                            "",
                        gender:
                            instructorData.gender ||
                            "",
                        role:
                            "instructor",
                        status:
                            instructorData.status ||
                            "active",
                        createdAt:
                            instructorData.createdAt ||
                            FieldValue
                                .serverTimestamp()
                    });
            }

            const password =
                String(
                    req.body?.password ||
                    ""
                );

            const students =
                req.body?.students;

            if (
                password.length <
                6
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Password must contain at least 6 characters."
                    });
            }

            if (
                !Array.isArray(
                    students
                ) ||
                students.length ===
                0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "No student records were provided."
                    });
            }

            if (
                students.length >
                200
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "A maximum of 200 students can be imported at one time."
                    });
            }

            const results =
                [];

            const emails =
                new Set();

            const studentNumbers =
                new Set();

            for (
                let index = 0;
                index <
                students.length;
                index += 1
            ) {
                const row =
                    students[index];

                const rowNumber =
                    index + 2;

                let createdStudent =
                    null;

                try {
                    const fullName =
                        String(
                            row?.fullName ||
                            ""
                        ).trim();

                    const email =
                        String(
                            row?.email ||
                            ""
                        )
                            .trim()
                            .toLowerCase();

                    const studentNumber =
                        String(
                            row?.studentNumber ||
                            ""
                        ).trim();

                    const section =
                        String(
                            row?.section ||
                            ""
                        ).trim();

                    const yearLevel =
                        String(
                            row?.yearLevel ||
                            ""
                        ).trim();

                    const gender =
                        String(
                            row?.gender ||
                            ""
                        ).trim();

                    if (
                        !fullName ||
                        !email ||
                        !studentNumber ||
                        !section ||
                        !yearLevel ||
                        !gender
                    ) {
                        results.push({
                            row:
                                rowNumber,
                            success:
                                false,
                            email,
                            message:
                                "Missing required student information."
                        });

                        continue;
                    }

                    if (
                        emails.has(
                            email
                        )
                    ) {
                        results.push({
                            row:
                                rowNumber,
                            success:
                                false,
                            email,
                            message:
                                "Duplicate email in CSV file."
                        });

                        continue;
                    }

                    if (
                        studentNumbers.has(
                            studentNumber
                        )
                    ) {
                        results.push({
                            row:
                                rowNumber,
                            success:
                                false,
                            email,
                            message:
                                "Duplicate student number in CSV file."
                        });

                        continue;
                    }

                    emails.add(
                        email
                    );

                    studentNumbers.add(
                        studentNumber
                    );

                    createdStudent =
                        await firebaseAuth
                            .createUser({
                                email,
                                password,
                                displayName:
                                    fullName,
                                disabled:
                                    false
                            });

                    const studentUID =
                        createdStudent.uid;

                    const studentData =
                        {
                            fullName,
                            email,
                            studentNumber,
                            section,
                            yearLevel,
                            gender,
                            role:
                                "student",
                            status:
                                "active",
                            instructorId:
                                instructorUID,
                            createdAt:
                                FieldValue
                                    .serverTimestamp(),
                            createdBy:
                                instructorUID
                        };

                    const batch =
                        db.batch();

                    batch.set(
                        db
                            .collection(
                                "users"
                            )
                            .doc(
                                studentUID
                            ),
                        studentData
                    );

                    batch.set(
                        db
                            .collection(
                                "instructors"
                            )
                            .doc(
                                instructorUID
                            )
                            .collection(
                                "students"
                            )
                            .doc(
                                studentUID
                            ),
                        studentData
                    );

                    await batch.commit();

                    results.push({
                        row:
                            rowNumber,
                        success:
                            true,
                        uid:
                            studentUID,
                        fullName,
                        email,
                        studentNumber,
                        message:
                            "Account created successfully."
                    });
                } catch (
                    studentError
                ) {
                    console.error(
                        `Student row ${rowNumber}:`,
                        studentError
                    );

                    if (
                        createdStudent?.uid
                    ) {
                        try {
                            await firebaseAuth
                                .deleteUser(
                                    createdStudent.uid
                                );
                        } catch (
                            cleanupError
                        ) {
                            console.error(
                                cleanupError
                            );
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

                    if (
                        studentError.code ===
                        "auth/invalid-email"
                    ) {
                        message =
                            "The email address is invalid.";
                    }

                    results.push({
                        row:
                            rowNumber,
                        success:
                            false,
                        email:
                            String(
                                row?.email ||
                                ""
                            ),
                        message
                    });
                }
            }

            const created =
                results.filter(
                    result =>
                        result.success
                ).length;

            const failed =
                results.length -
                created;

            return res.json({
                success:
                    failed === 0,
                total:
                    results.length,
                created,
                failed,
                message:
                    `${created} student account(s) created. ${failed} failed.`,
                results
            });
        } catch (error) {
            console.error(
                "Import students error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        error.message ||
                        "Unable to import students."
                });
        }
    }
);

app.use(
    (
        req,
        res
    ) => {
        res
            .status(404)
            .json({
                success: false,
                message:
                    "API endpoint not found."
            });
    }
);

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "Server error:",
            error
        );

        res
            .status(500)
            .json({
                success: false,
                message:
                    "Internal server error."
            });
    }
);

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Sintax backend running on port ${PORT}`
        );
    }
);