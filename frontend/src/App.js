import React from 'react'
import logo from './assets/connecto.png';
import './App.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import { faTwitter, faUnity } from '@fortawesome/free-brands-svg-icons'
import { faGem } from "@fortawesome/free-solid-svg-icons";

function App() {
  return (
    <div className="App">
      <header>
        <a target="_blank" href="https://twitter.com/donaldao0xffff">
          <FontAwesomeIcon icon={faUnity} />
        </a>
        <a target="_blank" href="https://twitter.com/tweezers0xffff">
          <FontAwesomeIcon icon={faGem} />
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
            <div className="button">INSTALL CONNECTO</div>
          </div>
        </div>
        <div className="video-placeholder" />
        {/*<div className="install-box">*/}
        {/*  <div className="button">INSTALL CONNECTO</div>*/}
        {/*</div>*/}
      </div>
    </div>
  );
}

export default App;
