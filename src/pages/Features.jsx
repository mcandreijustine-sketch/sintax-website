import "../css/features.css";

import bg from "../pics/bg.jpg";
import logo from "../pics/logo.png";

import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";


function Features() {

  return (

    <div
    className="features-container"
    style={{ "--features-background": `url(${bg})` }}
  >


      <Navbar />



      <section className="features-hero">

        <span className="section-tag">
          ⚔ Learn Java Through Adventure
        </span>


        <h1>
          Epic Features Await You
        </h1>


        <p>
          Discover an immersive RPG experience where Java programming becomes
          part of your adventure. Complete quests, defeat corruption, and master
          coding one challenge at a time.
        </p>


      </section>





      <section className="feature-grid">


        <div className="feature-card">

          <h2>
            📚 Interactive Java Lessons
          </h2>

          <p>
            Learn Java concepts through engaging quests instead of traditional
            lectures.
          </p>

        </div>



        <div className="feature-card">

          <h2>
            🎮 RPG Adventure
          </h2>

          <p>
            Explore the world of Sintax while battling corruption and protecting
            the kingdom.
          </p>

        </div>



        <div className="feature-card">

          <h2>
            🧩 Problem Solving
          </h2>

          <p>
            Solve coding challenges to unlock new areas and continue your
            journey.
          </p>

        </div>



        <div className="feature-card">

          <h2>
            ⭐ EXP & Level System
          </h2>

          <p>
            Earn experience points, level up your character, and unlock powerful
            rewards.
          </p>

        </div>


      </section>





      <section className="gameplay-section">


        <h1>
          Core Gameplay
        </h1>


        <div className="gameplay-grid">


          <div className="game-card">

            <h3>
              ❤️ Code Healing
            </h3>


            <p>
              Heal corrupted NPCs by fixing broken Java code.
            </p>


          </div>


        </div>


      </section>






      <section className="modules">


        <h1>
          Java Learning Modules
        </h1>


        <div className="module-grid">


          <div className="module">
            Variables
          </div>


          <div className="module">
            Operators
          </div>


          <div className="module">
            Conditional Statements
          </div>


          <div className="module">
            Loops
          </div>


          <div className="module">
            Methods
          </div>


          <div className="module">
            Arrays
          </div>


          <div className="module">
            Object-Oriented Programming
          </div>


          <div className="module">
            Debugging
          </div>


        </div>


      </section>






      <section className="challenge-section">


        <h1>
          Challenge Types
        </h1>


        <div className="challenge-grid">


          <div className="challenge-card">
            🧩
            <h3>
              Problem Solving
            </h3>
          </div>


          <div className="challenge-card">
            🔠
            <h3>
              Fill in the Blank
            </h3>
          </div>


          <div className="challenge-card">
            🔀
            <h3>
              Jumbled Code
            </h3>
          </div>


          <div className="challenge-card">
            🔍
            <h3>
              Identification
            </h3>
          </div>


          <div className="challenge-card">
            🔎
            <h3>
              Word Hunt
            </h3>
          </div>


        </div>


      </section>






      <section className="progress-section">


        <h1>
          Progress System
        </h1>


        <div className="progress-grid">


          <div className="progress-card">
            🏆
            <p>
              Achievements
            </p>
          </div>


          <div className="progress-card">
            ⭐
            <p>
              EXP System
            </p>
          </div>


          <div className="progress-card">
            📜
            <p>
              Quest Progress
            </p>
          </div>


          <div className="progress-card">
            🗺
            <p>
              Unlock New Areas
            </p>
          </div>


          <div className="progress-card">
            💡
            <p>
              Hints & Feedback
            </p>
          </div>


          <div className="progress-card">
            👨‍🏫
            <p>
              Instructor Dashboard
            </p>
          </div>


        </div>


      </section>






      <section className="cta">


        <h1>
          Ready to Save the World of Sintax?
        </h1>


        <p>
          Start your adventure today and master Java programming through epic
          quests and exciting battles.
        </p>


        <Link
          to="/register"
          className="play-btn"
        >
          Play Now
        </Link>


      </section>






      <footer className="footer">


        <img
          src={logo}
          alt="logo"
          className="footer-logo"
        />


        <h2>
          SINTAX
        </h2>


        <p>
          Learn Java. Complete Quests. Defeat Corruption.
        </p>


      </footer>



    </div>

  );

}


export default Features;