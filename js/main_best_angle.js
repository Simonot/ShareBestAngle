'use strict';

var isitAdmin = false;
var localStream;
var isStarted = false;
var pc;
var remoteStream;
var isStarted2 = false;
var pc2;
var remoteStream2;
var numeroCurrentConnection = 0; // use for switching between the two RTCPeerConnection when changing angle
var numberBestAngleClient = 0;

var turnReady;
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};

/////////////////////////////////////////////////////////

var socket = io.connect();

console.log('This is a best angle client');
socket.emit('is there admin');

socket.on('is it admin', function(admin) {
  isitAdmin = admin;
  console.log('isitAdmin', isitAdmin);
});

socket.on('numberBestAngleClient', function(number) {
  numberBestAngleClient = number;
  console.log('numberBestAngleClient', numberBestAngleClient);
});

sendMessage('new best angle client');

socket.on('log', function (array){
  console.log.apply(console, array);
});

if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

/////////////////////////////////////////////////////////

function sendMessage(message){
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

socket.on('message', function (message){
  console.log('Client received message:', message);
  if (message == 'admin ready') {
    /* We have to check if is it the first time we connect with webRTC to admin
       or if we only want to switch RTCPeerConnection when changing angle (case numeroCurrentConnection == 1 or 2)
    */
    if (numeroCurrentConnection == 0) {
      numeroCurrentConnection = 1;
      doCall();
    } else if (numeroCurrentConnection == 1){
      numeroCurrentConnection = 2;
      doCall2();
    } else { // numeroCurrentConnection == 2
      numeroCurrentConnection = 1;
      doCall();
    }
  } 
  else if (message === 'no share client') {
      alert("sorry but nobody is sharing an angle, please try change angle later");
  } 
  else if (message.type === 'answer') {
      if (numeroCurrentConnection == 1 && isStarted)
        pc.setRemoteDescription(new RTCSessionDescription(message));
      else if (numeroCurrentConnection == 2 && isStarted2)
        pc2.setRemoteDescription(new RTCSessionDescription(message));
  } 
  else if (message.type === 'candidate') {
      if (numeroCurrentConnection == 1 && isStarted) {
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
      } else if (numeroCurrentConnection == 2 && isStarted2) {
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate
        });
        pc2.addIceCandidate(candidate);
      }
  } 
  else if (message == 'admin bye') {
      isitAdmin = false;
      isStarted = false;
      isStarted2 = false;
      pc.close();
      pc2.close();
      pc = null;
      pc2 = null;
      numberBestAngleClient = 0;
  }
});

window.onbeforeunload = function(e){
  socket.emit('best angle client disconnected', numberBestAngleClient);
}

/////////////////////////////////////////////////////////

var localVideo = document.getElementById('localvideo');
var remoteVideo = document.getElementById('remotevideo');
var remoteVideo2 = document.getElementById('remotevideo2');
var findButton = document.getElementById('findButton');
var changeButton = document.getElementById('changeButton');

var constraints = {audio: true, video: true};

// For the fond button we have to get the user media with constraint audio and video true, other way we can not receive video (cf README III)
findButton.addEventListener('click', function(){
  if (isitAdmin) {
    getUserMedia(constraints, handleUserMedia, handleUserMediaError);
    console.log('Getting user media with constraints', constraints);
    findButton.setAttribute('disabled', '');
    changeButton.removeAttribute('disabled');
  }
  else
    alert("admin is still not connected, wait him to find the best angle");
});

changeButton.addEventListener('click', function(){
  if (isitAdmin) {
    // if the current connection is pc, we need to close it and start the connection with pc2
    if (numeroCurrentConnection == 1) {
      console.log('numeroCurrentConnection   1');
      createPeerConnection2();
      pc.close();
      isStarted = false;
      pc2.addStream(localStream);
      isStarted2 = true;
      sendMessage({
        type: 'change angle',
        number: numberBestAngleClient});
      remoteVideo.setAttribute('hidden', '');
      remoteVideo2.removeAttribute('hidden');
    } 
    // if the current connection is pc2 we then need to close it and start connection with pc 
    else { // numeroCurrentconnection == 2
      console.log('numeroCurrentConnection   2');
      createPeerConnection();
      pc2.close();
      isStarted2 = false;
      pc.addStream(localStream);
      isStarted = true;
      sendMessage({
        type: 'change angle',
        number: numberBestAngleClient});
      remoteVideo2.setAttribute('hidden', '');
      remoteVideo.removeAttribute('hidden');
    }
  }
  else
    alert("admin is still not connected, wait him to find the best angle");
});

/////////////////////////////////////////////////////////

function maybeStart() {
  console.log('isStarted', isStarted);
  if (!isStarted) {
    createPeerConnection();
    console.log('pcaddStream');
    pc.addStream(localStream);
    isStarted = true;
    console.log('isitAdmin', isitAdmin);
    if (isitAdmin) {
      sendMessage('want best angle');
    }
  }
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
}

function createPeerConnection2() {
  try {
    pc2 = new RTCPeerConnection(null);
    pc2.onicecandidate = handleIceCandidate;
    pc2.onaddstream = handleRemoteStreamAdded2;
    pc2.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection2');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
}

function handleUserMedia(stream) {
  console.log('Adding local stream.');
  localVideo.src = window.URL.createObjectURL(stream);
  localStream = stream;
  console.log('got user media');
  if (isitAdmin) {
    maybeStart();
  }
}

function handleUserMediaError(error){
  console.log('getUserMedia error: ', error);
}

function handleIceCandidate(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      origin: 'client',
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('New remote stream added');
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream = event.stream;
}

function handleRemoteStreamAdded2(event) {
  console.log('New remote stream 2 added');
  remoteVideo2.src = window.URL.createObjectURL(event.stream);
  remoteStream2 = event.stream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function handleCreateOfferError(event){
  console.log('createOffer() error: ', event);
}

function handleCreateAnswerError(event){
  console.log('createAnswer() error: ', event);
}

function doCall() {
  console.log('doCall');
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doCall2() {
  console.log('DoCall2');
  console.log('Sending offer to peer');
  pc2.createOffer(setLocalAndSendMessage2, handleCreateOfferError);
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  sendMessage(sessionDescription);
}

function setLocalAndSendMessage2(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc2.setLocalDescription(sessionDescription);
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

/////////////////////////////////////////////////////////

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

