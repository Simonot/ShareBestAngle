'use strict';
/* Please start by reading the README file to understand the idea of the project.
   You can also use it when reading the code, to help you understant the stack of exchanging messages
*/

var isAdmin = true;
var numberActualClient = 0;
// var for shareClient <-> admin 
var numberShareClient = 0;
var isShareClient; // to diferenciate the case of the communication admin/shareClient and admin/BestAngleClient
var newStreamClient = true; // to diferenciate the case of new <video> needed to ba add and only change of emptyVideo is needed
var isStarted = [];
var pcShare = [];
var remoteStream = []
var freeStreamNumero = [];
// var for bestAngle <-> admin
var numberBestAngleClient = 0;
var pcBestAngle = [];
var isStartedBestAngle = [];
var sharedAngle = []; // to know the numero of the stream which the bestAngleClient is connected
var bestAngleStream = [];
// var for STUn TURN servers
var turnReady;
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};

/////////////////////////////////////////////

var socket = io.connect();

console.log('This is admin');
socket.emit('admin connected');

socket.on('log', function (array){
  console.log.apply(console, array);
});

if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

////////////////////////////////////////////////

function sendMessage(message){
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

socket.on('message', function (message){
  console.log('Client received message:', message);
  if (message === 'got share client media') {
    isShareClient = true;
    if (freeStreamNumero.length == 0) {
      /* We add a new shareClient to the list because we can not reuse an old one
         left by a precedent leaving procedure of one shareClient
      */ 
      newStreamClient = true;
      numberShareClient = numberShareClient + 1;
      numberActualClient = numberShareClient;
      socket.emit('you are share client number', numberActualClient);
      isStarted[numberShareClient] = false;
      maybeStart();
    } else {
      /* just reuse the last shareConnection closed buy making the actual client the
         pop() of the freeStreamnumero
      */
      numberActualClient = freeStreamNumero.pop();
      newStreamClient = false;
      socket.emit('you are share client number', numberActualClient);
      maybeStart();
    }
  } 
  else if (message === 'want best angle') {
    isShareClient = false;
    numberBestAngleClient = numberBestAngleClient + 1;
    numberActualClient = numberBestAngleClient;
    socket.emit('you are best angle client number', numberActualClient);
    sharedAngle[numberActualClient] = 0; // no stream connected yet
    isStartedBestAngle[numberActualClient] = false;
    maybeStart_BestAngle();
  } 
  else if (message.type === 'change angle') {
    isShareClient = false;
    numberActualClient = message.number;
    pcBestAngle[numberActualClient].close();
    isStartedBestAngle[numberActualClient] = false;
    maybeStart_BestAngle();
  } 
  else if (message.type === 'offer') {
    if (isShareClient) {
      pcShare[numberActualClient].setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else {
      pcBestAngle[numberActualClient].setRemoteDescription(new RTCSessionDescription(message));
      doAnswer_BestAngle();
    }
  } 
  else if (message.type === 'candidate' && isStarted[numberActualClient]) {
    if (isShareClient) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pcShare[numberActualClient].addIceCandidate(candidate);
    } else {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pcBestAngle[numberActualClient].addIceCandidate(candidate);
    }
  }
});

/* when a share client disconnect we close with RTCPeerConnection in order to make free 
   the pcShare[number] for a potential reuse in the futur by a new share client
*/
socket.on('share client disconnected', function(number) {
  if(number != 0)
    if(isStarted[number]) {
      isStarted[number] = false;
      pcShare[number].close();
      pcShare[number] = null;
      remoteStream[number] = null;
      //create empty video and remplace videonumber by it
      var emptyVideo = document.createElement('video');
      emptyVideo.id = "emptyVideo" + number;
      emptyVideo.setAttribute('class', 'emptyVideo');
      var name = "video" + number;
      document.getElementById('videos').replaceChild(emptyVideo, document.getElementById(name));
      //
      freeStreamNumero.push(number);
      docNumberEmptyVideos.innerHTML = freeStreamNumero.length;
      docNumberShareVideos.innerHTML = numberShareClient - freeStreamNumero.length;
    }
  console.log('freeStreamNumero length', freeStreamNumero.length);
});

// just free the memory when a best angle client disconnect
socket.on('best angle client disconnected', function(number) {
  if(number != 0)
    if(isStartedBestAngle[number]) {
      isStartedBestAngle[number] = false;
      pcBestAngle[number].close();
      pcBestAngle[number] = null;
    }
});

////////////////////////////////////////////////////

var docNumberShareVideos = document.getElementById('numberShareVideos');
var docNumberEmptyVideos = document.getElementById('numberEmptyVideos');

function maybeStart() {
  console.log('numberActualClient', numberActualClient);
  if (!isStarted[numberActualClient]) {
    createPeerConnection();
    isStarted[numberActualClient] = true;
    sendMessage('admin ready');
  }
}

function maybeStart_BestAngle() {
  console.log('numberActualClient', numberActualClient);
  if (!isStartedBestAngle[numberActualClient]) {
    createPeerConnection_BestAngle();
    isStartedBestAngle[numberActualClient] = true;
    sendMessage('admin ready');
  }
}

window.onbeforeunload = function(e){
  sendMessage('admin bye');
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pcShare[numberActualClient] = new RTCPeerConnection(null);
    pcShare[numberActualClient].onicecandidate = handleIceCandidate;
    pcShare[numberActualClient].onaddstream = handleRemoteStreamAdded;
    pcShare[numberActualClient].onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
}

function createPeerConnection_BestAngle() {
  try {
    pcBestAngle[numberActualClient] = new RTCPeerConnection(null);
    pcBestAngle[numberActualClient].onicecandidate = handleIceCandidate;
    pcBestAngle[numberActualClient].onaddstream = handleRemoteStreamAdded_BestAngle;
    pcBestAngle[numberActualClient].onremovestream = handleRemoteStreamRemoved_BestAngle;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
  //verify that we have a share client left
  if (freeStreamNumero.length == numberShareClient)
    sendMessage('no share client');
  else {
  //verify that the next angle is not empty because the share client have disconnect
  do
    if (sharedAngle[numberActualClient] == numberShareClient)
      sharedAngle[numberActualClient] = 1;
    else sharedAngle[numberActualClient] = sharedAngle[numberActualClient] + 1;
  while (remoteStream[sharedAngle[numberActualClient]] == null)
  // ataching the first stream available
  bestAngleStream[numberActualClient] = remoteStream[sharedAngle[numberActualClient]];
  pcBestAngle[numberActualClient].addStream(bestAngleStream[numberActualClient]);
  console.log('Stream added to pcBestAngle', sharedAngle[numberActualClient]);
  }
}

function handleIceCandidate(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      origin: 'admin',
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

/* We have to create a new HTML video element to host the shareClient stream
   Two possibilities :
    - we have all the HTML video elements hosting a shareClient stream (newStreamClient == true)
      we then add the new HTML video element to the videos div
    - we have an empty HTML video element (newStreamclient == false) 
      we then replace the empty HTML video element by the one we have created
*/
function handleRemoteStreamAdded(event) {
  console.log('freeStreamNumero length', freeStreamNumero.length);
  console.log('New remote stream added');
  var newRemoteVideo = document.createElement('video');
  newRemoteVideo.id = "video" + numberActualClient;
  newRemoteVideo.setAttribute('class', 'video');
  newRemoteVideo.setAttribute('autoplay', '');
  newRemoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream[numberActualClient] = event.stream;
  if (newStreamClient) {
    document.getElementById('videos').appendChild(newRemoteVideo);
    docNumberShareVideos.innerHTML = numberShareClient;
  } else {
    var name = "emptyVideo" + numberActualClient;
    document.getElementById('videos').replaceChild(newRemoteVideo,document.getElementById(name));
    docNumberShareVideos.innerHTML = numberShareClient - freeStreamNumero.length;
    docNumberEmptyVideos.innerHTML = freeStreamNumero.length;
  }
}

function handleRemoteStreamAdded_BestAngle(event) {
  // nothing to do because a best angle client will never add a stream !
}

function handleRemoteStreamRemoved(event) {
  // nothin because a best angle client will never remove a stream !
}

function handleRemoteStreamRemoved_BestAngle(event) {
  // nothin because a best angle client will never remove a stream !
}

function handleCreateOfferError(event){
  console.log('createOffer() error: ', event);
}

function handleCreateAnswerError(event){
  console.log('createAnswer() error: ', event);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pcShare[numberActualClient].createAnswer(setLocalAndSendMessage, handleCreateAnswerError, sdpConstraints);
}

function doAnswer_BestAngle() {
  console.log('Sending answer to peer BestAngle.');
  pcBestAngle[numberActualClient].createAnswer(setLocalAndSendMessage_BestAngle, handleCreateAnswerError, sdpConstraints);
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pcShare[numberActualClient].setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  sendMessage(sessionDescription);
}

function setLocalAndSendMessage_BestAngle(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pcBestAngle[numberActualClient].setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  sendMessage(sessionDescription);
}

function requestTurn(turn_url) {
  var turnExists = false;
  for (var i = 0; i < pc_config.iceServers.length; i++) {
    console.log('pc_config.iceServers[i].url :' + pc_config.iceServers[i].url);
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}
