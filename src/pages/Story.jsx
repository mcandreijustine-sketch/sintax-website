import "../css/Story.css";

import bg from "../pics/bg.jpg";

import board1 from "../pics/board1.png";
import board2 from "../pics/board2.png";
import board3 from "../pics/board3.png";

import Navbar from "../components/Navbar";



function Story() {

  return (

    <div className="story-page" style={{"--story-background":`url(${bg})`}}>


      <Navbar />



      <div className="story-container">


        <h1 className="story-title">
          The Story of SINTAX
        </h1>



        <p className="story-subtitle">
          Every hero begins with a single line of code...
        </p>





        <div className="comic-panel">


          <img
            src={board1}
            alt="Board 1"
          />



          <div className="speech-box">


            <h2>
              Chapter I — A Kingdom in Danger
            </h2>



            <p>
              Once, the Kingdom of Sintax flourished through the power of the
              legendary Secret Code. Peace and knowledge spread across the land,
              protected by the Three Guardians who maintained harmony and guided
              future generations.
            </p>



          </div>


        </div>







        <div className="comic-panel reverse">


          <img
            src={board2}
            alt="Board 2"
          />



          <div className="speech-box">


            <h2>
              Chapter II — Darkness Rises
            </h2>



            <p>
              A mysterious corruption began consuming the kingdom, twisting
              knowledge into chaos and scattering the fragments of the Secret
              Code. The Guardians could no longer protect the realm alone, and
              hope slowly faded.
            </p>



          </div>


        </div>








        <div className="comic-panel">


          <img
            src={board3}
            alt="Board 3"
          />



          <div className="speech-box">


            <h2>
              Chapter III — Your Journey Begins
            </h2>



            <p>
              You have been chosen to restore balance. Complete Java programming
              challenges, solve puzzles, defeat powerful enemies, and recover
              the lost Secret Code. Every lesson you master strengthens your
              abilities and brings the kingdom one step closer to peace.
            </p>



          </div>


        </div>





      </div>


    </div>

  );

}


export default Story;