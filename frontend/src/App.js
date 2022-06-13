import React from 'react'
import logo from './assets/connecto.png';
import video from './assets/connecto-clip.m4v';
import './App.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import { faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faGem, faMountainCity } from "@fortawesome/free-solid-svg-icons";

const INSTALL_URL = "https://discord.com/oauth2/authorize?client_id=968173788946636850&permissions=326108176&scope=bot%20applications.commands"

function App() {
  return (
    <div className="App">
      <header>
        <a target="_blank" href="https://twitter.com/tweezers0xffff">
          <FontAwesomeIcon icon={faGem} />
        </a>
        <a target="_blank" href="https://twitter.com/donaldao0xffff">
          <FontAwesomeIcon icon={faMountainCity} />
        </a>
        <a target="_blank" href="https://twitter.com/connecto0xffff">
          <FontAwesomeIcon icon={faTwitter} />
        </a>
      </header>
      <div className="top-box">
        <div>
          <img src={logo} className="logo" alt="CONNECTO" />
          <h1>CONNECTO</h1>
          <h2>Get to know your community members in a fun and exciting way</h2>
          <div className="install-box">
            <a target="_blank" href={INSTALL_URL}>
              <div className="button">INSTALL CONNECTO</div>
            </a>
          </div>
        </div>
        <div className="video-placeholder">
          <video src={video} autoPlay muted controls />
        </div>
      </div>
    </div>
  );
}

export default App;
