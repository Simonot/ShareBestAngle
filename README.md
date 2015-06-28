
I. Idea of the project
II. Normal exchanging messages stack for share_client <-> admin
III. Normal exchanging messages stack for bestAngle_client <->admin
IV. contact for any question
____________________________________________________________________________________________________________________________

I. Idea of the project

	The idea start with two main observations. First in a lot of big spectacle event, like concert or football games, they
are a lot of people filming the event with their smart phone. Second observation is that in that kind of event, televisions 
have more that one camera to film the event, that way, the TV spectator can chose the angle he prefers, his best angle.
	
	With this two observation we can imagine a system in which all the person with the smart phones in the event share in 
real time with webRTC their angle of the event with an admin page. After that, a client in home can find his best angle for
the event by connecting himself in real time with webRTC with the admin page.
	
	To sum up, there is a scheme of the project :
	
	 Share clients                       Admin                         Best angle clients
	---------------                -----------------                ------------------------      
	                   webRTC                             webRTC
	client1/Stream1  <-------->    Stream1, Stream2,    <-------->  client1/Watching Stream3
								   Stream3, ... ,
	client2/Stream2  <-------->    StreamN              <-------->  client2/Watching Stream1

	client3/Stream3  <-------->                                     ...
	
	...                                                 <-------->  clientM/Watching StreamN
	
	clientN/StreamN  <-------->
	
____________________________________________________________________________________________________________________________

II. Normal exchanging messages stack for share_client <-> admin
! To simplify, I have not taking in account the fact that, because Admin is dealing with multiple shareClient, he has to use
  an array of RTCPeerConnection. That is the reason for all the operation with numberShareClient and actualClient
  
! In order to not waste memory, when a shareClient leave, the HTML video element of the Admin page which was containing the
  stream is replaced by an empty source. The point is the reuse this empty spot for the next shareClient. That is the reason
  for all the operation about freeStreamNumero

	             ShareClient                                           Admin
	-------------------------------------           ----------------------------------------
	startSharingButton.onclick()
	-> getUserMedia()
	-> handleUserMedia()
	-> maybeStart()
	-> CreatPeerConnection()
	+ send('got share client media')
	                                                 -> onmessage('got share client media')
													 -> maybeStart()
													 -> createPeerConnection()
													 + send('admin ready)
	-> onmessage('admin ready')
	-> doCall()
	-> setLocalAndSendMessage()
	-> setLocalDescription()
	+ send(sessionDescription/type :offer)          
													 -> onmessage(type :offer)
													 -> setRemoteDescription()
													 + doAnswer()
													 -> setLocalAndSendMessage()
													 -> setLocalDescription()
													 + send(sessionDescription/type :answer)
	-> onmessage(type :answer)
	-> setRemoteDescription()
	

III. Normal exchanging messages stack for bestAngle_client <-> admin
! To simplify, I have not taking in account the fact that, because Admin is dealing with multiple bestAngleClient, he has
  to use an array of RTCPeerConnection. That is the reason for all the operation with numberBestAngleClient and actualClient
  
! Normally we do not need to ask for the video and audio of the best angle client, he only want to see the videos sharing
  by shareClients. Furthermore, if he have to create the RTCPeerConnection with audio and video constraint, so you have to
  use getUserMedia, if we do not, the offer in the webRTC exchange while throws an error. That is why we use getUserMedia.
  
! For switching the stream you want to be connected with with the admin page I have chosen to use 2 RTCPeerConnection
  pc and pc2). So if you want to understand the normal stack of the find button and the change button, you have to be
  aware that the occasional 'if (numeroConnection == ...)' are there to properly switch between pc and pc2 when the user
  click the change button.

a) Find best angle

	          bestAngleClient                                         Admin
	-------------------------------------           ----------------------------------------
	findButton.onclick()
	-> getUserMedia()
	-> handleUserMedia()
	-> maybeStart()
	-> CreatPeerConnection()
	+ send('want best angle')
	                                                 -> onmessage('want best angle')
													 -> maybeStart_BestAngle()
													 -> createPeerConnection_BestAngle()
													 + send('admin ready')
	-> onmessage('admin ready')
	-> doCall()
	-> setLocalAndSendMessage()
	-> setLocalDescription()
	+ send(sessionDescription/type :offer)          
													 -> onmessage(type :offer)
													 -> setRemoteDescription_BestAngle()
													 + doAnswer_BestAngle()
													 -> setLocalAndSendMessage_BestAngle()
													 -> setLocalDescription()
													 + send(sessionDescription/type :answer)
	-> onmessage(type :answer)
	-> setRemoteDescription()

b) Change angle

	          bestAngleClient                                         Admin
	-------------------------------------           ----------------------------------------
	changeButton.onclick()
	-> switch the RTConnection pc/pc2
	+ send('change angle')
	                                                 -> onmessage('change angle')
													 -> maybeStart_BestAngle()
													 -> createPeerConnection_BestAngle()
													 + send('admin ready')
	-> onmessage('admin ready')
	-> doCall()
	-> setLocalAndSendMessage()
	-> setLocalDescription()
	+ send(sessionDescription/type :offer)          
													 -> onmessage(type :offer)
													 -> setRemoteDescription_BestAngle()
													 + doAnswer_BestAngle()
													 -> setLocalAndSendMessage_BestAngle()
													 -> setLocalDescription()
													 + send(sessionDescription/type :answer)
	-> onmessage(type :answer)
	-> setRemoteDescription()

IV. Contact for any question

contact me on gitHub by adding a Question.md file with your e-mail