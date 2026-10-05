import "../css/download.css";

import bg from "../pics/bg.jpg";
import Navbar from "../components/Navbar";

function Download() {
    return (
        <div
            className="download-container"
            style={{
                "--download-background": `url(${bg})`,
            }}
        >
            <Navbar />

            <main className="download-page">
                <div className="download-header">
                    <h1>DOWNLOAD SINTAX</h1>
                    <p>Begin Your Programming Adventure</p>
                </div>

                <section className="download-card">
                    <span className="download-label">
                        Android Version
                    </span>

                    <h2>Enter the Kingdom of Sintax</h2>

                    <p>
                        Download SINTAX and begin your journey through a fantasy
                        world where programming knowledge is your greatest
                        weapon.
                    </p>

                    <p>
                        Complete quests, solve Java programming challenges,
                        battle enemies, and strengthen your coding skills as you
                        explore the Kingdom of Sintax.
                    </p>

                    <div className="game-info">
                        <div className="info-item">
                            <span className="info-title">
                                Platform
                            </span>

                            <span className="info-value">
                                Android
                            </span>
                        </div>

                        <div className="info-item">
                            <span className="info-title">
                                File Type
                            </span>

                            <span className="info-value">
                                ZIP
                            </span>
                        </div>

                        <div className="info-item">
                            <span className="info-title">
                                Version
                            </span>

                            <span className="info-value">
                                1.0.0
                            </span>
                        </div>
                    </div>

                    <a
                        href="/downloads/Sintax.zip"
                        download="Sintax.zip"
                        className="download-button"
                    >
                        <span className="download-icon">
                            ↓
                        </span>

                        DOWNLOAD GAME
                    </a>

                    <p className="download-note">
                        After downloading, extract the ZIP file and open the
                        SINTAX APK to install the game on your Android device.
                    </p>

                    <div className="backup-download">
                        <p>
                            Having trouble downloading the game?
                        </p>

                        <a
                            href="https://drive.google.com/drive/folders/1e5aM5n-ljY0A5nZ-nNqKCL915iOeW7kU"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gdrive-download-button"
                        >
                            Download from Google Drive
                        </a>
                    </div>
                </section>

                <section className="download-card">
                    <span className="download-label">
                        Installation Guide
                    </span>

                    <h2>How to Install SINTAX</h2>

                    <div className="install-steps">
                        <div className="install-step">
                            <span className="step-number">
                                01
                            </span>

                            <div>
                                <h3>Download the ZIP File</h3>

                                <p>
                                    Press the Download Game button and wait for
                                    the Sintax.zip file to finish downloading.
                                    If the download does not work, use the
                                    Google Drive download option above.
                                </p>
                            </div>
                        </div>

                        <div className="install-step">
                            <span className="step-number">
                                02
                            </span>

                            <div>
                                <h3>Extract the ZIP File</h3>

                                <p>
                                    Open your Downloads folder, select
                                    Sintax.zip, and choose Extract or Unzip.
                                    Your Android device may use the Files or
                                    File Manager app for this step.
                                </p>
                            </div>
                        </div>

                        <div className="install-step">
                            <span className="step-number">
                                03
                            </span>

                            <div>
                                <h3>Open the APK</h3>

                                <p>
                                    After extracting the ZIP file, open the
                                    extracted folder and tap the SINTAX APK
                                    file.
                                </p>
                            </div>
                        </div>

                        <div className="install-step">
                            <span className="step-number">
                                04
                            </span>

                            <div>
                                <h3>Allow Installation</h3>

                                <p>
                                    If Android asks for permission, allow your
                                    browser or file manager to install apps from
                                    this source.
                                </p>
                            </div>
                        </div>

                        <div className="install-step">
                            <span className="step-number">
                                05
                            </span>

                            <div>
                                <h3>Install SINTAX</h3>

                                <p>
                                    Tap Install and wait for the installation
                                    process to finish.
                                </p>
                            </div>
                        </div>

                        <div className="install-step">
                            <span className="step-number">
                                06
                            </span>

                            <div>
                                <h3>Start Your Adventure</h3>

                                <p>
                                    Open SINTAX after installation and begin
                                    your journey through the Kingdom of Sintax.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="download-card warning-card">
                    <span className="download-label">
                        Important
                    </span>

                    <h2>Before Installing</h2>

                    <p>
                        Only download SINTAX from the official project website
                        or the official Google Drive backup link provided on
                        this page. Avoid downloading modified APK or ZIP files
                        from unofficial websites or unknown sources.
                    </p>
                </section>
            </main>
        </div>
    );
}

export default Download;