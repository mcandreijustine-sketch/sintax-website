import "../css/landing.css";

import bg from "../pics/bg.jpg";

import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";


function Landing() {

  return (

    <div
      className="landing-container"
      style={{
        backgroundImage: `url(${bg})`
      }}
    >


      <Navbar />





      <div className="overlay">


        <span className="welcome-tag">

          ⚔️ Welcome to the Kingdom of Sintax

        </span>





        <h1 className="hero-title">

          The World of <span>SINTAX</span> Awaits You

        </h1>





        <p className="hero-description">

          A mysterious corruption threatens the world. As the chosen hero,
          you'll solve Java programming challenges, complete quests, and
          restore balance while mastering essential coding concepts.

        </p>





        <div className="hero-buttons">


          <Link
            to="/register"
            className="primary-btn"
          >

            Start Your Adventure

          </Link>





          <Link
            to="/about"
            className="secondary-btn"
          >

            Learn More

          </Link>


        </div>



      </div>




    </div>

  );

}


export default Landing;