import './App.css';
import { useState,useEffect } from 'react';
import {socket} from './socket';
import axios from 'axios';


function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState();
  const [site, setSite] = useState(0);

  let listItems = messages.map((messages) =>
    <li>{messages}</li>
  );
  
  let activeUsers = users.map((u)=>
    <li>{u}</li>
  );

  let activeRooms = rooms.map((r)=>
    <li>nazwa : {r.name}, wlasciciel: {r.owner}, miejsca:{r.usersInRoom}\{r.limit}<button onClick={e=>join_room(e,r.roomID)}>join</button> </li>
    
  );

  function sendMessage(e){
    e.preventDefault();
    var msg= document.getElementById('message').value;

    socket.emit('sendMessage',msg);


  }

  function create_room(e){
    e.preventDefault();

    socket.emit('createRoom');
    setSite(1);
  }

  function join_room(e,id){
    e.preventDefault();
    socket.emit('joinRoom',id);
    setSite(1);
  }

  async function create_new_user(){
    
    let userName;
    let data=1;
    while(data){
      userName = "user"+Math.floor(Math.random() * 10000000)
      await axios.post('http://localhost:9000/users',{un:userName})  
      .then(function (response) {
        console.log(response.data);
        data=response.data;
      })
      .catch(function (error) {
        console.log(error);
      });
    };

    socket.emit("newUser", userName );
  }

  useEffect(() => {
    const update_users =(user)=> {
      setUsers(user);

    }
    
    function onDisconnect() {
      setIsConnected(false);
      setSite(0);
    }
    
    function update_chat(msg){
      setMessages(msg);
    }
    
    function onConnect() {
      setIsConnected(true);
      create_new_user();
    }
    
    function update_rooms(data){
      setRooms(data);
    }

    function update_name(data){
      setRoomName(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    if(site == 0){
      socket.on('roomCreated',(data)=>update_rooms(data));
      
    }


    socket.on('updateUsers',(user)=>update_users(user));
    socket.on('updateChat',(msg)=>update_chat(msg));
    socket.on('updateRoomName',(data)=>update_name(data))
    
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      
      if(site == 0){
        socket.off('roomCreated',(data)=>update_rooms(data))
        
      }
      
      socket.off('updateUsers',(user)=>update_users(user))
      socket.off('updateChat',(msg)=>update_chat(msg))
      socket.off('updateRoomName',(data)=>update_name(data))
        
      
    };
  }, []);


  if(site==0){
    return (
      <div className="App">
        <h1>open rooms:
          <ul id="roomsOpen">
            {activeRooms}
          </ul>
        </h1>
        <div>
          <form>
            <button type="sumbit" onClick={e=>create_room(e)}>create room</button>
          </form>
        </div>
  
      </div>
    );
  }
  else{
    return (
      <div className="App">
        <h1>{roomName}</h1>
        <h1>Connected users:
          <ol id="usersConnected">
              {activeUsers}
          </ol>
        </h1>
        <div>
          <form>
            <label for="message">Message here</label>
            <input id="message" type="text"/>
            <button type="sumbit" onClick={e=>sendMessage(e)}>Send</button>
          </form>
        </div>
  
        <ul>{listItems}</ul>
      </div>
    );
  }
}

export default App;
