const {
    onCall,
    HttpsError
} = require("firebase-functions/v2/https");

const {
    initializeApp,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");

const {
    getFirestore,
    FieldValue
} = require("firebase-admin/firestore");

if (getApps().length === 0) {
    initializeApp();
}

const db = getFirestore();
const firebaseAuth = getAuth();

const getUserRecord = async uid => {
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

exports.createInstructorAccount =
    onCall(
        {
            region: "asia-southeast1"
        },
        async request => {
            if (!request.auth) {
                throw new HttpsError(
                    "unauthenticated",
                    "You must be logged in as an administrator."
                );
            }

            const adminData =
                await getUserRecord(
                    request.auth.uid
                );

            if (!adminData) {
                throw new HttpsError(
                    "permission-denied",
                    "Administrator record was not found."
                );
            }

            if (
                adminData.role !==
                "admin"
            ) {
                throw new HttpsError(
                    "permission-denied",
                    "Only administrators can create instructor accounts."
                );
            }

            if (
                adminData.status ===
                "inactive"
            ) {
                throw new HttpsError(
                    "permission-denied",
                    "This administrator account is inactive."
                );
            }

            const fullName =
                String(
                    request.data?.fullName ||
                    ""
                ).trim();

            const email =
                String(
                    request.data?.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    request.data?.password ||
                    ""
                );

            const section =
                String(
                    request.data?.section ||
                    ""
                ).trim();

            const gender =
                String(
                    request.data?.gender ||
                    ""
                ).trim();

            const status =
                String(
                    request.data?.status ||
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
                throw new HttpsError(
                    "invalid-argument",
                    "Please complete all required fields."
                );
            }

            if (
                password.length < 6
            ) {
                throw new HttpsError(
                    "invalid-argument",
                    "Password must contain at least 6 characters."
                );
            }

            if (
                status !== "active" &&
                status !== "inactive"
            ) {
                throw new HttpsError(
                    "invalid-argument",
                    "Invalid account status."
                );
            }

            let createdUser = null;

            try {
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
                        .collection(
                            "users"
                        )
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
                        studentNumber:
                            "",
                        yearLevel:
                            "",
                        role:
                            "instructor",
                        status,
                        createdAt:
                            FieldValue
                                .serverTimestamp(),
                        createdBy:
                            request.auth.uid
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
                            request.auth.uid
                    }
                );

                await batch.commit();

                return {
                    success: true,
                    uid:
                        instructorUID,
                    instructor: {
                        uid:
                            instructorUID,
                        fullName,
                        email,
                        section,
                        gender,
                        role:
                            "instructor",
                        status
                    },
                    message:
                        "Instructor account created successfully."
                };
            } catch (error) {
                console.error(
                    "Instructor creation failed:",
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
                            "Instructor cleanup failed:",
                            cleanupError
                        );
                    }
                }

                if (
                    error.code ===
                    "auth/email-already-exists"
                ) {
                    throw new HttpsError(
                        "already-exists",
                        "An account already uses this email address."
                    );
                }

                if (
                    error.code ===
                    "auth/invalid-email"
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        "The email address is invalid."
                    );
                }

                if (
                    error.code ===
                    "auth/invalid-password"
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        "The password is invalid."
                    );
                }

                if (
                    error instanceof
                    HttpsError
                ) {
                    throw error;
                }

                throw new HttpsError(
                    "internal",
                    error.message ||
                    "Unable to create instructor account."
                );
            }
        }
    );

exports.importStudentAccounts =
    onCall(
        {
            region:
                "asia-southeast1",
            timeoutSeconds:
                540,
            memory:
                "512MiB"
        },
        async request => {
            if (!request.auth) {
                throw new HttpsError(
                    "unauthenticated",
                    "You must be logged in as an instructor."
                );
            }

            const instructorUID =
                request.auth.uid;

            const instructorData =
                await getUserRecord(
                    instructorUID
                );

            if (!instructorData) {
                throw new HttpsError(
                    "permission-denied",
                    "Instructor record was not found."
                );
            }

            if (
                instructorData.role !==
                "instructor"
            ) {
                throw new HttpsError(
                    "permission-denied",
                    "Only instructors can import student accounts."
                );
            }

            if (
                instructorData.status ===
                "inactive"
            ) {
                throw new HttpsError(
                    "permission-denied",
                    "This instructor account is inactive."
                );
            }

            const instructorSnapshot =
                await db
                    .collection(
                        "instructors"
                    )
                    .doc(
                        instructorUID
                    )
                    .get();

            if (
                !instructorSnapshot.exists
            ) {
                throw new HttpsError(
                    "failed-precondition",
                    "Instructor profile was not found."
                );
            }

            const sharedPassword =
                String(
                    request.data
                        ?.password ||
                    ""
                );

            const students =
                request.data
                    ?.students;

            if (!sharedPassword) {
                throw new HttpsError(
                    "invalid-argument",
                    "Student account password is required."
                );
            }

            if (
                sharedPassword.length <
                6
            ) {
                throw new HttpsError(
                    "invalid-argument",
                    "Password must contain at least 6 characters."
                );
            }

            if (
                !Array.isArray(
                    students
                )
            ) {
                throw new HttpsError(
                    "invalid-argument",
                    "Student data must be an array."
                );
            }

            if (
                students.length === 0
            ) {
                throw new HttpsError(
                    "invalid-argument",
                    "No student records were provided."
                );
            }

            if (
                students.length > 200
            ) {
                throw new HttpsError(
                    "invalid-argument",
                    "A maximum of 200 students can be imported at one time."
                );
            }

            const results = [];

            const importedEmails =
                new Set();

            const importedStudentNumbers =
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
                        importedEmails.has(
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
                                "Duplicate email in the CSV file."
                        });

                        continue;
                    }

                    if (
                        importedStudentNumbers
                            .has(
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
                                "Duplicate student number in the CSV file."
                        });

                        continue;
                    }

                    importedEmails.add(
                        email
                    );

                    importedStudentNumbers
                        .add(
                            studentNumber
                        );

                    createdStudent =
                        await firebaseAuth
                            .createUser({
                                email,
                                password:
                                    sharedPassword,
                                displayName:
                                    fullName,
                                disabled:
                                    false
                            });

                    const studentUID =
                        createdStudent.uid;

                    const studentData = {
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

                    const userReference =
                        db
                            .collection(
                                "users"
                            )
                            .doc(
                                studentUID
                            );

                    const instructorStudentReference =
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
                            );

                    batch.set(
                        userReference,
                        studentData
                    );

                    batch.set(
                        instructorStudentReference,
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
                        `Student import row ${rowNumber}:`,
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
                                "Student cleanup failed:",
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

                    if (
                        studentError.code ===
                        "auth/invalid-password"
                    ) {
                        message =
                            "The password is invalid.";
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

            return {
                success:
                    failed === 0,
                total:
                    results.length,
                created,
                failed,
                message:
                    `${created} student account(s) created. ${failed} failed.`,
                results
            };
        }
    );