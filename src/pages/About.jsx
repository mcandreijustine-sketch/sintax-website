import "../css/about.css";

import bg from "../pics/bg.jpg";
import Navbar from "../components/Navbar";

function About() {
  return (
    <div className="landing-container">
      {/* Fixed background */}
      <div
        className="page-background"
        style={{
          backgroundImage: `url(${bg})`,
        }}
        aria-hidden="true"
      />

      <Navbar />

      <div className="about-page">
        <div className="about-header">
          <h1>ABOUT SINTAX</h1>

          <p>Developer Blog • Capstone Project</p>
        </div>

        <div className="news-card">
          <span className="news-date">July 2026</span>

          <h2>What is SINTAX?</h2>

          <p>
            SINTAX is a capstone project developed by four Bachelor of Science
            in Information Technology (BSIT) students. The game was created to
            make learning the Java programming language more enjoyable by
            combining programming lessons with an immersive fantasy adventure.
          </p>

          <p>
            Players complete quests, solve programming challenges, battle
            enemies, and explore the Kingdom of Sintax while improving their
            understanding of Java concepts through interactive gameplay.
          </p>
        </div>

        <div className="news-card">
          <span className="news-date">Our Mission</span>

          <h2>Learning Through Adventure</h2>

          <p>
            Instead of relying only on textbooks, SINTAX allows students to
            learn programming by solving real coding problems inside a fantasy
            RPG. Every quest reinforces logical thinking, problem solving, and
            Java programming fundamentals.
          </p>
        </div>

        <div className="news-card">
          <span className="news-date">Development Team</span>

          <h2>Built by BSIT Students</h2>

          <p>
            This project was developed as part of our Bachelor of Science in
            Information Technology Capstone Project. It combines modern web
            technologies with game development to create an engaging
            educational experience.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;