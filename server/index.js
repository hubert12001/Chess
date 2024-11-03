const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server,{  
    cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]}}
);

let users = new Set();
let messages=[];
let rooms = [];
let sequenceID = new Set();


function find_room_by_id(id){
    for (r in rooms){
        if(rooms[r].roomID==id){
            return rooms[r];
        }
    }
}

function update_open_rooms_for_users(){
    let data=[];
    for (r in rooms){
        if (rooms[r].open == true)
        {
            data.push({
                roomID: rooms[r].roomID, 
                owner: rooms[r].owner,
                name: rooms[r].name, 
                limit: rooms[r].limit, 
                usersInRoom: rooms[r].users.size
            });
        }
    }
    io.emit("roomCreated",data);
}


const cors = require("cors");

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


//checking for unique
app.post('/users',(req, res) =>{
    try{
        let newUsername=req.body.un
        if ( users.has(newUsername) == true){
            res.send(true);
        }
        else{
            res.send(false);
        }

    }
    catch(e){
        console.log(e);
    }
});


io.on('connection', (socket) => {
    console.log('a user connected');
    //io.emit('updateChat',messages);

    update_open_rooms_for_users()



    //user creation
    socket.on('newUser',(u)=>{
        console.log('new user "'+u+'" created');
        socket.userID=u;
        users.add(u);

    });

    //user deletion
    socket.on('disconnect', s=>{
        console.log('a user disconnected')
        users.delete(socket.userID);


        let currentRoom=find_room_by_id(socket.room);
        currentRoom.users.delete(socket.userID);
        if(currentRoom.users.size == 0){
            rooms.splice(currentRoom.roomID-1,1);
            
        }
        else if(currentRoom.users.size<currentRoom.limit){
            currentRoom.open=true;
        }
        update_open_rooms_for_users()
        io.to(currentRoom.name).emit('updateUsers',[...currentRoom.users])

    });

    //updating message board
    socket.on('sendMessage',(msg)=>{
        let currentRoom=find_room_by_id(socket.room);
        currentRoom.messages.push(socket.userID+" : "+msg);

        io.to(currentRoom.name).emit('updateChat',currentRoom.messages);

    });


    //joining room
    socket.on('joinRoom',(roomID)=>{
        let currentRoom = find_room_by_id(roomID);

        socket.room=currentRoom.roomID;
        socket.join(currentRoom.name);
        currentRoom.users.add(socket.userID);
        if(currentRoom.users.size==currentRoom.limit){
            currentRoom.open=false;
        }

        io.to(currentRoom.name).emit("updateRoomName",currentRoom.name);
        io.to(currentRoom.name).emit("updateUsers",[...currentRoom.users]);
        io.to(currentRoom.name).emit('updateChat',currentRoom.messages);

        update_open_rooms_for_users()
        
    });



    //creating new room
    socket.on('createRoom',()=>{
        //getting unique id
        let i=0;
        while(sequenceID.has(i)){
            i++;
        }
        sequenceID.add(i);

        //random name
        let roomName = "room"+Math.floor(Math.random() * 10000000);

        //adding room to serwer
        let room = {
            roomID: i, 
            name: roomName,
            owner: socket.userID,
            users: new Set([socket.userID]), 
            messages: ["WITAJ NA CZACIE, TUTAJ BEDA WYSWIETLANE WIADOMOSCI..."], 
            open: true,
            limit: 3
        }
        rooms.push(room);
        console.log("ROOM ADDED : ", room);

        //emitting to other sockets that a new room had open
        update_open_rooms_for_users()

        socket.join(room.name);
        socket.room=room.roomID;
        
        io.to(room.name).emit("updateRoomName",room.name);
        io.to(room.name).emit("updateUsers",[...room.users]);
        io.to(room.name).emit('updateChat',room.messages);
    });
    
});   


server.listen(9000, () => {
  console.log('listening on *:9000');
});