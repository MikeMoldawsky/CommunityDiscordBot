import React from 'react'
import duck from './assets/duck.png';
import logo from './assets/connecto.png';
import video from './assets/connecto-clip.m4v';
import './App.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import { faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faGem } from "@fortawesome/free-solid-svg-icons";

function App() {
  return (
    <div className="App">
      <header>
        <a target="_blank" rel="noreferrer" href="https://twitter.com/tweezers0xffff">
          <FontAwesomeIcon icon={faGem} />
        </a>
        <a target="_blank" rel="noreferrer" href="https://twitter.com/donaldao0xffff">
          <img src={duck} alt="donaldao" />
        </a>
        <a target="_blank" rel="noreferrer" href="https://twitter.com/connecto0xffff">
          <FontAwesomeIcon icon={faTwitter} />
        </a>
      </header>
      <main>
        <div className="top-content">
          <img src={logo} className="logo" alt="CONNECTO" />
          <h2>Get to know your community members in a fun and exciting way</h2>
          <div className="install-box">
            <a target="_blank" rel="noreferrer" href="https://discord.com/oauth2/authorize?client_id=968173788946636850&permissions=326107152&scope=bot%20applications.commands">
              <div className="button">INSTALL</div>
            </a>
          </div>
        </div>
        <div className="bottom-content">
          <video src={video} autoPlay muted controls />
        </div>
      </main>
    </div>
  );
}

export default App;
