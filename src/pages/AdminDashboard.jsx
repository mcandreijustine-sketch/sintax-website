import "../css/adminDashboard.css";
import AdminBar from "../components/AdminBar";

import { useEffect, useState } from "react";

import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";

import "react-circular-progressbar/dist/styles.css";

import { db } from "../firebase";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [students, setStudents] = useState(0);
  const [instructors, setInstructors] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  const [activities, setActivities] = useState([]);

  const [registrationData, setRegistrationData] =
    useState([]);

  const [yearLevelData, setYearLevelData] =
    useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const snap = await getDocs(
          collection(db, "users")
        );

        let s = 0;
        let i = 0;
        let a = 0;

        const monthlyData = {
          Jan: 0,
          Feb: 0,
          Mar: 0,
          Apr: 0,
          May: 0,
          Jun: 0,
          Jul: 0,
          Aug: 0,
          Sep: 0,
          Oct: 0,
          Nov: 0,
          Dec: 0,
        };

        const yearLevels = {
          "1st Year": 0,
          "2nd Year": 0,
        };

        snap.forEach((document) => {
          const user = document.data();

          /* STUDENTS */
          if (user.role === "student") {
            s++;

            if (user.yearLevel === "1st Year") {
              yearLevels["1st Year"]++;
            }

            if (user.yearLevel === "2nd Year") {
              yearLevels["2nd Year"]++;
            }
          }

          /* INSTRUCTORS */
          if (user.role === "instructor") {
            i++;
          }

          /* ACTIVE USERS */
          if (user.status === "active") {
            a++;
          }

          /* MONTHLY REGISTRATION */
          if (user.createdAt) {
            const date =
              user.createdAt instanceof Timestamp
                ? user.createdAt.toDate()
                : new Date(user.createdAt);

            const month =
              date.toLocaleString(
                "default",
                {
                  month: "short",
                }
              );

            if (
              monthlyData[month] !==
              undefined
            ) {
              monthlyData[month]++;
            }
          }
        });

        /* REGISTRATION LINE GRAPH */

        setRegistrationData(
          Object.keys(monthlyData).map(
            (month) => ({
              month,
              users:
                monthlyData[month],
            })
          )
        );

        /* YEAR LEVEL PIE GRAPH */

        setYearLevelData([
          {
            name: "1st Year",
            value:
              yearLevels["1st Year"],
          },
          {
            name: "2nd Year",
            value:
              yearLevels["2nd Year"],
          },
        ]);

        setTotalUsers(snap.size);
        setStudents(s);
        setInstructors(i);
        setActiveUsers(a);

        /* RECENT ACTIVITIES */

        const recentQ = query(
          collection(db, "users"),
          orderBy(
            "createdAt",
            "desc"
          ),
          limit(5)
        );

        const recentSnap =
          await getDocs(recentQ);

        setActivities(
          recentSnap.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data(),
            })
          )
        );
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        );
      }
    };

    loadDashboard();
  }, []);

  const percent = (value) =>
    totalUsers
      ? (value / totalUsers) * 100
      : 0;

  const donut = (
    value,
    text,
    color,
    label
  ) => (
    <div className="stat-card">

      <div className="progress-wrapper">

        <CircularProgressbar
          value={value}
          text={String(text)}
          styles={buildStyles({
            pathColor: color,
            trailColor: "#2b2b2b",
            textColor: "#ffffff",
            strokeLinecap:
              "round",
          })}
        />

      </div>

      <h3>{label}</h3>

    </div>
  );

  /* PIE COLORS */

  const YEAR_COLORS = [
    "#10b981",
    "#3b82f6",
  ];

  const totalYearStudents =
    yearLevelData.reduce(
      (total, item) =>
        total + item.value,
      0
    );

  return (
    <div className="admin-dashboard">

      <AdminBar />

      <main className="dashboard-content">

        {/* =====================
            HEADER
        ===================== */}

        <div className="dashboard-header">

          <div>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Welcome back,
              Administrator.
            </p>

          </div>

          <div className="admin-profile">

            <img
              src="https://ui-avatars.com/api/?name=Administrator"
              alt="Administrator"
            />

            <div>

              <h3>
                Administrator
              </h3>

              <span>
                System Administrator
              </span>

            </div>

          </div>

        </div>

        {/* =====================
            STATISTICS
        ===================== */}

        <div className="stats-grid">

          {donut(
            100,
            totalUsers,
            "#3b82f6",
            "Total Users"
          )}

          {donut(
            percent(students),
            students,
            "#10b981",
            "Students"
          )}

          {donut(
            percent(instructors),
            instructors,
            "#f59e0b",
            "Instructors"
          )}

          {donut(
            percent(activeUsers),
            activeUsers,
            "#ef4444",
            "Active Users"
          )}

        </div>

        {/* =====================
            TWO GRAPHS
        ===================== */}

        <div className="dashboard-charts-grid">

          {/* USER REGISTRATION */}

          <section className="card dashboard-chart-card">

            <div className="dashboard-chart-heading">

              <h2>
                User Registration
              </h2>

              <p>
                Registered accounts
                by month.
              </p>

            </div>

            <div className="registration-chart">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={
                    registrationData
                  }
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#333"
                  />

                  <XAxis
                    dataKey="month"
                    stroke="#aaa"
                    tick={{
                      fill: "#aaa",
                    }}
                  />

                  <YAxis
                    stroke="#aaa"
                    allowDecimals={
                      false
                    }
                    tick={{
                      fill: "#aaa",
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#181818",
                      border:
                        "1px solid #333",
                      borderRadius:
                        "8px",
                      color:
                        "#fff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{
                      fill:
                        "#10b981",
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </section>

          {/* YEAR LEVEL PIE */}

          <section className="card dashboard-chart-card">

            <div className="dashboard-chart-heading">

              <h2>
                Students by Year Level
              </h2>

              <p>
                Distribution of
                registered student
                accounts.
              </p>

            </div>

            <div className="year-pie-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={
                      yearLevelData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                  >

                    {yearLevelData.map(
                      (
                        entry,
                        index
                      ) => (

                        <Cell
                          key={
                            entry.name
                          }
                          fill={
                            YEAR_COLORS[
                              index %
                                YEAR_COLORS.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background:
                        "#181818",
                      border:
                        "1px solid #333",
                      borderRadius:
                        "8px",
                      color:
                        "#fff",
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={40}
                  />

                </PieChart>

              </ResponsiveContainer>

              {/* CENTER TEXT */}

              <div className="pie-center-text">

                <strong>
                  {
                    totalYearStudents
                  }
                </strong>

                <span>
                  Students
                </span>

              </div>

            </div>

          </section>

        </div>

        {/* =====================
            RECENT ACTIVITIES
        ===================== */}

        <section className="card recent-activities-card">

          <div className="dashboard-chart-heading">

            <h2>
              Recent Activities
            </h2>

            <p>
              Latest registered
              accounts.
            </p>

          </div>

          <ul className="activity-list">

            {activities.length ===
            0 ? (

              <li>
                No recent
                registrations.
              </li>

            ) : (

              activities.map(
                (user) => (

                  <li key={user.id}>

                    <div className="activity-icon">
                      ✓
                    </div>

                    <div className="activity-info">

                      <strong>
                        {user.fullName ||
                          user.fullname ||
                          user.name ||
                          "Unknown User"}
                      </strong>

                      <span>
                        registered
                        {user.role
                          ? ` as ${user.role}`
                          : ""}
                      </span>

                    </div>

                  </li>

                )
              )

            )}

          </ul>

        </section>

      </main>

    </div>
  );
}

export default AdminDashboard;