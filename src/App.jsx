import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import solana_logo from "./logo-solana-white.svg"

import "bootstrap/dist/css/bootstrap.min.css";
import './App.css';
import { Card, Row, Col, Button, Image, Form, Container, InputGroup, FormControl } from "react-bootstrap";


import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import kp from './keypair.json'
import idl from './idl.json';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.



const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)
// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

//Get 


// Set our network to devnet.
const endpoint = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const connectionsOptions = {
  preflightCommitment: "processed"
}
// Constants

const SolanaLink = 'https://solana.com/'
const TEST_GIFS = [
	'https://media.giphy.com/media/AbWzDpbWYTh9l1B3tc/giphy.gif',
	'https://media.giphy.com/media/hryis7A55UXZNCUTNA/giphy.gif',
	'https://media.giphy.com/media/r1IMdmkhUcpzy/giphy.gif',
	'https://media.giphy.com/media/IoKZwSL0TlWzm/giphy.gif',
  'https://media.giphy.com/media/nJued2Sh59vO0/giphy.gif'
]
const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);


  const getConnectionProvider = () => {
    const connection = new Connection(
      endpoint,
      connectionsOptions.preflightCommitment
    );

    const provider = new Provider(
      connection,
      window.solana,
      connectionsOptions.preflightCommitment
    );
    return provider;
  };


  const connectWallet = async () => {
    try {
      const { solana } = window;

      if (solana) {
        const response = await solana.connect();
        console.log('Connected with Public Key:', response.publicKey.toString());
        setWalletAddress(response.publicKey.toString());
        getGifList();
      }
      else {
        setStatusMessage({ type: 'warning', text: 'Phantom Wallet not found! Please install it from https://phantom.app/ to continue.' });
      }
    } catch(error) {
      console.error(error);
      setStatusMessage({ type: 'danger', text: 'Failed to connect wallet. Please try again.' });
    }
  };

  const getGifList = async() => {
    try {
      const provider = getConnectionProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(
        account.gifList
        .filter((item) => item.gifLink.includes("media"))
        .sort((a,b) => (b.votes > a.votes ? 1 : -1))
      );

    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null)
      ;
    }
  };

  const isValidGifUrl = (url) => {
    try {
      const parsed = new URL(url);
      return (
        (parsed.hostname.endsWith('giphy.com') || parsed.hostname.endsWith('media.giphy.com')) &&
        parsed.pathname.toLowerCase().endsWith('.gif')
      );
    } catch {
      return false;
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      setStatusMessage({ type: 'warning', text: 'Please enter a GIF link.' });
      return;
    }
    if (!isValidGifUrl(inputValue)) {
      setStatusMessage({ type: 'warning', text: 'Please enter a valid GIPHY GIF URL (e.g. https://media.giphy.com/media/.../giphy.gif).' });
      return;
    }
    const gifUrl = inputValue;
    setInputValue('');
    setIsLoading(true);
    setStatusMessage(null);
    console.log('Gif link:', gifUrl);
    try {
      const provider = getConnectionProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(gifUrl, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", gifUrl);
      setStatusMessage({ type: 'success', text: 'GIF submitted successfully!' });
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error);
      setInputValue(gifUrl);
      setStatusMessage({ type: 'danger', text: 'Failed to submit GIF. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const createGifAccount = async () => {
    try {
      const provider = getConnectionProvider();
      console.log("ping");
      const program = new Program(idl, programID, provider);
      console.log("ping1");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,

        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }



  const renderNotConnectedContainer = () => (
    <button
      className="wallet-connect" variant="primary"
      onClick={connectWallet}
    >
      Connect to your Solana DevNet Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    } 
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
        <div className="connected-container">
          <Row xs={1} md={1} className="g-4"> 
          <Form noValidate
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
          <InputGroup className="mx-auto w-50 mt-3 mb-5">
              <FormControl
                aria-label="Enter gif link!"
                aria-describedby="basic-addon1"
                placeholder="Enter gif link!"
                value={inputValue}
                onChange={onInputChange}
              />
              <Button type="submit" variant="primary" id="button-addon1" >
                Submit
              </Button>
            </InputGroup>
          </Form>
          </Row>
          <Row xs={1} md={4} className="g-4">
            {gifList.map((item, idx) => (
              <Col key={idx}>
                <Card>
                  <Card.Header>
                      Rank #{ idx.toString() }
                    </Card.Header>
                    <Card.Img variant="top" src={item.gifLink} />
                    <Card.Body>
                      <Card.Title>
                        Votes: {item.votes.toString()}
                      </Card.Title>
                      <div className="d-grid gap-2">
                      <Button variant="secondary" size="lg" data={item.id} onClick={incrementVote.bind(this, item.id)}>Up Vote 👍</Button>
                      </div>
                    </Card.Body>
                  <Card.Footer>
                    <Button className="btn-money" size="lg" data={item.id} onClick={sendTip.bind(this, item.id)}>
                    Send a Tip to {item.userAddress.toString().substring(0, 6)} 💰
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      );
    }
  };


  const createTransaction = async(instructions) => {
    const anyTransaction = new web3.Transaction().add(instructions);
    anyTransaction.feePayer = getConnectionProvider().wallet.publicKey;
    console.log("Getting Recent Blockhash");
    anyTransaction.recentBlockhash = (
      await getConnectionProvider().connection.getRecentBlockhash()
    ).blockhash;
    return anyTransaction;
  }

  const createTransferTransaction = async (from, to, amount) => {
    return createTransaction(
      web3.SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: 100000 * amount,
    }));
  }

  const sendTransaction = async(from, to, amount) => {
    try {
      console.log(`sending ${amount} from: ${from}, to: ${to}`);
      let { signature } = await getConnectionProvider().wallet.signAndSendTransaction(await createTransferTransaction(from, to, amount));
      console.log("Submitted transaction " + signature + ", awaiting confirmation");
      await getConnectionProvider().connection.confirmTransaction(signature);
      console.log("Transaction " + signature + " confirmed");
    } catch (err) {
      console.warn(err);
      console.error("Error: " + JSON.stringify(err));
    }
  }
  
  const sendTip = async(id) => {
    console.log("Tipping:", id);
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const fromWallet = walletAddress;
      // could use a hashmap
      const toWallet = gifList.filter(x => x.id === id).map(x => x.userAddress);
      const amount = 1;
      await sendTransaction(fromWallet, toWallet[0], amount);
      setStatusMessage({ type: 'success', text: 'Tip sent successfully!' });
    } catch (error) {
      console.log("Error sending tip:", error);
      setStatusMessage({ type: 'danger', text: 'Failed to send tip. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }
  
  const incrementVote = async (id) => {
    console.log("UpVoting GifID:", id);
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const provider = getConnectionProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.upvoteGif(id, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey
        }
      });
      setStatusMessage({ type: 'success', text: 'Vote recorded!' });
      await getGifList();
    } catch (error) {
      console.log("Error UpVoting GifID:", id, error);
      setStatusMessage({ type: 'danger', text: 'Failed to record vote. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }


  useEffect(() => {
    const onLoad = async () => {
      await connectWallet();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (
    <div className="App">
      <div className="d-flex flex-column">
        <div id="page-content">
          <div className="container text-center">
            <Row className="row justify-content-center">
              <div className="container">
                <h1 className="mb-5 mt-5 fw-bold mt-4 text-white"> ⚽ Best Football GIFS</h1>
                <p className="mb-0 lead text-white">
            Upload and view the latest and best football <a href ="https://giphy.com/" style={{ color: 'white' }} > GIFS </a> on the metaverse ✨
                </p>
                <p className="lead text-white">
            Post the best GIFS and you can get upVotes 👍 or Tips 💰
                </p>

                {statusMessage && (
                  <div className={`alert alert-${statusMessage.type} mx-auto w-50`} role="alert">
                    {statusMessage.text}
                  </div>
                )}

                {isLoading && (
                  <div className="text-white mb-3">
                    <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                    Processing transaction...
                  </div>
                )}

                {!walletAddress && renderNotConnectedContainer()}
                {walletAddress && renderConnectedContainer()}
              </div>
            </Row>
          </div>
        </div>
      </div>
      <div id="sticky-footer" className="footer flex-shrink-0 py-0 bg-dark">
        <span>Built on </span> <a href="https://solana.com"><Image alt="Solana Logo" className="logo-solana" src={solana_logo} fluid /></a> 
               <span>  <p> 
            <a href="https://twitter.com/IBRAKADABRAAAAA" style={{ color: 'white' }}
          > <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo}fluid/> by @IBRAKADABRAAAAA </a> </p> </span> 
      </div>
    </div>
  );
};

export default App;
